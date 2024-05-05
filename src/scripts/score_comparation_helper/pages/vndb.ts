import { SearchSubject } from '../../../interface/subject';
import { favicon, getSearchSubject, searchGameData } from '../../../sites/vndb';
import {
  genScoreRowInfo,
  genScoreRowStr,
  getScoreWrapDom,
  insertScoreRow,
} from '../common';
import { PageConfig } from '../types';

export const vndbPage: PageConfig = {
  name: 'vndb',
  href: ['https://vndb.org/'],
  searchApi: 'https://vndb.org/v?sq={kw}',
  favicon: favicon,
  expiration: 21,
  infoSelector: [
    {
      selector: '.vnimg > :first-child',
    },
  ],
  pageSelector: [
    {
      selector: '.tabselected > a[href^="/v"]',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/\/(v)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://vndb.org/subjects/${id}`;
  },
  getSearchResult: searchGameData,
  getScoreInfo: getSearchSubject,
  insertScoreInfo: function (page: PageConfig, info: SearchSubject): void {
    const title = this.getScoreInfo().name;
    const opts = {
      title,
      adjacentSelector: this.infoSelector,
    };
    const wrapDom = getScoreWrapDom(opts.adjacentSelector);
    const rowInfo = genScoreRowInfo(opts.title, page, info);
    // refuse blob:<URL>
    rowInfo.favicon = page.favicon;
    insertScoreRow(wrapDom, rowInfo);
  },
};
