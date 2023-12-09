import { SearchResult } from '../../../interface/subject';
import {
  favicon,
  getSearchResult,
  normalizeQueryEGS,
  searchGameSubject,
} from '../../../sites/erogamescape';
import { insertScoreCommon } from '../common';
import { PageConfig } from '../types';

export const erogamescapePage: PageConfig = {
  name: 'erogamescape',
  href: ['https://erogamescape.org/', 'https://erogamescape.dyndns.org/'],
  searchApi:
    'https://erogamescape.org/~ap2/ero/toukei_kaiseki/kensaku.php?category=game&word_category=name&word={kw}&mode=normal',
  favicon: favicon,
  expiration: 21,
  infoSelector: [
    {
      selector: '#basic_information_table',
    },
    {
      selector: '#basic_infomation_table',
    },
  ],
  pageSelector: [
    {
      selector: '#soft-title',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/(game=)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://erogamescape.org/~ap2/ero/toukei_kaiseki/game.php?game=${id}`;
  },
  getSearchResult: searchGameSubject,
  getScoreInfo: getSearchResult,
  insertScoreInfo: function (page: PageConfig, info: SearchResult): void {
    const title = normalizeQueryEGS(this.getScoreInfo().name);
    insertScoreCommon(page, info, {
      title,
      adjacentSelector: this.infoSelector,
      cls: '',
      style: '',
    });
  },
};
