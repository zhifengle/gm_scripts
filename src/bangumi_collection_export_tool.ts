import { SearchSubject } from './interface/subject';
import { IInterestData, InterestType, SubjectItem } from './interface/types';
import {
  getInterestTypeId,
  getItemInfos,
  getSubjectId,
  getTotalPageNum,
  insertLogInfo,
  updateInterest,
} from './sites/bangumi/common';
import { randomSleep, sleep } from './utils/async/sleep';
import { $q, htmlToElement } from './utils/domUtils';
import {
  collectionSheetRowToItem,
  downloadCollectionExcel,
  ensureCollectionInfo,
  readCollectionSheetRows,
} from './utils/collectionSheet';
import { fetchText } from './utils/fetchData';
import { formatDate } from './utils/utils';

const INTEREST_TYPES: InterestType[] = [
  'wish',
  'collect',
  'do',
  'on_hold',
  'dropped',
];

const IMPORT_INPUT_ID = 'e-userjs-import-csv-file';
const COLLECTION_SHEET_EXTENSION = 'xlsx';
const COLLECTION_PAGE_DELAY_MS = 500;
const collectionCache = new Map<string, Promise<SubjectItem[]>>();

type MenuItemOptions = {
  title?: string;
  label: string;
  onClick?: (item: HTMLElement) => Promise<void> | void;
};

