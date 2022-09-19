import { SearchResult } from '../../interface/subject';
import { checkAnimeSubjectExist } from '../../sites/douban';
import { $q } from '../../utils/domUtils';
import { getFavicon } from './common';
import { PageConfig } from './types';

export const doubanAnimePage: PageConfig = {
  name: 'douban',
  href: ['https://movie.douban.com/'],
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
    {
      selector: '#info',
      subSelector: 'span[property="v:genre"]',
      keyWord: ['动画', '动漫'],
    },
  ],
  getSearchResult: checkAnimeSubjectExist,
  getScoreInfo() {
    const $title = $q('#content h1>span');
    const rawName = $title.textContent.trim();
    const keywords = $q('meta[name="keywords"]')?.getAttribute?.('content');
    let name = rawName;
    if (keywords) {
      // 可以考虑剔除第二个关键字里面的 Season 3
      const firstKeyword = keywords.split(',')[0];
      name = rawName.replace(firstKeyword, '').trim();
      // name: rawName.replace(/第.季/, ''),
    }
    const subjectInfo: SearchResult = {
      name,
      score: $q('.ll.rating_num')?.textContent ?? 0,
      count: $q('.rating_people > span')?.textContent ?? 0,
      rawName,
      url: location.href,
    };
    const $date = $q('span[property="v:initialReleaseDate"]');
    if ($date) {
      subjectInfo.releaseDate = $date.textContent.replace(/\(.*\)/, '');
    }
    return subjectInfo;
  },
  insertScoreInfo(name: string, info: SearchResult) {
    let $panel = $q('#interest_sectl');
    let $friendsRatingWrap = $q('.friends_rating_wrap');
    if (!$friendsRatingWrap) {
      $friendsRatingWrap = document.createElement('div');
      $friendsRatingWrap.className = 'friends_rating_wrap clearbox';
      $panel.appendChild($friendsRatingWrap);
    }
    const score = info.score || 0;
    const $div = document.createElement('div');
    const favicon = getFavicon(name);
    const rawHTML = `
<strong class="rating_avg">${score}</strong>
<div class="friends">
  <a class="avatar" title="${name}" href="javascript:;">
  <img src="${favicon}"/>
  </a>
</div>
<a href="${info.url}"
  rel="noopener noreferrer nofollow" class="friends_count" target="_blank">
    ${info.count || 0}人评价
</a>
`;
    $div.className = 'rating_content_wrap clearfix e-userjs-score-compare';
    $div.innerHTML = rawHTML;
    $friendsRatingWrap.appendChild($div);
  },
};
