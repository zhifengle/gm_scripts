import { SearchResult, Subject } from '../interface/subject';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { normalizeQuery } from '../utils/utils';
import { filterResults } from './common';

enum ErogamescapeCategory {
  game = 'game',
  brand = 'brand',
  creater = 'creater',
  music = 'music',
  pov = 'pov',
  character = 'character',
}
// https://erogamescape.org/favicon.ico
export const favicon =
  'https://www.google.com/s2/favicons?domain=erogamescape.org';

// 'http://erogamescape.org',
const site_origin = 'https://erogamescape.org';

function getSearchItem($item: HTMLElement): SearchResult {
  const $title = $item.querySelector('td:nth-child(1) > a');
  const href = $title.getAttribute('href');
  const $name = $item.querySelector<HTMLElement>('td:nth-child(1)');
  // remove tooltip text
  $name.querySelector('div.tooltip')?.remove();
  const info: SearchResult = {
    name: $name.innerText,
    url: href,
    count: $item.querySelector('td:nth-child(6)')?.textContent ?? 0,
    score: $item.querySelector('td:nth-child(4)')?.textContent ?? 0,
    releaseDate: $item.querySelector('td:nth-child(3)').textContent,
  };
  return info;
}

export async function searchSubject(
  subjectInfo: Subject,
  type: ErogamescapeCategory = ErogamescapeCategory.game,
  uniqueQueryStr: string = ''
): Promise<SearchResult> {
  let query = normalizeQuery((subjectInfo.name || '').trim());
  query = query.replace(/＜.+＞/, '');
  if (uniqueQueryStr) {
    query = uniqueQueryStr;
  }
  if (!query) {
    console.info('Query string is empty');
    return;
  }
  const url = `${site_origin}/~ap2/ero/toukei_kaiseki/kensaku.php?category=${type}&word_category=name&word=${encodeURIComponent(
    query
  )}&mode=normal`;
  console.info('search subject URL: ', url);
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#result table tr:not(:first-child)');
  const rawInfoList: SearchResult[] = [...items].map(($item: HTMLElement) =>
    getSearchItem($item)
  );
  const res = filterResults(
    rawInfoList,
    subjectInfo,
    {
      releaseDate: true,
      keys: ['name'],
    },
    true
  );
  console.info(`Search result of ${query} on erogamescape: `, res);
  if (res && res.url) {
    // 相对路径需要设置一下
    res.url = new URL(res.url, url).href;
    return res;
  }
}

export async function searchGameSubject(info: Subject): Promise<SearchResult> {
  const result = await searchSubject(info, ErogamescapeCategory.game);
  if (result && result.url) {
    const rawText = await fetchText(result.url);
    window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
    const res = getSearchResult();
    res.url = result.url;
    window._parsedEl = undefined;
    return res;
  } else {
    return result;
  }
}

export function getSearchResult(): SearchResult {
  const $title = $q('#soft-title > .bold');
  const info: SearchResult = {
    name: $title.textContent.trim(),
    score: $q('#average > td')?.textContent.trim() ?? 0,
    count: $q('#count > td')?.textContent.trim() ?? 0,
    url: location.href,
    releaseDate: $q('#sellday > td')?.textContent.trim()
  };
  return info;
}
