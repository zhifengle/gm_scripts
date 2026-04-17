import { Subject } from './interface/subject';
import {
  CollectionInfo,
  InterestType,
  SiteUtils,
  SubjectItem,
} from './interface/types';
import { siteUtils as bangumiUtils } from './sites/bangumi';
import { sendSearchResults, siteUtils as doubanUtils } from './sites/douban';
import {
  getInterestTypeId,
  getInterestTypeName,
  insertLogInfo,
} from './sites/bangumi/common';
import { randomSleep } from './utils/async/sleep';
import {
  CollectionSheetItem,
  CollectionSheetRow,
  collectionSheetRowToItem,
  downloadCollectionExcel,
  ensureCollectionInfo,
  readCollectionSheetRows,
} from './utils/collectionSheet';
import { formatDate } from './utils/utils';
import { insertControl } from './ui/migrateTool';

type MigrateSite = 'douban' | 'bangumi';
type SyncStatus = '' | '成功' | `失败: ${string}` | `跳过: ${string}`;

type SubjectItemWithSync = CollectionSheetItem & {
  syncStatus: SyncStatus | string;
};

type InterestBuckets = Record<InterestType, SubjectItemWithSync[]>;

type BangumiDataItem = {
  title?: string;
  titleTranslate?: {
    'zh-Hans'?: string[];
  };
  sites?: {
    site: string;
    id: string;
  }[];
};

type BangumiData = {
  items: BangumiDataItem[];
};

type ControlElements = {
  container: HTMLElement;
  userInput: HTMLInputElement;
  importButton: HTMLButtonElement;
  importFileButton: HTMLButtonElement;
  importFileInput: HTMLInputElement;
  exportButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
};

type MigrateContext = {
  localSite: MigrateSite;
  localUtils: SiteUtils;
  remoteUtils: SiteUtils;
  controls: ControlElements;
};

const ALL_INTEREST_TYPES: InterestType[] = [
  'wish',
  'collect',
  'do',
  'on_hold',
  'dropped',
];
const DEFAULT_INTEREST_TYPES: InterestType[] = ['do', 'collect', 'wish'];

const SYNC_SUCCESS: SyncStatus = '成功';
const SYNC_SHEET_NAME = '同步信息';

let bangumiData: BangumiData | null = null;
let bangumiDataLoaded = false;

function cloneItem(item: SubjectItemWithSync): SubjectItemWithSync {
  return {
    ...item,
    syncStatus: item.syncStatus || '',
    collectInfo: item.collectInfo ? { ...item.collectInfo } : undefined,
    syncSubject: item.syncSubject ? { ...item.syncSubject } : undefined,
  };
}

function createEmptyBuckets(): InterestBuckets {
  return ALL_INTEREST_TYPES.reduce((res, type) => {
    res[type] = [];
    return res;
  }, {} as InterestBuckets);
}

function replaceBuckets(target: InterestBuckets, source: InterestBuckets) {
  ALL_INTEREST_TYPES.forEach((type) => {
    target[type] = [...source[type]];
  });
}

function getBangumiData(): BangumiData | null {
  if (bangumiDataLoaded) {
    return bangumiData;
  }
  bangumiDataLoaded = true;
  try {
    bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
  } catch (error) {
    bangumiData = null;
    console.log('parse JSON:', error);
  }
  return bangumiData;
}

function getBangumiSubjectId(name = '', greyName = ''): string {
  const data = getBangumiData();
  if (!data) {
    return '';
  }
  const matchedItem = data.items.find((item) => {
    const cnNames = item.titleTranslate?.['zh-Hans'] || [];
    return (
      item.title === name ||
      item.title === greyName ||
      cnNames.includes(greyName)
    );
  });
  return matchedItem?.sites?.find((item) => item.site === 'bangumi')?.id || '';
}

function getSelectedInterestTypes(): InterestType[] {
  const select = document.querySelector(
    '.e-userjs-export-tool-container #movie-type-select'
  ) as HTMLSelectElement;
  if (select?.value) {
    return [select.value as InterestType];
  }
  return [...DEFAULT_INTEREST_TYPES];
}

