import { SearchSubject } from '../../interface/subject';
import { findElement, htmlToElement } from '../../utils/domUtils';
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
  bangumiGamePage,
  twodfanPage,
  vndbPage,
  erogamescapePage,
  moepediaPage,
];
const BGM_UA = 'e_user_bgm_ua';
var g_hide_game_score_flag = GM_getValue('e_user_hide_game_score') || '';
var g_game_pages_conf: {
  [key: string]: {
    hide: boolean;
  };
} = GM_getValue('e_user_game_pages_conf') || {};
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
  GM_registerMenuCommand('设置对话框', () => {
    // g_hide_game_score_flag = prompt(
    //   '设置不为空时隐藏游戏评分',
    //   g_hide_game_score_flag
    // );
    // GM_setValue('e_user_hide_game_score', g_hide_game_score_flag);
    showConfigDialog();
  });
}

function showConfigDialog() {
  const gamePagesFormStr = gamePages.map((page) => {
    return `<div>
      <input type="checkbox" id="e-user-game-pages-${page.name}">
      <label for="e-user-game-pages-${page.name}">${page.name}</label>
    </div>`;
  }).join('\n');
  const $dialog = htmlToElement(`
<dialog>
  <div class="game-option-container">
    <p style="color: #f09199;">游戏评分设置</p>
    <hr />
    <div>
      <input type="checkbox" id="e-user-hide-game-score">
      <label for="e-user-hide-game-score">隐藏游戏评分</label>
    </div>
    <hr />
    <p style="color: #00B41E;">是否后台搜索评分</p>
    ${gamePagesFormStr}
  </div>
  <div>
    <button autofocus>Close</button>
  </div>
</dialog>
`) as HTMLDialogElement;
  var g_hide_game_score_flag = GM_getValue('e_user_hide_game_score');
  g_game_pages_conf = GM_getValue('e_user_game_pages_conf') || {};
  if (g_hide_game_score_flag) {
    ($dialog.querySelector('#e-user-hide-game-score') as HTMLInputElement).checked = true;
  }
  gamePages.forEach((page) => {
    const conf: any = g_game_pages_conf[page.name] || {};
    ($dialog.querySelector(`#e-user-game-pages-${page.name}`) as HTMLInputElement).checked = conf.hide ? false : true;
  })
  $dialog.querySelector('.game-option-container').addEventListener('change', (e: any) => {
    if (e.target.id === 'e-user-hide-game-score') {
      g_hide_game_score_flag = e.target.checked ? '1' : undefined;
      GM_setValue('e_user_hide_game_score', g_hide_game_score_flag);
    } else if (e.target.id.startsWith('e-user-game-pages-')) {
      const name = e.target.id.replace('e-user-game-pages-', '');
      const conf: any = g_game_pages_conf[name] || {};
      conf.hide = !e.target.checked;
      g_game_pages_conf[name] = conf;
      GM_setValue('e_user_game_pages_conf', g_game_pages_conf);
    }
  })
  document.body.appendChild($dialog);
  $dialog.showModal();
  $dialog.querySelector('button').addEventListener('click', () => {
    $dialog.close();
    $dialog.remove();
  })
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
    let searchResult: any = getInfo(map[page.name]);
    if (!searchResult) {
      try {
        searchResult = await Promise.race([
          page.getSearchResult(curInfo),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${page.name} search timeout`)), 10000)
          ),
        ])
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
  }
  if (force) {
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
window.VNDB_REVISE_QUERY_DICT = {
  // for example: skip search with 'does not exist query'
  // 'does not exist query': 'SCH_SKIP_SEARCH',
}
window.EGS_REVISE_QUERY_DICT = {
}

initPage(animePages);
if (!g_hide_game_score_flag) {
  initPage(gamePages.map((p) => {
    const conf: any = g_game_pages_conf[p.name] || {};
    if (conf.hide) {
      return {
        ...p,
        type: 'info',
      };
    }
    return p;
  }));
}
