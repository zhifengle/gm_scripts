import { KvExpiration, GmEngine } from 'kv-expiration';
import { SearchSubject } from '../../interface/subject';
import { ScoreMap } from './types';

const USERJS_PREFIX = 'E_SCORE_';
const CURRENT_ID_DICT = 'CURRENT_ID_DICT';

const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);

export function clearInfoStorage() {
  storage.flush();
}

export function saveInfo(id: string, info: SearchSubject, expiration?: number) {
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

  const scoreMap = storage.get('DICT_ID' + id);
  if (scoreMap) {
    return scoreMap;
  }

  if (
    currentDict[site] === id ||
    Object.values(currentDict).includes(id)
  ) {
    return currentDict;
  }

  return {};
}

export function setScoreMap(id: string, map: ScoreMap, expiration?: number) {
  if (!id) {
    console.error('invalid score map id: ', map);
    return;
  }
  storage.set(CURRENT_ID_DICT, map);
  const ids = new Set([id, ...Object.values(map)].filter(Boolean));
  ids.forEach((mapId) => {
    storage.set('DICT_ID' + mapId, map, expiration || 7);
  });
}
