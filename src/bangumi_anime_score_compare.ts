import { SearchResult, Subject } from './interface/subject';
import { IFuncPromise } from './interface/types';
import { Selector, SubjectTypeId } from './interface/wiki';
import { checkSubjectExist } from './sites/bangumi';
import { checkAnimeSubjectExist as checkAnimeSubjectExistDouban } from './sites/douban';
import { searchAnimeData } from './sites/myanimelist';
import { findElement } from './utils/domUtils';
import { dealDate, roundNum } from './utils/utils';

const sites = ['douban', 'bangumi', 'myanimelist'] as const;
// const sites = ['douban', 'bangumi'] as const;
type ScoreSites = typeof sites[number];

type ScoreInfo = SearchResult & { site: ScoreSites };
type SubjectIdDict = {
  [key in ScoreSites]?: string;
};

interface ScorePage {
  name: ScoreSites;
  controlSelector: Selector[];
  pageSelector: Selector[];
  getSubjectInfo: () => SearchResult;
  // 插入评分信息的 DOM
  insertScoreInfo: (info: ScoreInfo) => void;
}

if (GM_registerMenuCommand) {
  // 用户脚本命令增加清除评分信息缓存
  GM_registerMenuCommand(
    '\u6e05\u9664\u8bc4\u5206\u7f13\u5b58',
    clearInfoStorage,
    'c'
  );
}

const USERJS_PREFIX = 'E_USERJS_ANIME_SCORE_';
const BANGUMI_LOADING = `${USERJS_PREFIX}BANGUMI_LOADING`;
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const CLEAR_INTERVAL = UPDATE_INTERVAL * 7;
const E_ENABLE_AUTO_SHOW_SCORE_INFO = true;
const TIMEOUT = 10 * 1000;

function getSubjectId(href: string): string {
  const m = href.match(/\/(subject|anime)\/(\d+)/);
  if (m) {
    return m[2];
  }
}

function saveValue(key: string, val: any) {
  GM_setValue(key, val);
}
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
function genSubjectIdDictKey(site: ScoreSites, id: string) {
  return USERJS_PREFIX + site.toUpperCase() + '_DICT_ID_' + id;
}
function readScoreInfo(site: ScoreSites, id: string): ScoreInfo | undefined {
  if (!id) return;
  let scoreInfo = GM_getValue(genScoreKey(site, id));
  if (scoreInfo) {
    // scoreInfo = JSON.parse(scoreInfo);
    if (+new Date() - +new Date(scoreInfo.date) < UPDATE_INTERVAL) {
      return scoreInfo.info;
    }
  }
}
function readSubjectIdDict(
  site: ScoreSites,
  id: string
): SubjectIdDict | undefined {
  if (!id) return;
  return GM_getValue(genSubjectIdDictKey(site, id));
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
  GM_setValue(genScoreKey(info.site, getSubjectId(info.url)), {
    info,
    date: +new Date(),
  });
}

function initControlDOM($target: Element) {
  if (!$target) return;
  const rawHTML = `<a title="强制刷新豆瓣和MAL评分" class="e-userjs-score-ctrl e-userjs-score-fresh">O</a>
      <a title="清除所有评分缓存" class="e-userjs-score-ctrl e-userjs-score-clear">X</a>
`;
  $target.innerHTML = $target.innerHTML + rawHTML;
  addStyle();
  document
    .querySelector('.e-userjs-score-clear')
    .addEventListener('click', clearInfoStorage, false);
  document.querySelector('.e-userjs-score-fresh').addEventListener(
    'click',
    () => {
      init(BangumiScorePage, true);
    },
    false
  );
}
async function fetchScoreInfo(name: ScoreSites, subjectInfo: SearchResult) {
  let info: ScoreInfo;
  let res: SearchResult;
  let bgmOrigin = 'https://bgm.tv';
  GM_setValue(BANGUMI_LOADING, true);
  switch (name) {
    case 'bangumi':
      res = await checkSubjectExist(
        subjectInfo,
        bgmOrigin,
        SubjectTypeId.anime
      );
      if (!res.url.includes('http')) {
        res.url = `${bgmOrigin}${res.url}`;
      }
      break;
    case 'myanimelist':
      res = await searchAnimeData(subjectInfo);
      break;
    case 'douban':
      res = await checkAnimeSubjectExistDouban(subjectInfo);
      break;
  }
  if (res) {
    info = {
      site: name,
      ...res,
    };
  }
  GM_setValue(BANGUMI_LOADING, false);
  return info;
}

const DoubanScorePage: ScorePage = {
  name: sites[0],
  controlSelector: [
    {
      selector: '#interest_sectl',
    },
  ],
  pageSelector: [
    {
      selector: 'body',
      subSelector: '.tags-body',
      keyWord: ['动画', '动漫'],
    },
  ],
  getSubjectInfo() {
    const $title = document.querySelector('#content h1>span');
    const rawName = $title.textContent.trim();
    const subjectInfo: SearchResult = {
      name: rawName.replace(/第.季/, ''),
      rawName,
      url: location.href,
    };
    const $date = document.querySelector(
      'span[property="v:initialReleaseDate"]'
    );
    if ($date) {
      subjectInfo.releaseDate = $date.textContent.replace(/\(.*\)/, '');
    }
    return subjectInfo;
  },
  insertScoreInfo(info: ScoreInfo) {
    let $panel = document.querySelector('#interest_sectl');
    let $friendsRatingWrap = document.querySelector('.friends_rating_wrap');
    if (!$friendsRatingWrap) {
      $friendsRatingWrap = document.createElement('div');
      $friendsRatingWrap.className = 'friends_rating_wrap clearbox';
      $panel.appendChild($friendsRatingWrap);
    }
    const score = roundNum(Number(info.score || 0), 1);
    const $div = document.createElement('div');
    const favicon = GM_getResourceURL(`${info.site}_favicon`);
    const rawHTML = `<strong class="rating_avg">${score}</strong>
                    <div class="friends">
                            <a class="avatar" title="${
                              info.site
                            }" href="javascript:;">
                            <img src="${favicon}"/>
                            </a>
                    </div>
                    <a href="${
                      info.url
                    }" class="friends_count" target="_blank">${
      info.count || 0
    }人评价</a>
`;
    $div.className = 'rating_content_wrap clearfix e-userjs-score-compare';
    $div.innerHTML = rawHTML;
    //toggleLoading(true);
    $friendsRatingWrap.appendChild($div);
  },
};

