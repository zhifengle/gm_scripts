import { SearchResult, Subject } from '../interface/subject';
import { sleep } from '../utils/async/sleep';
import { $q, $qa } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { getShortenedQuery, normalizeEditionName, normalizeQuery } from '../utils/utils';
import { filterResults } from './common';

export const favicon = 'https://vndb.org/favicon.ico';

function normalizeQueryVNDB(str: string) {
  // fixed: カオスQueen遼子4 森山由梨＆郁美姉妹併呑編
  if (/.+?\s[^\s]+$/.test(str)) {
    return str.replace(/\d\s.+$/, '');
  }
  // fixed: White x Red
  return str.replace(' x ', ' ');
}

function reviseTitle(title: string) {
  const titleDict: Record<string, string> = {
    'ランス５Ｄ －ひとりぼっちの女の子－': 'Rance5D ひとりぼっちの女の子',
    ＲａｇｎａｒｏｋＩｘｃａ: 'Ragnarok Ixca',
    'グリザイアの果実 -LE FRUIT DE LA GRISAIA-': 'グリザイアの果実',
    'ブラック ウルヴス サーガ -ブラッディーナイトメア-': 'Black Wolves Saga -Bloody Nightmare-',
    'ファミコン探偵倶楽部PartII うしろに立つ少女': 'ファミコン探偵倶楽部 うしろに立つ少女',
    'Rance Ⅹ -決戦-': 'ランス10',
    'PARTS ─パーツ─': 'PARTS',
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
  return normalizeQueryVNDB(title);
}

function getSearchItem($item: HTMLElement): SearchResult {
  const $title = $item.querySelector('.tc_title > a');
  const href = new URL($title.getAttribute('href'), 'https://vndb.org/').href;
  const $rating = $item.querySelector('.tc_rating');
  const rawName = $title.getAttribute('title');
  const info: SearchResult = {
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

export async function searchSubject(subjectInfo: SearchResult): Promise<SearchResult> {
  let query = normalizeQuery((subjectInfo.name || '').trim());
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  let searchResult;
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
    const res = getSearchResult();
    res.url = $doc.querySelector('head > base').getAttribute('href');
    window._parsedEl = undefined;
    return res;
  }
  const items = $doc.querySelectorAll('.browse.vnbrowse table > tbody > tr');
  const rawInfoList: SearchResult[] = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => getSearchItem($item));
  searchResult = filterResults(
    rawInfoList,
    subjectInfo,
    {
      releaseDate: true,
      keys: ['name', 'rawName'],
    },
    true
  );
  console.info(`Search result of ${query} on vndb: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
}

export async function searchGameData(info: SearchResult): Promise<SearchResult> {
  const result = await searchSubject(info);
  // when score is empty, try to extract score from page
  if (result && result.url && Number(result.count) > 0 && isNaN(Number(result.score))) {
    await sleep(100);
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
  let name = $q('tr.title span[lang="ja"]')?.textContent;
  if (!name) {
    name = $q('tr.title td:nth-of-type(2) > span').textContent;
  }
  const info: SearchResult = {
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
        // add title to alias
        alias.push(name);
        info.name = normalizeEditionName(jaTitle);
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
  alias.push(...getAlias(info.name))
  alias.push(...getAlias(name))
  // find alias
  for (const $el of $qa('.vndetails > table tr > td:first-child')) {
    if ($el.textContent.includes('Aliases')) {
      alias.push(...$el.nextElementSibling.textContent.split(',').map((s) => s.trim()));
      break;
    }
  }
  if (alias.length > 0) {
    info.alias = [...new Set(alias)];
  }
  // final step
  info.name = reviseTitle(info.name);
  return info;
}

function getAlias(name: string) {
  const alias = [];
  let m: RegExpMatchArray;
  if (name.match(/\s─(.+?)─$/)) {
    m = name.match(/\s─(.+?)─$/);
  } else if (name.match(/\s~(.+?)~$/)) {
    m = name.match(/\s~(.+?)~$/);
  } else if (name.match(/\s～(.+?)～$/)) {
    m = name.match(/\s～(.+?)～$/);
  } else if (name.match(/\s-(.+?)-$/)) {
    m = name.match(/\s-(.+?)-$/);
  }
  if (m) {
    alias.push(name.split(' ')[0]);
    alias.push(m[1]);
  }
  return alias
}
