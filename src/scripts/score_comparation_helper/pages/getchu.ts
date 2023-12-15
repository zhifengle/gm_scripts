import { SearchSubject } from '../../../interface/subject';
import { $q, findElement } from '../../../utils/domUtils';
import { dealDate } from '../../../utils/utils';
import { insertScoreCommon } from '../common';
import { PageConfig } from '../types';

function dealTitle(str: string): string {
  str = str.trim().split('\n')[0];
  str = str
    .split('＋')[0]
    .replace(/（このタイトルの関連商品）/, '')
    .trim();
  return str.replace(
    /\s[^ ]*?(スペシャルプライス版|限定版|通常版|廉価版|復刻版|初回.*?版|描き下ろし).*?$|＜.*＞$/g,
    ''
  );
}

export const getchuGamePage: PageConfig = {
  name: 'getchu-game',
  type: 'info',
  href: ['http://www.getchu.com/'],
  searchApi:
    'http://www.getchu.com/php/search.phtml?genre=pc_soft&search_keyword={kw}&check_key_dtl=1&submit=',
  favicon: 'http://www.getchu.com/favicon.ico',
  expiration: 21,
  infoSelector: [
    {
      selector: '#soft_table > tbody > tr > td > :last-child',
    },
  ],
  pageSelector: [
    {
      selector: '.genretab.current',
      subSelector: 'a',
      keyWord: ['ゲーム', '同人'],
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/(\?id=)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `http://www.getchu.com/soft.phtml?id=${id}`;
  },
  insertScoreInfo: function (page: PageConfig, info: SearchSubject): void {
    const title = this.getScoreInfo().title;
    insertScoreCommon(page, info, {
      title,
      adjacentSelector: this.infoSelector,
    });
  },
  getSearchResult: function (subjectInfo: SearchSubject): Promise<SearchSubject> {
    return;
  },
  getScoreInfo: function (): SearchSubject {
    const title = dealTitle($q('#soft-title').textContent);
    const info: SearchSubject = {
      name: title,
      score: 0,
      count: '-',
      url: location.href,
    };
    const $d = findElement([
      {
        selector: '#soft_table table',
        subSelector: 'td',
        sibling: true,
        keyWord: '^発売日',
      },
    ]);
    if ($d) {
      info.releaseDate = dealDate($d.textContent.trim());
    }

    return info;
  },
};
