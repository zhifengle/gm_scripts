import {
  AllSubject,
  BookSubject,
  SearchResult,
  Subject,
} from '../../interface/subject';
import { sleep } from '../../utils/async/sleep';
import { fetchText } from '../../utils/fetchData';
import { SubjectTypeId } from '../../interface/wiki';
import { dealDate, normalizeQuery } from '../../utils/utils';
import { filterResults } from '../common';
import { SiteUtils } from '../../interface/types';
import {
  getAllPageInfo,
  getBgmHost,
  getSubjectId,
  getUserId,
  updateInterest,
} from './common';

export const favicon = 'https://bgm.tv/img/favicon.ico';

export enum BangumiDomain {
  chii = 'chii.in',
  bgm = 'bgm.tv',
  bangumi = 'bangumi.tv',
}

export enum Protocol {
  http = 'http',
  https = 'https',
}

function getSearchItem($item: HTMLElement): SearchResult {
  let $subjectTitle = $item.querySelector('h3>a.l');
  let info: SearchResult = {
    name: $subjectTitle.textContent.trim(),
    // url 没有协议和域名
    url: $subjectTitle.getAttribute('href'),
    greyName: $item.querySelector('h3>.grey')
      ? $item.querySelector('h3>.grey').textContent.trim()
      : '',
  };
  let matchDate = $item
    .querySelector('.info')
    .textContent.match(/\d{4}[\-\/\年]\d{1,2}[\-\/\月]\d{1,2}/);
  if (matchDate) {
    info.releaseDate = dealDate(matchDate[0]);
  }
  let $rateInfo = $item.querySelector('.rateInfo');
  if ($rateInfo) {
    if ($rateInfo.querySelector('.fade')) {
      info.score = $rateInfo.querySelector('.fade').textContent;
      info.count = $rateInfo
        .querySelector('.tip_j')
        .textContent.replace(/[^0-9]/g, '');
    } else {
      info.score = '0';
      info.count = '少于10';
    }
  } else {
    info.score = '0';
    info.count = '0';
  }
  return info;
}

function getTotalPageNum($doc: Document | HTMLElement | Element): number {
  let totalPage = 1;
  let pList = $doc.querySelectorAll('.page_inner>.p');
  if (pList && pList.length) {
    let tempNum = parseInt(
      pList[pList.length - 2].getAttribute('href').match(/page=(\d*)/)[1]
    );
    totalPage = parseInt(
      pList[pList.length - 1].getAttribute('href').match(/page=(\d*)/)[1]
    );
    totalPage = totalPage > tempNum ? totalPage : tempNum;
  }
  return totalPage
}

function extractInfoList($doc: Document | HTMLElement | Element): SearchResult[] {
  return [...$doc.querySelectorAll<HTMLElement>('#browserItemList>li')].map($item => {
    return getSearchItem($item)
  })
}

/**
 * 处理搜索页面的 html
 * @param info 字符串 html
 */
function dealSearchResults(info: string): [SearchResult[], number] | [] {
  const results: SearchResult[] = [];
  let $doc = new DOMParser().parseFromString(info, 'text/html');
  let items = $doc.querySelectorAll('#browserItemList>li>div.inner');
  // get number of page
  let numOfPage = 1;
  let pList = $doc.querySelectorAll('.page_inner>.p');
  if (pList && pList.length) {
    let tempNum = parseInt(
      pList[pList.length - 2].getAttribute('href').match(/page=(\d*)/)[1]
    );
    numOfPage = parseInt(
      pList[pList.length - 1].getAttribute('href').match(/page=(\d*)/)[1]
    );
    numOfPage = numOfPage > tempNum ? numOfPage : tempNum;
  }
  if (items && items.length) {
    for (const item of Array.prototype.slice.call(items)) {
      let $subjectTitle = item.querySelector('h3>a.l');
      let itemSubject: SearchResult = {
        name: $subjectTitle.textContent.trim(),
        // url 没有协议和域名
        url: $subjectTitle.getAttribute('href'),
        greyName: item.querySelector('h3>.grey')
          ? item.querySelector('h3>.grey').textContent.trim()
          : '',
      };
      let matchDate = item
        .querySelector('.info')
        .textContent.match(/\d{4}[\-\/\年]\d{1,2}[\-\/\月]\d{1,2}/);
      if (matchDate) {
        itemSubject.releaseDate = dealDate(matchDate[0]);
      }
      let $rateInfo = item.querySelector('.rateInfo');
      if ($rateInfo) {
        if ($rateInfo.querySelector('.fade')) {
          itemSubject.score = $rateInfo.querySelector('.fade').textContent;
          itemSubject.count = $rateInfo
            .querySelector('.tip_j')
            .textContent.replace(/[^0-9]/g, '');
        } else {
          itemSubject.score = '0';
          itemSubject.count = '少于10';
        }
      } else {
        itemSubject.score = '0';
        itemSubject.count = '0';
      }
      results.push(itemSubject);
    }
  } else {
    return [];
  }
  return [results, numOfPage];
}

