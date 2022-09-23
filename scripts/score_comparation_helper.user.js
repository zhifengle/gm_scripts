// ==UserScript==
// @name        score comparation helper
// @name:zh-CN  评分对比助手
// @namespace   https://github.com/22earth
// @description show subject score information from other site
// @description:zh-cn 在Bangumi、豆瓣等上面显示其它网站的评分
// @author      22earth
// @license     MIT
// @homepage    https://github.com/22earth/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @include     https://movie.douban.com/subject/*
// @include     https://myanimelist.net/anime/*
// @include     https://anidb.net/anime/*
// @include     https://anidb.net/a*
// @include     https://galge.fun/subjects/*
// @include     https://vndb.org/v*
// @include     https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/*.php?game=*
// @include     https://moepedia.net/game/*
// @version     0.1.1
// @run-at      document-end
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceURL
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_addValueChangeListener
// @require     https://cdn.staticfile.org/fuse.js/6.4.0/fuse.min.js
// @resource    bangumi_favicon https://bgm.tv/img/favicon.ico
// @resource    douban_favicon https://img3.doubanio.com/favicon.ico
// @resource    myanimelist_favicon https://cdn.myanimelist.net/images/favicon.ico
// @resource    anidb_favicon https://cdn-us.anidb.net/css/icons/touch/favicon.ico
// @resource    erogamescape_favicon https://erogamescape.dyndns.org/favicon.ico
// ==/UserScript==

