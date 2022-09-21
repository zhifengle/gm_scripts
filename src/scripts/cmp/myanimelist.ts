import { SearchResult } from '../../interface/subject';
import { searchAnimeData } from '../../sites/myanimelist';
import { $q, $qa } from '../../utils/domUtils';
import { formatDate } from '../../utils/utils';
import { genScoreRowStr, getFavicon, NO_MATCH_DATA } from './common';
import { PageConfig } from './types';

export const myanimelistPage: PageConfig = {
  name: 'myanimelist',
  href: ['https://myanimelist.net/'],
  searchApi: 'https://myanimelist.net/anime.php?q={kw}&cat=anime',
  controlSelector: [
    {
      selector: '.h1.edit-info',
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
  getScoreInfo: function (): SearchResult {
    let name = $q('h1-title')?.textContent;
    const info: SearchResult = {
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
  insertScoreInfo: function (page: PageConfig, info: SearchResult): void {
    const favicon = getFavicon(page.name);
    let score: any = '-';
    let count = NO_MATCH_DATA;
    const name = this.getScoreInfo().name;
    const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(name));
    let url = searchUrl;
    if (info && info.url) {
      score = Number(info.score || 0).toFixed(2);
      count = (info.count || 0) + ' 人评分';
      url = info.url;
    }

    let $div: HTMLElement = document.querySelector(
      '.stats-block.e-userjs-score-compare'
    );
    if (!$div) {
      $div = document.createElement('div');
      $div.classList.add('stats-block');
      $div.classList.add('e-userjs-score-compare');
      $div.style.height = 'auto';
      $div.style.marginTop = '10px';
      document
        .querySelector('.anime-detail-header-stats > .stats-block')
        .insertAdjacentElement('afterend', $div);
    }
    $div.innerHTML += genScoreRowStr({ favicon, url, searchUrl, score, count });
  },
};