function injectActionStyles() {
  GM_addStyle(`
.e-userjs-collection-tool-action {
  margin-left: 4px;
}
.e-userjs-collection-tool-action > a {
  border: 1px solid #d0d0d5;
  border-radius: 4px;
  padding: 2px 8px;
  background: #fff;
  color: #4c5161;
  text-decoration: none;
  transition: border-color .15s, background-color .15s, color .15s, opacity .15s;
}
.e-userjs-collection-tool-action > a:hover {
  border-color: #2a80eb;
  background: #f7fbff;
  color: #2a80eb;
}
.e-userjs-collection-tool-action span {
  color: inherit !important;
}
.e-userjs-collection-tool-action.is-busy > a {
  opacity: .62;
  cursor: wait;
}
.e-userjs-collection-tool-action.is-success > a {
  border-color: #3ca370;
  color: #278455;
  background: #f4fbf7;
}
.e-userjs-collection-tool-action.is-error > a {
  border-color: #d05050;
  color: #b23636;
  background: #fff7f7;
}
`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function setMenuText(item: HTMLElement, text: string) {
  const span = item.querySelector('span');
  if (span) {
    span.innerText = text;
  }
}

function setActionState(
  item: HTMLElement,
  state: 'idle' | 'busy' | 'success' | 'error'
) {
  item.classList.toggle('is-busy', state === 'busy');
  item.classList.toggle('is-success', state === 'success');
  item.classList.toggle('is-error', state === 'error');
}

async function withBusyState(
  item: HTMLElement,
  busyText: string,
  fn: () => Promise<void>
) {
  setMenuText(item, busyText);
  setActionState(item, 'busy');
  item.style.pointerEvents = 'none';
  try {
    await fn();
  } finally {
    item.style.pointerEvents = 'auto';
    if (item.classList.contains('is-busy')) {
      setActionState(item, 'idle');
    }
  }
}

function createMenuItem(options: MenuItemOptions) {
  const node = htmlToElement(
    `<li class="e-userjs-collection-tool-action"${options.title ? ` title="${options.title}"` : ''}>
  <a href="javascript:void(0);"><span>${options.label}</span></a>
</li>`
  ) as HTMLElement;
  if (options.onClick) {
    node.addEventListener('click', async () => {
      try {
        await options.onClick(node);
      } catch (error) {
        setMenuText(node, '操作失败');
        setActionState(node, 'error');
        console.error('操作失败: ', error);
      }
    });
  }
  return node;
}

function clearLogInfo(container: HTMLElement | Element) {
  container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

function getInterestTypeByUrl(url: string): InterestType | undefined {
  const currentType = url.match(/[^\/?#]+(?=[?#]?[^\/]*$)/)?.[0];
  return INTEREST_TYPES.find((type) => type === currentType);
}

function getListBaseUrl() {
  return location.href.replace(/[^\/?#]+(?:[?#].*)?$/, '');
}

function getListUrl(interestType: InterestType) {
  return `${getListBaseUrl()}${interestType}`;
}

function getCacheKey(url: string) {
  const parsedUrl = new URL(url, location.href);
  parsedUrl.hash = '';
  parsedUrl.searchParams.delete('page');
  return parsedUrl.toString();
}

function isCurrentDocumentFirstPage() {
  return !new URL(location.href).searchParams.has('page');
}

function canUseCurrentDocument(url: string) {
  if (!isCurrentDocumentFirstPage()) {
    return false;
  }
  const target = new URL(url, location.href);
  const current = new URL(location.href);
  return target.origin === current.origin && target.pathname === current.pathname;
}

function getPageUrl(url: string, page: number) {
  const pageParam = `page=${page}`;
  if (/page=\d+/.test(url)) {
    return url.replace(/page=\d+/, pageParam);
  }
  return `${url}${url.includes('?') ? '&' : '?'}${pageParam}`;
}

async function fetchCollectionPage(url: string) {
  const rawText = await fetchText(url);
  return new DOMParser().parseFromString(rawText, 'text/html');
}

async function loadCollectionInfo(url: string) {
  const firstPage = canUseCurrentDocument(url)
    ? document
    : await fetchCollectionPage(url);
  const totalPageNum = getTotalPageNum(firstPage);
  const items = [...getItemInfos(firstPage)];
  let page = 2;
  while (page <= totalPageNum) {
    const reqUrl = getPageUrl(url, page);
    await sleep(COLLECTION_PAGE_DELAY_MS);
    console.info('fetch info: ', reqUrl);
    items.push(...getItemInfos(await fetchCollectionPage(reqUrl)));
    page += 1;
  }
  return items;
}

async function getCollectionInfo(url: string) {
  const cacheKey = getCacheKey(url);
  if (!collectionCache.has(cacheKey)) {
    collectionCache.set(cacheKey, loadCollectionInfo(url));
  }
  return collectionCache.get(cacheKey);
}

function withInterestType(item: SubjectItem, interestType?: InterestType) {
  const collectInfo = {
    ...ensureCollectionInfo(item),
  };
  if (interestType) {
    collectInfo.interestType = interestType;
  }
  return {
    ...item,
    collectInfo,
  };
}

async function getCurrentCollectionItems(interestType?: InterestType) {
  const items = await getCollectionInfo(
    interestType ? getListUrl(interestType) : location.href
  );
  return items.map((item) => withInterestType(item, interestType));
}

async function getAllCollectionItems() {
  let items: SubjectItem[] = [];
  for (const interestType of INTEREST_TYPES) {
    try {
      const pageItems = await getCollectionInfo(getListUrl(interestType));
      items = items.concat(
        pageItems.map((item) => withInterestType(item, interestType))
      );
    } catch (error) {
      console.error(`抓取${interestType}收藏错误: `, error);
    }
  }
  return items;
}

function downloadItems(filename: string, items: SubjectItem[]) {
  downloadCollectionExcel(filename, items);
}

async function exportCurrentCollection(
  menuItem: HTMLElement,
  filename: string,
  interestType?: InterestType
) {
  await withBusyState(menuItem, '导出中...', async () => {
    downloadItems(filename, await getCurrentCollectionItems(interestType));
    setMenuText(menuItem, '导出完成');
    setActionState(menuItem, 'success');
  });
}

async function exportAllCollections(menuItem: HTMLElement, filename: string) {
  await withBusyState(menuItem, '导出中...', async () => {
    downloadItems(filename, await getAllCollectionItems());
    setMenuText(menuItem, '完成所有导出');
    setActionState(menuItem, 'success');
  });
}

function getImportLogTarget(fallback: Element) {
  return document.querySelector('#columnSubjectBrowserB .menu_inner') || fallback;
}

async function updateUserInterest(
  subject: SearchSubject,
  data: IInterestData,
  logTarget: Element
) {
  const nameStr = `<span style="color:tomato">《${subject.name}》</span>`;
  try {
    const subjectId = getSubjectId(subject.url);
    if (!subjectId) {
      throw new Error('条目地址无效');
    }
    insertLogInfo(logTarget, `更新收藏 ${nameStr} 中...`);
    await updateInterest(subjectId, data);
    insertLogInfo(logTarget, `更新收藏 ${nameStr} 成功`);
    await randomSleep(2000, 1000);
  } catch (error) {
    insertLogInfo(logTarget, `导入 ${nameStr} 错误: ${getErrorMessage(error)}`);
    console.error('导入错误: ', error);
  }
}

async function importCollectionFile(file: File, logTarget: Element) {
  const rows = await readCollectionSheetRows(file);
  for (const row of rows) {
    try {
      const { item, interestType } = collectionSheetRowToItem(row);
      const subject: SearchSubject = {
        name: item.name,
        url: item.url,
      };
      if (!subject.name || !subject.url) {
        throw new Error('没有条目信息');
      }
      const collectInfo = ensureCollectionInfo(item);
      await updateUserInterest(
        subject,
        {
          interest: getInterestTypeId(interestType),
          rating: collectInfo.score,
          comment: collectInfo.comment,
          tags: collectInfo.tags,
        },
        logTarget
      );
    } catch (error) {
      insertLogInfo(logTarget, `导入条目错误: ${getErrorMessage(error)}`);
      console.error('导入错误: ', error);
    }
  }
}

function createImportControl() {
  const node = htmlToElement(`<li class="e-userjs-collection-tool-action" title="支持和导出表头相同的 csv 和 xlsx 文件">
  <a href="javascript:void(0);"><span><label for="${IMPORT_INPUT_ID}">导入收藏</label></span></a>
  <input type="file" id="${IMPORT_INPUT_ID}" style="display:none" accept=".xlsx,.xls,.csv" />
</li>`) as HTMLElement;
  const input = node.querySelector(`#${IMPORT_INPUT_ID}`) as HTMLInputElement;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const logTarget = getImportLogTarget(node);
    clearLogInfo(logTarget);
    try {
      await withBusyState(node, '导入中...', async () => {
        await importCollectionFile(file, logTarget);
        setMenuText(node, '导入完成');
        setActionState(node, 'success');
      });
    } catch (error) {
      setMenuText(node, '导入失败');
      setActionState(node, 'error');
      insertLogInfo(logTarget, `导入文件错误: ${getErrorMessage(error)}`);
      console.error('导入文件错误: ', error);
    } finally {
      input.value = '';
    }
  });
  return node;
}

function createAllExportControl(filename: string) {
  return createMenuItem({
    label: '导出所有收藏',
    onClick: (item) => exportAllCollections(item, filename),
  });
}

function createExportControl(filename: string, interestType?: InterestType) {
  return createMenuItem({
    label: '导出收藏',
    onClick: (item) => exportCurrentCollection(item, filename, interestType),
  });
}

function getPageTitleFilename(ext = COLLECTION_SHEET_EXTENSION) {
  const header = $q('#header');
  const title = header?.querySelector('h1')?.textContent?.trim() || '导出收藏';
  return `${title}.${ext}`;
}

function getUserListFilename(ext = COLLECTION_SHEET_EXTENSION) {
  const type = $q('#headerProfile .navSubTabs .focus')?.textContent || '';
  const username =
    $q('.nameSingle .inner>a')?.textContent?.trim() || '导出收藏';
  return {
    all: `${username}-${formatDate(new Date())}.${ext}`,
    current: `${username}-${type}-${formatDate(new Date())}.${ext}`,
  };
}

function addListPageControls() {
  injectActionStyles();
  const nav = $q('#headerProfile .navSubTabs');
  if (!nav) {
    return;
  }
  const filename = getUserListFilename();
  nav.appendChild(createAllExportControl(filename.all));
  const interestType = getInterestTypeByUrl(location.href);
  if (interestType) {
    nav.appendChild(createExportControl(filename.current, interestType));
  }
  nav.appendChild(createImportControl());
}

function addIndexPageControls() {
  injectActionStyles();
  const header = $q('#header');
  if (!header) {
    return;
  }
  header.appendChild(createExportControl(getPageTitleFilename()));
}

if (location.href.match(/index\/\d+/)) {
  addIndexPageControls();
}

if (location.href.match(/\w+\/list\//)) {
  addListPageControls();
}
