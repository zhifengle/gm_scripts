import { SearchResult } from '../../interface/subject';
import { findElement } from '../../utils/domUtils';
import { anidbPage } from './pages/anidb';
import { bangumiAnimePage, bangumiGamePage } from './pages/bangumi';
import { doubanAnimePage } from './pages/douban';
import { myanimelistPage } from './pages/myanimelist';
import {
  clearInfoStorage,
  getInfo,
  getScoreMap,
  saveInfo,
  setScoreMap,
} from './storage';
import { twodfanPage } from './pages/twodfan';
import { PageConfig, ScoreMap } from './types';
import { vndbPage } from './pages/vndb';
import { erogamescapePage } from './pages/erogamescape';
import { moepediaPage } from './pages/moepedia';

// 也许使用索引更快?
type SaveTask = {
  page: PageConfig;
  info: SearchResult;
};

const animePages: PageConfig[] = [
  bangumiAnimePage,
  doubanAnimePage,
  myanimelistPage,
  anidbPage,
];

const gamePages: PageConfig[] = [
  bangumiGamePage,
  twodfanPage,
  vndbPage,
  erogamescapePage,
  moepediaPage,
];
if (GM_registerMenuCommand) {
  GM_registerMenuCommand(
    '清除缓存信息',
    () => {
      clearInfoStorage();
      alert('已清除缓存');
    },
    'c'
  );
}

function getPageIdxByHost(pages: PageConfig[], host: string) {
  const idx = pages.findIndex((obj) => {
    if (Array.isArray(obj.href)) {
      return obj.href.some((href) => href.includes(host));
    } else {
      return obj.href.includes(host);
    }
  });
  return idx;
}

async function insertScoreRows(
  curPage: PageConfig,
  pages: PageConfig[],
  curInfo: SearchResult,
  map: ScoreMap,
  tasks: SaveTask[]
) {
  for (const page of pages) {
    if (page.name === curPage.name || page.type === 'info') {
      continue;
    }
    let searchResult: SearchResult = getInfo(map[page.name]);
    if (!searchResult) {
      try {
        searchResult = await page.getSearchResult(curInfo);
      } catch (error) {
        console.error(error);
      }
      tasks.push({
        page,
        info: searchResult || { name: curInfo.name, url: '' },
      });
    }
    curPage.insertScoreInfo(page, searchResult);
  }
}

async function refreshScore(
  curPage: PageConfig,
  pages: PageConfig[],
  force: boolean = false
) {
  const saveTask: SaveTask[] = [];
  const curInfo = curPage.getScoreInfo();
  saveTask.push({
    page: curPage,
    info: curInfo,
  });
  const subjectId = curPage.getSubjectId(curInfo.url);
  let map = { [curPage.name]: subjectId };
  if (!force) {
    const scoreMap = getScoreMap(curPage.name, subjectId);
    map = { ...scoreMap, [curPage.name]: subjectId };
    document
      .querySelectorAll('.e-userjs-score-compare')
      .forEach((el) => el.remove());
  }
  await insertScoreRows(curPage, pages, curInfo, map, saveTask);

  saveTask.forEach((t) => {
    const { page, info } = t;
    if (info && info.url) {
      const key = page.getSubjectId(info.url);
      saveInfo(key, info, page.expiration);
      map[page.name] = key;
    } else {
      const key = `${page.name}_${info.name}`;
      saveInfo(key, { url: '', name: '' }, page.expiration);
      map[page.name] = key;
    }
  });
  setScoreMap(subjectId, map);
}

async function initPage(pages: PageConfig[]) {
  const idx = getPageIdxByHost(pages, location.host);
  if (idx === -1) {
    return;
  }
  const curPage = pages[idx];
  const $page = findElement(curPage.pageSelector);
  if (!$page) return;
  const $info = findElement(curPage.infoSelector);
  if (!$info) return;
  if (curPage.controlSelector) {
    const $ctrl = findElement(curPage.controlSelector);
    curPage?.insertControlDOM?.($ctrl, {
      clear: clearInfoStorage,
      refresh: () => refreshScore(curPage, pages, true),
    });
  }
  refreshScore(curPage, pages, false);
}
initPage(animePages);
initPage(gamePages);
