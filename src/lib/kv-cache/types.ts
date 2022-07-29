export interface KvEngine {
  set(key: string, value: any, time?: number): boolean;
  get(key: string): any;
  remove(key: string): void;
  keys(): string[];
}
