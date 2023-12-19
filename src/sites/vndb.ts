import { SearchSubject, Subject } from '../interface/subject';
import { sleep } from '../utils/async/sleep';
import { $q, $qa } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { getShortenedQuery, normalizeQuery } from '../utils/utils';
import { filterResults } from './common';
import {
  getAlias,
  isEnglishName,
  normalizeEditionName,
  removePairs,
  removeSubTitle,
  replaceCharsToSpace,
  replaceToASCII,
} from './utils';

export const favicon = 'https://vndb.org/favicon.ico';

function reviseQueryVNDB(str: string) {
  // @TODO: カオスQueen遼子4 森山由梨＆郁美姉妹併呑編

  // fixed: White x Red
  return str.replace(' x ', ' ').replace(/　/g, ' ');
}

function reviseTitle(title: string) {
  const titleDict: Record<string, string> = {
    'レベル-F': 'Lv-F',
    'カオスヘッド らぶChu☆Chu!': 'CHAOS;HEAD らぶChu☆Chu!',
    'ドキドキ文芸部!': 'Doki Doki Literature Club!',
    // https://vndb.org/v13666
    '凍京NECRO＜トウキョウ・ネクロ＞': '凍京NECRO',
    // https://vndb.org/v4102
    'Ｓｕｍｍｅｒラディッシュ・バケーション!!2': 'サマー・ラディッシュ・バケーション!! 2',
    'ランス4　－教団の遺産－': 'Rance IV -教団の遺産-',
    'ランス５Ｄ －ひとりぼっちの女の子－': 'Rance5D ひとりぼっちの女の子',
    ＲａｇｎａｒｏｋＩｘｃａ: 'Ragnarok Ixca',
    'グリザイアの果実 -LE FRUIT DE LA GRISAIA-': 'グリザイアの果実',
    'ブラック ウルヴス サーガ -ブラッディーナイトメア-': 'Black Wolves Saga -Bloody Nightmare-',
    'ファミコン探偵倶楽部PartII うしろに立つ少女': 'ファミコン探偵倶楽部 うしろに立つ少女',
    'Rance Ⅹ -決戦-': 'ランス10',
    'PARTS ─パーツ─': 'PARTS',
    // revise for searching
    'LOVE FOREVER 1 Progress': 'LOVE FOREVER',
  };
  const userTitleDict = window.VNDB_REVISE_TITLE_DICT || {};
  if (userTitleDict[title]) {
    return userTitleDict[title];
  }
  if (titleDict[title]) {
    return titleDict[title];
  }
  const shortenTitleDict: Record<string, string> = {
    淫獣学園: '淫獣学園',
  };
  for (const [key, val] of Object.entries(shortenTitleDict)) {
    if (title.includes(key)) {
      return val;
    }
  }
  return reviseQueryVNDB(title);
}

function getSearchItem($item: HTMLElement): SearchSubject {
  const $title = $item.querySelector('.tc_title > a');
  const href = new URL($title.getAttribute('href'), 'https://vndb.org/').href;
  const $rating = $item.querySelector('.tc_rating');
  const rawName = $title.getAttribute('title');
  const info: SearchSubject = {
    name: reviseTitle(rawName),
    rawName,
    url: href,
    count: 0,
    releaseDate: $item.querySelector('.tc_rel').textContent,
  };
  const score = $rating.firstChild.textContent;
  if (!isNaN(Number(score))) {
    info.score = score;
  }
  const m = $rating.textContent.match(/\((\d+)\)/);
  if (m) {
    info.count = m[1];
  }
  return info;
}

// exception title
// 凍京NECRO＜トウキョウ・ネクロ＞
// https://vndb.org/v5154

export async function searchSubject(
  subjectInfo: Subject,
  opts: { query?: string; shortenQuery?: boolean } = {}
): Promise<SearchSubject> {
  let query = opts.query || subjectInfo.name;
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  let res;
  const url = `https://vndb.org/v?sq=${encodeURIComponent(query)}`;
  console.info('vndb search URL: ', url);
  const rawText = await fetchText(url, {
    headers: {
      referer: 'https://vndb.org/',
    },
  });
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const $vndetails = $doc.querySelector('.vndetails');
  // 重定向
  if ($vndetails) {
    window._parsedEl = $doc;
    const res = getSearchSubject();
    res.url = $doc.querySelector('head > base').getAttribute('href');
    window._parsedEl = undefined;
    return res;
  }
  const items = $doc.querySelectorAll('.browse.vnbrowse table > tbody > tr');
  const rawInfoList: SearchSubject[] = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => getSearchItem($item));
  const filterOpts = {
    releaseDate: true,
    threshold: 0.4,
    keys: ['name'],
  };
  // fix: Ib
  if (/^[a-zA-Z]+$/.test(subjectInfo.name) && rawInfoList.length > 10) {
    return filterResults(rawInfoList, subjectInfo, { ...filterOpts, sameName: true });
  }
  res = filterResults(rawInfoList, subjectInfo, filterOpts);
  if (res && res.url) {
    console.info(`Search result of ${query} on vndb: `, res);
    return res;
  }
  if (opts.shortenQuery) {
    const name = subjectInfo.name;
    // have sub title
    if (!res && getAlias(name).length > 0) {
      const changedName = removeSubTitle(name);
      // fix: 痕 -きずあと-
      res = rawInfoList.find((item) => item.name === changedName);
      if (res) {
        return res
      }
    }
    // fix: LOVE FOREVER 1 Progress; @TODO filter out wrong name
    return filterResults(rawInfoList, { ...subjectInfo, name: opts.query }, {
      ...filterOpts,
      threshold: 0.1
    });
  }
  res = filterResults(rawInfoList, { ...subjectInfo, name: opts.query }, filterOpts);
  return res;
}

