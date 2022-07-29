import { KvEngine } from './types';

export class Storage {
  constructor(
    private engine: KvEngine,
    private prefix: string,
    private suffix: string = '-expiration',
    private bucket: string = ''
  ) {}
  genExpirationKey(key: string): string {
    return `${this.prefix}${this.bucket}${key}${this.suffix}`;
  }
  genKey(key: string): string {
    return `${this.prefix}${this.bucket}${key}`;
  }
  flush() {
    this.engine.keys().forEach((key) => {
      if (key.startsWith(`${this.prefix}${this.bucket}`)) {
        this.engine.remove(key);
      }
    });
  }
  flushExpiredItem(key: string): boolean {
    var exprKey = this.genExpirationKey(key);
    let time = this.engine.get(exprKey);
    if (time) {
      if (typeof time !== 'number') {
        time = parseInt(time);
      }
      if (+new Date() >= time) {
        this.engine.remove(exprKey);
        this.engine.remove(this.genKey(key));
        return true;
      }
    }
    return false;
  }
  set(key: string, value: any, day?: number): boolean {
    this.engine.set(this.genKey(key), value);
    if (day) {
      const oneDay = 24 * 60 * 60 * 1000;
      const invalidTime = +new Date() + day * oneDay;
      this.engine.set(this.genExpirationKey(key), invalidTime);
    }
    return true;
  }
  get(key: string): any {
    if (this.flushExpiredItem(key)) {
      return;
    }
    return this.engine.get(this.genKey(key));
  }
  remove(key: string) {
    this.engine.remove(this.genKey(key));
    this.engine.remove(this.genExpirationKey(key));
  }
}