function isJpMovie(item: SubjectItem) {
  return item.rawInfos.indexOf('日本') !== -1;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function setFailure(item: SubjectItemWithSync, message: string) {
  item.syncStatus = `失败: ${message}`;
}

function shouldSyncItem(item: SubjectItemWithSync) {
  const status = item.syncStatus || '';
  return status !== SYNC_SUCCESS && !status.startsWith('跳过:');
}

function clearLogInfo(container: HTMLElement) {
  container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

function insertStatusLog(context: MigrateContext, message: string) {
  insertLogInfo(context.controls.importButton, message);
}

function insertErrorLog(context: MigrateContext, message: string) {
  insertStatusLog(context, `<span style="color:tomato">${message}</span>`);
}

function getMigrateUtils(localSite: MigrateSite) {
  if (localSite === 'bangumi') {
    return {
      localUtils: bangumiUtils,
      remoteUtils: doubanUtils,
    };
  }
  return {
    localUtils: doubanUtils,
    remoteUtils: bangumiUtils,
  };
}

function getExportSubjectName(site: MigrateSite) {
  return site === 'bangumi' ? '豆瓣' : 'Bangumi';
}

function getRequiredElement<T extends Element>(
  parent: Document | Element,
  selector: string
): T {
  const element = parent.querySelector(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element as T;
}

function createControls(localUtils: SiteUtils, remoteUtils: SiteUtils) {
  const container = insertControl(
    localUtils.contanerSelector,
    remoteUtils.name
  );
  return {
    container,
    userInput: getRequiredElement<HTMLInputElement>(container, 'input'),
    importButton: getRequiredElement<HTMLButtonElement>(
      container,
      '.import-btn'
    ),
    importFileButton: getRequiredElement<HTMLButtonElement>(
      container,
      '.import-file-btn'
    ),
    importFileInput: getRequiredElement<HTMLInputElement>(
      container,
      '.import-file-input'
    ),
    exportButton: getRequiredElement<HTMLButtonElement>(
      container,
      '.export-btn'
    ),
    retryButton: getRequiredElement<HTMLButtonElement>(
      container,
      '.retry-btn'
    ),
  };
}

function getUserIdFromInput(context: MigrateContext): string {
  const value = context.controls.userInput.value;
  if (!value) {
    alert(`请输入${context.remoteUtils.name}主页地址`);
    return '';
  }
  const userId = context.remoteUtils.getUserId(value);
  if (!userId) {
    alert(`无效${context.remoteUtils.name}主页地址`);
    return '';
  }
  return userId;
}

function sheetRowToItem(
  row: CollectionSheetRow,
  fallbackTypes: InterestType[]
): { type: InterestType; item: SubjectItemWithSync } {
  const { item, interestType } = collectionSheetRowToItem(row, {
    fallbackTypes,
    defaultInterestType: 'collect',
  });
  return {
    type: interestType,
    item: {
      ...item,
      syncStatus: item.syncStatus || '',
    },
  };
}

function bucketsToItems(buckets: InterestBuckets) {
  const items: SubjectItemWithSync[] = [];
  ALL_INTEREST_TYPES.forEach((type) => {
    buckets[type].forEach((item) => {
      const itemWithType = cloneItem(item);
      ensureCollectionInfo(itemWithType).interestType = type;
      items.push(itemWithType);
    });
  });
  return items;
}

function downloadExcel(filename: string, buckets: InterestBuckets) {
  downloadCollectionExcel(filename, bucketsToItems(buckets), {
    includeSyncColumns: true,
    interestTypeHeader: '类别',
    sheetName: SYNC_SHEET_NAME,
  });
}

async function readBucketsFromFile(file: File): Promise<InterestBuckets> {
  const rows = await readCollectionSheetRows(file);
  const buckets = createEmptyBuckets();
  const fallbackTypes = getSelectedInterestTypes();
  rows.forEach((row) => {
    const { type, item } = sheetRowToItem(row, fallbackTypes);
    if (item.name || item.url || item.syncSubject?.url) {
      buckets[type].push(item);
    }
  });
  return buckets;
}

function getSubjectIdFromSyncSubject(
  context: MigrateContext,
  item: SubjectItemWithSync
) {
  if (!item.syncSubject?.url) {
    return '';
  }
  return context.localUtils.getSubjectId(item.syncSubject.url);
}

async function findLocalSubjectId(
  context: MigrateContext,
  item: SubjectItemWithSync
) {
  let subjectId = getSubjectIdFromSyncSubject(context, item);
  if (subjectId) {
    return subjectId;
  }
  if (context.localSite === 'bangumi') {
    subjectId = getBangumiSubjectId(item.name, item.greyName);
    if (subjectId) {
      return subjectId;
    }
  }
  await randomSleep(1000, 400);
  const result = await context.localUtils.checkSubjectExist({
    name: item.name,
    releaseDate: item.releaseDate,
  } as Subject);
  if (result?.url) {
    item.syncSubject = result;
    return context.localUtils.getSubjectId(result.url);
  }
  return '';
}

async function syncItem(
  context: MigrateContext,
  item: SubjectItemWithSync,
  type: InterestType
): Promise<SubjectItemWithSync> {
  const subjectItem = cloneItem(item);
  if (context.localSite === 'bangumi' && !isJpMovie(subjectItem)) {
    subjectItem.syncStatus = '跳过: 非日本动画';
    return subjectItem;
  }

  let subjectId = '';
  try {
    subjectId = await findLocalSubjectId(context, subjectItem);
  } catch (error) {
    setFailure(subjectItem, `搜索错误: ${getErrorMessage(error)}`);
    console.error('搜索条目错误: ', error);
    return subjectItem;
  }

  if (!subjectId) {
    setFailure(subjectItem, '未找到匹配条目');
    return subjectItem;
  }

  clearLogInfo(context.controls.container);
  const nameStr = `<span style="color:tomato">《${subjectItem.name}》</span>`;
  insertStatusLog(context, `更新收藏 ${nameStr} 中...`);

  const collectInfo: Partial<CollectionInfo> = subjectItem.collectInfo || {};
  try {
    await context.localUtils.updateInterest(subjectId, {
      interest: getInterestTypeId(type),
      ...collectInfo,
      rating: collectInfo.score || '',
    });
    subjectItem.syncStatus = SYNC_SUCCESS;
    await randomSleep(2000, 1000);
    insertStatusLog(context, `更新收藏 ${nameStr} 成功`);
  } catch (error) {
    setFailure(subjectItem, getErrorMessage(error));
    insertErrorLog(
      context,
      `更新收藏 ${nameStr} 失败: ${getErrorMessage(error)}`
    );
    console.error('更新收藏错误: ', error);
  }
  return subjectItem;
}

async function syncBuckets(context: MigrateContext, buckets: InterestBuckets) {
  for (const type of getSelectedInterestTypes()) {
    const items = buckets[type];
    for (let i = 0; i < items.length; i++) {
      if (shouldSyncItem(items[i])) {
        items[i] = await syncItem(context, items[i], type);
      }
    }
  }
}

async function importRemoteCollections(
  context: MigrateContext,
  userId: string,
  buckets: InterestBuckets
) {
  for (const type of getSelectedInterestTypes()) {
    let items: SubjectItemWithSync[] = [];
    try {
      items = (await context.remoteUtils.getAllPageInfo(
        userId,
        'movie',
        type
      )) as SubjectItemWithSync[];
    } catch (error) {
      const message = `获取${getInterestTypeName(type)}收藏失败: ${getErrorMessage(
        error
      )}`;
      insertErrorLog(context, message);
      console.error(message, error);
      continue;
    }

    for (let i = 0; i < items.length; i++) {
      items[i] = await syncItem(context, items[i], type);
    }
    buckets[type] = [...items];
  }
}

function showActionButtons(context: MigrateContext) {
  clearLogInfo(context.controls.container);
  context.controls.exportButton.style.display = 'inline-block';
  context.controls.retryButton.style.display = 'inline-block';
}

function bindControls(context: MigrateContext, buckets: InterestBuckets) {
  const {
    exportButton,
    importButton,
    importFileButton,
    importFileInput,
    retryButton,
  } = context.controls;

  exportButton.addEventListener('click', async () => {
    exportButton.textContent = '导出中...';
    const filename = `${getExportSubjectName(context.localSite)}动画的收藏-${formatDate(
      new Date()
    )}.xlsx`;
    downloadExcel(filename, buckets);
    exportButton.style.display = 'none';
  });

  retryButton.addEventListener('click', async () => {
    await syncBuckets(context, buckets);
    showActionButtons(context);
  });

  importButton.addEventListener('click', async () => {
    const userId = getUserIdFromInput(context);
    if (!userId) {
      return;
    }
    await importRemoteCollections(context, userId, buckets);
    showActionButtons(context);
  });

  importFileButton.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files?.[0];
    if (!file) {
      return;
    }
    try {
      replaceBuckets(buckets, await readBucketsFromFile(file));
      await syncBuckets(context, buckets);
      showActionButtons(context);
    } catch (error) {
      console.error('导入文件错误: ', error);
      alert(`导入文件错误: ${getErrorMessage(error)}`);
    } finally {
      importFileInput.value = '';
    }
  });
}

function init(localSite: MigrateSite) {
  const { localUtils, remoteUtils } = getMigrateUtils(localSite);
  const context: MigrateContext = {
    localSite,
    localUtils,
    remoteUtils,
    controls: createControls(localUtils, remoteUtils),
  };
  bindControls(context, createEmptyBuckets());
}

if (location.href.match(/bgm.tv|bangumi.tv|chii.in/)) {
  init('bangumi');
}

if (location.href.match(/movie.douban.com/)) {
  init('douban');
}

if (location.href.match(/search\.douban\.com\/movie\/subject_search/)) {
  if (window.top !== window.self) {
    sendSearchResults();
  }
}