(function () {
  'use strict';

  /**
   * 为页面添加样式
   * @param style
   */
  /**
   * 获取节点文本
   * @param elem
   */
  function getText(elem) {
      if (!elem)
          return '';
      if (elem.tagName.toLowerCase() === 'meta') {
          return elem.content;
      }
      if (elem.tagName.toLowerCase() === 'input') {
          return elem.value;
      }
      return elem.textContent || elem.innerText || '';
  }
  /**
   * dollar 选择单个
   * @param {string} selector
   */
  function $q(selector) {
      if (window._parsedEl) {
          return window._parsedEl.querySelector(selector);
      }
      return document.querySelector(selector);
  }
  /**
   * dollar 选择所有元素
   * @param {string} selector
   */
  function $qa(selector) {
      if (window._parsedEl) {
          return window._parsedEl.querySelectorAll(selector);
      }
      return document.querySelectorAll(selector);
  }
  /**
   * 查找包含文本的标签
   * @param {string} selector
   * @param {string} text
   */
  function contains(selector, text, $parent) {
      let elements;
      if ($parent) {
          elements = $parent.querySelectorAll(selector);
      }
      else {
          elements = $qa(selector);
      }
      let t;
      if (typeof text === 'string') {
          t = text;
      }
      else {
          t = text.join('|');
      }
      return [].filter.call(elements, function (element) {
          return new RegExp(t, 'i').test(getText(element));
      });
  }
  function findElementByKeyWord(selector, $parent) {
      let res = null;
      if ($parent) {
          $parent = $parent.querySelector(selector.selector);
      }
      else {
          $parent = $q(selector.selector);
      }
      if (!$parent)
          return res;
      const targets = contains(selector.subSelector, selector.keyWord, $parent);
      if (targets && targets.length) {
          let $t = targets[targets.length - 1];
          // 相邻节点
          if (selector.sibling) {
              $t = targets[targets.length - 1].nextElementSibling;
          }
          return $t;
      }
      return res;
  }
  function findElement(selector, $parent) {
      var _a;
      let r = null;
      if (selector) {
          if (selector instanceof Array) {
              let i = 0;
              let targetSelector = selector[i];
              while (targetSelector && !(r = findElement(targetSelector, $parent))) {
                  targetSelector = selector[++i];
              }
          }
          else {
              if (!selector.subSelector) {
                  r = $parent
                      ? $parent.querySelector(selector.selector)
                      : $q(selector.selector);
              }
              else if (selector.isIframe) {
                  // iframe 暂时不支持 parent
                  const $iframeDoc = (_a = $q(selector.selector)) === null || _a === void 0 ? void 0 : _a.contentDocument;
                  r = $iframeDoc === null || $iframeDoc === void 0 ? void 0 : $iframeDoc.querySelector(selector.subSelector);
              }
              else {
                  r = findElementByKeyWord(selector, $parent);
              }
              if (selector.closest) {
                  r = r.closest(selector.closest);
              }
              // recursive
              if (r && selector.nextSelector) {
                  const nextSelector = selector.nextSelector;
                  r = findElement(nextSelector, r);
              }
          }
      }
      return r;
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
  function fetchInfo(url, type, opts = {}, TIMEOUT = 10 * 1000) {
      var _a;
      const method = ((_a = opts === null || opts === void 0 ? void 0 : opts.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'GET';
      // @ts-ignore
      {
          const gmXhrOpts = Object.assign({}, opts);
          if (method === 'POST' && gmXhrOpts.body) {
              gmXhrOpts.data = gmXhrOpts.body;
          }
          if (opts.decode) {
              type = 'arraybuffer';
          }
          return new Promise((resolve, reject) => {
              // @ts-ignore
              GM_xmlhttpRequest(Object.assign({ method, timeout: TIMEOUT, url, responseType: type, onload: function (res) {
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
                  }, onerror: (e) => {
                      retryCounter = 0;
                      reject(e);
                  } }, gmXhrOpts));
          });
      }
  }
  function fetchText(url, opts = {}, TIMEOUT = 10 * 1000) {
      return fetchInfo(url, 'text', opts, TIMEOUT);
  }
  function fetchJson(url, opts = {}) {
      return fetchInfo(url, 'json', opts);
  }

  const SEARCH_RESULT = 'search_result';

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
  function isEqualDate(d1, d2) {
      const resultDate = new Date(d1);
      const originDate = new Date(d2);
      if (resultDate.getFullYear() === originDate.getFullYear() &&
          resultDate.getMonth() === originDate.getMonth() &&
          resultDate.getDate() === originDate.getDate()) {
          return true;
      }
      return false;
  }

  /**
   * 过滤搜索结果： 通过名称以及日期
   * @param items
   * @param subjectInfo
   * @param opts
   */
  function filterResults(items, subjectInfo, opts = {}, isSearch = true) {
      var _a;
      if (!items)
          return;
      // 只有一个结果时直接返回, 不再比较日期
      if (items.length === 1 && isSearch) {
          return items[0];
      }
      var results = new Fuse(items, Object.assign({}, opts)).search(subjectInfo.name);
      if (!results.length)
          return;
      // 有参考的发布时间
      const tempResults = [];
      if (subjectInfo.releaseDate) {
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
                  // 过滤年份不一致的数据
                  if (result.releaseDate.slice(0, 4) === subjectInfo.releaseDate.slice(0, 4)) {
                      tempResults.push(obj);
                  }
              }
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
      results = tempResults;
      return (_a = results[0]) === null || _a === void 0 ? void 0 : _a.item;
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

  async function searchAnimeData$1(subjectInfo) {
      let query = (subjectInfo.name || '').trim();
      if (!query) {
          console.info('Query string is empty');
          return Promise.reject('empty query');
      }
      // 标点符号不一致
      // 戦闘員、派遣します！  ---->  戦闘員, 派遣します!
      query = subjectInfo.name
          .replace(/、|！/, ' ')
          .replace(/\s{2,}/, ' ')
          .trim();
      const url = `https://anidb.net/perl-bin/animedb.pl?show=json&action=search&type=anime&query=${encodeURIComponent(query)}`;
      console.info('anidb search URL: ', url);
      const info = await fetchJson(url, {
          headers: {
              referrer: 'https://anidb.net/',
              'content-type': 'application/json',
              'accept-language': 'en-US,en;q=0.9',
              'x-lcontrol': 'x-no-cache',
          },
      });
      await randomSleep(300, 100);
      const rawInfoList = info.map((obj) => {
          return Object.assign(Object.assign({}, obj), { url: obj.link, greyName: obj.hit });
      });
      const options = {
          keys: ['greyName'],
      };
      let result;
      result = filterResults(rawInfoList, subjectInfo, options, true);
      if (result && result.url) {
          // 转换评分
          const obj = result;
          const arr = (obj.desc || '').split(',');
          const scoreObj = {
              score: '0',
              count: '0',
          };
          if (arr && arr.length === 3) {
              const scoreStr = arr[2];
              if (!scoreStr.includes('N/A') && scoreStr.includes('(')) {
                  const arr = scoreStr.split('(');
                  scoreObj.score = arr[0].trim();
                  scoreObj.count = arr[1].replace(/\).*/g, '');
              }
          }
          result = Object.assign(Object.assign({}, result), scoreObj);
          console.info('anidb search result: ', result);
          return result;
      }
  }
  const favicon$3 = 'data:image/x-icon;base64,AAABAAMAEBAAAAEABAAoAQAANgAAACAgAAABACAAqBAAAF4BAAAwMAAAAQAgAKglAAAGEgAAKAAAABAAAAAgAAAAAQAEAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAMG+vQAygMsAVAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIiIgIiIiAAIRESIhERIgAhIiEiEiISACEgISISIhIAISAhIhERIgAhIiEiEiISACEREiIRESIAIiIiIiIiIiIgAAICIgIgIgIiAgIiAiAiIAACAiICICAiIgICIgIAICAAIgAAIiIgIiIiIiIgICAAAAAAAAAiIAAAAAAAAAAIEDAACAAQAAgAEAAIgBAACIAQAAgAEAAIABAACAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACACAAA//gAAP//AAAoAAAAIAAAAEAAAAABACAAAAAAAIAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Af9/fwL/f38C/39/Av9/fwL/f38C/39/AgAAAAAAAAAAAAAAAAAAAAAAAAAA////Af9/fwL/f38C/39/Av9/fwL/f38C/39/Av///wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AaqqqgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH9//wL///8BAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAADAAAABgAAAAAQAgAAAAAACAJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

  const BLANK_LINK = 'target="_blank" rel="noopener noreferrer nofollow"';
  const NO_MATCH_DATA = '点击搜索';
  const SCORE_ROW_WRAP_CLS = 'e-userjs-score-compare';
  function getFavicon(page) {
      let site = page.name;
      let favicon = '';
      site = site.split('-')[0];
      const dict = {
          anidb: favicon$3,
      };
      if (dict[site]) {
          return dict[site];
      }
      try {
          favicon = GM_getResourceURL(`${site}_favicon`);
      }
      catch (error) { }
      if (!favicon) {
          favicon = page.favicon || '';
      }
      return favicon;
  }
  function genScoreRowStr(info) {
      return `
<div class="e-userjs-score-compare-row" style="display:flex;align-items:center;margin-bottom:10px;">
<a target="_blank" rel="noopener noreferrer nofollow"
  style="margin-right:1em;"  title="点击在${info.name}搜索" href="${info.searchUrl}">
<img alt="${info.name}" style="width:16px;" src="${info.favicon}"/>
</a>
<strong style="margin-right:1em;">${info.score}</strong>
<a href="${info.url}"
  target="_blank" rel="noopener noreferrer nofollow">
  ${info.count}
</a>
</div>
`;
  }
  function genScoreRowInfo(title, page, info) {
      const favicon = getFavicon(page);
      const name = page.name.split('-')[0];
      let score = '0.00';
      let count = NO_MATCH_DATA;
      const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(title));
      let url = searchUrl;
      if (info && info.url) {
          score = Number(info.score || 0).toFixed(2);
          count = (info.count || 0) + ' 人评分';
          url = info.url;
      }
      return { favicon, count, score, url, searchUrl, name };
  }
  function getScoreWrapDom(adjacentSelector, cls = '', style = '') {
      var _a;
      let sel = '.' + SCORE_ROW_WRAP_CLS;
      if (cls) {
          sel = `.${cls}.${SCORE_ROW_WRAP_CLS}`;
      }
      let $div = document.querySelector(sel);
      if (!$div) {
          $div = document.createElement('div');
          cls && $div.classList.add(cls);
          $div.classList.add(SCORE_ROW_WRAP_CLS);
          $div.setAttribute('style', `margin-top:10px;${style}`);
          (_a = findElement(adjacentSelector)) === null || _a === void 0 ? void 0 : _a.insertAdjacentElement('afterend', $div);
      }
      return $div;
  }
  function insertScoreCommon(page, info, opts) {
      const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls, opts.style);
      const rowInfo = genScoreRowInfo(opts.title, page, info);
      wrapDom.innerHTML += genScoreRowStr(rowInfo);
  }

  const anidbPage = {
      name: 'anidb',
      href: ['https://anidb.net'],
      searchApi: 'https://anidb.net/anime/?adb.search={kw}&do.search=1',
      favicon: 'https://cdn-us.anidb.net/css/icons/touch/favicon.ico',
      expiration: 21,
      infoSelector: [
          {
              selector: '#tab_1_pane',
          },
      ],
      pageSelector: [
          {
              selector: 'h1.anime',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/\/(anime\/|anidb.net\/a)(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://anidb.net/anime/${id}`;
      },
      getSearchResult: searchAnimeData$1,
      getScoreInfo: function () {
          const $table = $q('#tabbed_pane .g_definitionlist > table');
          let names = $table.querySelectorAll('tr.official .value > label');
          const info = {
              name: names[0].textContent.trim(),
              greyName: names[names.length - 1].textContent.trim(),
              score: 0,
              count: 0,
              url: location.href,
          };
          const $rating = $table.querySelector('tr.rating span.rating');
          if ($rating) {
              info.count = $rating
                  .querySelector('.count')
                  .textContent.trim()
                  .replace(/\(|\)/g, '');
              const score = Number($rating.querySelector('a > .value').textContent.trim());
              if (!isNaN(score)) {
                  info.score = score;
              }
              const $year = $table.querySelector('tr.year > .value > span[itemprop="startDate"]');
              if ($year) {
                  info.releaseDate = $year.getAttribute('content');
              }
              names = $table.querySelectorAll('tr.official .value');
              for (let i = 0; i < names.length; i++) {
                  const el = names[i];
                  if (el.querySelector('.icons').innerHTML.includes('japanese')) {
                      info.name = el.querySelector('label').textContent.trim();
                  }
                  else if (el.querySelector('.icons').innerHTML.includes('english')) {
                      info.greyName = el.querySelector('label').textContent.trim();
                  }
              }
          }
          return info;
      },
      insertScoreInfo: function (page, info) {
          const title = this.getScoreInfo().name;
          const opts = {
              title,
              adjacentSelector: this.infoSelector,
              cls: '',
              style: '',
          };
          const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls, opts.style);
          const rowInfo = genScoreRowInfo(opts.title, page, info);
          // refuse blob:<URL>
          rowInfo.favicon = page.favicon;
          wrapDom.innerHTML += genScoreRowStr(rowInfo);
      },
  };

  var SubjectTypeId;
  (function (SubjectTypeId) {
      SubjectTypeId[SubjectTypeId["book"] = 1] = "book";
      SubjectTypeId[SubjectTypeId["anime"] = 2] = "anime";
      SubjectTypeId[SubjectTypeId["music"] = 3] = "music";
      SubjectTypeId[SubjectTypeId["game"] = 4] = "game";
      SubjectTypeId[SubjectTypeId["real"] = 6] = "real";
      SubjectTypeId["all"] = "all";
  })(SubjectTypeId || (SubjectTypeId = {}));

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
  async function searchSubject$1(subjectInfo, bgmHost = 'https://bgm.tv', type = SubjectTypeId.all, uniqueQueryStr = '') {
      if (subjectInfo && subjectInfo.releaseDate) {
          subjectInfo.releaseDate;
      }
      let query = (subjectInfo.name || '').trim();
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
      const rawText = await fetchText(url);
      const rawInfoList = dealSearchResults(rawText)[0] || [];
      // 使用指定搜索字符串如 ISBN 搜索时, 并且结果只有一条时，不再使用名称过滤
      if (uniqueQueryStr && rawInfoList && rawInfoList.length === 1) {
          return rawInfoList[0];
      }
      const options = {
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
  async function checkBookSubjectExist(subjectInfo, bgmHost = 'https://bgm.tv', type) {
      let searchResult = await searchSubject$1(subjectInfo, bgmHost, type, subjectInfo.isbn);
      console.info(`First: search book of bangumi: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
      searchResult = await searchSubject$1(subjectInfo, bgmHost, type, subjectInfo.asin);
      console.info(`Second: search book by ${subjectInfo.asin}: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
      // 默认使用名称搜索
      searchResult = await searchSubject$1(subjectInfo, bgmHost, type);
      console.info('Third: search book of bangumi: ', searchResult);
      return searchResult;
  }
  /**
   * 查找条目是否存在： 通过名称搜索或者日期加上名称的过滤查询
   * @param subjectInfo 条目基本信息
   * @param bgmHost bangumi 域名
   * @param type 条目类型
   */
  async function checkExist(subjectInfo, bgmHost = 'https://bgm.tv', type, disabelDate) {
      const subjectTypeDict = {
          [SubjectTypeId.game]: 'game',
          [SubjectTypeId.anime]: 'anime',
          [SubjectTypeId.music]: 'music',
          [SubjectTypeId.book]: 'book',
          [SubjectTypeId.real]: 'real',
          [SubjectTypeId.all]: 'all',
      };
      let searchResult = await searchSubject$1(subjectInfo, bgmHost, type);
      console.info(`First: search result of bangumi: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
      if (disabelDate) {
          return;
      }
      searchResult = await findSubjectByDate(subjectInfo, bgmHost, 1, subjectTypeDict[type]);
      console.info(`Second: search result by date: `, searchResult);
      return searchResult;
  }
  async function checkSubjectExist(subjectInfo, bgmHost = 'https://bgm.tv', type = SubjectTypeId.all, disableDate) {
      let result;
      switch (type) {
          case SubjectTypeId.book:
              result = await checkBookSubjectExist(subjectInfo, bgmHost, type);
              break;
          case SubjectTypeId.all:
          case SubjectTypeId.game:
          case SubjectTypeId.anime:
              result = await checkExist(subjectInfo, bgmHost, type, disableDate);
              break;
          case SubjectTypeId.real:
          case SubjectTypeId.music:
          default:
              console.info('not support type: ', type);
      }
      return result;
  }

  // http://mirror.bgm.rincat.ch
  let bgm_origin = 'https://bgm.tv';
  function genBgmUrl(url) {
      if (url.startsWith('http')) {
          return url;
      }
      return new URL(url, bgm_origin).href;
  }
  const bangumiAnimePage = {
      name: 'bangumi-anime',
      href: ['https://bgm.tv/', 'https://bangumi.tv/', 'https://chii.in/'],
      searchApi: 'https://bgm.tv/subject_search/{kw}?cat=2',
      favicon: 'https://bgm.tv/img/favicon.ico',
      controlSelector: [
          {
              selector: '#panelInterestWrapper h2',
          },
      ],
      infoSelector: [
          {
              selector: '#panelInterestWrapper h2',
          },
      ],
      pageSelector: [
          {
              selector: '.focus.chl.anime',
          },
      ],
      getSubjectId(url) {
          // @TODO 修改域名。
          // const urlObj = new URL(url);
          // setBgmOrigin(urlObj.origin);
          // this.searchApi = `${bgm_origin}/subject_search/{kw}?cat=2`;
          const m = url.match(/\/(subject)\/(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `${bgm_origin}/subject/${id}`;
      },
      async getSearchResult(subject) {
          const res = await checkSubjectExist(subject, bgm_origin, SubjectTypeId.anime);
          if (res) {
              res.url = genBgmUrl(res.url);
          }
          return res;
      },
      getScoreInfo: () => {
          var _a, _b, _c, _d;
          const info = {
              name: $q('h1>a').textContent.trim(),
              score: (_b = (_a = $q('.global_score span[property="v:average"')) === null || _a === void 0 ? void 0 : _a.textContent) !== null && _b !== void 0 ? _b : 0,
              count: (_d = (_c = $q('span[property="v:votes"')) === null || _c === void 0 ? void 0 : _c.textContent) !== null && _d !== void 0 ? _d : 0,
              url: location.href,
          };
          let infoList = $qa('#infobox>li');
          if (infoList && infoList.length) {
              for (let i = 0, len = infoList.length; i < len; i++) {
                  let el = infoList[i];
                  if (el.innerHTML.match(/放送开始|上映年度/)) {
                      info.releaseDate = dealDate(el.textContent.split(':')[1].trim());
                  }
                  // if (el.innerHTML.match('播放结束')) {
                  //   info.endDate = dealDate(el.textContent.split(':')[1].trim());
                  // }
              }
          }
          return info;
      },
      // 插入评分信息的 DOM
      insertScoreInfo(page, info) {
          let $panel = $q('.SidePanel.png_bg');
          if ($panel) {
              let $div = document.createElement('div');
              $div.classList.add('frdScore');
              $div.classList.add('e-userjs-score-compare');
              const favicon = getFavicon(page);
              let score = '0.00';
              let count = NO_MATCH_DATA;
              const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent($q('h1>a').textContent.trim()));
              let url = searchUrl;
              if (info && info.url) {
                  score = Number(info.score || 0).toFixed(2);
                  count = (info.count || 0) + ' 人评分';
                  url = info.url;
              }
              const siteName = page.name.split('-')[0];
              $div.innerHTML = `
<a class="avatar"
target="_blank" rel="noopener noreferrer nofollow"
style="vertical-align:-3px;margin-right:10px;" title="点击在${siteName}搜索" href="${searchUrl}">
<img style="width:16px;" src="${favicon}"/>
</a>
<span class="num">${score}</span>
<span class="desc" style="visibility:hidden">还行</span>
<a href="${url}"
      target="_blank" rel="noopener noreferrer nofollow" class="l">
      ${count}
</a>
`;
              $panel.appendChild($div);
          }
      },
      insertControlDOM($target, callbacks) {
          if (!$target)
              return;
          // 已存在控件时返回
          if ($q('.e-userjs-score-ctrl'))
              return;
          const rawHTML = `<a title="强制刷新评分" class="e-userjs-score-ctrl e-userjs-score-fresh">O</a>
      <a title="清除所有评分缓存" class="e-userjs-score-ctrl e-userjs-score-clear">X</a>
`;
          $target.innerHTML = $target.innerHTML + rawHTML;
          GM_addStyle(`
      .e-userjs-score-ctrl {color:#f09199;font-weight:800;float:right;}
      .e-userjs-score-ctrl:hover {cursor: pointer;}
      .e-userjs-score-clear {margin-right: 12px;}
      .e-userjs-score-loading { width: 208px; height: 13px; background-image: url("/img/loadingAnimation.gif"); }
      `);
          $q('.e-userjs-score-clear').addEventListener('click', callbacks.clear, false);
          $q('.e-userjs-score-fresh').addEventListener('click', callbacks.refresh, false);
      },
  };
  const bangumiGamePage = Object.assign(Object.assign({}, bangumiAnimePage), { name: 'bangumi-game', expiration: 21, pageSelector: [
          {
              selector: 'a.focus.chl[href="/game"]',
          },
      ], async getSearchResult(subject) {
          const res = await checkSubjectExist(subject, bgm_origin, SubjectTypeId.game);
          if (res) {
              res.url = genBgmUrl(res.url);
          }
          return res;
      } });

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

  const doubanAnimePage = {
      name: 'douban-anime',
      href: ['https://movie.douban.com/'],
      searchApi: 'https://www.douban.com/search?cat=1002&q={kw}',
      favicon: 'https://img3.doubanio.com/favicon.ico',
      expiration: 21,
      infoSelector: [
          {
              selector: '#interest_sectl',
          },
      ],
      pageSelector: [
          {
              selector: 'body',
              subSelector: '.tags-body',
              keyWord: ['动画', '动漫'],
          },
          {
              selector: '#info',
              subSelector: 'span[property="v:genre"]',
              keyWord: ['动画', '动漫'],
          },
      ],
      getSubjectId(url) {
          const m = url.match(/\/(subject)\/(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://movie.douban.com/subject/${id}/`;
      },
      getSearchResult: checkAnimeSubjectExist,
      getScoreInfo() {
          var _a, _b, _c, _d, _e, _f;
          const $title = $q('#content h1>span');
          const rawName = $title.textContent.trim();
          const keywords = (_b = (_a = $q('meta[name="keywords"]')) === null || _a === void 0 ? void 0 : _a.getAttribute) === null || _b === void 0 ? void 0 : _b.call(_a, 'content');
          let name = rawName;
          if (keywords) {
              // 可以考虑剔除第二个关键字里面的 Season 3
              const firstKeyword = keywords.split(',')[0];
              name = rawName.replace(firstKeyword, '').trim();
              // name: rawName.replace(/第.季/, ''),
          }
          const subjectInfo = {
              name,
              score: (_d = (_c = $q('.ll.rating_num')) === null || _c === void 0 ? void 0 : _c.textContent) !== null && _d !== void 0 ? _d : 0,
              count: (_f = (_e = $q('.rating_people > span')) === null || _e === void 0 ? void 0 : _e.textContent) !== null && _f !== void 0 ? _f : 0,
              rawName,
              url: location.href,
          };
          const $date = $q('span[property="v:initialReleaseDate"]');
          if ($date) {
              subjectInfo.releaseDate = $date.textContent.replace(/\(.*\)/, '');
          }
          return subjectInfo;
      },
      insertScoreInfo(page, info) {
          let $panel = $q('#interest_sectl');
          let $friendsRatingWrap = $q('.friends_rating_wrap');
          if (!$friendsRatingWrap) {
              $friendsRatingWrap = document.createElement('div');
              $friendsRatingWrap.className = 'friends_rating_wrap clearbox';
              $panel.appendChild($friendsRatingWrap);
          }
          const $div = document.createElement('div');
          $div.className = 'rating_content_wrap clearfix e-userjs-score-compare';
          const favicon = getFavicon(page);
          let score = '0.00';
          let count = NO_MATCH_DATA;
          // 直接用 this.getScoreInfo() 似乎有点冗余。 也许改用 genSearchUrl
          const name = this.getScoreInfo().name;
          const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(name));
          let url = searchUrl;
          if (info && info.url) {
              score = Number(info.score || 0).toFixed(2);
              count = (info.count || 0) + ' 人评价';
              url = info.url;
          }
          const siteName = page.name.split('-')[0];
          $div.innerHTML = `
<strong class="rating_avg">${score}</strong>
<div class="friends">
  <a class="avatar"
  ${BLANK_LINK}
  href="${searchUrl}"
  style="cursor:pointer;"
  title="点击在${siteName}搜索">
  <img src="${favicon}"/>
  </a>
</div>
<a href="${url}"
  rel="noopener noreferrer nofollow" class="friends_count" target="_blank">
    ${count}
</a>
`;
          $friendsRatingWrap.appendChild($div);
      },
  };

  async function searchAnimeData(subjectInfo) {
      const url = `https://myanimelist.net/search/prefix.json?type=anime&keyword=${encodeURIComponent(subjectInfo.name)}&v=1`;
      console.info('myanimelist search URL: ', url);
      const info = await fetchJson(url);
      let startDate = null;
      let items = info.categories[0].items;
      let pageUrl = '';
      let name = '';
      if (subjectInfo.releaseDate) {
          startDate = new Date(subjectInfo.releaseDate);
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              let aired = null;
              if (item.payload.aired.match('to')) {
                  aired = new Date(item.payload.aired.split('to')[0]);
              }
              else {
                  aired = new Date(item.payload.aired);
              }
              // 选择第一个匹配日期的
              if (startDate.getFullYear() === aired.getFullYear() &&
                  startDate.getMonth() === aired.getMonth()) {
                  pageUrl = item.url;
                  name = item.name;
                  break;
              }
          }
      }
      else if (items && items[0]) {
          name = items[0].name;
          pageUrl = items[0].url;
      }
      if (!pageUrl) {
          throw new Error('No match results');
      }
      let result = {
          name,
          url: pageUrl,
      };
      await randomSleep(200, 100);
      const content = await fetchText(pageUrl);
      const $doc = new DOMParser().parseFromString(content, 'text/html');
      let $score = $doc.querySelector('.fl-l.score');
      if ($score) {
          //siteScoreInfo.averageScore = parseFloat($score.textContent.trim()).toFixed(1)
          result.score = $score.textContent.trim();
          if (result.score === 'N/A') {
              result.score = 0;
          }
          if ($score.dataset.user) {
              result.count = $score.dataset.user.replace(/users|,/g, '').trim();
          }
          else {
              throw new Error('Invalid score info');
          }
      }
      else {
          throw new Error('Invalid results');
      }
      console.info('myanimelist search result: ', result);
      return result;
  }

  const myanimelistPage = {
      name: 'myanimelist',
      href: ['https://myanimelist.net/'],
      searchApi: 'https://myanimelist.net/anime.php?q={kw}&cat=anime',
      favicon: 'https://cdn.myanimelist.net/images/favicon.ico',
      infoSelector: [
          {
              selector: '.anime-detail-header-stats > .stats-block',
          },
      ],
      pageSelector: [
          {
              selector: '.breadcrumb a[href$="myanimelist.net/anime.php"]',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/\/(anime)\/(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://myanimelist.net/anime/${id}`;
      },
      getSearchResult: searchAnimeData,
      getScoreInfo: function () {
          var _a, _b, _c, _d, _e;
          let name = (_a = $q('h1-title')) === null || _a === void 0 ? void 0 : _a.textContent;
          const info = {
              name: name,
              greyName: name,
              score: (_c = (_b = $q('span[itemprop="ratingValue"]')) === null || _b === void 0 ? void 0 : _b.textContent.trim()) !== null && _c !== void 0 ? _c : 0,
              count: (_e = (_d = $q('span[itemprop="ratingCount"]')) === null || _d === void 0 ? void 0 : _d.textContent.trim()) !== null && _e !== void 0 ? _e : 0,
              url: location.href,
          };
          $qa('.leftside .spaceit_pad > .dark_text').forEach((el) => {
              if (el.innerHTML.includes('Japanese:')) {
                  info.name = el.nextSibling.textContent.trim();
              }
              else if (el.innerHTML.includes('Aired:')) {
                  const aired = el.nextSibling.textContent.trim();
                  if (aired.includes('to')) {
                      const startDate = new Date(aired.split('to')[0].trim());
                      info.releaseDate = formatDate(startDate);
                  }
              }
          });
          return info;
      },
      insertScoreInfo: function (page, info) {
          const title = this.getScoreInfo().name;
          insertScoreCommon(page, info, {
              title,
              adjacentSelector: this.infoSelector,
              cls: 'stats-block',
              style: 'height:auto;',
          });
      },
  };

  function getMilliseconds(opt) {
      if (typeof opt === 'number') {
          const oneDay = 24 * 60 * 60 * 1000;
          return oneDay * opt;
      }
      const d = (opt.dd || 0) + 1;
      return (+new Date(1970, 1, d, opt.hh || 0, opt.mm || 0, opt.ss || 0, opt.ms || 0) -
          +new Date(1970, 1));
  }
  class KvExpiration {
      constructor(engine, prefix, suffix = '-expiration', bucket = '') {
          this.engine = engine;
          this.prefix = prefix;
          this.suffix = suffix;
          this.bucket = bucket;
      }
      genExpirationKey(key) {
          return `${this.prefix}${this.bucket}${key}${this.suffix}`;
      }
      genKey(key) {
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
      flushExpiredItem(key) {
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
      set(key, value, opt) {
          this.engine.set(this.genKey(key), value);
          if (opt) {
              const invalidTime = +new Date() + getMilliseconds(opt);
              this.engine.set(this.genExpirationKey(key), invalidTime);
          }
          return true;
      }
      get(key) {
          if (this.flushExpiredItem(key)) {
              return;
          }
          return this.engine.get(this.genKey(key));
      }
      remove(key) {
          this.engine.remove(this.genKey(key));
          this.engine.remove(this.genExpirationKey(key));
      }
  }

  class GmEngine {
      set(key, value) {
          GM_setValue(key, value);
          return true;
      }
      get(key) {
          return GM_getValue(key);
      }
      remove(key) {
          GM_deleteValue(key);
      }
      keys() {
          return GM_listValues();
      }
  }

  const USERJS_PREFIX = 'E_SCORE_';
  const CURRENT_ID_DICT = 'CURRENT_ID_DICT';
  const storage = new KvExpiration(new GmEngine(), USERJS_PREFIX);
  function clearInfoStorage() {
      storage.flush();
  }
  function saveInfo(id, info, expiration) {
      expiration = expiration || 7;
      if (id === '') {
          console.error('invalid id:  ', info);
          return;
      }
      storage.set(id, info, expiration);
  }
  function getInfo(id) {
      if (id) {
          return storage.get(id);
      }
  }
  function getScoreMap(site, id) {
      const currentDict = storage.get(CURRENT_ID_DICT) || {};
      if (currentDict[site] === id) {
          return currentDict;
      }
      return storage.get('DICT_ID' + id) || {};
  }
  function setScoreMap(id, map) {
      storage.set(CURRENT_ID_DICT, map);
      storage.set('DICT_ID' + id, map, 7);
  }

  const site_origin$2 = 'https://galge.fun/';
  const HEADERS = {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      referer: 'https://galge.fun/',
  };
  const favicon$2 = 'https://galge.fun/favicon.ico';
  function getSearchItem$3($item) {
      const $title = $item.querySelector('h4.media-heading > a');
      const href = new URL($title.getAttribute('href'), site_origin$2).href;
      const infos = $item.querySelectorAll('.tags > span');
      let releaseDate = undefined;
      for (let i = 0; i < infos.length; i++) {
          const el = infos[i];
          if (el.innerHTML.includes('发售日期')) {
              const m = el.textContent.match(/\d{4}-\d\d-\d\d/);
              if (m) {
                  releaseDate = m[0];
              }
          }
      }
      return {
          name: $title.textContent.trim(),
          releaseDate,
          url: href,
          score: 0,
          count: 0,
      };
  }
  async function searchGameData$1(subjectInfo) {
      let query = (subjectInfo.name || '').trim();
      if (!query) {
          console.info('Query string is empty');
          return Promise.reject();
      }
      let searchResult;
      const options = {
          keys: ['name'],
      };
      const url = `https://galge.fun/subjects/search?keyword=${encodeURIComponent(query)}`;
      console.info('2dfan search URL: ', url);
      const rawText = await fetchText(url, {
          headers: HEADERS,
      });
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const items = $doc.querySelectorAll('#subjects > li');
      const rawInfoList = Array.prototype.slice
          .call(items)
          .map(($item) => getSearchItem$3($item));
      searchResult = filterResults(rawInfoList, subjectInfo, options, true);
      console.info(`Search result of ${query} on 2dfan: `, searchResult);
      if (searchResult && searchResult.url) {
          randomSleep(200, 50);
          const res = await followSearch(searchResult.url);
          if (res) {
              res.url = searchResult.url;
              return res;
          }
          return searchResult;
      }
  }
  async function followSearch(url) {
      const rawText = await fetchText(url, {
          headers: {
              accept: HEADERS.accept,
              referer: url,
          },
      });
      window._parsedEl = new DOMParser().parseFromString(rawText, 'text/html');
      const res = getSearchResult$3();
      window._parsedEl = undefined;
      return res;
  }
  function getSearchResult$3() {
      var _a, _b;
      const $table = $q('.media-body.control-group > .control-group');
      const name = $q('.navbar > h3').textContent.trim();
      const info = {
          name: name,
          greyName: name,
          score: (_b = (_a = $q('.rank-info.control-group .score')) === null || _a === void 0 ? void 0 : _a.textContent.trim()) !== null && _b !== void 0 ? _b : 0,
          count: 0,
          url: location.href,
      };
      const $count = $q('.rank-info.control-group .muted');
      if ($count) {
          info.count = $count.textContent.trim().replace('人评价', '');
          if (info.count.includes('无评分')) {
              info.count = '-';
          }
      }
      $table.querySelectorAll('p.tags').forEach((el) => {
          if (el.innerHTML.includes('发售日期')) {
              const m = el.textContent.match(/\d{4}-\d\d-\d\d/);
              if (m) {
                  info.releaseDate = m[0];
              }
          }
          else if (el.innerHTML.includes('又名：')) {
              info.greyName = el.querySelector('.muted').textContent;
          }
      });
      return info;
  }

  let site_origin$1 = 'https://galge.fun/';
  const twodfanPage = {
      name: '2dfan',
      href: ['https://galge.fun/'],
      searchApi: 'https://galge.fun/subjects/search?keyword={kw}',
      favicon: favicon$2,
      expiration: 21,
      infoSelector: [
          {
              selector: '.rank-info.control-group',
          },
      ],
      pageSelector: [
          {
              selector: '.navbar > h3',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/\/(subjects\/)(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `${site_origin$1}/subjects/${id}`;
      },
      getSearchResult: searchGameData$1,
      getScoreInfo: getSearchResult$3,
      insertScoreInfo: function (page, info) {
          const title = $q('.navbar > h3').textContent.trim();
          insertScoreCommon(page, info, {
              title,
              adjacentSelector: this.infoSelector,
              cls: '',
              style: '',
          });
      },
  };

  const favicon$1 = 'https://vndb.org/favicon.ico';
  function getSearchItem$2($item) {
      const $title = $item.querySelector('.tc_title > a');
      const href = new URL($title.getAttribute('href'), 'https://vndb.org/').href;
      const $rating = $item.querySelector('.tc_rating');
      const info = {
          name: $title.getAttribute('title'),
          url: href,
          count: 0,
          score: $rating.firstChild.textContent,
          releaseDate: $item.querySelector('.tc_rel').textContent,
      };
      const $count = $rating.querySelector('.grayedout');
      if ($count) {
          info.count = $count.textContent.trim().replace(/\(|\)/g, '');
      }
      return info;
  }
  async function searchGameData(subjectInfo) {
      let query = (subjectInfo.name || '').trim();
      if (!query) {
          console.info('Query string is empty');
          return Promise.reject();
      }
      let searchResult;
      const options = {
          keys: ['name'],
      };
      const url = `https://vndb.org/v?sq=${encodeURIComponent(query)}`;
      console.info('vndb search URL: ', url);
      const rawText = await fetchText(url, {
          headers: {
              referer: 'https://vndb.org/',
          },
      });
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const $title = $doc.querySelector('#maincontent > .mainbox > h1');
      // 重定向
      if ($title) {
          window._parsedEl = $doc;
          const res = getSearchResult$2();
          res.url = $doc.querySelector('head > base').getAttribute('href');
          window._parsedEl = undefined;
          return res;
      }
      const items = $doc.querySelectorAll('#maincontent .mainbox table > tbody > tr');
      const rawInfoList = Array.prototype.slice
          .call(items)
          .map(($item) => getSearchItem$2($item));
      searchResult = filterResults(rawInfoList, subjectInfo, options, true);
      console.info(`Search result of ${query} on vndb: `, searchResult);
      if (searchResult && searchResult.url) {
          return searchResult;
      }
  }
  function getSearchResult$2() {
      var _a, _b, _c, _d;
      let name = (_a = $q('tr.title span[lang="ja"]')) === null || _a === void 0 ? void 0 : _a.textContent;
      if (!name) {
          name = $q('tr.title td:nth-of-type(2) > span').textContent;
      }
      const info = {
          name: name,
          score: (_c = (_b = $q('.rank-info.control-group .score')) === null || _b === void 0 ? void 0 : _b.textContent.trim()) !== null && _c !== void 0 ? _c : 0,
          count: 0,
          url: location.href,
      };
      const vote = (_d = $q('.votegraph tfoot > tr > td')) === null || _d === void 0 ? void 0 : _d.textContent.trim();
      if (vote) {
          const v = vote.match(/^\d+/);
          if (v) {
              info.count = v[0];
          }
          const s = vote.match(/average (\d+(\.\d+))/);
          if (s) {
              info.score = s[1];
          }
      }
      return info;
  }

  const vndbPage = {
      name: 'vndb',
      href: ['https://vndb.org/'],
      searchApi: 'https://vndb.org/v?sq={kw}',
      favicon: favicon$1,
      expiration: 21,
      infoSelector: [
          {
              selector: '.vnimg > label',
          },
      ],
      pageSelector: [
          {
              selector: '.tabselected > a[href^="/v"]',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/\/(v)(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://vndb.org/subjects/${id}`;
      },
      getSearchResult: searchGameData,
      getScoreInfo: getSearchResult$2,
      insertScoreInfo: function (page, info) {
          const title = this.getScoreInfo().name;
          const opts = {
              title,
              adjacentSelector: this.infoSelector,
              cls: '',
              style: '',
          };
          const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls, opts.style);
          const rowInfo = genScoreRowInfo(opts.title, page, info);
          // refuse blob:<URL>
          rowInfo.favicon = page.favicon;
          wrapDom.innerHTML += genScoreRowStr(rowInfo);
      },
  };

  var ErogamescapeCategory;
  (function (ErogamescapeCategory) {
      ErogamescapeCategory["game"] = "game";
      ErogamescapeCategory["brand"] = "brand";
      ErogamescapeCategory["creater"] = "creater";
      ErogamescapeCategory["music"] = "music";
      ErogamescapeCategory["pov"] = "pov";
      ErogamescapeCategory["character"] = "character";
  })(ErogamescapeCategory || (ErogamescapeCategory = {}));
  const favicon = 'https://erogamescape.dyndns.org/favicon.ico';
  // 'http://erogamescape.org',
  const site_origin = 'https://erogamescape.dyndns.org';
  function getSearchItem$1($item) {
      var _a, _b, _c, _d;
      const $title = $item.querySelector('td:nth-child(1) > a');
      const href = $title.getAttribute('href');
      const info = {
          name: $title.textContent,
          url: href,
          count: (_b = (_a = $item.querySelector('td:nth-child(6)')) === null || _a === void 0 ? void 0 : _a.textContent) !== null && _b !== void 0 ? _b : 0,
          score: (_d = (_c = $item.querySelector('td:nth-child(4)')) === null || _c === void 0 ? void 0 : _c.textContent) !== null && _d !== void 0 ? _d : 0,
          releaseDate: $item.querySelector('td:nth-child(3)').textContent,
      };
      return info;
  }
  async function searchSubject(subjectInfo, type = ErogamescapeCategory.game, uniqueQueryStr = '') {
      let query = (subjectInfo.name || '').trim();
      if (uniqueQueryStr) {
          query = uniqueQueryStr;
      }
      if (!query) {
          console.info('Query string is empty');
          return;
      }
      const url = `${site_origin}/~ap2/ero/toukei_kaiseki/kensaku.php?category=${type}&word_category=name&word=${encodeURIComponent(query)}&mode=normal`;
      console.info('search subject URL: ', url);
      const rawText = await fetchText(url);
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const items = $doc.querySelectorAll('#result table tr:not(:first-child)');
      const rawInfoList = [...items].map(($item) => getSearchItem$1($item));
      const res = filterResults(rawInfoList, subjectInfo, {
          keys: ['name'],
      }, true);
      console.info(`Search result of ${query} on erogamescape: `, res);
      if (res && res.url) {
          // 相对路径需要设置一下
          res.url = new URL(res.url, url).href;
          return res;
      }
  }
  function searchGameSubject$1(info) {
      return searchSubject(info, ErogamescapeCategory.game);
  }
  function getSearchResult$1() {
      var _a, _b, _c, _d;
      const $title = $q('#soft-title > .bold');
      const info = {
          name: $title.textContent.trim(),
          score: (_b = (_a = $q('#average > td')) === null || _a === void 0 ? void 0 : _a.textContent.trim()) !== null && _b !== void 0 ? _b : 0,
          count: (_d = (_c = $q('#count > td')) === null || _c === void 0 ? void 0 : _c.textContent.trim()) !== null && _d !== void 0 ? _d : 0,
          url: location.href,
      };
      return info;
  }

  const erogamescapePage = {
      name: 'erogamescape',
      href: ['https://erogamescape.dyndns.org/'],
      searchApi: 'https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/kensaku.php?category=game&word_category=name&word={kw}&mode=normal',
      favicon: favicon,
      expiration: 21,
      infoSelector: [
          {
              selector: '#basic_information_table',
          },
          {
              selector: '#basic_infomation_table',
          },
      ],
      pageSelector: [
          {
              selector: '#soft-title',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/(game=)(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/game.php?game=${id}`;
      },
      getSearchResult: searchGameSubject$1,
      getScoreInfo: getSearchResult$1,
      insertScoreInfo: function (page, info) {
          const title = this.getScoreInfo().name;
          insertScoreCommon(page, info, {
              title,
              adjacentSelector: this.infoSelector,
              cls: '',
              style: '',
          });
      },
  };

  function getSearchResult() {
      const $title = $q('.body-top_info_title > h2');
      const info = {
          name: $title.textContent.trim(),
          score: 0,
          count: '-',
          url: location.href,
      };
      const topTableSelector = {
          selector: 'table',
          subSelector: 'tr > th',
          sibling: true,
      };
      const $d = findElement(Object.assign(Object.assign({}, topTableSelector), { keyWord: '発売日' }));
      if ($d) {
          info.releaseDate = dealDate($d.textContent.split('日')[0]);
      }
      return info;
  }
  function getSearchItem($item) {
      const $title = $item.querySelector('.product-title');
      const href = $item.querySelector('a.product-body').getAttribute('href');
      const info = {
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
  async function searchGameSubject(info) {
      const url = `https://moepedia.net/search/result/?s=${info.name}&t=on`;
      const rawText = await fetchText(url);
      const $doc = new DOMParser().parseFromString(rawText, 'text/html');
      const items = $doc.querySelectorAll('.sw-Products .sw-Products_Item');
      const rawInfoList = [...items].map(($item) => getSearchItem($item));
      const res = filterResults(rawInfoList, info, {
          keys: ['name'],
      }, true);
      console.info(`Search result of ${info.name} on moepedia: `, res);
      if (res && res.url) {
          // 相对路径需要设置一下
          res.url = new URL(res.url, url).href;
          return res;
      }
  }

  const moepediaPage = {
      name: 'moepedia',
      href: ['https://moepedia.net/'],
      searchApi: 'https://moepedia.net/search/result/?s={kw}&t=on',
      favicon: 'https://moepedia.net/wp/wp-content/themes/moepedia/assets/images/common/common/favicon.ico',
      expiration: 21,
      infoSelector: [
          {
              selector: '.body-top_image_wrapper',
          },
      ],
      pageSelector: [
          {
              selector: '.body-top_info_title h2',
          },
      ],
      getSubjectId(url) {
          const m = url.match(/(game\/)(\d+)/);
          if (m) {
              return `${this.name}_${m[2]}`;
          }
          return '';
      },
      genSubjectUrl(id) {
          return `https://moepedia.net/game/${id}/`;
      },
      insertScoreInfo: function (page, info) {
          const title = $q('.body-top_info_title > h2').textContent.trim();
          insertScoreCommon(page, info, {
              title,
              adjacentSelector: this.infoSelector,
          });
      },
      getSearchResult: searchGameSubject,
      getScoreInfo: getSearchResult,
  };

  const animePages = [
      bangumiAnimePage,
      doubanAnimePage,
      myanimelistPage,
      anidbPage,
  ];
  const gamePages = [
      bangumiGamePage,
      twodfanPage,
      vndbPage,
      erogamescapePage,
      moepediaPage,
  ];
  if (GM_registerMenuCommand) {
      GM_registerMenuCommand('清除缓存信息', () => {
          clearInfoStorage();
          alert('已清除缓存');
      }, 'c');
      GM_registerMenuCommand('强制刷新动画评分信息', () => {
          const pages = animePages;
          const idx = getPageIdxByHost(pages, location.host);
          if (idx === -1) {
              return;
          }
          const curPage = pages[idx];
          refreshScore(curPage, pages, true);
      }, 'r');
      GM_registerMenuCommand('强制刷新游戏评分信息', () => {
          const pages = gamePages;
          const idx = getPageIdxByHost(pages, location.host);
          if (idx === -1) {
              return;
          }
          const curPage = pages[idx];
          refreshScore(curPage, pages, true);
      }, 'g');
  }
  function getPageIdxByHost(pages, host) {
      const idx = pages.findIndex((obj) => {
          if (Array.isArray(obj.href)) {
              return obj.href.some((href) => href.includes(host));
          }
          else {
              return obj.href.includes(host);
          }
      });
      return idx;
  }
  async function insertScoreRows(curPage, pages, curInfo, map, tasks) {
      const results = await Promise.all(pages
          .filter((page) => {
          if (page.name === curPage.name || page.type === 'info') {
              return false;
          }
          return true;
      })
          .map(async (page) => {
          let searchResult = getInfo(map[page.name]);
          if (!searchResult) {
              try {
                  searchResult = await page.getSearchResult(curInfo);
              }
              catch (error) {
                  console.error(error);
              }
              tasks.push({
                  page,
                  info: searchResult || { name: curInfo.name, url: '' },
              });
          }
          return {
              page,
              searchResult,
          };
      }));
      results.forEach(({ page, searchResult }) => {
          curPage.insertScoreInfo(page, searchResult);
      });
  }
  async function refreshScore(curPage, pages, force = false) {
      const saveTask = [];
      const curInfo = curPage.getScoreInfo();
      saveTask.push({
          page: curPage,
          info: curInfo,
      });
      const subjectId = curPage.getSubjectId(curInfo.url);
      let map = { [curPage.name]: subjectId };
      if (!force) {
          const scoreMap = getScoreMap(curPage.name, subjectId);
          map = Object.assign(Object.assign({}, scoreMap), { [curPage.name]: subjectId });
          document
              .querySelectorAll('.e-userjs-score-compare')
              .forEach((el) => el.remove());
      }
      await insertScoreRows(curPage, pages, curInfo, map, saveTask);
      saveTask.forEach((t) => {
          const { page, info } = t;
          if (info && info.url) {
              const key = page.getSubjectId(info.url);
              saveInfo(key, info, page.expiration);
              map[page.name] = key;
          }
          else {
              const key = `${page.name}_${info.name}`;
              saveInfo(key, { url: '', name: '' }, page.expiration);
              map[page.name] = key;
          }
      });
      setScoreMap(subjectId, map);
  }
  async function initPage(pages) {
      var _a;
      const idx = getPageIdxByHost(pages, location.host);
      if (idx === -1) {
          return;
      }
      const curPage = pages[idx];
      const $page = findElement(curPage.pageSelector);
      if (!$page)
          return;
      const $info = findElement(curPage.infoSelector);
      if (!$info)
          return;
      if (curPage.controlSelector) {
          const $ctrl = findElement(curPage.controlSelector);
          (_a = curPage === null || curPage === void 0 ? void 0 : curPage.insertControlDOM) === null || _a === void 0 ? void 0 : _a.call(curPage, $ctrl, {
              clear: clearInfoStorage,
              refresh: () => refreshScore(curPage, pages, true),
          });
      }
      refreshScore(curPage, pages, false);
  }
  initPage(animePages);
  initPage(gamePages);

})();
