import { SearchSubject, Subject } from '../../../interface/subject';
import { SubjectTypeId } from '../../../interface/wiki';
import { checkSubjectExist } from '../../../sites/bangumi';
import { getSearchSubject } from '../../../sites/bangumi/extract';
import { $q, $qa, htmlToElement } from '../../../utils/domUtils';
import {
  genScoreRowInfo,
  getFavicon,
  getScoreWrapDom,
  insertScoreRow,
  NO_MATCH_DATA,
} from '../common';
import { PageConfig } from '../types';

// http://mirror.bgm.rincat.ch
let bgm_origin = 'https://bgm.tv';

export function genBgmUrl(url: string) {
  if (url.startsWith('http')) {
    return url;
  }
  return new URL(url, bgm_origin).href;
}

export function setBgmOrigin(url: string) {
  bgm_origin = url;
}

export function getBgmOrigin(): string {
  return bgm_origin;
}

export const bangumiAnimePage: PageConfig = {
  name: 'bangumi-anime',
  href: ['https://bgm.tv/', 'https://bangumi.tv/', 'https://chii.in/'],
  searchApi: 'https://bgm.tv/subject_search/{kw}?cat=2',
  favicon: 'https://bgm.tv/img/favicon.ico',
  controlSelector: [
    {
      selector: '#panelInterestWrapper h2',
    },
  ],
  infoSelector: [
    {
      selector: '#panelInterestWrapper .SidePanel > :last-child',
    },
  ],
  pageSelector: [
    {
      selector: '.focus.chl.anime',
    },
  ],
  getSubjectId(url: string) {
    // @TODO 修改域名。
    // const urlObj = new URL(url);
    // setBgmOrigin(urlObj.origin);
    // this.searchApi = `${bgm_origin}/subject_search/{kw}?cat=2`;

    const m = url.match(/\/(subject)\/(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `${bgm_origin}/subject/${id}`;
  },
  async getSearchResult(subject: Subject) {
    const res = await checkSubjectExist(
      subject,
      bgm_origin,
      SubjectTypeId.anime
    );
    if (res) {
      res.url = genBgmUrl(res.url);
    }
    return res;
  },
  getScoreInfo: getSearchSubject,
  // 插入评分信息的 DOM
  insertScoreInfo(page: PageConfig, info: SearchSubject) {
    const title = $q('h1>a').textContent.trim();
    const opts = {
      title,
      adjacentSelector: this.infoSelector,
    };
    const wrapDom = getScoreWrapDom(opts.adjacentSelector);
    const rowInfo = genScoreRowInfo(opts.title, page, info);
    const rowStr = `
<div class="e-userjs-score-compare-row frdScore">
<a class="avatar"
target="_blank" rel="noopener noreferrer nofollow"
style="vertical-align:-3px;margin-right:10px;" title="点击在${rowInfo.name}搜索" href="${rowInfo.searchUrl}">
<img style="width:16px;" src="${rowInfo.favicon}"/>
</a>
<span class="num">${rowInfo.score}</span>
<span class="desc" style="visibility:hidden">还行</span>
<a href="${rowInfo.url}"
      target="_blank" rel="noopener noreferrer nofollow" class="l">
      ${rowInfo.count}
</a>
</div>
`;
    wrapDom.appendChild(htmlToElement(rowStr));
  },
  insertControlDOM($target, callbacks) {
    if (!$target) return;
    // 已存在控件时返回
    if ($q('.e-userjs-score-ctrl')) return;
    const rawHTML = `<a title="强制刷新评分" class="e-userjs-score-ctrl e-userjs-score-fresh">O</a>
      <a title="清除所有评分缓存" class="e-userjs-score-ctrl e-userjs-score-clear">X</a>
`;
    $target.innerHTML = $target.innerHTML + rawHTML;
    GM_addStyle(`
      .e-userjs-score-ctrl {color:#f09199;font-weight:800;float:right;}
      .e-userjs-score-ctrl:hover {cursor: pointer;}
      .e-userjs-score-clear {margin-right: 12px;}
      .e-userjs-score-loading { width: 208px; height: 13px; background-image: url("/img/loadingAnimation.gif"); }
      `);

    $q('.e-userjs-score-clear').addEventListener(
      'click',
      callbacks.clear,
      false
    );
    $q('.e-userjs-score-fresh').addEventListener(
      'click',
      callbacks.refresh,
      false
    );
  },
};

export const bangumiGamePage: PageConfig = {
  ...bangumiAnimePage,
  name: 'bangumi-game',
  searchApi: 'https://bgm.tv/subject_search/{kw}?cat=4',
  expiration: 21,
  pageSelector: [
    {
      selector: 'a.focus.chl[href="/game"]',
    },
  ],
  async getSearchResult(subject: SearchSubject) {
    const res = await checkSubjectExist(
      subject,
      bgm_origin,
      SubjectTypeId.game,
      {
        releaseDate: true,
        enableShortenQuery: true,
        disableDate: true,
      }
    );
    if (res) {
      res.url = genBgmUrl(res.url);
    }
    return res;
  },
};
