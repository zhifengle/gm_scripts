import { AllSubject, SearchResult, Subject } from './interface/subject';
import {
  InterestType,
  InterestTypeId,
  SiteUtils,
  SubjectItem,
} from './interface/types';
import { siteUtils as bangumiUtils } from './sites/bangumi';
import { sendSearchResults, siteUtils as doubanUtils } from './sites/douban';
import { insertLogInfo } from './sites/bangumi/common';
import { randomSleep } from './utils/async/sleep';
import { downloadFile } from './utils/domUtils';
import { formatDate } from './utils/utils';
import { insertControl } from './ui/migrateTool';

type SubjectItemWithSync = SubjectItem & {
  syncStatus: string;
  syncSubject?: SearchResult;
};
type InterestInfos = { [key in InterestType]: SubjectItemWithSync[] };

let bangumiData: any = null;

const typeIdDict: {
  [key in InterestType]: { name: string; id: InterestTypeId };
} = {
  dropped: {
    name: '抛弃',
    id: '5',
  },
  on_hold: {
    name: '搁置',
    id: '4',
  },
  do: {
    name: '在看',
    id: '3',
  },
  collect: {
    name: '看过',
    id: '2',
  },
  wish: {
    name: '想看',
    id: '1',
  },
};

function getBangumiSubjectId(name = '', greyName = '') {
  if (!bangumiData) return;
  const obj = bangumiData.items.find((item: any) => {
    let cnNames = [];
    if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
      cnNames = item.titleTranslate['zh-Hans'];
    }
    return (
      item.title === name ||
      item.title === greyName ||
      cnNames.includes(greyName)
    );
  });
  return obj?.sites?.find((item: any) => item.site === 'bangumi').id;
}
function genCSVContent(infos: InterestInfos) {
  const header =
    '\ufeff名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息,类别,同步情况,搜索结果信息';
  let csvContent = '';
  const keys = Object.keys(infos) as InterestType[];
  keys.forEach((key) => {
    infos[key].forEach((item) => {
      csvContent += `\r\n${item.name || ''},${item.greyName || ''},${
        item.releaseDate || ''
      }`;
      const subjectUrl = item.url;
      csvContent += `,${subjectUrl}`;
      const cover = item.cover || '';
      csvContent += `,${cover}`;
      const collectInfo: any = item.collectInfo || {};
      const collectDate = collectInfo.date || '';
      csvContent += `,${collectDate}`;
      const score = collectInfo.score || '';
      csvContent += `,${score}`;
      const tag = collectInfo.tags || '';
      csvContent += `,${tag}`;
      const comment = collectInfo.comment || '';
      csvContent += `,"${comment}"`;
      const rawInfos = item.rawInfos || '';
      csvContent += `,"${rawInfos}"`;
      csvContent += `,"${typeIdDict[key].name}"`;
      csvContent += `,${item.syncStatus || ''}`;
      // 新增搜索结果信息
      let searchResultStr = '';
      if (item.syncSubject) {
        const obj = item.syncSubject;
        searchResultStr = `${obj.name};${obj.greyName || ''};${obj.url || ''};${
          obj.rawName || ''
        }`;
      }
      // 同步信息
      csvContent += `,"${searchResultStr}"`;
    });
  });
  return header + csvContent;
}

