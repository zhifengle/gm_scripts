import { IFuncPromise } from './interface/types';
import { Selector } from './interface/wiki';
import { findElement } from './utils/domUtils';

const sites = ['douban', 'bangumi', 'mal'] as const;
type ScoreSites = typeof sites[number];

type ISelectors = Selector | Selector[];
type ScoreInfo = {
  name: ScoreSites;
  url: string;
  score: number | string;
  count: number | string;
} & {
  [Properties in ScoreSites as `${Properties}Id`]?: number;
};

if (GM_registerMenuCommand) {
  // 用户脚本命令增加清除评分信息缓存
  GM_registerMenuCommand(
    '\u6e05\u9664\u8bc4\u5206\u7f13\u5b58',
    clearInfoStorage,
    'c'
  );
}

const USERJS_PREFIX = 'E_USERJS_ANIME_SCORE_';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const CLEAR_INTERVAL = UPDATE_INTERVAL * 7;
const E_ENABLE_AUTO_SHOW_SCORE_INFO = true;
const TIMEOUT = 10 * 1000;

function clearInfoStorage() {
  const keys = GM_listValues();
  for (const key of keys) {
    if (key.match(USERJS_PREFIX)) {
      GM_deleteValue(key);
    }
  }
}
function readScoreInfo(site: ScoreSites, id: string) {
  let scoreInfo = GM_getValue(USERJS_PREFIX + site.toUpperCase() + '_' + id);
  if (scoreInfo) {
    scoreInfo = JSON.parse(scoreInfo);
    if (+new Date() - +new Date(scoreInfo.date) < UPDATE_INTERVAL) {
      return scoreInfo;
    }
  }
}
function checkInfoUpdate() {
  let time = GM_getValue(USERJS_PREFIX + 'LATEST_UPDATE_TIME');
  let now = new Date();
  if (!time) {
    GM_setValue(USERJS_PREFIX + 'LATEST_UPDATE_TIME', now.getTime());
    return;
  } else if (+now - +new Date(time) > CLEAR_INTERVAL) {
    clearInfoStorage();
  }
}

function saveScoreInfo(info: ScoreInfo) {
  GM_setValue(info.name, {
    info,
    date: +new Date(),
  });
}

class AnimeScorePage {
  name: ScoreSites;
  controlSelector: ISelectors;
  pageSelector: ISelectors;
  constructor(
    name: ScoreSites,
    ctrlSelector: ISelectors,
    pageSelector: ISelectors
  ) {
    this.name = name;
    this.controlSelector = ctrlSelector;
    this.pageSelector = pageSelector;
  }
  init() {
    const $page = findElement(this.pageSelector);
    if (!$page) return;
    const $title = findElement(this.controlSelector);
    if (!$title) return;
  }
  initControlDOM($t: Element, cb: IFuncPromise) {
    if (!$t) return;
    const $div = document.createElement('div');
    const $s = document.createElement('span');
    $s.classList.add('e-wiki-new-subject');
    $s.innerHTML = '刷新评分信息';
    const $clear = $s.cloneNode() as Element;
    $clear.innerHTML = '清除评分缓存';
    $div.appendChild($s);
    $div.appendChild($clear);
    $t.insertAdjacentElement('afterend', $div);
    $s.addEventListener('click', async (e) => {
      await cb(e);
    });
    $clear.addEventListener('click', async (e) => {
      await cb(e, true);
    });
  }
  getSubjectInfo() {}
  insertScoreInfo() {}
}
