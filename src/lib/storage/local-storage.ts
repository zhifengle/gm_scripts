import { KvEngine } from './types';

// https://github.com/pamelafox/lscache

export class LsEngine implements KvEngine {
  setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  set(key: string, value: any): boolean {
    if (typeof value === 'object') {
      try {
        value = JSON.stringify(value);
      } catch (e) {
        return false;
      }
    }
    this.setItem(key, value);
    return true;
  }
  get(key: string) {
    localStorage.getItem(key);
  }
  remove(key: string): void {
    localStorage.removeItem(key);
  }
  keys(): string[] {
    var arr: string[] = [];
    return arr;
  }
}