const BangumiScorePage: ScorePage = {
  name: sites[1],
  controlSelector: [
    {
      selector: '#panelInterestWrapper h2',
    },
  ],
  pageSelector: [
    {
      selector: '.focus.chl.anime',
    },
  ],
  getSubjectInfo: function () {
    let info: SearchResult = {
      name: document.querySelector('h1>a').textContent.trim(),
      url: location.href,
    };
    let infoList = document.querySelectorAll('#infobox>li');
    if (infoList && infoList.length) {
      for (let i = 0, len = infoList.length; i < len; i++) {
        let el = infoList[i];
        if (el.innerHTML.match(/放送开始|上映年度/)) {
          info.releaseDate = dealDate(el.textContent.split(':')[1].trim());
        }
        // if (el.innerHTML.match('播放结束')) {
        //   info.endDate = dealDate(el.textContent.split(':')[1].trim());
        // }
      }
    }
    return info;
  },
  insertScoreInfo(info: ScoreInfo) {
    let $panel = document.querySelector('.SidePanel.png_bg');
    if ($panel) {
      const score = roundNum(Number(info.score || 0), 2);
      let $div = document.createElement('div');
      $div.classList.add('frdScore');
      $div.classList.add('e-userjs-score-compare');
      const convertName = (site: ScoreSites) => {
        if (site === 'myanimelist') {
          return 'MAL';
        } else if (site === 'douban') {
          return '豆瓣';
        }
        return site;
      };
      $div.innerHTML = `${convertName(
        info.site
      )}评价：<span class="num">${score}</span> <span class="desc" style="visibility:hidden">还行</span> <a href="${
        info.url
      }" target="_blank" class="l">${info.count || 0} 人评分</a>
`;
      $panel.appendChild($div);
    }
  },
};

function addStyle(css?: string) {
  if (css) {
    GM_addStyle(css);
  } else {
    GM_addStyle(`
      .e-userjs-score-ctrl {color:#f09199;font-weight:800;float:right;}
      .e-userjs-score-ctrl:hover {cursor: pointer;}
      .e-userjs-score-clear {margin-right: 12px;}
      .e-userjs-score-loading { width: 208px; height: 13px; background-image: url("/img/loadingAnimation.gif"); }
      `);
  }
}
// Bangumi Loading
function toggleLoading(hidden?: boolean) {
  let $div = document.querySelector('.e-userjs-score-loading') as HTMLElement;
  if (!$div) {
    $div = document.createElement('div');
    $div.classList.add('e-userjs-score-loading');
    let $panel = document.querySelector('.SidePanel.png_bg');
    $panel.appendChild($div);
  }
  // const $infos: NodeListOf<HTMLElement> = document.querySelectorAll(
  //   '.frdScore.e-userjs-score-compare'
  // );
  // $infos?.forEach(($el) => {
  //   if (hidden) {
  //     $el.style.display = 'none';
  //   } else {
  //     $el.style.display = '';
  //   }
  // });
  if (hidden) {
    $div.style.display = 'none';
  } else {
    $div.style.display = '';
  }
}

async function init(page: ScorePage, force?: boolean) {
  const $page = findElement(page.pageSelector);
  if (!$page) return;
  const $title = findElement(page.controlSelector);
  if (!$title) return;
  const curPageId = getSubjectId(location.href);
  const curPageScoreInfo: ScoreInfo = {
    site: page.name,
    ...page.getSubjectInfo(),
  };
  saveScoreInfo(curPageScoreInfo);
  let subjectIdDict = readSubjectIdDict(page.name, curPageId);
  // 强制刷新，不使用缓存
  if (force) {
    subjectIdDict = undefined;
  }
  let dict: SubjectIdDict = { ...subjectIdDict };
  for (const s of sites) {
    let info: ScoreInfo;
    if (s !== page.name) {
      if (subjectIdDict) {
        const id = subjectIdDict[s];
        info = readScoreInfo(s, id);
      }
      // 不存在缓存数据
      if (!info) {
        info = await fetchScoreInfo(s, curPageScoreInfo);
      }
      if (info) {
        page.insertScoreInfo(info);
        saveScoreInfo(info);
        // 索引里面没有这个数据
        if (!dict[s]) {
          dict[s] = getSubjectId(info.url);
        }
      }
    }
  }
  // 保存索引数据
  saveValue(genSubjectIdDictKey(page.name, curPageId), dict);
}
if (location.hostname.match(/bgm.tv|bangumi.tv|chii.in/)) {
  GM_addValueChangeListener(BANGUMI_LOADING, (n, oldValue, newValue) => {
    if (newValue === false) {
      toggleLoading(true);
    } else if (newValue === true) {
      toggleLoading();
    }
  });
  init(BangumiScorePage);
  initControlDOM(document.querySelector('#panelInterestWrapper h2'));
}
if (location.hostname.match('movie.douban.com')) {
  init(DoubanScorePage);
}