// 区分是否为动画
function isJpMovie(item: SubjectItem) {
  return item.rawInfos.indexOf('日本') !== -1;
}
function clearLogInfo($container: HTMLElement) {
  $container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

function init(site: 'douban' | 'bangumi') {
  let targetUtils: SiteUtils;
  let originUtils: SiteUtils;
  if (site === 'bangumi') {
    targetUtils = doubanUtils;
    originUtils = bangumiUtils;
  } else {
    targetUtils = bangumiUtils;
    originUtils = doubanUtils;
  }
  const $container = insertControl(
    originUtils.contanerSelector,
    targetUtils.name
  );
  const $input = $container.querySelector('input');
  const $importBtn = $container.querySelector('.import-btn');
  const $exportBtn = $container.querySelector(
    '.export-btn'
  ) as HTMLButtonElement;
  const $retryBtn = $container.querySelector('.retry-btn') as HTMLButtonElement;
  const interestInfos: InterestInfos = {
    do: [],
    collect: [],
    wish: [],
    dropped: [],
    on_hold: [],
  };
  $exportBtn.addEventListener('click', async (e) => {
    const $text = e.target as HTMLInputElement;
    $text.value = '导出中...';
    let name = 'Bangumi';
    if (site === 'bangumi') {
      name = '豆瓣';
    }
    let strName = `${name}动画的收藏`;
    const csv = genCSVContent(interestInfos);
    // $text.value = '导出完成';
    $text.style.display = 'none';
    downloadFile(csv, `${strName}-${formatDate(new Date())}.csv`);
  });
  $retryBtn.addEventListener('click', async (e) => {
    try {
      bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
    } catch (e) {
      console.log('parse JSON:', e);
    }
    const userId = getUserIdFromInput($input.value, targetUtils.getUserId);
    if (!userId) return;
    const arr = getInterestTypeArr();
    for (let type of arr) {
      const res = interestInfos[type];
      for (let i = 0; i < res.length; i++) {
        let item = res[i];
        if (!item.syncStatus) {
          item = await migrateCollection(originUtils, item, site, type);
        }
        res[i] = item;
      }
    }
    clearLogInfo($container);
    $exportBtn.style.display = 'inline-block';
    $retryBtn.style.display = 'inline-block';
  });
  $importBtn.addEventListener('click', async (e) => {
    try {
      bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
    } catch (e) {
      console.log('parse JSON:', e);
    }
    const userId = getUserIdFromInput($input.value, targetUtils.getUserId);
    if (!userId) return;
    const arr = getInterestTypeArr();
    for (let type of arr) {
      try {
        const res = (await targetUtils.getAllPageInfo(
          userId,
          'movie',
          type
        )) as SubjectItemWithSync[];
        for (let i = 0; i < res.length; i++) {
          let item = res[i];
          item = await migrateCollection(originUtils, item, site, type);
          res[i] = item;
        }
        interestInfos[type] = [...res];
      } catch (error) {
        console.error(error);
      }
    }
    clearLogInfo($container);
    $exportBtn.style.display = 'inline-block';
    $retryBtn.style.display = 'inline-block';
  });
}
function getUserIdFromInput(val: string, fn: (str: string) => string): string {
  if (!val) {
    alert(`请输入${name}主页地址`);
    return '';
  }
  const userId = fn(val);
  if (!userId) {
    alert(`无效${name}主页地址`);
    return '';
  }
  return userId;
}
function getInterestTypeArr() {
  const $container = document.querySelector(
    '.e-userjs-export-tool-container'
  ) as HTMLElement;
  const $select = $container.querySelector(
    '#movie-type-select'
  ) as HTMLSelectElement;
  // const arr: InterestType[] = ['wish'];
  let arr: InterestType[] = ['do', 'collect', 'wish'];
  if ($select && $select.value) {
    arr = [$select.value as any];
  }
  return arr;
}
async function migrateCollection(
  siteUtils: SiteUtils,
  item: SubjectItemWithSync,
  site: 'bangumi' | 'douban',
  type: InterestType
): Promise<SubjectItemWithSync> {
  const subjectItem: SubjectItemWithSync = { ...item };
  const $container = document.querySelector(
    '.e-userjs-export-tool-container'
  ) as HTMLElement;
  const $btn = $container.querySelector('.import-btn');
  // 在 Bangumi 上 非日语的条目跳过
  if (site === 'bangumi' && !isJpMovie(subjectItem)) {
    return subjectItem;
  }
  let subjectId = '';
  // 使用 bangumi data
  if (site === 'bangumi') {
    subjectId = getBangumiSubjectId(subjectItem.name, subjectItem.greyName);
  }
  if (!subjectId) {
    try {
      await randomSleep(1000, 400);
      const result = await siteUtils.checkSubjectExist({
        name: subjectItem.name,
        releaseDate: subjectItem.releaseDate,
      } as Subject);
      if (result && result.url) {
        subjectId = siteUtils.getSubjectId(result.url);
        subjectItem.syncSubject = result;
      }
    } catch (error) {
      console.error(error);
    }
  }
  if (subjectId) {
    clearLogInfo($container);
    const nameStr = `<span style="color:tomato">《${subjectItem.name}》</span>`;
    insertLogInfo($btn, `更新收藏 ${nameStr} 中...`);
    await siteUtils.updateInterest(subjectId, {
      interest: typeIdDict[type].id,
      ...subjectItem.collectInfo,
      rating: subjectItem.collectInfo.score || '',
    });
    subjectItem.syncStatus = '成功';
    await randomSleep(2000, 1000);
    insertLogInfo($btn, `更新收藏 ${nameStr} 成功`);
  }
  return subjectItem;
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
