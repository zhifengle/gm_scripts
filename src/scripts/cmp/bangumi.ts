import { SearchResult, Subject } from '../../interface/subject';
import { SubjectTypeId } from '../../interface/wiki';
import { checkSubjectExist } from '../../sites/bangumi';
import { $q, $qa } from '../../utils/domUtils';
import { dealDate } from '../../utils/utils';
import { getFavicon } from './common';
import { PageConfig } from './types';

let bgm_origin = 'https://bgm.tv';

export function setBgmOrigin(url: string) {
  bgm_origin = url;
}

export function getBgmOrigin(): string {
  return bgm_origin;
}

export const bangumiAnimePage: PageConfig = {
  name: 'bangumi',
  href: ['https://bgm.tv/'],
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
  getSearchResult: (subject: Subject) =>
    checkSubjectExist(subject, bgm_origin, SubjectTypeId.anime),
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
  insertScoreInfo: (name: string, info: SearchResult) => {
    let $panel = $q('.SidePanel.png_bg');
    if ($panel) {
      const score = info.score || 0;
      let $div = document.createElement('div');
      $div.classList.add('frdScore');
      $div.classList.add('e-userjs-score-compare');
      const favicon = getFavicon(name);
      $div.innerHTML = `
<a class="avatar" style="vertical-align:-3px;margin-right:10px;" title="${name}" href="javascript:;">
<img style="width:16px;" src="${favicon}"/>
</a>
<span class="num">${Number(score).toFixed(2)}</span>
<span class="desc" style="visibility:hidden">还行</span>
<a href="${info.url}"
      target="_blank" rel="noopener noreferrer nofollow" class="l">
      ${info.count || 0} 人评分
</a>
`;
      $panel.appendChild($div);
    }
  },
};

export const bangumiGamePage: PageConfig = {
  ...bangumiAnimePage,
  pageSelector: [
    {
      selector: '.focus.chl.game',
    },
  ],
  getSearchResult: (subject: Subject) =>
    checkSubjectExist(subject, bgm_origin, SubjectTypeId.game),
};