function normalizeQueryVNDB(query: string): string {
  query = replaceToASCII(query);
  query = removePairs(query);
  query = replaceCharsToSpace(query);
  return query;
}

export async function searchGameData(info: SearchSubject): Promise<SearchSubject> {
  const revisedName = reviseTitle(info.name);
  if (revisedName !== info.name) {
    let result = await searchSubject(info);
    return patchSearchResult(result);
  }
  // fix EXTRA VA MIZUNA
  if (isEnglishName(info.name)) {
    let result = await searchSubject(info);
    return patchSearchResult(result);
  }
  let query = normalizeQueryVNDB(info.name);
  let result = await searchSubject(info, { query });
  if (!result) {
    await sleep(100);
    query = getShortenedQuery(query);
    result = await searchSubject(info, { shortenQuery: true, query });
  }
  return patchSearchResult(result)
}

async function patchSearchResult(result: SearchSubject) {
  // when score is empty, try to extract score from page
  if (result && result.url && Number(result.count) > 0 && isNaN(Number(result.score))) {
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
  let name = $q('tr.title span[lang="ja"]')?.textContent;
  if (!name) {
    name = $q('tr.title td:nth-of-type(2) > span').textContent;
  }
  const info: SearchSubject = {
    name,
    rawName: name,
    score: $q('.rank-info.control-group .score')?.textContent.trim() ?? 0,
    count: 0,
    url: location.href,
  };
  const vote = $q('.votegraph tfoot > tr > td')?.textContent.trim();
  if (vote) {
    const v = vote.match(/^\d+/);
    if (v) {
      info.count = v[0];
    }
    const s = vote.match(/(\d+(\.\d+)?)(?= average)/);
    if (s) {
      info.score = s[1];
    }
  }
  let alias = [];
  // get release date
  for (const elem of $qa('table.releases tr')) {
    if (elem.querySelector('.icon-rtcomplete')) {
      info.releaseDate = elem.querySelector<HTMLElement>('.tc1')?.innerText;
      const jaTitle = elem.querySelector<HTMLElement>('.tc4 > [lang="ja-Latn"]')?.title;
      if (jaTitle && !jaTitle.includes(info.name)) {
        alias.push(normalizeEditionName(jaTitle));
      }
      break;
    }
  }
  const $title = $q('tr.title td:nth-of-type(2)')?.cloneNode(true) as HTMLElement;
  if ($title) {
    $title.querySelector('span')?.remove();
    const enName = $title.textContent.trim();
    if (enName) {
      alias.push(enName);
    }
  }
  alias.push(...getAliasVNDB(name));
  // find alias
  for (const $el of $qa('.vndetails > table tr > td:first-child')) {
    if ($el.textContent.includes('Aliases')) {
      alias.push(...$el.nextElementSibling.textContent.split(',').map((s) => s.trim()));
      break;
    }
  }
  if (alias.length > 0) {
    const newAlias: string[] = [];
    for (const s of alias) {
      // skip vol.1  vol1  vol2
      if (/vol\.?\d+/i.test(s)) {
        continue;
      }
      // skip abbreviation
      if (/^[A-Z]{1,}$/.test(s)) {
        continue
      }
      if (!newAlias.includes(s)) {
        newAlias.push(s);
      }
    }
    info.alias = newAlias;
  }
  // final step
  info.name = reviseTitle(info.name);
  return info;
}

// 注意使用 alias 时，太短的alias会干扰搜索结果
// 吸血美人 vol.1 ---->  vol.1 就会干扰搜索结果

function getAliasVNDB(name: string) {
  name = name.replace(/　/g, ' ');
  const alias = getAlias(name) || [];
  if (alias && alias.length > 0) {
    return alias;
  }
  return alias;
}
