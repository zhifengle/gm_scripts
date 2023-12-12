// ==UserScript==
// @name        migrate douban collection to bangumi
// @name:zh-CN  迁移豆瓣收藏到 Bangumi
// @namespace   https://github.com/22earth
// @description migrate douban collection to bangumi and export douban collection
// @description:zh-cn 迁移豆瓣动画收藏到 Bangumi.
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/?$/
// @include     https://movie.douban.com/mine
// @include     https://search.douban.com/movie/subject_search*
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @version     0.0.7
// @run-at      document-end
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_getResourceText
// @require     https://cdn.staticfile.org/fuse.js/6.4.0/fuse.min.js
// @resource    bangumiDataURL https://unpkg.com/bangumi-data@0.3/dist/data.json
// ==/UserScript==

(function () {
  'use strict';

  function sleep(num) {
      return new Promise((resolve) => {
          setTimeout(resolve, num);
      });
  }
  function randomSleep(max = 400, min = 200) {
      return sleep(randomNum(max, min));
  }
  function randomNum(max, min) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // support GM_XMLHttpRequest
  let retryCounter = 0;
  let USER_SITE_CONFIG = {};
  function getSiteConfg(url, host) {
      let hostname = host;
      if (!host) {
          hostname = new URL(url)?.hostname;
      }
      const config = USER_SITE_CONFIG[hostname] || {};
      return config;
  }
  function mergeOpts(opts, config) {
      return {
          ...opts,
          ...config,
          headers: {
              ...opts?.headers,
              ...config?.headers,
          },
      };
  }
  function fetchInfo(url, type, opts = {}, TIMEOUT = 10 * 1000) {
      const method = opts?.method?.toUpperCase() || 'GET';
      opts = mergeOpts(opts, getSiteConfg(url));
      // @ts-ignore
      {
          const gmXhrOpts = { ...opts };
          if (method === 'POST' && gmXhrOpts.body) {
              gmXhrOpts.data = gmXhrOpts.body;
          }
          if (opts.decode) {
              type = 'arraybuffer';
          }
          return new Promise((resolve, reject) => {
              // @ts-ignore
              GM_xmlhttpRequest({
                  method,
                  timeout: TIMEOUT,
                  url,
                  responseType: type,
                  onload: function (res) {
                      if (res.status === 404) {
                          retryCounter = 0;
                          reject(404);
                      }
                      else if (res.status === 302 && retryCounter < 5) {
                          retryCounter++;
                          resolve(fetchInfo(res.finalUrl, type, opts, TIMEOUT));
                      }
                      if (opts.decode && type === 'arraybuffer') {
                          retryCounter = 0;
                          let decoder = new TextDecoder(opts.decode);
                          resolve(decoder.decode(res.response));
                      }
                      else {
                          retryCounter = 0;
                          resolve(res.response);
                      }
                  },
                  onerror: (e) => {
                      retryCounter = 0;
                      reject(e);
                  },
                  ...gmXhrOpts,
              });
          });
      }
  }
  function fetchText(url, opts = {}, TIMEOUT = 10 * 1000) {
      return fetchInfo(url, 'text', opts, TIMEOUT);
  }
  function fetchJson(url, opts = {}) {
      return fetchInfo(url, 'json', opts);
  }

  var SubjectTypeId;
  (function (SubjectTypeId) {
      SubjectTypeId[SubjectTypeId["book"] = 1] = "book";
      SubjectTypeId[SubjectTypeId["anime"] = 2] = "anime";
      SubjectTypeId[SubjectTypeId["music"] = 3] = "music";
      SubjectTypeId[SubjectTypeId["game"] = 4] = "game";
      SubjectTypeId[SubjectTypeId["real"] = 6] = "real";
      SubjectTypeId["all"] = "all";
  })(SubjectTypeId || (SubjectTypeId = {}));

  function formatDate(time, fmt = 'yyyy-MM-dd') {
      const date = new Date(time);
      var o = {
          'M+': date.getMonth() + 1,
          'd+': date.getDate(),
          'h+': date.getHours(),
          'm+': date.getMinutes(),
          's+': date.getSeconds(),
          'q+': Math.floor((date.getMonth() + 3) / 3),
          S: date.getMilliseconds(), //毫秒
      };
      if (/(y+)/i.test(fmt)) {
          fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      }
      for (var k in o) {
          if (new RegExp('(' + k + ')', 'i').test(fmt)) {
              fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
          }
      }
      return fmt;
  }
  function dealDate(dataStr) {
      // 2019年12月19
      let l = [];
      if (/\d{4}年\d{1,2}月(\d{1,2}日?)?/.test(dataStr)) {
          l = dataStr
              .replace('日', '')
              .split(/年|月/)
              .filter((i) => i);
      }
      else if (/\d{4}\/\d{1,2}(\/\d{1,2})?/.test(dataStr)) {
          l = dataStr.split('/');
      }
      else if (/\d{4}-\d{1,2}(-\d{1,2})?/.test(dataStr)) {
          return dataStr;
      }
      else {
          return dataStr;
      }
      return l
          .map((i) => {
          if (i.length === 1) {
              return `0${i}`;
          }
          return i;
      })
          .join('-');
  }
  function isEqualDate(d1, d2, type = 'd') {
      const resultDate = new Date(d1);
      const originDate = new Date(d2);
      if (type === 'y') {
          return resultDate.getFullYear() === originDate.getFullYear();
      }
      if (type === 'm') {
          return (resultDate.getFullYear() === originDate.getFullYear() &&
              resultDate.getMonth() === originDate.getMonth());
      }
      if (resultDate.getFullYear() === originDate.getFullYear() &&
          resultDate.getMonth() === originDate.getMonth() &&
          resultDate.getDate() === originDate.getDate()) {
          return true;
      }
      return false;
  }
  function normalizeQuery(query) {
      let newQuery = query
          .replace(/^(.*?～)(.*)(～[^～]*)$/, function (_, p1, p2, p3) {
          return p1.replace(/～/g, ' ') + p2 + p3.replace(/～/g, ' ');
      })
          .replace(/＝|=/g, ' ')
          .replace(/　/g, ' ')
          .replace(/０/g, '0')
          .replace(/１/g, '1')
          .replace(/２/g, '2')
          .replace(/３/g, '3')
          .replace(/４/g, '4')
          .replace(/５/g, '5')
          .replace(/６/g, '6')
          .replace(/７/g, '7')
          .replace(/８/g, '8')
          .replace(/９/g, '9')
          .replace(/Ⅰ/g, 'I')
          .replace(/Ⅱ/g, 'II')
          .replace(/Ⅲ/g, 'III')
          .replace(/Ⅳ/g, 'IV')
          .replace(/Ⅴ/g, 'V')
          .replace(/Ⅵ/g, 'VI')
          .replace(/Ⅶ/g, 'VII')
          .replace(/Ⅷ/g, 'VIII')
          .replace(/Ⅸ/g, 'IX')
          .replace(/Ⅹ/g, 'X')
          .replace(/[－―～〜━\[\]『』~'…！？。♥☆\/♡★‥○, 【】◆×▼’&＇"＊?]/g, ' ')
          .replace(/[．・]/g, ' ')
          //.replace(/ー/g, " ")
          .replace(/\.\.\./g, ' ')
          .replace(/～っ.*/, '')
          .replace(/\(.*?\)/g, '')
          .replace(/\（.*?\）/g, ' ')
          .replace(/＜.+?＞/, '')
          .replace(/<.+?>/, '')
          .replace(/\s-[^-]+?-$/, '')
          .trim();
      // newQuery = replaceCharToSpace(newQuery);
      newQuery = newQuery.replace(/\s{2,}/g, ' ');
      // game: 14 -one & four or the other meaning-
      if (/^\d+$/.test(newQuery)) {
          return query;
      }
      return newQuery;
  }

  const SEARCH_RESULT = 'search_result';

  /**
   * 过滤搜索结果： 通过名称以及日期
   * @param items
   * @param subjectInfo
   * @param opts
   */
  function filterResults(items, subjectInfo, opts = {}, isSearch = true) {
      if (!items)
          return;
      // 只有一个结果时直接返回, 不再比较日期
      if (items.length === 1 && isSearch) {
          return items[0];
      }
      // 使用发行日期过滤
      if (subjectInfo.releaseDate && opts.releaseDate) {
          const obj = items.find((item) => isEqualDate(item.releaseDate, subjectInfo.releaseDate));
          if (obj) {
              return obj;
          }
      }
      var results = new Fuse(items, Object.assign({}, opts)).search(subjectInfo.name);
      // 去掉括号包裹的，再次模糊查询
      if (!results.length && /<|＜|\(|（/.test(subjectInfo.name)) {
          results = new Fuse(items, Object.assign({}, opts)).search(subjectInfo.name
              .replace(/＜.+＞/g, '')
              .replace(/<.+>/g, '')
              .replace(/（.+）/g, '')
              .replace(/\(.+\)/g, ''));
      }
      if (!results.length) {
          return;
      }
      // 有参考的发布时间
      if (subjectInfo.releaseDate) {
          const sameYearResults = [];
          const sameMonthResults = [];
          for (const obj of results) {
              const result = obj.item;
              if (result.releaseDate) {
                  // 只有年的时候
                  if (result.releaseDate.length === 4) {
                      if (result.releaseDate === subjectInfo.releaseDate.slice(0, 4)) {
                          return result;
                      }
                  }
                  else {
                      if (isEqualDate(result.releaseDate, subjectInfo.releaseDate)) {
                          return result;
                      }
                  }
                  if (isEqualDate(result.releaseDate, subjectInfo.releaseDate, 'm')) {
                      sameMonthResults.push(obj);
                      continue;
                  }
                  if (isEqualDate(result.releaseDate, subjectInfo.releaseDate, 'y')) {
                      sameYearResults.push(obj);
                  }
              }
          }
          if (sameMonthResults.length) {
              return sameMonthResults[0].item;
          }
          if (sameYearResults.length) {
              return sameYearResults[0].item;
          }
      }
      // 比较名称
      const nameRe = new RegExp(subjectInfo.name.trim());
      for (const item of results) {
          const result = item.item;
          if (nameRe.test(result.name) ||
              nameRe.test(result.greyName) ||
              nameRe.test(result.rawName)) {
              return result;
          }
      }
  }
  const typeIdDict$1 = {
      dropped: {
          name: '抛弃',
          id: '5',
      },
      on_hold: {
          name: '搁置',
          id: '4',
      },
      do: {
          name: '在看',
          id: '3',
      },
      collect: {
          name: '看过',
          id: '2',
      },
      wish: {
          name: '想看',
          id: '1',
      },
  };
  function findInterestStatusById(id) {
      for (let key in typeIdDict$1) {
          const obj = typeIdDict$1[key];
          if (obj.id === id) {
              return {
                  key: key,
                  ...obj,
              };
          }
      }
  }
  async function getSearchResultByGM() {
      return new Promise((resolve, reject) => {
          const listenId = window.gm_val_listen_id;
          if (listenId) {
              GM_removeValueChangeListener(listenId);
          }
          window.gm_val_listen_id = GM_addValueChangeListener(
          // const listenId = GM_addValueChangeListener(
          SEARCH_RESULT, (n, oldValue, newValue) => {
              console.log('enter promise');
              const now = +new Date();
              if (newValue.type === SEARCH_RESULT &&
                  newValue.timestamp &&
                  newValue.timestamp < now) {
                  // GM_removeValueChangeListener(listenId);
                  resolve(newValue.data);
              }
              reject('mismatch timestamp');
          });
      });
  }
  async function setSearchResultByGM(data) {
      const res = {
          type: SEARCH_RESULT,
          timestamp: +new Date(),
          data,
      };
      GM_setValue(SEARCH_RESULT, res);
  }

  function getBgmHost() {
      return `${location.protocol}//${location.host}`;
  }
  function getSubjectId$1(url) {
      const m = url.match(/(?:subject|character)\/(\d+)/);
      if (!m)
          return '';
      return m[1];
  }
  function getUserId$1(url) {
      // https://bgm.tv/user/a_little
      const m = url.match(/user\/(.*)/);
      if (!m)
          return '';
      return m[1];
  }
  function insertLogInfo($sibling, txt) {
      const $log = document.createElement('div');
      $log.classList.add('e-wiki-log-info');
      // $log.setAttribute('style', 'color: tomato;');
      $log.innerHTML = txt;
      $sibling.parentElement.insertBefore($log, $sibling);
      $sibling.insertAdjacentElement('afterend', $log);
      return $log;
  }
  function convertItemInfo$1($item) {
      let $subjectTitle = $item.querySelector('h3>a.l');
      let itemSubject = {
          name: $subjectTitle.textContent.trim(),
          rawInfos: $item.querySelector('.info').textContent.trim(),
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
          itemSubject.releaseDate = dealDate(matchDate[0]);
      }
      const $rateInfo = $item.querySelector('.rateInfo');
      if ($rateInfo) {
          const rateInfo = {};
          if ($rateInfo.querySelector('.fade')) {
              rateInfo.score = $rateInfo.querySelector('.fade').textContent;
              rateInfo.count = $rateInfo
                  .querySelector('.tip_j')
                  .textContent.replace(/[^0-9]/g, '');
          }
          else {
              rateInfo.score = '0';
              rateInfo.count = '少于10';
          }
          itemSubject.rateInfo = rateInfo;
      }
      const $rank = $item.querySelector('.rank');
      if ($rank) {
          itemSubject.rank = $rank.textContent.replace('Rank', '').trim();
      }
      const $collectInfo = $item.querySelector('.collectInfo');
      const collectInfo = {};
      const $comment = $item.querySelector('#comment_box');
      if ($comment) {
          collectInfo.comment = $comment.textContent.trim();
      }
      if ($collectInfo) {
          const textArr = $collectInfo.textContent.split('/');
          collectInfo.date = textArr[0].trim();
          textArr.forEach((str) => {
              if (str.match('标签')) {
                  collectInfo.tags = str.replace(/标签:/, '').trim();
              }
          });
          const $starlight = $collectInfo.querySelector('.starlight');
          if ($starlight) {
              $starlight.classList.forEach((s) => {
                  if (/stars\d/.test(s)) {
                      collectInfo.score = s.replace('stars', '');
                  }
              });
          }
      }
      if (Object.keys(collectInfo).length) {
          collectInfo.tags = collectInfo.tags || '';
          collectInfo.comment = collectInfo.comment || '';
          itemSubject.collectInfo = collectInfo;
      }
      const $cover = $item.querySelector('.subjectCover img');
      if ($cover && $cover.tagName.toLowerCase() === 'img') {
          // 替换 cover/s --->  cover/l 是大图
          const src = $cover.getAttribute('src') || $cover.getAttribute('data-cfsrc');
          if (src) {
              itemSubject.cover = src.replace('pic/cover/s', 'pic/cover/l');
          }
      }
      return itemSubject;
  }
  function getItemInfos$1($doc = document) {
      const items = $doc.querySelectorAll('#browserItemList>li');
      const res = [];
      for (const item of Array.from(items)) {
          res.push(convertItemInfo$1(item));
      }
      return res;
  }
  function getTotalPageNum$1($doc = document) {
      const $multipage = $doc.querySelector('#multipage');
      let totalPageNum = 1;
      const pList = $multipage?.querySelectorAll('.page_inner>.p');
      if (pList && pList.length) {
          let tempNum = parseInt(pList[pList.length - 2].getAttribute('href').match(/page=(\d*)/)[1]);
          totalPageNum = parseInt(pList[pList.length - 1].getAttribute('href').match(/page=(\d*)/)[1]);
          totalPageNum = totalPageNum > tempNum ? totalPageNum : tempNum;
      }
      return totalPageNum;
  }
  function genCollectionURL$1(userId, subjectType, interestType) {
      const dict = {
          movie: 'anime',
          music: 'music',
          book: 'book',
      };
      return `https://bgm.tv/${dict[subjectType]}/list/${userId}/${interestType}`;
  }
  async function getAllPageInfo$1(userId, subjectType, interestType) {
      const url = genCollectionURL$1(userId, subjectType, interestType);
      console.info('bgm collection page: ', url);
      const rawText = await fetchText(url);
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const totalPageNum = getTotalPageNum$1($doc);
      const res = [...getItemInfos$1($doc)];
      let page = 2;
      while (page <= totalPageNum) {
          let reqUrl = url;
          const m = url.match(/page=(\d*)/);
          if (m) {
              reqUrl = reqUrl.replace(m[0], `page=${page}`);
          }
          else {
              reqUrl = `${reqUrl}?page=${page}`;
          }
          await sleep(500);
          console.info('fetch info: ', reqUrl);
          const rawText = await fetchText(reqUrl);
          const $doc = new DOMParser().parseFromString(rawText, 'text/html');
          res.push(...getItemInfos$1($doc));
          page += 1;
      }
      return res;
  }
  function loadIframe$1($iframe, subjectId) {
      return new Promise((resolve, reject) => {
          $iframe.src = `/update/${subjectId}`;
          let timer = setTimeout(() => {
              timer = null;
              reject('bangumi iframe timeout');
          }, 5000);
          $iframe.onload = () => {
              clearTimeout(timer);
              $iframe.onload = null;
              resolve(null);
          };
      });
  }
  async function getUpdateForm(subjectId) {
      const iframeId = 'e-userjs-update-interest';
      let $iframe = document.querySelector(`#${iframeId}`);
      if (!$iframe) {
          $iframe = document.createElement('iframe');
          $iframe.style.display = 'none';
          $iframe.id = iframeId;
          document.body.appendChild($iframe);
      }
      await loadIframe$1($iframe, subjectId);
      const $form = $iframe.contentDocument.querySelector('#collectBoxForm');
      return $form;
      // return $form.action;
  }
  /**
   * 更新用户收藏
   * @param subjectId 条目 id
   * @param data 更新数据
   */
  async function updateInterest$1(subjectId, data) {
      // gh 暂时不知道如何获取，直接拿 action 了
      const $form = await getUpdateForm(subjectId);
      const formData = new FormData($form);
      const obj = Object.assign({ referer: 'ajax', tags: '', comment: '', update: '保存' }, data);
      for (let [key, val] of Object.entries(obj)) {
          if (!formData.has(key)) {
              formData.append(key, val);
          }
          else {
              // 标签和吐槽可以直接清空
              if (['tags', 'comment', 'rating'].includes(key)) {
                  formData.set(key, val);
              }
              else if (!formData.get(key) && val) {
                  formData.set(key, val);
              }
          }
      }
      await fetch($form.action, {
          method: 'POST',
          body: formData,
      });
  }

  var BangumiDomain;
  (function (BangumiDomain) {
      BangumiDomain["chii"] = "chii.in";
      BangumiDomain["bgm"] = "bgm.tv";
      BangumiDomain["bangumi"] = "bangumi.tv";
  })(BangumiDomain || (BangumiDomain = {}));
  var Protocol;
  (function (Protocol) {
      Protocol["http"] = "http";
      Protocol["https"] = "https";
  })(Protocol || (Protocol = {}));
  function getSearchItem($item) {
      let $subjectTitle = $item.querySelector('h3>a.l');
      let info = {
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
          }
          else {
              info.score = '0';
              info.count = '少于10';
          }
      }
      else {
          info.score = '0';
          info.count = '0';
      }
      return info;
  }
  function extractInfoList($doc) {
      return [...$doc.querySelectorAll('#browserItemList>li')].map($item => {
          return getSearchItem($item);
      });
  }
  /**
   * 处理搜索页面的 html
   * @param info 字符串 html
   */
  function dealSearchResults(info) {
      const results = [];
      let $doc = new DOMParser().parseFromString(info, 'text/html');
      let items = $doc.querySelectorAll('#browserItemList>li>div.inner');
      // get number of page
      let numOfPage = 1;
      let pList = $doc.querySelectorAll('.page_inner>.p');
      if (pList && pList.length) {
          let tempNum = parseInt(pList[pList.length - 2].getAttribute('href').match(/page=(\d*)/)[1]);
          numOfPage = parseInt(pList[pList.length - 1].getAttribute('href').match(/page=(\d*)/)[1]);
          numOfPage = numOfPage > tempNum ? numOfPage : tempNum;
      }
      if (items && items.length) {
          for (const item of Array.prototype.slice.call(items)) {
              let $subjectTitle = item.querySelector('h3>a.l');
              let itemSubject = {
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
                  }
                  else {
                      itemSubject.score = '0';
                      itemSubject.count = '少于10';
                  }
              }
              else {
                  itemSubject.score = '0';
                  itemSubject.count = '0';
              }
              results.push(itemSubject);
          }
      }
      else {
          return [];
      }
      return [results, numOfPage];
  }
  /**
   * 搜索条目
   * @param subjectInfo
   * @param type
   * @param uniqueQueryStr
   */
  async function searchSubject(subjectInfo, bgmHost = 'https://bgm.tv', type = SubjectTypeId.all, uniqueQueryStr = '', opts = {}) {
      if (subjectInfo && subjectInfo.releaseDate) {
          subjectInfo.releaseDate;
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
      const url = `${bgmHost}/subject_search/${encodeURIComponent(query)}?cat=${type}`;
      console.info('search bangumi subject URL: ', url);
      const content = await fetchText(url);
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
  async function findSubjectByDate(subjectInfo, bgmHost = 'https://bgm.tv', pageNumber = 1, type) {
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
      }
      else if (sort) {
          query = '?' + sort;
      }
      else if (page) {
          query = '?' + page;
      }
      const url = `${bgmHost}/${type}/browser/airtime/${releaseDate.getFullYear()}-${releaseDate.getMonth() + 1}${query}`;
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
              return await findSubjectByDate(subjectInfo, bgmHost, pageNumber + 1, type);
          }
          else {
              throw 'notmatched';
          }
      }
      return result;
  }
  /**
   * 查找条目是否存在： 通过名称搜索或者日期加上名称的过滤查询
   * @param subjectInfo 条目基本信息
   * @param bgmHost bangumi 域名
   * @param type 条目类型
   */
  async function checkExist(subjectInfo, bgmHost = 'https://bgm.tv', type, opts) {
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
      let searchResult = await searchSubject(subjectInfo, bgmHost, type, '', searchOpts);
      console.info(`First: search result of bangumi: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
      // disableDate
      if ((typeof opts === 'boolean' && opts) ||
          (typeof opts === 'object' && opts.disableDate)) {
          return;
      }
      searchResult = await findSubjectByDate(subjectInfo, bgmHost, 1, subjectTypeDict[type]);
      console.info(`Second: search result by date: `, searchResult);
      return searchResult;
  }
  async function checkAnimeSubjectExist$1(subjectInfo) {
      const result = await checkExist(subjectInfo, getBgmHost(), SubjectTypeId.anime, true);
      return result;
  }
  const siteUtils$1 = {
      name: 'Bangumi',
      contanerSelector: '#columnHomeB',
      getUserId: getUserId$1,
      getSubjectId: getSubjectId$1,
      updateInterest: updateInterest$1,
      checkSubjectExist: checkAnimeSubjectExist$1,
      getAllPageInfo: getAllPageInfo$1,
  };

  /**
   * 为页面添加样式
   * @param style
   */
  /**
   * 下载内容
   * https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
   * @example
   * download(csvContent, 'dowload.csv', 'text/csv;encoding:utf-8');
   * BOM: data:text/csv;charset=utf-8,\uFEFF
   * @param content 内容
   * @param fileName 文件名
   * @param mimeType 文件类型
   */
  function downloadFile(content, fileName, mimeType = 'application/octet-stream') {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], {
          type: mimeType,
      }));
      a.style.display = 'none';
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }
  /**
   * @param {String} HTML 字符串
   * @return {Element}
   */
  function htmlToElement(html) {
      var template = document.createElement('template');
      html = html.trim();
      template.innerHTML = html;
      // template.content.childNodes;
      return template.content.firstChild;
  }
  /**
   * 载入 iframe
   * @param $iframe iframe DOM
   * @param src iframe URL
   * @param TIMEOUT time out
   */
  function loadIframe($iframe, src, TIMEOUT = 5000) {
      return new Promise((resolve, reject) => {
          $iframe.src = src;
          let timer = setTimeout(() => {
              timer = null;
              $iframe.onload = undefined;
              reject('iframe timeout');
          }, TIMEOUT);
          $iframe.onload = () => {
              clearTimeout(timer);
              $iframe.onload = null;
              resolve(null);
          };
      });
  }

  function genCollectionURL(userId, interestType, subjectType = 'movie', start = 1) {
      const baseURL = `https://${subjectType}.douban.com/people/${userId}/${interestType}`;
      if (start === 1) {
          return baseURL;
      }
      else {
          return `${baseURL}?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
      }
  }
  function convertBangumiScore(num) {
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
  function getSubjectId(url) {
      const m = url.match(/movie\.douban\.com\/subject\/(\d+)/);
      if (m) {
          return m[1];
      }
      return '';
  }
  function getUserId(homeURL) {
      let m = homeURL.match(/douban.com\/people\/([^\/]*)\//);
      if (m) {
          return m[1];
      }
      return '';
  }
  function convertItemInfo($item) {
      let $subjectTitle = $item.querySelector('.info .title a');
      // 默认第二项为日文名
      const titleArr = $subjectTitle.textContent
          .trim()
          .split('/')
          .map((str) => str.trim());
      const rawInfos = $item.querySelector('.info .intro').textContent.trim();
      let itemSubject = {
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
      }
      else if ((m = rawInfos.match(dateReg))) {
          itemSubject.releaseDate = m[0];
      }
      const $collectInfo = $item.querySelector('.info');
      if ($collectInfo) {
          const collectInfo = {};
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
  function getTotalPageNum($doc = document) {
      const numStr = $doc.querySelector('.mode > .subject-num').textContent.trim();
      return Number(numStr.split('/')[1].trim());
  }
  /**
   * 拿到当前页面豆瓣用户收藏信息列表
   * @param $doc DOM
   */
  function getItemInfos($doc = document) {
      const items = $doc.querySelectorAll('#content .grid-view > .item');
      const res = [];
      for (const item of Array.from(items)) {
          res.push(convertItemInfo(item));
      }
      return res;
  }
  /**
   * 获取所有分页的条目数据
   * @param userId 用户id
   * @param subjectType 条目类型
   * @param interestType 条目状态
   */
  async function getAllPageInfo(userId, subjectType = 'movie', interestType) {
      let res = [];
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
  function convertHomeSearchItem($item) {
      const dealHref = (href) => {
          if (/^https:\/\/movie\.douban\.com\/subject\/\d+\/$/.test(href)) {
              return href;
          }
          const urlParam = href.split('?url=')[1];
          if (urlParam) {
              return decodeURIComponent(urlParam.split('&')[0]);
          }
          else {
              throw 'invalid href';
          }
      };
      const $title = $item.querySelector('.title h3 > a');
      const href = dealHref($title.getAttribute('href'));
      const $ratingNums = $item.querySelector('.rating-info > .rating_nums');
      let ratingsCount = '';
      let averageScore = '';
      if ($ratingNums) {
          const $count = $ratingNums.nextElementSibling;
          const m = $count.innerText.match(/\d+/);
          if (m) {
              ratingsCount = m[0];
          }
          averageScore = $ratingNums.innerText;
      }
      let greyName = '';
      const $greyName = $item.querySelector('.subject-cast');
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
  async function getHomeSearchResults(query, cat = '1002') {
      const url = `https://www.douban.com/search?cat=${cat}&q=${encodeURIComponent(query)}`;
      console.info('Douban search URL: ', url);
      const rawText = await fetchText(url);
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const items = $doc.querySelectorAll('.search-result > .result-list > .result > .content');
      return Array.prototype.slice
          .call(items)
          .map(($item) => convertHomeSearchItem($item));
  }
  /**
   * 提取所有 search.douban.com 的条目信息
   * @param $doc 页面容器
   */
  function getAllSearchResult($doc = document) {
      let items = $doc.querySelectorAll('#root .item-root');
      return Array.prototype.slice
          .call(items)
          .map(($item) => convertSubjectSearchItem($item));
  }
  /**
   * 提取 search.douban.com 的条目信息
   * @param $item 单项搜索结果容器 DOM
   */
  function convertSubjectSearchItem($item) {
      // item-root
      const $title = $item.querySelector('.title a');
      let name = '';
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
              arr[1].replace(yearRe, '');
          }
          else {
              arr = rawText.split(/ (?!(-|\w))/);
              name = arr[0];
              rawText.replace(name, '').trim().replace(yearRe, '').trim();
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
  async function getSubjectSearchResults(query, cat = '1002') {
      const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(query)}&cat=${cat}`;
      console.info('Douban search URL: ', url);
      const iframeId = 'e-userjs-search-subject';
      let $iframe = document.querySelector(`#${iframeId}`);
      if (!$iframe) {
          $iframe = document.createElement('iframe');
          $iframe.setAttribute('sandbox', 'allow-forms allow-same-origin allow-scripts');
          $iframe.style.display = 'none';
          $iframe.id = iframeId;
          document.body.appendChild($iframe);
      }
      // 这里不能使用 await 否则数据加载完毕了监听器还没有初始化
      loadIframe($iframe, url, 1000 * 10);
      return await getSearchResultByGM();
  }
  async function sendSearchResults() {
      const searchItems = getAllSearchResult();
      setSearchResultByGM(searchItems);
  }
  async function updateInterest(subjectId, data) {
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
          }
          else if (formData.has(key) && !formData.get(key) && val) {
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
  async function checkAnimeSubjectExist(subjectInfo, type = 'home_search') {
      let query = (subjectInfo.name || '').trim();
      if (!query) {
          console.info('Query string is empty');
          return Promise.reject();
      }
      let rawInfoList;
      let searchResult;
      const options = {
          keys: ['name', 'greyName'],
      };
      if (type === 'home_search') {
          rawInfoList = await getHomeSearchResults(query);
      }
      else {
          rawInfoList = await getSubjectSearchResults(query);
      }
      searchResult = filterResults(rawInfoList, subjectInfo, options, true);
      console.info(`Search result of ${query} on Douban: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
  }
  const siteUtils = {
      name: '豆瓣',
      contanerSelector: '#content .aside',
      getUserId,
      getSubjectId,
      getAllPageInfo,
      updateInterest,
      checkSubjectExist: checkAnimeSubjectExist,
  };

  function insertControl(contanerSelector, name) {
      GM_addStyle(`
  .e-userjs-export-tool-container input {
    margin-bottom: 12px;
  }
  .e-userjs-export-tool-container .title {
    color: #F09199;
    font-weight: bold;
    font-size: 14px;
    margin: 12px 0;
    display: inline-block;
  }
  .e-userjs-export-tool-container .import-btn{
    margin-top: 12px;
  }
  .e-userjs-export-tool-container .export-btn {
    display: none;
  }
  .e-userjs-export-tool-container .retry-btn {
    display: none;
  }
  .ui-button {
    display: inline-block;
    line-height: 20px;
    font-size: 14px;
    text-align: center;
    color: #4c5161;
    border-radius: 4px;
    border: 1px solid #d0d0d5;
    padding: 9px 15px;
    min-width: 80px;
    background-color: #fff;
    background-repeat: no-repeat;
    background-position: center;
    text-decoration: none;
    box-sizing: border-box;
    transition: border-color .15s, box-shadow .15s, opacity .15s;
    font-family: inherit;
    cursor: pointer;
    overflow: visible;

    background-color: #2a80eb;
    color: #fff;
  }
`);
      const $parent = document.querySelector(contanerSelector);
      const $container = htmlToElement(`
<div class="e-userjs-export-tool-container">
<div>
  <span class="title">${name}主页 URL: </span><br/>
  <input placeholder="输入${name}主页的 URL" class="inputtext" autocomplete="off" type="text" size="30" name="tags" value="">
</div>
  <div>
<label for="movie-type-select">选择同步类型:</label>
<select name="movieType" id="movie-type-select">
    <option value="">所有</option>
    <option value="do">在看</option>
    <option value="wish">想看</option>
    <option value="collect">看过</option>
</select>
  </div>
  <button class="ui-button import-btn" type="submit">
导入${name}动画收藏
  </button>
  <br/>
  <button class="ui-button export-btn" type="submit">
导出${name}动画的收藏同步信息
  </button>
  <button class="ui-button retry-btn" type="submit">
重新同步失败的条目
  </button>
</div>
  `);
      $parent.appendChild($container);
      return $container;
  }

  let bangumiData = null;
  const typeIdDict = {
      dropped: {
          name: '抛弃',
          id: '5',
      },
      on_hold: {
          name: '搁置',
          id: '4',
      },
      do: {
          name: '在看',
          id: '3',
      },
      collect: {
          name: '看过',
          id: '2',
      },
      wish: {
          name: '想看',
          id: '1',
      },
  };
  function getBangumiSubjectId(name = '', greyName = '') {
      if (!bangumiData)
          return;
      const obj = bangumiData.items.find((item) => {
          let cnNames = [];
          if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
              cnNames = item.titleTranslate['zh-Hans'];
          }
          return (item.title === name ||
              item.title === greyName ||
              cnNames.includes(greyName));
      });
      return obj?.sites?.find((item) => item.site === 'bangumi').id;
  }
  function genCSVContent(infos) {
      const header = '\ufeff名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息,类别,同步情况,搜索结果信息';
      let csvContent = '';
      const keys = Object.keys(infos);
      keys.forEach((key) => {
          infos[key].forEach((item) => {
              csvContent += `\r\n${item.name || ''},${item.greyName || ''},${item.releaseDate || ''}`;
              const subjectUrl = item.url;
              csvContent += `,${subjectUrl}`;
              const cover = item.cover || '';
              csvContent += `,${cover}`;
              const collectInfo = item.collectInfo || {};
              const collectDate = collectInfo.date || '';
              csvContent += `,${collectDate}`;
              const score = collectInfo.score || '';
              csvContent += `,${score}`;
              const tag = collectInfo.tags || '';
              csvContent += `,${tag}`;
              const comment = collectInfo.comment || '';
              csvContent += `,"${comment}"`;
              const rawInfos = item.rawInfos || '';
              csvContent += `,"${rawInfos}"`;
              csvContent += `,"${typeIdDict[key].name}"`;
              csvContent += `,${item.syncStatus || ''}`;
              // 新增搜索结果信息
              let searchResultStr = '';
              if (item.syncSubject) {
                  const obj = item.syncSubject;
                  searchResultStr = `${obj.name};${obj.greyName || ''};${obj.url || ''};${obj.rawName || ''}`;
              }
              // 同步信息
              csvContent += `,"${searchResultStr}"`;
          });
      });
      return header + csvContent;
  }
  // 区分是否为动画
  function isJpMovie(item) {
      return item.rawInfos.indexOf('日本') !== -1;
  }
  function clearLogInfo($container) {
      $container
          .querySelectorAll('.e-wiki-log-info')
          .forEach((node) => node.remove());
  }
  function init(site) {
      let targetUtils;
      let originUtils;
      if (site === 'bangumi') {
          targetUtils = siteUtils;
          originUtils = siteUtils$1;
      }
      else {
          targetUtils = siteUtils$1;
          originUtils = siteUtils;
      }
      const $container = insertControl(originUtils.contanerSelector, targetUtils.name);
      const $input = $container.querySelector('input');
      const $importBtn = $container.querySelector('.import-btn');
      const $exportBtn = $container.querySelector('.export-btn');
      const $retryBtn = $container.querySelector('.retry-btn');
      const interestInfos = {
          do: [],
          collect: [],
          wish: [],
          dropped: [],
          on_hold: [],
      };
      $exportBtn.addEventListener('click', async (e) => {
          const $text = e.target;
          $text.value = '导出中...';
          let name = 'Bangumi';
          if (site === 'bangumi') {
              name = '豆瓣';
          }
          let strName = `${name}动画的收藏`;
          const csv = genCSVContent(interestInfos);
          // $text.value = '导出完成';
          $text.style.display = 'none';
          downloadFile(csv, `${strName}-${formatDate(new Date())}.csv`);
      });
      $retryBtn.addEventListener('click', async (e) => {
          try {
              bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
          }
          catch (e) {
              console.log('parse JSON:', e);
          }
          const userId = getUserIdFromInput($input.value, targetUtils.getUserId);
          if (!userId)
              return;
          const arr = getInterestTypeArr();
          for (let type of arr) {
              const res = interestInfos[type];
              for (let i = 0; i < res.length; i++) {
                  let item = res[i];
                  if (!item.syncStatus) {
                      item = await migrateCollection(originUtils, item, site, type);
                  }
                  res[i] = item;
              }
          }
          clearLogInfo($container);
          $exportBtn.style.display = 'inline-block';
          $retryBtn.style.display = 'inline-block';
      });
      $importBtn.addEventListener('click', async (e) => {
          try {
              bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
          }
          catch (e) {
              console.log('parse JSON:', e);
          }
          const userId = getUserIdFromInput($input.value, targetUtils.getUserId);
          if (!userId)
              return;
          const arr = getInterestTypeArr();
          for (let type of arr) {
              try {
                  const res = (await targetUtils.getAllPageInfo(userId, 'movie', type));
                  for (let i = 0; i < res.length; i++) {
                      let item = res[i];
                      item = await migrateCollection(originUtils, item, site, type);
                      res[i] = item;
                  }
                  interestInfos[type] = [...res];
              }
              catch (error) {
                  console.error(error);
              }
          }
          clearLogInfo($container);
          $exportBtn.style.display = 'inline-block';
          $retryBtn.style.display = 'inline-block';
      });
  }
  function getUserIdFromInput(val, fn) {
      if (!val) {
          alert(`请输入${name}主页地址`);
          return '';
      }
      const userId = fn(val);
      if (!userId) {
          alert(`无效${name}主页地址`);
          return '';
      }
      return userId;
  }
  function getInterestTypeArr() {
      const $container = document.querySelector('.e-userjs-export-tool-container');
      const $select = $container.querySelector('#movie-type-select');
      // const arr: InterestType[] = ['wish'];
      let arr = ['do', 'collect', 'wish'];
      if ($select && $select.value) {
          arr = [$select.value];
      }
      return arr;
  }
  async function migrateCollection(siteUtils, item, site, type) {
      const subjectItem = { ...item };
      const $container = document.querySelector('.e-userjs-export-tool-container');
      const $btn = $container.querySelector('.import-btn');
      // 在 Bangumi 上 非日语的条目跳过
      if (site === 'bangumi' && !isJpMovie(subjectItem)) {
          return subjectItem;
      }
      let subjectId = '';
      // 使用 bangumi data
      if (site === 'bangumi') {
          subjectId = getBangumiSubjectId(subjectItem.name, subjectItem.greyName);
      }
      if (!subjectId) {
          try {
              await randomSleep(1000, 400);
              const result = await siteUtils.checkSubjectExist({
                  name: subjectItem.name,
                  releaseDate: subjectItem.releaseDate,
              });
              if (result && result.url) {
                  subjectId = siteUtils.getSubjectId(result.url);
                  subjectItem.syncSubject = result;
              }
          }
          catch (error) {
              console.error(error);
          }
      }
      if (subjectId) {
          clearLogInfo($container);
          const nameStr = `<span style="color:tomato">《${subjectItem.name}》</span>`;
          insertLogInfo($btn, `更新收藏 ${nameStr} 中...`);
          await siteUtils.updateInterest(subjectId, {
              interest: typeIdDict[type].id,
              ...subjectItem.collectInfo,
              rating: subjectItem.collectInfo.score || '',
          });
          subjectItem.syncStatus = '成功';
          await randomSleep(2000, 1000);
          insertLogInfo($btn, `更新收藏 ${nameStr} 成功`);
      }
      return subjectItem;
  }
  if (location.href.match(/bgm.tv|bangumi.tv|chii.in/)) {
      init('bangumi');
  }
  if (location.href.match(/movie.douban.com/)) {
      init('douban');
  }
  if (location.href.match(/search\.douban\.com\/movie\/subject_search/)) {
      if (window.top !== window.self) {
          sendSearchResults();
      }
  }

})();
