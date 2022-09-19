import { KvExpiration, GmEngine } from 'kv-expiration';
import { SearchResult, Subject } from '../../interface/subject';
import { $q, $qa, findElement } from '../../utils/domUtils';
import { PageConfig } from './types';

const USERJS_PREFIX = 'E_SCORE_';
const CURRENT_ID_DICT = 'CURRENT_ID_DICT';

const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);

function saveInfo(info: SearchResult) {
  storage.set(info.url, info, 7);
}

async function getSearchResult(
  subject: Subject,
  name: string,
  url: string
): Promise<SearchResult> {
  let info: SearchResult = undefined;
  if (url) {
    info = storage.get(url);
  }
  if (info) {
    return info;
  }
  const site = siteDict.find((s) => s.name === name);
  if (!site) {
    return null;
  }
  info = await site.getSearchResult(subject);
  if (info) {
    saveInfo(info);
  }
  return info;
}

function getScoreMap(site: string, url: string): Record<string, string> {
  const currentDict = storage.get(CURRENT_ID_DICT) || {};
  if (currentDict[site] === url) {
    return currentDict;
  }
  return storage.get('DICT_ID' + url) || {};
}
function setScoreMap(url: string, map: Record<string, string>) {
  storage.set(CURRENT_ID_DICT, map);
  storage.set('DICT_ID' + url, map, 7);
}

const siteDict: PageConfig[] = [];

async function main() {
  const idx = siteDict.findIndex((obj) => {
    if (Array.isArray(obj.href)) {
      return obj.href.some((href) => href.includes(location.host));
    } else {
      return obj.href.includes(location.host);
    }
  });
  if (idx === -1) {
    return;
  }
  const page = siteDict[idx];
  const $page = findElement(page.pageSelector);
  if (!$page) return;
  const $title = findElement(page.controlSelector);
  if (!$title) return;
  const curInfo = page.getScoreInfo();
  saveInfo(curInfo);
  let scoreMap = getScoreMap(page.name, location.href);
  const map = { ...scoreMap, [page.name]: location.href };
  for (const s of siteDict) {
    const name = s.name;
    if (s.name === page.name) {
      continue;
    }
    const searchResult = await getSearchResult(curInfo, name, scoreMap[name]);
    if (searchResult) {
      map[name] = searchResult.url;
      page.insertScoreInfo(name, searchResult);
    }
  }
  setScoreMap(location.href, map);
}
main();
