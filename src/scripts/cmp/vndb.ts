import { SearchResult } from '../../interface/subject';
import { favicon, getSearchResult, searchGameData } from '../../sites/vndb';
import { genScoreRowInfo, genScoreRowStr, getScoreWrapDom } from './common';
import { PageConfig } from './types';

export const vndbPage: PageConfig = {
  name: 'vndb',
  href: ['https://vndb.org/'],
  searchApi: 'https://vndb.org/v?sq={kw}',
  favicon: favicon,
  expiration: 21,
  controlSelector: [
    {
      selector: '.mainbox > h1',
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
  getScoreInfo: getSearchResult,
  insertScoreInfo: function (page: PageConfig, info: SearchResult): void {
    const title = this.getScoreInfo().name;
    const opts = {
      title,
      adjacentSelector: '.vnimg > label',
      cls: '',
      style: '',
    };
    const wrapDom = getScoreWrapDom(
      opts.adjacentSelector,
      opts.cls,
      opts.style
    );
    const rowInfo = genScoreRowInfo(opts.title, page, info);
    // refuse blob:<URL>
    rowInfo.favicon = page.favicon;
    wrapDom.innerHTML += genScoreRowStr(rowInfo);
  },
};
