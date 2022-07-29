import { KvEngine } from './types';

export class GmEngine implements KvEngine {
  set(key: string, value: any): boolean {
    GM_setValue(key, value);
    return true;
  }
  get(key: string) {
    return GM_getValue(key);
  }
  remove(key: string): void {
    GM_deleteValue(key);
  }
  keys(): string[] {
    return GM_listValues();
  }
}
