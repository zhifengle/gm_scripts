import TinySegmenter from 'tiny-segmenter';
import { SearchResult } from '../interface/subject';
import { sleep } from '../utils/async/sleep';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { getShortenedQuery, normalizeQuery } from '../utils/utils';
import { filterResults, filterResultsByMonth } from './common';

enum ErogamescapeCategory {
  game = 'game',
  brand = 'brand',
  creater = 'creater',
  music = 'music',
  pov = 'pov',
  character = 'character',
}
// https://erogamescape.org/favicon.ico
export const favicon = 'https://www.google.com/s2/favicons?domain=erogamescape.org';

// 'http://erogamescape.org',
const site_origin = 'https://erogamescape.org';

function reviseTitle(title: string) {
  const titleDict: Record<string, string> = {
    // @TODO
  };
  const userTitleDict = window.EGS_REVISE_TITLE_DICT || {};
  if (userTitleDict[title]) {
    return userTitleDict[title];
  }
  if (titleDict[title]) {
    return titleDict[title];
  }
  const shortenTitleDict: Record<string, string> = {
    // @TODO
  };
  for (const [key, val] of Object.entries(shortenTitleDict)) {
    if (title.includes(key)) {
      return val;
    }
  }
  return title;
}

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
  // let newQuery = query.replace(/([Ａ-Ｚａ-ｚ０-９])([Ａ-Ｚ])/g, '$1 $2');
  let newQuery = query;
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
    .replace(/[♥❤☆\/♡★‥○⁉,.【】◆●∽＋‼＿◯※♠×▼％#∞’&!:＇"＊\*＆［］<>＜＞`_「」¨／◇：♪･@＠]/g, ' ')
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
  // 	White x Red --->  	White Red
  newQuery = newQuery.replace(/ x /, ' ');
  newQuery = newQuery.replace(/\s{2,}/g, ' ');
  // カオスQueen遼子4 森山由梨＆郁美姉妹併呑編
  if (/^[^\d]+?\d+[^\d]+$/.test(newQuery)) {
    newQuery = newQuery.split(/\d+/).join('?')
  }
  // return getShortenedQuery(newQuery);
  return newQuery;
}

export async function searchSubject(
  subjectInfo: SearchResult,
  type: ErogamescapeCategory = ErogamescapeCategory.game,
  uniqueQueryStr: string = ''
): Promise<SearchResult> {
  let query = uniqueQueryStr || subjectInfo.name;
  const url = `${site_origin}/~ap2/ero/toukei_kaiseki/kensaku.php?category=${type}&word_category=name&word=${encodeURIComponent(
    query
  )}&mode=normal`;
  console.info('search erogamescape subject URL: ', url);
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#result table tr:not(:first-child)');
  const rawInfoList: SearchResult[] = [...items].map(($item: HTMLElement) => getSearchItem($item));
  let res: SearchResult;
  if (uniqueQueryStr) {
    res = filterResultsByMonth(rawInfoList, subjectInfo);
    // no result. try to fuse search by rawName
    if (!res && subjectInfo.rawName) {
      res = filterResults(
        rawInfoList,
        { ...subjectInfo, name: subjectInfo.rawName },
        {
          keys: ['name'],
        }
      );
    }
  } else {
    res = filterResults(rawInfoList, subjectInfo, {
      releaseDate: true,
      keys: ['name'],
    });
  }
  console.info(`Search result of ${query} on erogamescape: `, res);
  if (res && res.url) {
    // 相对路径需要设置一下
    res.url = new URL(res.url, url).href;
    return res;
  }
}

export async function searchGameSubject(info: SearchResult): Promise<SearchResult> {
  const querySet = new Set();
  let query = normalizeQueryEGS((info.name || '').trim());
  let res = await searchAndFollow({ ...info, name: query });
  querySet.add(query);
  if (res) {
    return res;
  }
  await sleep(100);
  query = getShortenedQuery(query);
  if (!querySet.has(query)) {
    res = await searchAndFollow(info, query);
    querySet.add(query);
    if (res) {
      return res;
    }
  }
  await sleep(100);
  if (query.length > 3) {
    const segmenter = new TinySegmenter();
    const segs = segmenter.segment(query);
    if (segs && segs.length > 2) {
      query = segs[0] + '?' + segs[segs.length - 1];
      if (!querySet.has(query)) {
        res = await searchAndFollow(info, query);
        querySet.add(query);
        if (res) {
          return res;
        }
      }
    }
  }
  await sleep(100);

  let queryList: string[] = [];
  if (info.alias) {
    queryList = info.alias;
  }
  for (const s of queryList) {
    const queryStr = getShortenedQuery(normalizeQueryEGS(s))
    if (querySet.has(queryStr)) {
      continue;
    }
    const res = await searchAndFollow({ ...info, rawName: s }, queryStr);
    querySet.add(queryStr);
    if (res) {
      return res;
    }
    await sleep(200);
  }
}

// search and follow the URL of search result
export async function searchAndFollow(info: SearchResult, uniqueQueryStr: string = ''): Promise<SearchResult> {
  const result = await searchSubject(info, ErogamescapeCategory.game, uniqueQueryStr);
  if (result && result.url) {
    // await sleep(50)
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
  const rawName = $title.textContent.trim();
  const title = reviseTitle(rawName);
  let name = rawName;
  if (title !== rawName) {
    name = title;
  } else {
    name = normalizeQuery(rawName);
  }
  const info: SearchResult = {
    name,
    rawName,
    score: $q('#average > td')?.textContent.trim() ?? 0,
    count: $q('#count > td')?.textContent.trim() ?? 0,
    url: location.href,
    releaseDate: $q('#sellday > td')?.textContent.trim(),
  };
  return info;
}
