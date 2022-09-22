import { SearchResult, Subject } from '../../interface/subject';
import { SubjectTypeId } from '../../interface/wiki';
import { checkSubjectExist } from '../../sites/bangumi';
import { $q, $qa } from '../../utils/domUtils';
import { dealDate } from '../../utils/utils';
import { getFavicon, NO_MATCH_DATA } from './common';
import { PageConfig } from './types';

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
  getScoreInfo: () => {
    const info: SearchResult = {
      name: $q('h1>a').textContent.trim(),
      score: $q('.global_score span[property="v:average"')?.textContent ?? 0,
      count: $q('span[property="v:votes"')?.textContent ?? 0,
      url: location.href,
    };
    let infoList = $qa('#infobox>li');
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
  // 插入评分信息的 DOM
  insertScoreInfo(page: PageConfig, info: SearchResult) {
    let $panel = $q('.SidePanel.png_bg');
    if ($panel) {
      let $div = document.createElement('div');
      $div.classList.add('frdScore');
      $div.classList.add('e-userjs-score-compare');
      const favicon = getFavicon(page);
      let score: any = '0.00';
      let count = NO_MATCH_DATA;
      const searchUrl = page.searchApi.replace(
        '{kw}',
        encodeURIComponent($q('h1>a').textContent.trim())
      );
      let url = searchUrl;
      if (info && info.url) {
        score = Number(info.score || 0).toFixed(2);
        count = (info.count || 0) + ' 人评分';
        url = info.url;
      }
      const siteName = page.name.split('-')[0];
      $div.innerHTML = `
<a class="avatar"
target="_blank" rel="noopener noreferrer nofollow"
style="vertical-align:-3px;margin-right:10px;" title="点击在${siteName}搜索" href="${searchUrl}">
<img style="width:16px;" src="${favicon}"/>
</a>
<span class="num">${score}</span>
<span class="desc" style="visibility:hidden">还行</span>
<a href="${url}"
      target="_blank" rel="noopener noreferrer nofollow" class="l">
      ${count}
</a>
`;
      $panel.appendChild($div);
    }
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
  expiration: 21,
  pageSelector: [
    {
      selector: 'a.focus.chl[href="/game"]',
    },
  ],
  async getSearchResult(subject: Subject) {
    const res = await checkSubjectExist(
      subject,
      bgm_origin,
      SubjectTypeId.game
    );
    if (res) {
      res.url = genBgmUrl(res.url);
    }
    return res;
  },
};
