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
type ScoreRowTask = SaveTask & {
  shouldSave: boolean;
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
const HIDE_GAME_SCORE_KEY = 'e_user_hide_game_score';
const GAME_PAGES_CONF_KEY = 'e_user_game_pages_conf';
const SEARCH_TIMEOUT = 10000;

type GamePagesConf = Record<string, { hide?: boolean }>;
const siteSearchQueues: Record<string, Promise<void>> = {};

function isGameScoreHidden(): boolean {
  return Boolean(GM_getValue(HIDE_GAME_SCORE_KEY));
}

function setGameScoreHidden(hidden: boolean) {
  GM_setValue(HIDE_GAME_SCORE_KEY, hidden ? '1' : '');
}

function getGamePagesConf(): GamePagesConf {
  return GM_getValue(GAME_PAGES_CONF_KEY) || {};
}

function setGamePagesConf(conf: GamePagesConf) {
  GM_setValue(GAME_PAGES_CONF_KEY, conf);
}

function getRuntimeGamePages(): PageConfig[] {
  const gamePagesConf = getGamePagesConf();
  return gamePages.map((p) => {
    const conf = gamePagesConf[p.name] || {};
    if (conf.hide) {
      return {
        ...p,
        type: 'info',
      };
    }
    return p;
  });
}

function getRuntimePages(pages: PageConfig[]): PageConfig[] {
  const isGamePages = pages.some((page) =>
    gamePages.some((gamePage) => gamePage.name === page.name)
  );
  return isGamePages ? getRuntimeGamePages() : pages;
}

function getUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch (error) {
    return '';
  }
}

function getPageSearchHost(page: PageConfig): string {
  if (page.searchApi) {
    const host = getUrlHost(page.searchApi);
    if (host) return host;
  }
  const hrefList = Array.isArray(page.href) ? page.href : [page.href];
  for (const href of hrefList) {
    const host = getUrlHost(href);
    if (host) return host;
  }
  return page.name;
}

function withTimeout<T>(promise: Promise<T>, timeout: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeout);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function runInSiteSearchQueue<T>(
  page: PageConfig,
  task: () => Promise<T>
): Promise<T> {
  const host = getPageSearchHost(page);
  const previous = siteSearchQueues[host] || Promise.resolve();
  let releaseQueue: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  const queued = previous.catch((): void => undefined).then(() => current);
  siteSearchQueues[host] = queued;

  await previous.catch((): void => undefined);
  try {
    return await task();
  } finally {
    releaseQueue();
    if (siteSearchQueues[host] === queued) {
      delete siteSearchQueues[host];
    }
  }
}

function getNoMatchInfo(curInfo: SearchSubject): SearchSubject {
  return {
    name: curInfo.name,
    url: '',
  };
}

async function getPageSearchResult(
  page: PageConfig,
  curInfo: SearchSubject
): Promise<SearchSubject | undefined> {
  try {
    return await withTimeout(
      runInSiteSearchQueue(page, () => page.getSearchResult(curInfo)),
      SEARCH_TIMEOUT,
      `${page.name} search timeout`
    );
  } catch (error) {
    console.error(error);
  }
}

function logRefreshError(error: unknown) {
  console.error('[score_comparation_helper] refresh failed', error);
}

function refreshVisibleScores() {
  document
    .querySelectorAll('.e-userjs-score-compare')
    .forEach((el) => el.remove());
  initPage(animePages, true);
  if (!isGameScoreHidden()) {
    initPage(getRuntimeGamePages(), true);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    const dict: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return dict[char];
  });
}

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand('评分设置', () => showConfigDialog());
}