function reviseQuery(title: string): string {
  const titleDict: Record<string, string> = {
    // 'グリザイアの果実 -LE FRUIT DE LA GRISAIA-': 'グリザイアの果実',
  };
  if (titleDict[title]) {
    return titleDict[title];
  }
  const shortenTitleDict: Record<string, string> = {
    // 'グリザイアの果実': 'グリザイアの果実',
  };
  for (const [key, val] of Object.entries(shortenTitleDict)) {
    if (title.includes(key)) {
      return val;
    }
  }
  return title;
}

/**
 * 搜索条目
 * @param subjectInfo
 * @param type
 * @param uniqueQueryStr
 */
export async function searchSubject(
  subjectInfo: AllSubject,
  bgmHost: string = 'https://bgm.tv',
  type: SubjectTypeId = SubjectTypeId.all,
  uniqueQueryStr: string = '',
  opts: { releaseDate?: boolean } = {}
) {
  let releaseDate: string;
  if (subjectInfo && subjectInfo.releaseDate) {
    releaseDate = subjectInfo.releaseDate;
  }
  let query = normalizeQuery((subjectInfo.name || '').trim());
  if (type === SubjectTypeId.book) {
    // 去掉末尾的括号并加上引号
    query = query.replace(/（[^0-9]+?）|\([^0-9]+?\)$/, '');
    query = `"${query}"`;
  }
  if (uniqueQueryStr) {
    query = `"${uniqueQueryStr || ''}"`;
  }
  if (!query || query === '""') {
    console.info('Query string is empty');
    return;
  }
  const url = `${bgmHost}/subject_search/${encodeURIComponent(
    query
  )}?cat=${type}`;
  console.info('search bangumi subject URL: ', url);
  const content = await fetchText(url)
  const $doc = new DOMParser().parseFromString(content, 'text/html');
  const rawInfoList = extractInfoList($doc);
  // 使用指定搜索字符串如 ISBN 搜索时, 并且结果只有一条时，不再使用名称过滤
  if (uniqueQueryStr && rawInfoList && rawInfoList.length === 1) {
    return rawInfoList[0];
  }
  const options = {
    releaseDate: opts.releaseDate,
    keys: ['name', 'greyName'],
  };
  return filterResults(rawInfoList, subjectInfo, options);
}

/**
 * 通过时间查找条目
 * @param subjectInfo 条目信息
 * @param pageNumber 页码
 * @param type 条目类型
 */
export async function findSubjectByDate(
  subjectInfo: AllSubject,
  bgmHost: string = 'https://bgm.tv',
  pageNumber: number = 1,
  type: string
): Promise<SearchResult> {
  if (!subjectInfo || !subjectInfo.releaseDate || !subjectInfo.name) {
    throw new Error('invalid subject info');
  }
  const releaseDate = new Date(subjectInfo.releaseDate);
  if (isNaN(releaseDate.getTime())) {
    throw `invalid releasedate: ${subjectInfo.releaseDate}`;
  }
  const sort = releaseDate.getDate() > 15 ? 'sort=date' : '';
  const page = pageNumber ? `page=${pageNumber}` : '';
  let query = '';
  if (sort && page) {
    query = '?' + sort + '&' + page;
  } else if (sort) {
    query = '?' + sort;
  } else if (page) {
    query = '?' + page;
  }
  const url = `${bgmHost}/${type}/browser/airtime/${releaseDate.getFullYear()}-${
    releaseDate.getMonth() + 1
  }${query}`;
  console.info('find subject by date: ', url);
  const rawText = await fetchText(url);
  let [rawInfoList, numOfPage] = dealSearchResults(rawText);
  const options = {
    threshold: 0.3,
    keys: ['name', 'greyName'],
  };
  let result = filterResults(rawInfoList, subjectInfo, options, false);
  if (!result) {
    if (pageNumber < numOfPage) {
      await sleep(300);
      return await findSubjectByDate(
        subjectInfo,
        bgmHost,
        pageNumber + 1,
        type
      );
    } else {
      throw 'notmatched';
    }
  }
  return result;
}

