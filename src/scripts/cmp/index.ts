import { KvExpiration, GmEngine } from 'kv-expiration';
import { SearchResult, Subject } from '../../interface/subject';
import { findElement } from '../../utils/domUtils';
import { bangumiAnimePage } from './bangumi';
import { doubanAnimePage } from './douban';
import { PageConfig } from './types';

const USERJS_PREFIX = 'E_SCORE_';
const CURRENT_ID_DICT = 'CURRENT_ID_DICT';

const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);

function saveInfo(id: string, info: SearchResult) {
  if (id === '') {
    console.error('invalid id:  ', info);
    return;
  }
  storage.set(id, info, 7);
}

async function getSearchResult(
  pages: PageConfig[],
  subject: Subject,
  name: string,
  subjectId: string
): Promise<SearchResult> {
  let info: SearchResult = undefined;
  if (subjectId) {
    info = storage.get(subjectId);
  }
  if (info) {
    return info;
  }
  const site = pages.find((s) => s.name === name);
  if (!site) {
    return null;
  }
  info = await site.getSearchResult(subject);
  if (info) {
    saveInfo(site.getSubjectId(info.url), info);
  }
  return info;
}

function getScoreMap(site: string, id: string): Record<string, string> {
  const currentDict = storage.get(CURRENT_ID_DICT) || {};
  if (currentDict[site] === id) {
    return currentDict;
  }
  return storage.get('DICT_ID' + id) || {};
}
function setScoreMap(id: string, map: Record<string, string>) {
  storage.set(CURRENT_ID_DICT, map);
  storage.set('DICT_ID' + id, map, 7);
}

const animePages: PageConfig[] = [bangumiAnimePage, doubanAnimePage];

async function initPage(pages: PageConfig[]) {
  const idx = pages.findIndex((obj) => {
    if (Array.isArray(obj.href)) {
      return obj.href.some((href) => href.includes(location.host));
    } else {
      return obj.href.includes(location.host);
    }
  });
  if (idx === -1) {
    return;
  }
  const curPage = pages[idx];
  const $page = findElement(curPage.pageSelector);
  if (!$page) return;
  const $title = findElement(curPage.controlSelector);
  if (!$title) return;
  const curInfo = curPage.getScoreInfo();
  const subjectId = curPage.getSubjectId(curInfo.url);
  saveInfo(subjectId, curInfo);
  let scoreMap = getScoreMap(curPage.name, subjectId);
  const map = { ...scoreMap, [curPage.name]: subjectId };
  for (const page of pages) {
    const name = page.name;
    if (page.name === curPage.name) {
      continue;
    }
    const searchResult = await getSearchResult(
      pages,
      curInfo,
      name,
      scoreMap[name]
    );
    if (searchResult) {
      map[name] = page.getSubjectId(searchResult.url);
    }
    const searchUrl = page.searchApi.replace(
      '{kw}',
      encodeURIComponent(curInfo.name)
    );
    curPage.insertScoreInfo(name, searchUrl, searchResult);
  }
  setScoreMap(subjectId, map);
}
initPage(animePages);
