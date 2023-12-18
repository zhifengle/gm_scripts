import { SearchSubject, Subject } from '../interface/subject';
import {
  IInterestData,
  InterestType,
  SiteUtils,
  SubjectItem,
  SubjectType,
} from '../interface/types';
import { sleep } from '../utils/async/sleep';
import { loadIframe } from '../utils/domUtils';
import { fetchJson, fetchText } from '../utils/fetchData';
import {
  filterResults,
  findInterestStatusById,
  getSearchSubjectByGM,
  setSearchResultByGM,
} from './common';

export const favicon = 'https://img3.doubanio.com/favicon.ico';

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
  return Math.ceil(num / 2);
  // if (num < 4) {
  //   return 1;
  // }
  // if (num < 6) {
  //   return 2;
  // }
  // if (num < 8) return 3;
  // if (num < 9) return 4;
  // if (num === 10) return 5;
  // return 0;
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
      .trim() ?? '';
    collectInfo.comment = $collectInfo
      .querySelector('li .comment')
      ?.textContent.trim() ?? '';
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

/**
 * 拿到当前页面豆瓣用户收藏信息列表
 * @param $doc DOM
 */
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

function convertHomeSearchItem($item: HTMLElement): SearchSubject {
  const dealHref = (href: string) => {
    if (/^https:\/\/movie\.douban\.com\/subject\/\d+\/$/.test(href)) {
      return href;
    }
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
  let greyName = '';
  const $greyName = $item.querySelector('.subject-cast') as HTMLElement;
  if ($greyName) {
    greyName = $greyName.innerText;
  }
  return {
    name: $title.textContent.trim(),
    greyName: greyName.split('/')[0].replace('原名:', '').trim(),
    releaseDate: (greyName.match(/\d{4}$/) || [])[0],
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
): Promise<SearchSubject[]> {
  const url = `https://www.douban.com/search?cat=${cat}&q=${encodeURIComponent(
    query
  )}`;
  console.info('Douban search URL: ', url);
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const items = $doc.querySelectorAll(
    '.search-result > .result-list > .result > .content'
  );
  return Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => convertHomeSearchItem($item));
}

/**
 * 提取所有 search.douban.com 的条目信息
 * @param $doc 页面容器
 */
function getAllSearchResult(
  $doc: Element | Document = document
): SearchSubject[] {
  let items = $doc.querySelectorAll('#root .item-root');
  return Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => convertSubjectSearchItem($item));
}

/**
 * 提取 search.douban.com 的条目信息
 * @param $item 单项搜索结果容器 DOM
 */
export function convertSubjectSearchItem($item: HTMLElement): SearchSubject {
  // item-root
  const $title = $item.querySelector('.title a') as HTMLElement;
  let name = '';
  let greyName = '';
  let releaseDate = '';
  let rawName = '';
  if ($title) {
    const rawText = $title.textContent.trim();
    rawName = rawText;
    const yearRe = /\((\d{4})\)$/;
    releaseDate = (rawText.match(yearRe) || ['', ''])[1];
    let arr = rawText.split(/ (?!-)/);
    if (arr && arr.length === 2) {
      name = arr[0];
      greyName = arr[1].replace(yearRe, '');
    } else {
      arr = rawText.split(/ (?!(-|\w))/);
      name = arr[0];
      greyName = rawText.replace(name, '').trim().replace(yearRe, '').trim();
    }
  }
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
    name,
    rawName,
    url: $title.getAttribute('href'),
    score: averageScore,
    count: ratingsCount,
    releaseDate,
  };
}
/**
 * 单独类型搜索入口
 * @param query 搜索字符串
 * @param cat 搜索类型
 * @param type 获取传递数据的类型: gm 通过 GM_setValue, message 通过 postMessage
 */
export async function getSubjectSearchResults(
  query: string,
  cat = '1002'
): Promise<SearchSubject[]> {
  const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
    query
  )}&cat=${cat}`;
  console.info('Douban search URL: ', url);
  const iframeId = 'e-userjs-search-subject';
  let $iframe = document.querySelector(`#${iframeId}`) as HTMLIFrameElement;
  if (!$iframe) {
    $iframe = document.createElement('iframe');
    $iframe.setAttribute(
      'sandbox',
      'allow-forms allow-same-origin allow-scripts'
    );
    $iframe.style.display = 'none';
    $iframe.id = iframeId;
    document.body.appendChild($iframe);
  }
  // 这里不能使用 await 否则数据加载完毕了监听器还没有初始化
  loadIframe($iframe, url, 1000 * 10);
  return await getSearchSubjectByGM();
}

export async function sendSearchResults() {
  const searchItems: SearchSubject[] = getAllSearchResult();
  setSearchResultByGM(searchItems);
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
  // share-shuo: douban  删除分享广播
  if (formData.has('share-shuo')) {
    formData.delete('share-shuo');
  }
  await fetch($form.action, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: formData,
  });
}
/**
 *
 * @param subjectInfo 条目信息
 * @param type 默认使用主页搜索
 * @returns 搜索结果
 */
export async function checkAnimeSubjectExist(
  subjectInfo: Subject,
  type: string = 'home_search'
): Promise<SearchSubject> {
  let query = (subjectInfo.name || '').trim();
  if (!query) {
    console.info('Query string is empty');
    return Promise.reject();
  }
  let rawInfoList;
  let searchResult;
  const options = {
    sameYear: true,
    keys: ['name', 'greyName'],
  };
  if (type === 'home_search') {
    rawInfoList = await getHomeSearchResults(query);
  } else {
    rawInfoList = await getSubjectSearchResults(query);
  }
  searchResult = filterResults(rawInfoList, subjectInfo, options);
  console.info(`Search result of ${query} on Douban: `, searchResult);
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
