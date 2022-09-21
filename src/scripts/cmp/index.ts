import { SearchResult } from '../../interface/subject';
import { findElement } from '../../utils/domUtils';
import { anidbPage } from './anidb';
import { bangumiAnimePage } from './bangumi';
import { doubanAnimePage } from './douban';
import { myanimelistPage } from './myanimelist';
import {
  clearInfoStorage,
  getInfo,
  getScoreMap,
  saveInfo,
  setScoreMap,
} from './storage';
import { PageConfig, ScoreMap } from './types';

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

if (GM_registerMenuCommand) {
  GM_registerMenuCommand(
    '清除缓存信息',
    () => {
      clearInfoStorage();
      alert('已清除缓存');
    },
    'c'
  );
  GM_registerMenuCommand(
    '强制刷新动画评分信息',
    () => {
      const pages = animePages;
      const idx = getPageIdxByHost(pages, location.host);
      if (idx === -1) {
        return;
      }
      const curPage = pages[idx];
      refreshScore(curPage, pages, true);
    },
    'r'
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
    const name = page.name;
    if (page.name === curPage.name) {
      continue;
    }
    let searchResult: SearchResult = getInfo(map[name]);
    if (!searchResult) {
      searchResult = await page.getSearchResult(curInfo);
      tasks.push({
        page,
        info: searchResult,
      });
    }
    if (searchResult) {
      map[name] = page.getSubjectId(searchResult.url);
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
    if (info) {
      saveInfo(page.getSubjectId(info.url), info, page.expiration);
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
  const $title = findElement(curPage.controlSelector);
  if (!$title) return;
  curPage?.insertControlDOM?.($title, {
    clear: clearInfoStorage,
    refresh: () => refreshScore(curPage, pages, true),
  });
  refreshScore(curPage, pages, false);
}
initPage(animePages);
