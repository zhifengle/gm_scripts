import { findElement } from './utils/domUtils';

const $dom = findElement({
  selector: 'body',
  subSelector: 'a[onclick^=jgjg]',
  keyWord: '前进至结束',
});

console.log($dom);