function showConfigDialog() {
  const gamePagesFormStr = gamePages.map((page) => {
    return `<label class="e-user-config-row" for="e-user-game-pages-${page.name}">
      <span class="e-user-config-row-text">
        <span class="e-user-config-row-title">${page.name}</span>
        <span class="e-user-config-row-desc">开启后自动请求该站点评分；关闭后跳过后台搜索</span>
      </span>
      <input class="e-user-config-switch e-user-game-page-switch" type="checkbox" id="e-user-game-pages-${page.name}">
    </label>`;
  }).join('\n');
  const bgmUA = GM_getValue(BGM_UA) || '';
  const $dialog = htmlToElement(`
<dialog class="e-user-config-dialog" aria-labelledby="e-user-config-title">
  <style>
    .e-user-config-dialog {
      width: min(420px, calc(100vw - 32px));
      padding: 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #09090b;
      background: #ffffff;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .e-user-config-dialog::backdrop {
      background: rgba(15, 23, 42, 0.42);
    }
    .e-user-config-content {
      padding: 20px;
    }
    .e-user-config-header {
      margin-bottom: 18px;
    }
    .e-user-config-title {
      margin: 0;
      color: #09090b;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
    }
    .e-user-config-desc {
      margin: 6px 0 0;
      color: #71717a;
      font-size: 13px;
      line-height: 1.5;
    }
    .e-user-config-section {
      padding: 14px 0;
      border-top: 1px solid #e5e7eb;
    }
    .e-user-config-section.is-disabled {
      opacity: 0.56;
    }
    .e-user-config-section-title {
      margin: 0 0 10px;
      color: #27272a;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
    }
    .e-user-config-section-desc,
    .e-user-config-note,
    .e-user-config-status {
      margin: 0;
      color: #71717a;
      font-size: 12px;
      line-height: 1.45;
    }
    .e-user-config-section-desc {
      margin-bottom: 10px;
    }
    .e-user-config-note {
      margin-bottom: 10px;
      color: #a16207;
    }
    .e-user-config-status {
      min-height: 18px;
      padding-top: 10px;
    }
    .e-user-config-list {
      display: grid;
      gap: 8px;
    }
    .e-user-config-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 44px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .e-user-config-row:hover {
      background: #f8fafc;
      border-color: #d4d4d8;
    }
    .e-user-config-search-section.is-disabled .e-user-config-row {
      cursor: not-allowed;
    }
    .e-user-config-row-text {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .e-user-config-row-title {
      color: #09090b;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.35;
      word-break: break-word;
    }
    .e-user-config-row-desc {
      color: #71717a;
      font-size: 12px;
      line-height: 1.35;
    }
    .e-user-config-switch {
      appearance: none;
      position: relative;
      flex: 0 0 auto;
      width: 38px;
      height: 22px;
      margin: 0;
      border: 1px solid transparent;
      border-radius: 999px;
      background: #e4e4e7;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .e-user-config-switch:disabled {
      cursor: not-allowed;
    }
    .e-user-config-switch::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
      transition: transform 0.15s ease;
    }
    .e-user-config-switch:checked {
      background: #18181b;
    }
    .e-user-config-switch:checked::after {
      transform: translateX(16px);
    }
    .e-user-config-switch:focus-visible,
    .e-user-config-input:focus-visible,
    .e-user-config-button:focus-visible {
      outline: 2px solid #18181b;
      outline-offset: 2px;
    }
    .e-user-config-field {
      display: grid;
      gap: 8px;
    }
    .e-user-config-input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      height: 36px;
      padding: 0 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #09090b;
      background: #ffffff;
      font-size: 13px;
    }
    .e-user-config-input::placeholder {
      color: #a1a1aa;
    }
    .e-user-config-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .e-user-config-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    .e-user-config-button {
      height: 36px;
      padding: 0 14px;
      border: 1px solid #18181b;
      border-radius: 8px;
      color: #ffffff;
      background: #18181b;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .e-user-config-button.secondary {
      border-color: #e5e7eb;
      color: #18181b;
      background: #ffffff;
    }
    .e-user-config-button.danger {
      border-color: #fecaca;
      color: #991b1b;
      background: #ffffff;
    }
    .e-user-config-button:hover {
      background: #27272a;
    }
    .e-user-config-button.secondary:hover {
      background: #f8fafc;
    }
    .e-user-config-button.danger:hover {
      background: #fef2f2;
    }
  </style>
  <div class="game-option-container e-user-config-content">
    <div class="e-user-config-header">
      <p id="e-user-config-title" class="e-user-config-title">游戏评分设置</p>
      <p class="e-user-config-desc">集中管理显示状态、自动搜索、Bangumi 请求和当前页面操作。</p>
    </div>
    <div class="e-user-config-section">
      <label class="e-user-config-row" for="e-user-show-game-score">
        <span class="e-user-config-row-text">
          <span class="e-user-config-row-title">显示游戏评分</span>
          <span class="e-user-config-row-desc">关闭后，不会在当前页面插入游戏评分区域</span>
        </span>
        <input class="e-user-config-switch" type="checkbox" id="e-user-show-game-score">
      </label>
    </div>
    <div class="e-user-config-section e-user-config-search-section">
      <p class="e-user-config-section-title">自动搜索站点</p>
      <p class="e-user-config-section-desc">开启的站点会在后台搜索评分；关闭后跳过自动请求，配置会保留。</p>
      <p class="e-user-config-note" hidden>游戏评分已隐藏，站点搜索设置暂不生效。</p>
      <div class="e-user-config-list">
        ${gamePagesFormStr}
      </div>
    </div>
    <div class="e-user-config-section">
      <p class="e-user-config-section-title">Bangumi UA</p>
      <p class="e-user-config-section-desc">用于访问 bgm.tv / bangumi.tv / chii.in。留空则使用默认请求。</p>
      <div class="e-user-config-field">
        <input class="e-user-config-input" id="e-user-bgm-ua" type="text" value="${escapeHtml(bgmUA)}" placeholder="默认请求">
        <button class="e-user-config-button secondary e-user-save-ua" type="button">保存 UA</button>
      </div>
    </div>
    <div class="e-user-config-section">
      <p class="e-user-config-section-title">当前页面操作</p>
      <div class="e-user-config-actions">
        <button class="e-user-config-button secondary e-user-refresh-score" type="button">刷新评分</button>
        <button class="e-user-config-button danger e-user-clear-cache" type="button">清除缓存</button>
      </div>
      <p class="e-user-config-status" aria-live="polite"></p>
    </div>
    <div class="e-user-config-footer">
      <button class="e-user-config-button e-user-config-close" type="button" autofocus>完成</button>
    </div>
  </div>
</dialog>
`) as HTMLDialogElement;
  let gamePagesConf = getGamePagesConf();
  const $showGameScore = $dialog.querySelector('#e-user-show-game-score') as HTMLInputElement;
  const $searchSection = $dialog.querySelector('.e-user-config-search-section') as HTMLElement;
  const $searchNote = $dialog.querySelector('.e-user-config-note') as HTMLElement;
  const $status = $dialog.querySelector('.e-user-config-status') as HTMLElement;
  const $clearCache = $dialog.querySelector('.e-user-clear-cache') as HTMLButtonElement;

  const setStatus = (text: string) => {
    $status.textContent = text;
  };
  const updateSearchSectionState = () => {
    const enabled = $showGameScore.checked;
    $searchSection.classList.toggle('is-disabled', !enabled);
    $searchNote.hidden = enabled;
    $dialog
      .querySelectorAll<HTMLInputElement>('.e-user-game-page-switch')
      .forEach(($input) => {
        $input.disabled = !enabled;
      });
  };

  $showGameScore.checked = !isGameScoreHidden();
  gamePages.forEach((page) => {
    const conf = gamePagesConf[page.name] || {};
    ($dialog.querySelector(`#e-user-game-pages-${page.name}`) as HTMLInputElement).checked = conf.hide ? false : true;
  })
  $dialog.querySelector('.game-option-container').addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.id === 'e-user-show-game-score') {
      setGameScoreHidden(!target.checked);
      updateSearchSectionState();
      setStatus(target.checked ? '游戏评分已设为显示。' : '游戏评分已隐藏，站点搜索设置暂不生效。');
    } else if (target.id?.startsWith('e-user-game-pages-')) {
      const name = target.id.replace('e-user-game-pages-', '');
      const conf = gamePagesConf[name] || {};
      conf.hide = !target.checked;
      gamePagesConf = {
        ...gamePagesConf,
        [name]: conf,
      };
      setGamePagesConf(gamePagesConf);
      setStatus(`${name} 自动搜索已${target.checked ? '开启' : '关闭'}。`);
    }
  })
  $dialog.querySelector('.e-user-save-ua').addEventListener('click', () => {
    const $ua = $dialog.querySelector('#e-user-bgm-ua') as HTMLInputElement;
    GM_setValue(BGM_UA, $ua.value.trim());
    setStatus('Bangumi UA 已保存，下次请求生效。');
  });
  $dialog.querySelector('.e-user-refresh-score').addEventListener('click', () => {
    refreshVisibleScores();
    setStatus(isGameScoreHidden() ? '已刷新动画评分；游戏评分当前隐藏。' : '评分刷新已开始。');
  });
  let clearCacheConfirmTimer: ReturnType<typeof setTimeout>;
  $clearCache.addEventListener('click', () => {
    if ($clearCache.dataset.confirm === 'true') {
      clearTimeout(clearCacheConfirmTimer);
      delete $clearCache.dataset.confirm;
      $clearCache.textContent = '清除缓存';
      clearInfoStorage();
      setStatus('缓存已清除。');
      return;
    }
    $clearCache.dataset.confirm = 'true';
    $clearCache.textContent = '再次点击确认';
    setStatus('再次点击“清除缓存”确认操作。');
    clearCacheConfirmTimer = setTimeout(() => {
      delete $clearCache.dataset.confirm;
      $clearCache.textContent = '清除缓存';
    }, 3000);
  });
  updateSearchSectionState();
  document.body.appendChild($dialog);
  $dialog.showModal();
  $dialog.querySelector('.e-user-config-close').addEventListener('click', () => {
    clearTimeout(clearCacheConfirmTimer);
    $dialog.close();
    $dialog.remove();
  })
}

