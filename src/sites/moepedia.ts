import { SearchSubject, Subject } from '../interface/subject';
import { Selector } from '../interface/wiki';
import { $q, findElement } from '../utils/domUtils';
import { fetchText } from '../utils/fetchData';
import { dealDate } from '../utils/utils';
import { filterResults } from './common';

export function getSearchSubject(): SearchSubject {
  const $title = $q('.body-top_info_title > h2');
  const info: SearchSubject = {
    name: $title.textContent.trim(),
    score: 0,
    count: '-',
    url: location.href,
  };

  const topTableSelector: Selector = {
    selector: 'table',
    subSelector: 'tr > th',
    sibling: true,
  };
  const $d = findElement({
    ...topTableSelector,
    keyWord: '発売日',
  });
  if ($d) {
    info.releaseDate = dealDate($d.textContent.split('日')[0]);
  }
  return info;
}

function getSearchItem($item: HTMLElement): SearchSubject {
  const $title = $item.querySelector('.product-title');
  const href = $item.querySelector('a.product-body').getAttribute('href');
  const info: SearchSubject = {
    name: $title.textContent,
    url: href,
    count: '-',
    score: 0,
  };
  const $d = $item.querySelector('.product-date > p');
  if ($d) {
    info.releaseDate = dealDate($d.textContent.split('日')[0]);
  }
  return info;
}

export async function searchGameSubject(info: Subject): Promise<SearchSubject> {
  const url = `https://moepedia.net/search/result/?s=${info.name}&t=on`;
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('.sw-Products .sw-Products_Item');
  const rawInfoList: SearchSubject[] = [...items].map(($item: HTMLElement) =>
    getSearchItem($item)
  );
  const res = filterResults(
    rawInfoList,
    info,
    {
      keys: ['name'],
    },
  );
  console.info(`Search result of ${info.name} on moepedia: `, res);
  if (res && res.url) {
    // 相对路径需要设置一下
    res.url = new URL(res.url, url).href;
    return res;
  }
}
