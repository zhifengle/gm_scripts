import { SearchResult } from '../../../interface/subject';
import {
  favicon,
  getSearchResult,
  searchGameData,
} from '../../../sites/twodfan';
import { $q } from '../../../utils/domUtils';
import { insertScoreCommon } from '../common';
import { PageConfig } from '../types';

let site_origin = 'https://galge.fun/';

export function setOrigin(url: string) {
  site_origin = url;
}

export function getOrigin(): string {
  return site_origin;
}

export const twodfanPage: PageConfig = {
  name: '2dfan',
  href: ['https://galge.fun/'],
  searchApi: 'https://galge.fun/subjects/search?keyword={kw}',
  favicon: favicon,
  expiration: 21,
  infoSelector: [
    {
      selector: '.rank-info.control-group',
    },
  ],
  pageSelector: [
    {
      selector: '.navbar > h3',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/\/(subjects\/)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `${site_origin}/subjects/${id}`;
  },
  getSearchResult: searchGameData,
  getScoreInfo: getSearchResult,
  insertScoreInfo: function (page: PageConfig, info: SearchResult): void {
    const title = $q('.navbar > h3').textContent.trim();
    insertScoreCommon(page, info, {
      title,
      adjacentSelector: this.infoSelector,
      cls: '',
      style: '',
    });
  },
};