function getPageIdxByHost(pages: PageConfig[], host: string) {
  const idx = pages.findIndex((obj) => {
    if (Array.isArray(obj.href)) {
      return obj.href.some((href) => getUrlHost(href) === host);
    } else {
      return getUrlHost(obj.href) === host;
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
  const targetPages = pages.filter((page) => page.name !== curPage.name && page.type !== 'info');
  const rowTasks = await Promise.all(
    targetPages.map(async (page): Promise<ScoreRowTask> => {
      const cachedInfo = getInfo(map[page.name]) as SearchSubject | undefined;
      if (cachedInfo) {
        return {
          page,
          info: cachedInfo,
          shouldSave: false,
        };
      }

      const searchResult = await getPageSearchResult(page, curInfo);
      return {
        page,
        info: searchResult || getNoMatchInfo(curInfo),
        shouldSave: true,
      };
    })
  );

  for (const rowTask of rowTasks) {
    const { page, info, shouldSave } = rowTask;
    if (shouldSave) {
      tasks.push({ page, info });
    }
    try {
      curPage.insertScoreInfo(page, info);
    } catch (error) {
      console.error(error);
    }
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
      refresh: () => refreshScore(curPage, getRuntimePages(pages), true).catch(logRefreshError),
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
  refreshScore(curPage, pages, force).catch(logRefreshError);
}

// user config for revising title
window.VNDB_REVISE_TITLE_DICT = window.VNDB_REVISE_TITLE_DICT ?? {
  // your config
}
window.EGS_REVISE_TITLE_DICT = window.EGS_REVISE_TITLE_DICT ?? {
  // your config
}
window.VNDB_REVISE_QUERY_DICT = window.VNDB_REVISE_QUERY_DICT ?? {
  // for example: skip search with 'does not exist query'
  // 'does not exist query': 'SCH_SKIP_SEARCH',
}
window.EGS_REVISE_QUERY_DICT = window.EGS_REVISE_QUERY_DICT ?? {
}

initPage(animePages);
if (!isGameScoreHidden()) {
  initPage(getRuntimeGamePages());
}
