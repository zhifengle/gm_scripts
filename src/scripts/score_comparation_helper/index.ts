import { SearchSubject } from '../../interface/subject';
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
import { addSiteOption } from '../../utils/fetchData';

// 也许使用索引更快?
type SaveTask = {
  page: PageConfig;
  info: SearchSubject;
};

const animePages: PageConfig[] = [
  bangumiAnimePage,
  doubanAnimePage,
  myanimelistPage,
  anidbPage,
];

const gamePages: PageConfig[] = [
  // bangumiGamePage,
  // twodfanPage,
  vndbPage,
  erogamescapePage,
  // moepediaPage,
];
const BGM_UA = 'e_user_bgm_ua';
var g_hide_game_score_flag = GM_getValue('e_user_hide_game_score') || '';
if (GM_registerMenuCommand) {
  GM_registerMenuCommand(
    'clear cache',
    () => {
      clearInfoStorage();
      alert('cache cleared');
    },
    'c'
  );
  GM_registerMenuCommand(
    'refresh score',
    () => {
      document.querySelector('.e-userjs-score-compare')?.remove()
      initPage(animePages, true);
      !g_hide_game_score_flag && initPage(gamePages, true);
    },
    'c'
  );
  GM_registerMenuCommand('设置Bangumi UA', () => {
    var p = prompt('设置 Bangumi UA', '');
    GM_setValue(BGM_UA, p);
  });
  GM_registerMenuCommand('显示游戏评分开关', () => {
    g_hide_game_score_flag = prompt(
      '设置不为空时隐藏游戏评分',
      g_hide_game_score_flag
    );
    GM_setValue('e_user_hide_game_score', g_hide_game_score_flag);
  });
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
  curInfo: SearchSubject,
  map: ScoreMap,
  tasks: SaveTask[]
) {
  for (const page of pages) {
    if (page.name === curPage.name || page.type === 'info') {
      continue;
    }
    let searchResult: SearchSubject = getInfo(map[page.name]);
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

function isValidPage(curPage: PageConfig): boolean {
  const $page = findElement(curPage.pageSelector);
  if (!$page) return false;
  const $info = findElement(curPage.infoSelector);
  if (!$info) return false;
  return true;
}

function insertControlDOM(curPage: PageConfig, pages: PageConfig[]) {
  if (curPage.controlSelector) {
    const $ctrl = findElement(curPage.controlSelector);
    curPage?.insertControlDOM?.($ctrl, {
      clear: clearInfoStorage,
      refresh: () => refreshScore(curPage, pages, true),
    });
  }
}

function initSiteConfig() {
  const ua = GM_getValue(BGM_UA);
  if (ua) {
    addSiteOption('bgm.tv', {
      headers: {
        'user-agent': ua,
      },
    });
    addSiteOption('bangumi.tv', {
      headers: {
        'user-agent': ua,
      },
    });
    addSiteOption('chii.in', {
      headers: {
        'user-agent': ua,
      },
    });
  }
}

async function initPage(pages: PageConfig[], force = false) {
  const idx = getPageIdxByHost(pages, location.host);
  if (idx === -1) return;
  const curPage = pages[idx];
  if (!isValidPage(curPage)) return;
  insertControlDOM(curPage, pages);
  initSiteConfig();
  refreshScore(curPage, pages, force);
}

// user config for revising title
window.VNDB_REVISE_TITLE_DICT = {
  // your config
}
window.EGS_REVISE_TITLE_DICT = {
  // your config
}

initPage(animePages);
!g_hide_game_score_flag && initPage(gamePages);
