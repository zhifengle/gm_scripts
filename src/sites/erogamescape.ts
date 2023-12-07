import { SearchResult } from '../interface/subject';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { getShortenedQuery } from '../utils/utils';
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

export function normalizeQueryEGS(query: string): string {
  let newQuery = query.replace(/([Ａ-Ｚａ-ｚ０-９])([Ａ-Ｚ])/g, '$1 $2');
  newQuery = newQuery.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) - 65248);
  });

  newQuery = newQuery
    .replace(/^(.*?～)(.*)(～[^～]*)$/, function (_, p1, p2, p3) {
      return p1.replace(/～/g, ' ') + p2 + p3.replace(/～/g, ' ');
    })
    .replace(/＝|=/g, ' ')
    .replace(/　/g, ' ')
    .replace(/０/g, '0')
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/３/g, '3')
    .replace(/４/g, '4')
    .replace(/５/g, '5')
    .replace(/６/g, '6')
    .replace(/７/g, '7')
    .replace(/８/g, '8')
    .replace(/９/g, '9')
    .replace(/Ⅰ/g, 'I')
    .replace(/Ⅱ/g, 'II')
    .replace(/Ⅲ/g, 'III')
    .replace(/Ⅳ/g, 'IV')
    .replace(/Ⅴ/g, 'V')
    .replace(/Ⅵ/g, 'VI')
    .replace(/Ⅶ/g, 'VII')
    .replace(/Ⅷ/g, 'VIII')
    .replace(/Ⅸ/g, 'IX')
    .replace(/Ⅹ/g, 'X')
    .replace(/[-－―～〜━\[\]『』~'…！？。]/g, ' ')
    .replace(
      /[♥❤☆\/♡★‥○⁉,.【】◆●∽＋‼＿◯※♠×▼％#∞’&!:＇"＊\*＆［］<>＜＞`_「」¨／◇：♪･@＠]/g,
      ' '
    )
    .replace(/[、，△《》†〇\/·;^‘“”√≪≫＃→♂?%~■‘〈〉Ω♀⇒≒§♀⇒←∬🕊¡Ι≠±『』♨❄—~Σ⇔↑↓‡▽□』〈〉＾]/g, ' ')
    .replace(/[─|+．・]/g, ' ')
    .replace(/°C/g, '℃')
    .replace(/[①②③④⑤⑥⑦⑧⑨]/g, ' ')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, ' ')
    .replace(/‐.*?‐/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\（.*?\）/g, ' ')
    .replace(/\.\.\./g, ' ')
    .replace(/([Ａ-Ｚａ-ｚ０-９])([Ａ-Ｚ])/g, '$1 $2')
    .replace(/～っ.*/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\（.*?\）/g, ' ')
    .trim();
  newQuery = newQuery.replace(/\s{2,}/g, ' ');
  return getShortenedQuery(newQuery)
}

export async function searchSubject(
  subjectInfo: SearchResult,
  type: ErogamescapeCategory = ErogamescapeCategory.game,
  uniqueQueryStr: string = ''
): Promise<SearchResult> {
  let query = normalizeQueryEGS((subjectInfo.name || '').trim());
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
    { ...subjectInfo, name: query },
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

export async function searchGameSubject(
  info: SearchResult
): Promise<SearchResult> {
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
  const rawName = $title.textContent.trim()
  const info: SearchResult = {
    name: normalizeQueryEGS(rawName),
    rawName,
    score: $q('#average > td')?.textContent.trim() ?? 0,
    count: $q('#count > td')?.textContent.trim() ?? 0,
    url: location.href,
    releaseDate: $q('#sellday > td')?.textContent.trim(),
  };
  return info;
}