export async function checkBookSubjectExist(
  subjectInfo: BookSubject,
  bgmHost: string = 'https://bgm.tv',
  type: SubjectTypeId
) {
  let searchResult = await searchSubject(
    subjectInfo,
    bgmHost,
    type,
    subjectInfo.isbn
  );
  console.info(`First: search book of bangumi: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
  searchResult = await searchSubject(
    subjectInfo,
    bgmHost,
    type,
    subjectInfo.asin
  );
  console.info(`Second: search book by ${subjectInfo.asin}: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
  // 默认使用名称搜索
  searchResult = await searchSubject(subjectInfo, bgmHost, type);
  console.info('Third: search book of bangumi: ', searchResult);
  return searchResult;
}

/**
 * 查找条目是否存在： 通过名称搜索或者日期加上名称的过滤查询
 * @param subjectInfo 条目基本信息
 * @param bgmHost bangumi 域名
 * @param type 条目类型
 */
async function checkExist(
  subjectInfo: AllSubject,
  bgmHost: string = 'https://bgm.tv',
  type: SubjectTypeId,
  opts?: any
) {
  const subjectTypeDict = {
    [SubjectTypeId.game]: 'game',
    [SubjectTypeId.anime]: 'anime',
    [SubjectTypeId.music]: 'music',
    [SubjectTypeId.book]: 'book',
    [SubjectTypeId.real]: 'real',
    [SubjectTypeId.all]: 'all',
  };
  let searchOpts = {};
  if (typeof opts === 'object') {
    searchOpts = opts;
  }
  let searchResult = await searchSubject(
    subjectInfo,
    bgmHost,
    type,
    '',
    searchOpts
  );
  console.info(`First: search result of bangumi: `, searchResult);
  if (searchResult && searchResult.url) {
    return searchResult;
  }
  // disableDate
  if (
    (typeof opts === 'boolean' && opts) ||
    (typeof opts === 'object' && opts.disableDate)
  ) {
    return;
  }
  searchResult = await findSubjectByDate(
    subjectInfo,
    bgmHost,
    1,
    subjectTypeDict[type]
  );
  console.info(`Second: search result by date: `, searchResult);
  return searchResult;
}

export async function checkSubjectExist(
  subjectInfo: AllSubject,
  bgmHost: string = 'https://bgm.tv',
  type: SubjectTypeId = SubjectTypeId.all,
  opts?: any
) {
  let result;
  switch (type) {
    case SubjectTypeId.book:
      result = await checkBookSubjectExist(
        subjectInfo as BookSubject,
        bgmHost,
        type
      );
      break;
    case SubjectTypeId.all:
    case SubjectTypeId.game:
    case SubjectTypeId.anime:
      result = await checkExist(subjectInfo, bgmHost, type, opts);
      break;
    case SubjectTypeId.real:
    case SubjectTypeId.music:
    default:
      console.info('not support type: ', type);
  }
  return result;
}

export function changeDomain(
  originUrl: string,
  domain: BangumiDomain,
  protocol: Protocol = Protocol.https
): string {
  let url = originUrl;
  if (url.match(domain)) return url;
  let domainArr = [
    BangumiDomain.bangumi,
    BangumiDomain.chii,
    BangumiDomain.bgm,
  ];
  domainArr.splice(domainArr.indexOf(domain), 1);
  return url
    .replace(new RegExp(domainArr.join('|').replace('.', '\\.')), domain)
    .replace(/https?/, protocol);
}
async function checkAnimeSubjectExist(
  subjectInfo: Subject
): Promise<SearchResult> {
  const result = await checkExist(
    subjectInfo,
    getBgmHost(),
    SubjectTypeId.anime,
    true
  );
  return result;
}

export const siteUtils: SiteUtils = {
  name: 'Bangumi',
  contanerSelector: '#columnHomeB',
  getUserId: getUserId,
  getSubjectId: getSubjectId,
  updateInterest: updateInterest,
  checkSubjectExist: checkAnimeSubjectExist,
  getAllPageInfo: getAllPageInfo,
};
