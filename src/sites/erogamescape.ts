import TinySegmenter from 'tiny-segmenter';
import { SearchSubject } from '../interface/subject';
import { sleep } from '../utils/async/sleep';
import { $q } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { getShortenedQuery, normalizeQuery } from '../utils/utils';
import { filterResults, findResultByMonth, fuseFilterSubjects } from './common';
import {
  getHiraganaSubTitle,
  isEnglishName,
  isKatakanaName,
  normalizeEditionName,
  removePairs,
  replaceToASCII,
} from './utils';

type SearchOptions = {
  shortenQuery?: boolean;
  query?: string;
};

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
    姉妹いじり: '姉妹いじり',
  };
  for (const [key, val] of Object.entries(shortenTitleDict)) {
    if (title.includes(key)) {
      return val;
    }
  }
  return title;
}

function getSearchItem($item: HTMLElement): SearchSubject {
  const $title = $item.querySelector('td:nth-child(1) > a');
  const href = $title.getAttribute('href');
  const $name = $item.querySelector<HTMLElement>('td:nth-child(1)');
  // remove tooltip text
  $name.querySelector('div.tooltip')?.remove();
  const info: SearchSubject = {
    name: $name.innerText,
    url: href,
    count: $item.querySelector('td:nth-child(6)')?.textContent ?? 0,
    score: $item.querySelector('td:nth-child(4)')?.textContent ?? 0,
    releaseDate: $item.querySelector('td:nth-child(3)').textContent,
  };
  return info;
}

