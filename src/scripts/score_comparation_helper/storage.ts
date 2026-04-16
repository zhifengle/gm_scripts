import { KvExpiration, GmEngine } from 'kv-expiration';
import { SearchSubject } from '../../interface/subject';
import { ScoreMap, ScoreMapEntry } from './types';

const USERJS_PREFIX = 'E_SCORE_V2_';
const CURRENT_ID_DICT = 'CURRENT_ID_DICT';
const SCORE_MAP_PREFIX = 'DICT_ID';
const DEFAULT_EXPIRATION_DAYS = 7;
const CURRENT_MAP_EXPIRATION_DAYS = 1;

const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);

export function clearInfoStorage() {
  storage.flush();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isSearchSubject(value: unknown): value is SearchSubject {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  );
}

function isScoreMapEntry(value: unknown): value is ScoreMapEntry {
  if (!isObject(value) || typeof value.status !== 'string') return false;
  if (value.status === 'matched') {
    return typeof value.id === 'string' && value.id !== '';
  }
  if (value.status === 'no-match') {
    return typeof value.cacheKey === 'string' && value.cacheKey !== '';
  }
  return false;
}

function isScoreMap(value: unknown): value is ScoreMap {
  if (!isObject(value)) return false;
  return Object.values(value).every(isScoreMapEntry);
}

function getMatchedIds(map: ScoreMap): string[] {
  return Object.values(map)
    .filter((entry): entry is Extract<ScoreMapEntry, { status: 'matched' }> =>
      entry.status === 'matched'
    )
    .map((entry) => entry.id);
}

function mapHasMatchedId(map: ScoreMap, site: string, id: string): boolean {
  const siteEntry = map[site];
  return (
    (siteEntry?.status === 'matched' && siteEntry.id === id) ||
    getMatchedIds(map).includes(id)
  );
}

export function saveSubjectInfo(
  id: string,
  info: SearchSubject,
  expiration?: number
): void {
  const expirationDays = expiration || DEFAULT_EXPIRATION_DAYS;
  if (id === '') {
    console.error('invalid id:  ', info);
    return;
  }
  storage.set(id, info, expirationDays);
}

export function getSubjectInfo(id: string): SearchSubject | undefined {
  if (!id) return;
  const info = storage.get(id);
  if (isSearchSubject(info)) return info;
}

export function saveNoMatchInfo(
  cacheKey: string,
  expiration?: number
): SearchSubject | undefined {
  if (!cacheKey) {
    console.error('invalid no-match cache key');
    return;
  }
  const info: SearchSubject = { url: '', name: '' };
  storage.set(cacheKey, info, expiration || DEFAULT_EXPIRATION_DAYS);
  return info;
}

export function getScoreMap(site: string, id: string): ScoreMap {
  if (!id) return {};

  const scoreMap = storage.get(SCORE_MAP_PREFIX + id);
  if (isScoreMap(scoreMap)) {
    return scoreMap;
  }

  const currentDict = storage.get(CURRENT_ID_DICT);
  if (isScoreMap(currentDict) && mapHasMatchedId(currentDict, site, id)) {
    return currentDict;
  }

  return {};
}

export function setScoreMap(id: string, map: ScoreMap, expiration?: number) {
  if (!id) {
    console.error('invalid score map id: ', map);
    return;
  }
  storage.set(CURRENT_ID_DICT, map, CURRENT_MAP_EXPIRATION_DAYS);
  const ids = new Set([id, ...getMatchedIds(map)].filter(Boolean));
  ids.forEach((mapId) => {
    storage.set(SCORE_MAP_PREFIX + mapId, map, expiration || DEFAULT_EXPIRATION_DAYS);
  });
}

export function getInfoFromMap(
  map: ScoreMap,
  site: string
): SearchSubject | undefined {
  const entry = map[site];
  if (!entry) return;
  if (entry.status === 'matched') {
    return getSubjectInfo(entry.id);
  }
  return getSubjectInfo(entry.cacheKey);
}
