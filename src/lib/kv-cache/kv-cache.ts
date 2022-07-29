import { KvEngine } from './types';

type TimeOpt =
  | number
  | {
      hh?: number;
      dd?: number;
      mm?: number;
      ss?: number;
      ms?: number;
    };

function getMilliseconds(opt: TimeOpt): number {
  if (typeof opt === 'number') {
    const oneDay = 24 * 60 * 60 * 1000;
    return oneDay * opt;
  }
  const d = (opt.dd || 0) + 1;
  return (
    +new Date(1970, 1, d, opt.hh, opt.mm, opt.ss, opt.ms) - +new Date(1970, 1)
  );
}

export class KvCache {
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
  flushExpired() {
    const pre = `${this.prefix}${this.bucket}`;
    this.engine.keys().forEach((key) => {
      if (key.startsWith(pre) && !key.endsWith(this.suffix)) {
        this.flushExpiredItem(key.replace(pre, ''));
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
  set(key: string, value: any, opt?: TimeOpt): boolean {
    this.engine.set(this.genKey(key), value);
    if (opt) {
      const invalidTime = +new Date() + getMilliseconds(opt);
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