export function normalizeQueryEGS(query: string): string {
  let newQuery = query;
  newQuery = newQuery.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) - 65248);
  });

  newQuery = newQuery.replace(/^(.*?～)(.*)(～[^～]*)$/, function (_, p1, p2, p3) {
    return p1.replace(/～/g, ' ') + p2 + p3.replace(/～/g, ' ');
  });
  newQuery = removePairs(replaceToASCII(newQuery), ['‐‐'])
    .replace(/[-－―～〜━\[\]『』~'…！？。]/g, ' ')
    // keep "." or not?
    .replace(/[♥❤☆\/♡★‥○⁉,【】◆●∽＋‼＿◯※♠×▼％#∞’&!:＇"＊\*＆［］<>＜＞`_「」¨／◇：♪･@＠]/g, ' ')
    .replace(/[、，△《》†〇\/·;^‘“”√≪≫＃→♂?%~■‘〈〉Ω♀⇒≒§♀⇒←∬🕊¡Ι≠±『』♨❄—~Σ⇔↑↓‡▽□』〈〉＾]/g, ' ')
    .replace(/[─|+．・]/g, ' ')
    .replace(/°C/g, '℃')
    .replace(/[①②③④⑤⑥⑦⑧⑨]/g, ' ')
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, ' ')
    .replace(/\.\.\./g, ' ')
    .replace(/～っ.*/, '');
  // 	White x Red --->  	White Red
  newQuery = newQuery.replace(/ x /, ' ');
  newQuery = newQuery.replace(/\s{2,}/g, ' ');
  // return getShortenedQuery(newQuery);
  return newQuery;
}

export async function searchSubject(
  subjectInfo: SearchSubject,
  type: ErogamescapeCategory = ErogamescapeCategory.game,
  opts: SearchOptions = {}
): Promise<SearchSubject> {
  let query = opts.query || subjectInfo.name;
  const url = `${site_origin}/~ap2/ero/toukei_kaiseki/kensaku.php?category=${type}&word_category=name&word=${encodeURIComponent(
    query
  )}&mode=normal`;
  console.info('search erogamescape subject URL: ', url);
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#result table tr:not(:first-child)');
  const rawInfoList: SearchSubject[] = [...items].map(($item: HTMLElement) => getSearchItem($item));
  let res: SearchSubject;
  const fuseOptions = {
    keys: ['name'],
  };
  if (opts.shortenQuery) {
    res = findResultByMonth(rawInfoList, subjectInfo);
    if (!res) {
      res = filterResults(rawInfoList, subjectInfo, fuseOptions, false);
    }
  } else {
    res = filterResults(
      rawInfoList,
      subjectInfo,
      {
        ...fuseOptions,
        threshold: 0.4,
        releaseDate: true,
      },
      false
    );
  }
  console.info(`Search result of ${query} on erogamescape: `, res);
  if (res && res.url) {
    // 相对路径需要设置一下
    res.url = new URL(res.url, url).href;
    return res;
  }
}

function canShortenQuery(query: string): boolean {
  if (isEnglishName(query)) {
    return false;
  }
  if (isKatakanaName(query)) {
    return false;
  }
  return true;
}

export async function searchGameSubject(info: SearchSubject): Promise<SearchSubject> {
  let res: SearchSubject;
  const querySet = new Set();
  const normalizedStr = normalizeQueryEGS(info.name);
  // fix フィギュア ～奪われた放課後～
  const subTitle = normalizeQueryEGS(getHiraganaSubTitle(info.name));
  if (subTitle) {
    res = await searchAndFollow(info, {
      shortenQuery: true,
      query: subTitle,
    });
    querySet.add(subTitle);
  } else if (isEnglishName(info.name)) {
    res = await searchAndFollow(info);
    querySet.add(normalizedStr);
  } else {
    res = await searchAndFollow(info, { query: normalizedStr });
    querySet.add(normalizedStr);
  }
  if (res) {
    return res;
  }
  await sleep(100);
  let shortenedStr = '';
  if (canShortenQuery(normalizedStr)) {
    shortenedStr = getShortenedQuery(normalizedStr);
    // skip length <= 3 short query
    if (!querySet.has(shortenedStr) && shortenedStr.length > 3) {
      res = await searchAndFollow(info, { shortenQuery: true, query: shortenedStr });
      querySet.add(shortenedStr);
      if (res) {
        return res;
      }
    }
  }
  await sleep(200);
  if (shortenedStr.length > 3) {
    const segmenter = new TinySegmenter();
    const segs = segmenter.segment(shortenedStr);
    if (segs && segs.length > 2) {
      const query = segs[0] + '?' + segs[segs.length - 1];
      if (!querySet.has(query)) {
        res = await searchAndFollow(info, { shortenQuery: true, query });
        querySet.add(query);
        if (res) {
          return res;
        }
      }
    }
  }
  await sleep(200);

  let queryList: string[] = [];
  if (info.alias) {
    queryList = info.alias;
  }
  for (const s of queryList) {
    let queryStr = normalizeQueryEGS(s);
    let shortenQuery = false
    if (canShortenQuery(queryStr)) {
      queryStr = getShortenedQuery(queryStr);
      shortenQuery = true
    }
    if (querySet.has(queryStr)) {
      continue;
    }
    const res = await searchAndFollow(info, { shortenQuery, query: queryStr });
    querySet.add(queryStr);
    if (res) {
      return res;
    }
    await sleep(500);
  }
}

// search and follow the URL of search result
export async function searchAndFollow(info: SearchSubject, opts: SearchOptions = {}): Promise<SearchSubject> {
  const result = await searchSubject(info, ErogamescapeCategory.game, opts);
  if (result && result.url) {
    // await sleep(50)
    const rawText = await fetchText(result.url);
    window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
    const res = getSearchSubject();
    res.url = result.url;
    window._parsedEl = undefined;
    return res;
  } else {
    return result;
  }
}

export function getSearchSubject(): SearchSubject {
  const $title = $q('#soft-title > .bold');
  const rawName = normalizeEditionName($title.textContent.trim());
  const title = reviseTitle(rawName);
  let name = rawName;
  if (title !== rawName) {
    name = title;
  }
  const info: SearchSubject = {
    name,
    rawName,
    score: $q('#average > td')?.textContent.trim() ?? 0,
    count: $q('#count > td')?.textContent.trim() ?? 0,
    url: location.href,
    releaseDate: $q('#sellday > td')?.textContent.trim(),
  };
  return info;
}
