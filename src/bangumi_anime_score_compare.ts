import { SearchResult, Subject } from './interface/subject';
import { IFuncPromise } from './interface/types';
import { Selector, SubjectTypeId } from './interface/wiki';
import { checkSubjectExist } from './sites/bangumi';
import { getSubjectId } from './sites/bangumi/common';
import { checkAnimeSubjectExist as checkAnimeSubjectExistDouban } from './sites/douban';
import { findElement } from './utils/domUtils';

const sites = ['douban', 'bangumi', 'myanimelist'] as const;
type ScoreSites = typeof sites[number];

type ISelectors = Selector | Selector[];
type ScoreInfo = SearchResult &
  {
    [Properties in ScoreSites as `${Properties}PageId`]?: number;
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
const bgm = {
  getSubjectId: getSubjectId,
};
const hostObj = {
  'bgm.tv': bgm,
  'bangumi.tv': bgm,
  'www.douban.com': bgm,
  'myanimelist.net': bgm,
};

function clearInfoStorage() {
  const keys = GM_listValues();
  for (const key of keys) {
    if (key.match(USERJS_PREFIX)) {
      GM_deleteValue(key);
    }
  }
}
function genScoreKey(site: ScoreSites, id: string) {
  return USERJS_PREFIX + site.toUpperCase() + '_' + id;
}
function readScoreInfo(site: ScoreSites, id: string): ScoreInfo | undefined {
  if (!id) return;
  let scoreInfo = GM_getValue(genScoreKey(site, id));
  if (scoreInfo) {
    scoreInfo = JSON.parse(scoreInfo);
    if (+new Date() - +new Date(scoreInfo.date) < UPDATE_INTERVAL) {
      return scoreInfo.info;
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

function saveScoreInfo(site: ScoreSites, info: ScoreInfo) {
  // @TODO id
  GM_setValue(genScoreKey(site, 'sss'), {
    info,
    date: +new Date(),
  });
}

class AnimeScorePage {
  name: ScoreSites;
  controlSelector: ISelectors;
  pageSelector: ISelectors;
  getSubjectInfo: () => SearchResult;
  // 插入评分信息的 DOM
  insertScoreInfo: (info: ScoreInfo) => void;
  getSubjectId: (url: string) => string;
  constructor(
    name: ScoreSites,
    controlSelector: ISelectors,
    pageSelector: ISelectors
  ) {
    this.name = name;
    this.controlSelector = controlSelector;
    this.pageSelector = pageSelector;
  }
  init() {
    const $page = findElement(this.pageSelector);
    if (!$page) return;
    const $title = findElement(this.controlSelector);
    if (!$title) return;
    const currentScoreInfo = readScoreInfo(
      this.name,
      this.getSubjectId(location.href)
    );
    if (currentScoreInfo) {
      sites.forEach((s) => {
        if (s !== this.name) {
          // @ts-ignore
          let info = readScoreInfo(s, currentScoreInfo[`${s}PageId`]);
          // 没有评分缓存
          if (!info) {
          }
          info && this.insertScoreInfo(info);
        }
      });
    }
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
  async fetchScoreInfo(name: ScoreSites) {
    const subjectInfo = this.getSubjectInfo();
    switch (name) {
      case 'bangumi':
        return await checkSubjectExist(
          subjectInfo,
          'https://bgm.tv',
          SubjectTypeId.anime
        );
      case 'myanimelist':
        break;
      case 'douban':
        return await checkAnimeSubjectExistDouban(
          this.getSubjectInfo() as Subject
        );
    }
  }
}
