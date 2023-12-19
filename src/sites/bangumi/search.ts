import { SearchSubject } from '../../interface/subject';
import { SubjectTypeId } from '../../interface/wiki';
import { fetchInfo, fetchJson, fetchText } from '../../utils/fetchData';
import { getSearchSubject } from './extract';

export async function postSearch(query: string, bgmHost: string, type: SubjectTypeId): Promise<string> {
  const url = `${bgmHost}/subject_search`;
  return await fetchInfo(url, 'text', {
    headers: { 'content-type': 'application/x-www-form-urlencoded', Referer: 'https://bgm.tv/' },
    data: {
      cat: type,
      search_text: query,
      submit: '搜索',
    },
  });
}

export async function searchGameApi(query: string, bgmHost: string) {
  return await fetchJson(`${bgmHost}/subject_search/${encodeURIComponent(query)}`);
}

export async function searchSubjectsApi(keyword: string, type: SubjectTypeId) {
  const body = {
    keyword: keyword,
    sort: 'rank',
    filter: {
      type: [type],
    },
  };
  return await fetchJson('https://api.bgm.tv/v0/search/subjects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function patchSearchResult(result: SearchSubject) {
  if (result && result.url) {
    const rawText = await fetchText(result.url);
    window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
    let res = getSearchSubject();
    res = {
      ...result,
      count: res.count
    }
    window._parsedEl = undefined;
    return res;
  } else {
    return result;
  }
}
