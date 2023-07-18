import { KvExpiration, GmEngine } from 'kv-expiration';
import { SearchResult } from '../../interface/subject';
import { ScoreMap } from './types';

const USERJS_PREFIX = 'E_SCORE_';
const CURRENT_ID_DICT = 'CURRENT_ID_DICT';

const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);

export function clearInfoStorage() {
  storage.flush();
}

export function saveInfo(id: string, info: SearchResult, expiration?: number) {
  expiration = expiration || 7;
  if (id === '') {
    console.error('invalid id:  ', info);
    return;
  }
  storage.set(id, info, expiration);
}

export function getInfo(id: string) {
  if (id) {
    return storage.get(id);
  }
}

export function getScoreMap(site: string, id: string): ScoreMap {
  const currentDict = storage.get(CURRENT_ID_DICT) || {};
  if (currentDict[site] === id) {
    return currentDict;
  }
  return storage.get('DICT_ID' + id) || {};
}

export function setScoreMap(id: string, map: ScoreMap) {
  storage.set(CURRENT_ID_DICT, map);
  storage.set('DICT_ID' + id, map, 7);
}
