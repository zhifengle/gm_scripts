import { KvEngine } from './types';

// https://github.com/pamelafox/lscache

export class LsEngine implements KvEngine {
  set(key: string, value: any): boolean {
    try {
      value = JSON.stringify(value);
    } catch (e) {
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  }
  get(key: string) {
    let value = localStorage.getItem(key);
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  remove(key: string): void {
    localStorage.removeItem(key);
  }
  keys(): string[] {
    var arr: string[] = [];
    return arr;
  }
}
