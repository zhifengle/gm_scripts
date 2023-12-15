import { SearchSubject } from '../../../interface/subject';
import { searchAnimeData } from '../../../sites/myanimelist';
import { $q, $qa } from '../../../utils/domUtils';
import { formatDate } from '../../../utils/utils';
import { insertScoreCommon } from '../common';
import { PageConfig } from '../types';

export const myanimelistPage: PageConfig = {
  name: 'myanimelist',
  href: ['https://myanimelist.net/'],
  searchApi: 'https://myanimelist.net/anime.php?q={kw}&cat=anime',
  favicon: 'https://cdn.myanimelist.net/images/favicon.ico',
  infoSelector: [
    {
      selector: '.anime-detail-header-stats > .stats-block',
    },
  ],
  pageSelector: [
    {
      selector: '.breadcrumb a[href$="myanimelist.net/anime.php"]',
    },
  ],
  getSubjectId(url: string) {
    const m = url.match(/\/(anime)\/(\d+)/);
    if (m) {
      return `${this.name}_${m[2]}`;
    }
    return '';
  },
  genSubjectUrl(id) {
    return `https://myanimelist.net/anime/${id}`;
  },
  getSearchResult: searchAnimeData,
  getScoreInfo: function (): SearchSubject {
    let name = $q('h1-title')?.textContent;
    const info: SearchSubject = {
      name: name,
      greyName: name,
      score: $q('span[itemprop="ratingValue"]')?.textContent.trim() ?? 0,
      count: $q('span[itemprop="ratingCount"]')?.textContent.trim() ?? 0,
      url: location.href,
    };
    $qa('.leftside .spaceit_pad > .dark_text').forEach((el) => {
      if (el.innerHTML.includes('Japanese:')) {
        info.name = el.nextSibling.textContent.trim();
      } else if (el.innerHTML.includes('Aired:')) {
        const aired = el.nextSibling.textContent.trim();
        if (aired.includes('to')) {
          const startDate = new Date(aired.split('to')[0].trim());
          info.releaseDate = formatDate(startDate);
        }
      }
    });
    return info;
  },
  insertScoreInfo: function (page: PageConfig, info: SearchSubject): void {
    const title = this.getScoreInfo().name;
    insertScoreCommon(page, info, {
      title,
      adjacentSelector: this.infoSelector,
      cls: 'stats-block',
      style: 'height:auto;',
    });
  },
};
