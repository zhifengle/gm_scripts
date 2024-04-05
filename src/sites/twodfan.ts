import { SearchSubject, Subject } from '../interface/subject';
import { randomSleep } from '../utils/async/sleep';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { normalizeQuery } from '../utils/utils';
import { FilterOptions, filterResults } from './common';
import { isEnglishName } from './utils';

const site_origin = 'https://ddfan.org/';
const HEADERS = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  referer: 'https://ddfan.org/',
};

// export const favicon = 'https://ddfan.org/favicon.ico';
export const favicon = 'https://www.google.com/s2/favicons?domain=ddfan.org';

function getSearchItem($item: HTMLElement): SearchSubject {
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

export async function searchGameData(subjectInfo: Subject): Promise<SearchSubject> {
  let query = normalizeQuery((subjectInfo.name || '').trim());
  // fix long name
  if (subjectInfo.name.length > 50) {
    const arr = query.split(' ');
    if (arr[0].length > 10) {
      query = arr[0];
    } else {
      query = arr[0] + ' ' + arr[1];
    }
  }
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  let searchResult;
  const options: FilterOptions = {
    dateFirst: true,
    keys: ['name'],
  };
  const url = `https://ddfan.org/subjects/search?keyword=${encodeURIComponent(query)}`;
  console.info('ddfan search URL: ', url);
  const rawText = await fetchText(url, {
    headers: HEADERS,
  });
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#subjects > li');
  const rawInfoList: SearchSubject[] = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => getSearchItem($item));
  if (isEnglishName(subjectInfo.name)) {
    if (rawInfoList.every((item) => item.name.toLowerCase().startsWith(query.toLowerCase()))) {
      options.sameDate = true;
    }
  }
  searchResult = filterResults(rawInfoList, subjectInfo, options);
  console.info(`Search result of ${query} on ddfan: `, searchResult);
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

async function followSearch(url: string): Promise<SearchSubject> {
  const rawText = await fetchText(url, {
    headers: {
      accept: HEADERS.accept,
      referer: url,
    },
  });
  window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
  const res = getSearchSubject();
  window._parsedEl = undefined;
  return res;
}

export function getSearchSubject(): SearchSubject {
  const $table = $q('.media-body.control-group > .control-group');
  const name = $q('.navbar > h3').textContent.trim();
  const info: SearchSubject = {
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
