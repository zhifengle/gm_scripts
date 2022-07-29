import { GmEngine, KvCache } from './lib/kv-cache';

const engine = new GmEngine();
const kvCache = new KvCache(engine, 'e_user_js');

kvCache.set(
  'test',
  {
    a: 1,
  },
  1
);
setTimeout(() => {
  console.log(kvCache.get('test'));
}, 5000);
