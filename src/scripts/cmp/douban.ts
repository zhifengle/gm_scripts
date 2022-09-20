import { SearchResult } from '../../interface/subject';
import { checkAnimeSubjectExist } from '../../sites/douban';
import { $q } from '../../utils/domUtils';
import { BLANK_LINK, getFavicon, NO_MATCH_DATA } from './common';
import { PageConfig } from './types';

export const doubanAnimePage: PageConfig = {
  name: 'douban-anime',
  href: ['https://movie.douban.com/'],
  searchApi: 'https://www.douban.com/search?cat=1002&q={kw}',
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
  getSubjectId(url: string) {
    const m = url.match(/\/(subject)\/(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://movie.douban.com/subject/${id}/`;
  },
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
  insertScoreInfo(name: string, searchUrl: string, info: SearchResult) {
    let $panel = $q('#interest_sectl');
    let $friendsRatingWrap = $q('.friends_rating_wrap');
    if (!$friendsRatingWrap) {
      $friendsRatingWrap = document.createElement('div');
      $friendsRatingWrap.className = 'friends_rating_wrap clearbox';
      $panel.appendChild($friendsRatingWrap);
    }
    const $div = document.createElement('div');
    $div.className = 'rating_content_wrap clearfix e-userjs-score-compare';
    const favicon = getFavicon(name);
    let score: any = '-';
    let count = NO_MATCH_DATA;
    let url = searchUrl;
    if (info && info.url) {
      score = info.score || 0;
      count = (info.count || 0) + ' 人评价';
      url = info.url;
    }
    $div.innerHTML = `
<strong class="rating_avg">${score}</strong>
<div class="friends">
  <a class="avatar"
  ${BLANK_LINK}
  href="${searchUrl}"
  title="点击搜索">
  <img src="${favicon}"/>
  </a>
</div>
<a href="${url}"
  rel="noopener noreferrer nofollow" class="friends_count" target="_blank">
    ${count}
</a>
`;
    $friendsRatingWrap.appendChild($div);
  },
};
