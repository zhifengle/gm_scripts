import { SearchResult, Subject } from '../interface/subject';
import { randomSleep } from '../utils/async/sleep';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { normalizeQuery } from '../utils/utils';
import { filterResults } from './common';

const site_origin = 'https://2dfan.org/';
const HEADERS = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  referer: 'https://2dfan.org/',
};

export const favicon = 'https://2dfan.org/favicon.ico';

function getSearchItem($item: HTMLElement): SearchResult {
  const $title = $item.querySelector('h4.media-heading > a');
  const href = new URL($title.getAttribute('href'), site_origin).href;
  const infos = $item.querySelectorAll('.tags > span');
  let releaseDate = undefined;
  for (let i = 0; i < infos.length; i++) {
    const el = infos[i];
    if (el.innerHTML.includes('发售日期')) {
      const m = el.textContent.match(/\d{4}-\d\d-\d\d/);
      if (m) {
        releaseDate = m[0];
      }
    }
  }
  return {
    name: $title.textContent.trim(),
    releaseDate,
    url: href,
    score: 0,
    count: 0,
  };
}

export async function searchGameData(
  subjectInfo: Subject
): Promise<SearchResult> {
  let query = normalizeQuery((subjectInfo.name || '').trim());
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  let searchResult;
  const options = {
    releaseDate: true,
    keys: ['name'],
  };
  const url = `https://2dfan.org/subjects/search?keyword=${encodeURIComponent(
    query
  )}`;
  console.info('2dfan search URL: ', url);
  const rawText = await fetchText(url, {
    headers: HEADERS,
  });
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#subjects > li');
  const rawInfoList: SearchResult[] = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => getSearchItem($item));
  searchResult = filterResults(rawInfoList, subjectInfo, options, true);
  console.info(`Search result of ${query} on 2dfan: `, searchResult);
  if (searchResult && searchResult.url) {
    randomSleep(200, 50);
    const res = await followSearch(searchResult.url);
    if (res) {
      res.url = searchResult.url;
      return res;
    }
    return searchResult;
  }
}

async function followSearch(url: string): Promise<SearchResult> {
  const rawText = await fetchText(url, {
    headers: {
      accept: HEADERS.accept,
      referer: url,
    },
  });
  window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
  const res = getSearchResult();
  window._parsedEl = undefined;
  return res;
}

export function getSearchResult(): SearchResult {
  const $table = $q('.media-body.control-group > .control-group');
  const name = $q('.navbar > h3').textContent.trim();
  const info: SearchResult = {
    name: name,
    greyName: name,
    score: $q('.rank-info.control-group .score')?.textContent.trim() ?? 0,
    count: 0,
    url: location.href,
  };
  const $count = $q('.rank-info.control-group .muted');
  if ($count) {
    info.count = $count.textContent.trim().replace('人评价', '');
    if (info.count.includes('无评分')) {
      info.count = '-';
    }
  }
  $table.querySelectorAll('p.tags').forEach((el) => {
    if (el.innerHTML.includes('发售日期')) {
      const m = el.textContent.match(/\d{4}-\d\d-\d\d/);
      if (m) {
        info.releaseDate = m[0];
      }
    } else if (el.innerHTML.includes('又名：')) {
      info.greyName = el.querySelector('.muted').textContent;
    }
  });

  return info;
}
