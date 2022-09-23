import { SearchResult } from '../../../interface/subject';
import { checkAnimeSubjectExist } from '../../../sites/douban';
import { $q, htmlToElement } from '../../../utils/domUtils';
import { BLANK_LINK, genScoreRowInfo, getScoreWrapDom } from '../common';
import { PageConfig } from '../types';

export const doubanAnimePage: PageConfig = {
  name: 'douban-anime',
  href: ['https://movie.douban.com/'],
  searchApi: 'https://www.douban.com/search?cat=1002&q={kw}',
  favicon: 'https://img3.doubanio.com/favicon.ico',
  expiration: 21,
  infoSelector: [
    {
      selector: '#interest_sectl > .rating_wrap',
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
  insertScoreInfo(page: PageConfig, info: SearchResult) {
    const title = this.getScoreInfo().name;
    const opts = {
      title,
      adjacentSelector: this.infoSelector,
      cls: 'friends_rating_wrap clearbox',
    };
    const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls);
    const rowInfo = genScoreRowInfo(opts.title, page, info);
    const rowStr = `
<div class="e-userjs-score-compare-row rating_content_wrap clearfix">
<strong class="rating_avg">${rowInfo.score}</strong>
<div class="friends">
  <a class="avatar"
  ${BLANK_LINK}
  href="${rowInfo.searchUrl}"
  style="cursor:pointer;"
  title="点击在${rowInfo.name}搜索">
  <img src="${rowInfo.favicon}"/>
  </a>
</div>
<a href="${rowInfo.url}"
  rel="noopener noreferrer nofollow" class="friends_count" target="_blank">
    ${rowInfo.count}
</a>
</div>
`;
    wrapDom.appendChild(htmlToElement(rowStr));
  },
};
