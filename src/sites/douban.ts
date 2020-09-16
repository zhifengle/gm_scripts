import { SearchResult, Subject } from '../interface/subject';
import {
  IInterestData,
  InterestType,
  SiteUtils,
  SubjectItem,
  SubjectType,
} from '../interface/types';
import { sleep } from '../utils/async/sleep';
import { htmlToElement } from '../utils/domUtils';
import { fetchJson, fetchText } from '../utils/fetchData';
import { filterResults, findInterestStatusById } from './common';

function genCollectionURL(
  userId: string,
  interestType: InterestType,
  subjectType: SubjectType = 'movie',
  start: number = 1
) {
  const baseURL = `https://${subjectType}.douban.com/people/${userId}/${interestType}`;
  if (start === 1) {
    return baseURL;
  } else {
    return `${baseURL}?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
  }
}

function convertBangumiScore(num: number): number {
  if (num < 4) {
    return 1;
  }
  if (num < 6) {
    return 2;
  }
  if (num < 8) return 3;
  if (num < 9) return 4;
  if (num === 10) return 5;
  return 0;
}

function getSubjectId(url: string): string {
  const m = url.match(/movie\.douban\.com\/subject\/(\d+)/);
  if (m) {
    return m[1];
  }
  return '';
}

export function getUserId(homeURL: string) {
  let m = homeURL.match(/douban.com\/people\/([^\/]*)\//);
  if (m) {
    return m[1];
  }
  return '';
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
/**
 * 获取所有分页的条目数据
 * @param userId 用户id
 * @param subjectType 条目类型
 * @param interestType 条目状态
 */
export async function getAllPageInfo(
  userId: string,
  subjectType: SubjectType = 'movie',
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

function convertHomeSearchItem($item: HTMLElement): SearchResult {
  const dealHref = (href: string) => {
    const urlParam = href.split('?url=')[1];
    if (urlParam) {
      return decodeURIComponent(urlParam.split('&')[0]);
    } else {
      throw 'invalid href';
    }
  };
  const $title = $item.querySelector('.title h3 > a');
  const href = dealHref($title.getAttribute('href'));
  const $ratingNums = $item.querySelector(
    '.rating-info > .rating_nums'
  ) as HTMLElement;
  let ratingsCount = '';
  let averageScore = '';
  if ($ratingNums) {
    const $count = $ratingNums.nextElementSibling as HTMLElement;
    const m = $count.innerText.match(/\d+/);
    if (m) {
      ratingsCount = m[0];
    }
    averageScore = $ratingNums.innerText;
  }
  const greayName = ($item.querySelector('.subject-cast') as HTMLElement)
    .innerText;
  return {
    name: $title.textContent.trim(),
    greyName: greayName.split('/')[0].replace('原名:', '').trim(),
    releaseDate: (greayName.match(/\d{4}$/) || [])[0],
    url: href,
    score: averageScore,
    count: ratingsCount,
  };
}
/**
 * 通过首页搜索的结果
 * @param query 搜索字符串
 */
async function getHomeSearchResults(
  query: string,
  cat = '1002'
): Promise<SearchResult[]> {
  const url = `https://www.douban.com/search?cat=${cat}&q=${encodeURIComponent(
    query
  )}`;
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll(
    '.search-result > .result-list > .result > .content'
  );
  return Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => convertHomeSearchItem($item));
}
function convertSubjectSearchItem($item: HTMLElement): SearchResult {
  // item-root
  const $title = $item.querySelector('.title a') as HTMLElement;
  let ratingsCount = '';
  let averageScore = '';
  const $ratingNums = $item.querySelector('.rating_nums');
  if ($ratingNums) {
    const $count = $ratingNums.nextElementSibling;
    const m = $count.textContent.match(/\d+/);
    if (m) {
      ratingsCount = m[0];
    }
    averageScore = $ratingNums.textContent;
  }
  return {
    name: $title.innerText,
    url: $title.getAttribute('href'),
    score: averageScore,
    count: ratingsCount,
  };
}
/**
 * 单独类型搜索入口
 * @param query 搜索字符串
 * @param cat 类型
 */
async function getSubjectSearchResults(
  query: string,
  cat = '1002'
): Promise<SearchResult[]> {
  const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
    query
  )}&cat=${cat}`;
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll('#root .item-root');
  return Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => convertSubjectSearchItem($item));
}
async function updateInterest(subjectId: string, data: IInterestData) {
  const interestObj = findInterestStatusById(data.interest);
  let query = '';
  if (data.interest !== undefined) {
    query = 'interest=' + interestObj.key;
  }
  let url = `https://movie.douban.com/j/subject/${subjectId}/interest?${query}`;
  const collectInfo = await fetchJson(url);
  const interestStatus = collectInfo.interest_status;
  const tags = collectInfo.tags;
  const $doc = new DOMParser().parseFromString(collectInfo.html, 'text/html');
  const $form = $doc.querySelector('form');
  const formData = new FormData($form);
  const sendData = {
    interest: interestObj.key,
    tags: data.tags,
    comment: data.comment,
    rating: convertBangumiScore(+data.rating) + '',
  };
  if (tags && tags.length) {
    sendData.tags = tags.join(' ');
  }
  if (interestStatus) {
    sendData.interest = interestStatus;
  }
  if (data.privacy === '1') {
    // @ts-ignore
    sendData.privacy = 'on';
  }
  for (let [key, val] of Object.entries(sendData)) {
    if (!formData.has(key)) {
      formData.append(key, val);
    } else if (formData.has(key) && !formData.get(key) && val) {
      formData.set(key, val);
    }
  }
  await fetch($form.action, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formData,
  });
}
async function checkAnimeSubjectExist(
  subjectInfo: Subject
): Promise<SearchResult> {
  let query = (subjectInfo.name || '').trim();
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  const rawInfoList = await getHomeSearchResults(query);
  // const rawInfoList = await getSubjectSearchResults(query);
  const options = {
    keys: ['name', 'greyName'],
  };
  let searchResult = filterResults(rawInfoList, subjectInfo, options);
  console.info(`Search result of douban: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
}

export const siteUtils: SiteUtils = {
  name: '豆瓣',
  contanerSelector: '#content .aside',
  getUserId,
  getSubjectId,
  getAllPageInfo,
  updateInterest,
  checkSubjectExist: checkAnimeSubjectExist,
};
