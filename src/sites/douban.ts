import { SubjectItem } from '../interface/types';
import { sleep } from '../utils/async/sleep';
import { fetchText } from '../utils/fetchData';

type DoubanSubjectType = 'book' | 'movie' | 'music';
export type InterestType = 'collect' | 'do' | 'wish';

function genCollectionURL(
  userId: string,
  interestType: InterestType,
  subjectType: DoubanSubjectType = 'movie',
  start: number = 1
) {
  const baseURL = `https://${subjectType}.douban.com/people/${userId}/${interestType}`;
  if (start === 1) {
    return baseURL;
  } else {
    return `${baseURL}?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
  }
}

export function convertItemInfo($item: HTMLElement): SubjectItem {
  let $subjectTitle = $item.querySelector('.info .title a');
  // 默认第二项为日文名
  const titleArr = $subjectTitle.textContent
    .trim()
    .split('/')
    .map((str) => str.trim());
  const rawInfos = $item.querySelector('.info .intro').textContent.trim();
  let itemSubject: SubjectItem = {
    name: titleArr[1],
    rawInfos,
    url: $subjectTitle.getAttribute('href'),
    greyName: titleArr[0],
  };
  const $cover = $item.querySelector('.pic img');
  if ($cover && $cover.tagName.toLowerCase() === 'img') {
    const src = $cover.getAttribute('src');
    if (src) {
      itemSubject.cover = src;
    }
  }
  const jpDateReg = /(\d+-\d\d\-\d\d)(?:\(日本\))/;
  const dateReg = /\d+-\d\d\-\d\d/;
  let m;
  if ((m = rawInfos.match(jpDateReg))) {
    itemSubject.releaseDate = m[1];
  } else if ((m = rawInfos.match(dateReg))) {
    itemSubject.releaseDate = m[0];
  }
  const $collectInfo = $item.querySelector('.info');
  if ($collectInfo) {
    const collectInfo: any = {};
    collectInfo.date = $collectInfo
      .querySelector('li .date')
      ?.textContent.trim();
    collectInfo.tags = $collectInfo
      .querySelector('li .tags')
      ?.textContent.replace('标签: ', '')
      .trim();
    collectInfo.comment = $collectInfo
      .querySelector('li .comment')
      ?.textContent.trim();
    const $rating = $collectInfo.querySelector('[class^=rating]');
    if ($rating) {
      const m = $rating.getAttribute('class').match(/\d/);
      if (m) {
        // 十分制
        collectInfo.score = +m[0] * 2;
      }
    }
    itemSubject.collectInfo = collectInfo;
  }
  return itemSubject;
}

function getTotalPageNum($doc: Document | Element = document) {
  const numStr = $doc.querySelector('.mode > .subject-num').textContent.trim();
  return Number(numStr.split('/')[1].trim());
}

export function getItemInfos($doc: Document | Element = document) {
  const items = $doc.querySelectorAll('#content .grid-view > .item');
  const res = [];
  for (const item of Array.from(items)) {
    res.push(convertItemInfo(item as HTMLElement));
  }
  return res;
}
// https://movie.douban.com/people/y4950/collect?start=75&sort=time&rating=all&filter=all&mode=grid
export async function getAllPageInfo(
  userId: string,
  subjectType: DoubanSubjectType = 'movie',
  interestType: InterestType
) {
  let res: SubjectItem[] = [];
  const url = genCollectionURL(userId, interestType, subjectType);
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const totalPageNum = getTotalPageNum($doc);
  res = [...getItemInfos($doc)];
  // 16 分割
  let page = 16;
  while (page <= totalPageNum) {
    let reqUrl = genCollectionURL(userId, interestType, subjectType, page);
    await sleep(500);
    console.info('fetch info: ', reqUrl);
    const rawText = await fetchText(reqUrl);
    const $doc = new DOMParser().parseFromString(rawText, 'text/html');
    res.push(...getItemInfos($doc));
    page += 15;
  }
  return res;
}
