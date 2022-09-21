import { SearchResult } from '../../interface/subject';
import { searchAnimeData } from '../../sites/anidb';
import { $q } from '../../utils/domUtils';
import { genScoreRowInfo, genScoreRowStr, insertScoreCommon } from './common';
import { PageConfig } from './types';

export const anidbPage: PageConfig = {
  name: 'anidb',
  href: ['https://anidb.net'],
  searchApi: 'https://anidb.net/anime/?adb.search={kw}&do.search=1',
  controlSelector: [
    {
      selector: 'h1.anime',
    },
  ],
  pageSelector: [
    {
      selector: 'h1.anime',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/\/(anime\/|anidb.net\/a)(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://anidb.net/anime/${id}`;
  },
  getSearchResult: searchAnimeData,
  getScoreInfo: function (): SearchResult {
    const $table = $q('#tabbed_pane .g_definitionlist > table');
    let names = $table.querySelectorAll('tr.official .value > label');
    const info: SearchResult = {
      name: names[0].textContent.trim(),
      greyName: names[names.length - 1].textContent.trim(),
      score: 0,
      count: 0,
      url: location.href,
    };
    const $rating = $table.querySelector('tr.rating span.rating');
    if ($rating) {
      info.count = $rating
        .querySelector('.count')
        .textContent.trim()
        .replace(/\(|\)/g, '');
      const score = Number(
        $rating.querySelector('a > .value').textContent.trim()
      );
      if (!isNaN(score)) {
        info.score = score;
      }
      const $year = $table.querySelector(
        'tr.year > .value > span[itemprop="startDate"]'
      );
      if ($year) {
        info.releaseDate = $year.getAttribute('content');
      }
      names = $table.querySelectorAll('tr.official .value');
      for (let i = 0; i < names.length; i++) {
        const el = names[i];
        if (el.querySelector('.icons').innerHTML.includes('japanese')) {
          info.name = el.querySelector('label').textContent.trim();
        } else if (el.querySelector('.icons').innerHTML.includes('english')) {
          info.greyName = el.querySelector('label').textContent.trim();
        }
      }
    }
    return info;
  },
  insertScoreInfo: function (page: PageConfig, info: SearchResult): void {
    const title = this.getScoreInfo().name;
    insertScoreCommon(page, info, title, '#tab_1_pane', {
      cls: '',
      style: '',
    });
  },
};
