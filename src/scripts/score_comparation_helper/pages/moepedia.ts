import { SearchSubject } from '../../../interface/subject';
import { getSearchSubject, searchGameSubject } from '../../../sites/moepedia';
import { $q } from '../../../utils/domUtils';
import { insertScoreCommon } from '../common';
import { PageConfig } from '../types';

export const moepediaPage: PageConfig = {
  name: 'moepedia',
  href: ['https://moepedia.net/'],
  searchApi: 'https://moepedia.net/search/result/?s={kw}&t=on',
  favicon:
    'https://moepedia.net/wp/wp-content/themes/moepedia/assets/images/common/common/favicon.ico',
  expiration: 21,
  infoSelector: [
    {
      selector: '.body-top_image_wrapper',
    },
  ],
  pageSelector: [
    {
      selector: '.body-top_info_title h2',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/(game\/)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://moepedia.net/game/${id}/`;
  },
  insertScoreInfo: function (page: PageConfig, info: SearchSubject): void {
    const title = $q('.body-top_info_title > h2').textContent.trim();
    insertScoreCommon(page, info, {
      title,
      adjacentSelector: this.infoSelector,
    });
  },
  getSearchResult: searchGameSubject,
  getScoreInfo: getSearchSubject,
};
