import { SearchResult, Subject } from '../interface/subject';
import { $q, $qa } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { normalizeQuery } from '../utils/utils';
import { filterResults } from './common';

export const favicon = 'https://vndb.org/favicon.ico';

function normalizeTitle(title: string) {
  return title.replace(/＜.+＞/, '')
}

function getSearchItem($item: HTMLElement): SearchResult {
  const $title = $item.querySelector('.tc_title > a');
  const href = new URL($title.getAttribute('href'), 'https://vndb.org/').href;
  const $rating = $item.querySelector('.tc_rating');
  const info: SearchResult = {
    name: normalizeTitle($title.getAttribute('title')),
    url: href,
    count: 0,
    score: $rating.firstChild.textContent,
    releaseDate: $item.querySelector('.tc_rel').textContent,
  };
  const m = $rating.textContent.match(/\((\d+)\)/);
  if (m) {
    info.count = m[1];
  }
  return info;
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
  const items = $doc.querySelectorAll(
    '.browse.vnbrowse table > tbody > tr'
  );
  const rawInfoList: SearchResult[] = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => getSearchItem($item));
  searchResult = filterResults(rawInfoList, subjectInfo, {
    releaseDate: true,
    keys: ['name'],
  }, true);
  console.info(`Search result of ${query} on vndb: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
}

export function getSearchResult(): SearchResult {
  let name = $q('tr.title span[lang="ja"]')?.textContent;
  if (!name) {
    name = $q('tr.title td:nth-of-type(2) > span').textContent;
  }
  const info: SearchResult = {
    name: normalizeTitle(name),
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
  // get release date
  for (const elem of $qa('table.releases tr')) {
    if (elem.querySelector('.icon-rtcomplete')) {
      info.releaseDate = elem.querySelector<HTMLElement>('.tc1')?.innerText
      break
    }
  }
  return info;
}
