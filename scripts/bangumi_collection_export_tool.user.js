// ==UserScript==
// @name        bangumi collection export tool
// @name:zh-CN  bangumi 收藏导出工具
// @namespace   https://github.com/22earth
// @description 导出和导入 Bangumi 收藏为 Excel
// @description:en-US export or import collection on bangumi.tv
// @description:zh-CN 导出和导入 Bangumi 收藏为 Excel
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/\w+\/list\/.*$/
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/index\/\d+/
// @version     0.0.8
// @note        0.0.6 导出格式改为 excel 和支持 excel 的导入。
// @note        0.0.4 添加导入功能。注意：不支持是否对自己可见的导入
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @require     https://cdnjs.cloudflare.com/ajax/libs/jschardet/1.4.1/jschardet.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @run-at      document-end
// ==/UserScript==

function formatDate(time, fmt = 'yyyy-MM-dd') {
    const date = new Date(time);
    var o = {
        'M+': date.getMonth() + 1, //月份
        'd+': date.getDate(), //日
        'h+': date.getHours(), //小时
        'm+': date.getMinutes(), //分
        's+': date.getSeconds(), //秒
        'q+': Math.floor((date.getMonth() + 3) / 3), //季度
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

// support GM_XMLHttpRequest
let retryCounter = 0;
let USER_SITE_CONFIG = {};
function getSiteConfg(url, host) {
    let hostname = host;
    {
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
                ontimeout: (e) => {
                    retryCounter = 0;
                    reject(e || new Error(`request timeout: ${url}`));
                },
                ...gmXhrOpts,
            });
        });
    }
}
function fetchText(url, opts = {}, TIMEOUT = 10 * 1000) {
    return fetchInfo(url, 'text', opts, TIMEOUT);
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

// @TODO 听和读没有区分开
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
function getInterestTypeId(type) {
    return typeIdDict[type].id;
}
function getInterestTypeName(type) {
    return typeIdDict[type].name;
}
function getSubjectId(url) {
    const m = url.match(/(?:subject|character)\/(\d+)/);
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
function convertItemInfo($item) {
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
function getItemInfos($doc = document) {
    const items = $doc.querySelectorAll('#browserItemList>li');
    const res = [];
    for (const item of Array.from(items)) {
        res.push(convertItemInfo(item));
    }
    return res;
}
function getTotalPageNum($doc = document) {
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
function loadIframe($iframe, subjectId) {
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
    await loadIframe($iframe, subjectId);
    const $form = $iframe.contentDocument.querySelector('#collectBoxForm');
    return $form;
    // return $form.action;
}
/**
 * 更新用户收藏
 * @param subjectId 条目 id
 * @param data 更新数据
 */
async function updateInterest(subjectId, data) {
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

/**
 * 为页面添加样式
 * @param style
 */
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

const INTEREST_TYPE_HEADERS = ['观看状态', '类别', 'interestType'];
const SYNC_STATUS_HEADERS = ['同步情况', 'syncStatus'];
const SYNC_SUBJECT_HEADERS = ['搜索结果信息', 'syncSubject'];
const DEFAULT_COLLECTION_SHEET_NAME = '用户收藏';
const COLLECTION_SHEET_COLUMNS = [
    {
        key: 'name',
        headers: ['名称', 'name', 'title'],
        exportValue: (item) => item.name,
        importValue: (item, value) => {
            item.name = value;
        },
    },
    {
        key: 'greyName',
        headers: ['别名', 'greyName', 'subtitle'],
        exportValue: (item) => item.greyName,
        importValue: (item, value) => {
            item.greyName = value;
        },
    },
    {
        key: 'releaseDate',
        headers: ['发行日期', 'releaseDate'],
        exportValue: (item) => item.releaseDate,
        importValue: (item, value) => {
            item.releaseDate = value;
        },
    },
    {
        key: 'url',
        headers: ['地址', 'url', 'subjectUrl'],
        exportValue: (item) => item.url,
        importValue: (item, value) => {
            item.url = value;
        },
    },
    {
        key: 'cover',
        headers: ['封面地址', 'cover', 'coverUrl'],
        exportValue: (item) => item.cover,
        importValue: (item, value) => {
            item.cover = value;
        },
    },
    {
        key: 'collectDate',
        headers: ['收藏日期', 'collectDate'],
        exportValue: (item) => item.collectInfo?.date,
        importValue: (item, value) => {
            ensureCollectionInfo(item).date = value;
        },
    },
    {
        key: 'score',
        headers: ['我的评分', 'score', 'rating'],
        exportValue: (item) => item.collectInfo?.score,
        importValue: (item, value) => {
            ensureCollectionInfo(item).score = value;
        },
    },
    {
        key: 'tags',
        headers: ['标签', 'tags'],
        exportValue: (item) => item.collectInfo?.tags,
        importValue: (item, value) => {
            ensureCollectionInfo(item).tags = value;
        },
    },
    {
        key: 'comment',
        headers: ['吐槽', 'comment'],
        exportValue: (item) => item.collectInfo?.comment,
        importValue: (item, value) => {
            ensureCollectionInfo(item).comment = value;
        },
    },
    {
        key: 'rawInfos',
        headers: ['其它信息', 'rawInfos', 'info'],
        exportValue: (item) => item.rawInfos,
        importValue: (item, value) => {
            item.rawInfos = value;
        },
    },
];
function ensureCollectionInfo(item) {
    if (!item.collectInfo) {
        item.collectInfo = {
            date: '',
            score: '',
            tags: '',
            comment: '',
        };
    }
    return item.collectInfo;
}
function toCellText(value) {
    if (value == null) {
        return '';
    }
    return String(value).trim();
}
function readFirstCell(row, headers) {
    for (const header of headers) {
        const value = toCellText(row[header]);
        if (value) {
            return value;
        }
    }
    return '';
}
function getInterestTypeByName(name) {
    const text = toCellText(name);
    return ['wish', 'collect', 'do', 'on_hold', 'dropped'].find((type) => type === text || getInterestTypeName(type) === text);
}
function createEmptyCollectionSheetItem() {
    return {
        name: '',
        url: '',
        rawInfos: '',
        syncStatus: '',
        collectInfo: {
            date: '',
            score: '',
            tags: '',
            comment: '',
        },
    };
}
function serializeSearchSubject(subject) {
    if (!subject) {
        return '';
    }
    return [
        subject.name || '',
        subject.greyName || '',
        subject.url || '',
        subject.rawName || '',
    ].join(';');
}
function parseSearchSubject(value) {
    const text = toCellText(value);
    if (!text) {
        return;
    }
    try {
        const parsed = JSON.parse(text);
        if (parsed?.name || parsed?.url) {
            return {
                name: parsed.name || '',
                greyName: parsed.greyName || '',
                url: parsed.url || '',
                rawName: parsed.rawName || '',
            };
        }
    }
    catch (error) {
        // Older exports use "name;greyName;url;rawName".
    }
    const [name, greyName, url, rawName] = text.split(';');
    if (!name && !url) {
        return;
    }
    return {
        name: name || '',
        greyName: greyName || '',
        url: url || '',
        rawName: rawName || '',
    };
}
function getCollectionSheetHeaders(options = {}) {
    const headers = COLLECTION_SHEET_COLUMNS.map((column) => column.headers[0]);
    headers.push(options.interestTypeHeader || INTEREST_TYPE_HEADERS[0]);
    if (options.includeSyncColumns) {
        headers.push(SYNC_STATUS_HEADERS[0], SYNC_SUBJECT_HEADERS[0]);
    }
    return headers;
}
function collectionItemToSheetRow(item, options = {}) {
    const row = COLLECTION_SHEET_COLUMNS.reduce((res, column) => {
        res[column.headers[0]] = column.exportValue(item) || '';
        return res;
    }, {});
    const interestType = options.getInterestType?.(item) || item.collectInfo?.interestType;
    row[options.interestTypeHeader || INTEREST_TYPE_HEADERS[0]] = interestType
        ? getInterestTypeName(interestType)
        : '';
    if (options.includeSyncColumns) {
        row[SYNC_STATUS_HEADERS[0]] = item.syncStatus || '';
        row[SYNC_SUBJECT_HEADERS[0]] = serializeSearchSubject(item.syncSubject);
    }
    return row;
}
function collectionItemsToSheetRows(items, options = {}) {
    return items.map((item) => collectionItemToSheetRow(item, options));
}
function collectionSheetRowToItem(row, options = {}) {
    const item = createEmptyCollectionSheetItem();
    COLLECTION_SHEET_COLUMNS.forEach((column) => {
        column.importValue(item, readFirstCell(row, column.headers));
    });
    item.syncStatus = readFirstCell(row, SYNC_STATUS_HEADERS);
    item.syncSubject = parseSearchSubject(readFirstCell(row, SYNC_SUBJECT_HEADERS));
    if (!item.name && item.syncSubject?.name) {
        item.name = item.syncSubject.name;
    }
    const fallbackTypes = options.fallbackTypes || [];
    const interestType = getInterestTypeByName(readFirstCell(row, INTEREST_TYPE_HEADERS)) ||
        (fallbackTypes.length === 1
            ? fallbackTypes[0]
            : options.defaultInterestType || 'collect');
    ensureCollectionInfo(item).interestType = interestType;
    return { item, interestType };
}
function createCollectionWorkbook(items, options = {}) {
    const worksheet = XLSX.utils.json_to_sheet(collectionItemsToSheetRows(items, options), {
        header: getCollectionSheetHeaders(options),
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || DEFAULT_COLLECTION_SHEET_NAME);
    return workbook;
}
function downloadCollectionExcel(filename, items, options = {}) {
    XLSX.writeFile(createCollectionWorkbook(items, options), filename);
}
async function readCollectionWorkbook(file) {
    if (/\.csv$/i.test(file.name)) {
        const data = await file.text();
        return XLSX.read(data, { type: 'string' });
    }
    const data = await file.arrayBuffer();
    return XLSX.read(data);
}
async function readCollectionSheetRows(file) {
    const workbook = await readCollectionWorkbook(file);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('文件中没有工作表');
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        throw new Error(`找不到工作表: ${sheetName}`);
    }
    return XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
    });
}

const INTEREST_TYPES = [
    'wish',
    'collect',
    'do',
    'on_hold',
    'dropped',
];
const IMPORT_INPUT_ID = 'e-userjs-import-csv-file';
const COLLECTION_SHEET_EXTENSION = 'xlsx';
const COLLECTION_PAGE_DELAY_MS = 500;
const collectionCache = new Map();
function injectActionStyles() {
    GM_addStyle(`
.e-userjs-collection-tool-action {
  --action-border: rgba(112, 154, 174, .38);
  --action-bg: rgba(112, 154, 174, .08);
  --action-color: #6c93a6;
  --action-hover-border: rgba(84, 144, 176, .58);
  --action-hover-bg: rgba(112, 154, 174, .14);
  --action-hover-color: #4f8fad;
  display: inline-flex;
  align-items: center;
  margin: 0 0 0 6px;
  padding: 0;
  list-style: none;
  vertical-align: middle;
}
.navSubTabs .e-userjs-collection-tool-action {
  flex: 0 0 auto;
  margin-left: 6px;
}
.navSubTabs .e-userjs-collection-tool-action + .e-userjs-collection-tool-action {
  margin-left: 0;
}
.e-userjs-collection-tool-action > a {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  margin: 2px 0;
  border: 1px solid var(--action-border);
  border-radius: 8px;
  padding: 3px 9px;
  background: var(--action-bg);
  color: var(--action-color);
  font-size: 13px;
  line-height: 16px;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6);
  transition: border-color .15s, background-color .15s, box-shadow .15s, color .15s, opacity .15s;
}
.navSubTabs .e-userjs-collection-tool-action > a {
  display: inline-flex;
  padding: 3px 9px;
  color: var(--action-color);
}
.e-userjs-collection-tool-action > a:hover {
  border-color: var(--action-hover-border);
  background: var(--action-hover-bg);
  color: var(--action-hover-color);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .75), 0 1px 3px rgba(112, 154, 174, .18);
}
.navSubTabs .e-userjs-collection-tool-action > a:hover {
  color: var(--action-hover-color);
}
.e-userjs-collection-tool-action span {
  color: inherit !important;
}
.e-userjs-collection-tool-action--inline {
  margin-left: 10px;
}
#indexCatBox .e-userjs-collection-tool-action {
  margin-left: auto;
  padding-right: 2px;
}
#indexCatBox .e-userjs-collection-tool-action > a {
  border: 1px solid var(--action-border);
  padding: 4px 10px;
  background: var(--action-bg);
  color: var(--action-color);
  transform: none;
}
#indexCatBox .e-userjs-collection-tool-action > a:hover {
  border-color: var(--action-hover-border);
  background: var(--action-hover-bg);
  color: var(--action-hover-color);
  transform: none;
}
#indexCatBox .e-userjs-collection-tool-action > a::after {
  content: none;
  display: none;
}
.e-userjs-collection-tool-action.is-busy > a {
  opacity: .62;
  cursor: wait;
}
.e-userjs-collection-tool-action.is-success {
  --action-border: rgba(87, 166, 114, .6);
  --action-bg: rgba(87, 166, 114, .1);
  --action-color: #3b9461;
}
.e-userjs-collection-tool-action.is-error {
  --action-border: rgba(203, 84, 84, .6);
  --action-bg: rgba(203, 84, 84, .1);
  --action-color: #bd4a4a;
}
.e-userjs-collection-tool-action.is-success > a:hover,
.e-userjs-collection-tool-action.is-error > a:hover {
  border-color: var(--action-border);
  background: var(--action-bg);
  color: var(--action-color);
}
#header .e-userjs-collection-tool-action--inline > a {
  min-height: 23px;
  padding: 3px 10px;
  font-size: 12px;
}
html[data-theme="dark"] .e-userjs-collection-tool-action {
  --action-border: rgba(132, 174, 195, .45);
  --action-bg: rgba(132, 174, 195, .12);
  --action-color: #a7c9da;
  --action-hover-border: rgba(159, 199, 218, .7);
  --action-hover-bg: rgba(132, 174, 195, .2);
  --action-hover-color: #d2edf7;
}
html[data-theme="dark"] .e-userjs-collection-tool-action > a {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
}
html[data-theme="dark"] .e-userjs-collection-tool-action > a:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, .22);
}
html[data-theme="dark"] .e-userjs-collection-tool-action.is-success {
  --action-border: rgba(90, 180, 124, .55);
  --action-bg: rgba(90, 180, 124, .14);
  --action-color: #8bd0a2;
}
html[data-theme="dark"] .e-userjs-collection-tool-action.is-error {
  --action-border: rgba(218, 100, 100, .6);
  --action-bg: rgba(218, 100, 100, .14);
  --action-color: #ef9a9a;
}
`);
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function setMenuText(item, text) {
    const span = item.querySelector('span');
    if (span) {
        span.innerText = text;
    }
}
function setActionState(item, state) {
    item.classList.toggle('is-busy', state === 'busy');
    item.classList.toggle('is-success', state === 'success');
    item.classList.toggle('is-error', state === 'error');
}
async function withBusyState(item, busyText, fn) {
    setMenuText(item, busyText);
    setActionState(item, 'busy');
    item.style.pointerEvents = 'none';
    try {
        await fn();
    }
    finally {
        item.style.pointerEvents = 'auto';
        if (item.classList.contains('is-busy')) {
            setActionState(item, 'idle');
        }
    }
}
function createMenuItem(options) {
    const tagName = options.tagName || 'li';
    const className = [
        'e-userjs-collection-tool-action',
        tagName === 'span' ? 'e-userjs-collection-tool-action--inline' : '',
    ]
        .filter(Boolean)
        .join(' ');
    const node = htmlToElement(`<${tagName} class="${className}"${options.title ? ` title="${options.title}"` : ''}>
  <a href="javascript:void(0);"><span>${options.label}</span></a>
</${tagName}>`);
    if (options.onClick) {
        node.addEventListener('click', async () => {
            try {
                await options.onClick(node);
            }
            catch (error) {
                setMenuText(node, '操作失败');
                setActionState(node, 'error');
                console.error('操作失败: ', error);
            }
        });
    }
    return node;
}
function clearLogInfo(container) {
    container
        .querySelectorAll('.e-wiki-log-info')
        .forEach((node) => node.remove());
}
function getInterestTypeByUrl(url) {
    const currentType = url.match(/[^\/?#]+(?=[?#]?[^\/]*$)/)?.[0];
    return INTEREST_TYPES.find((type) => type === currentType);
}
function getListBaseUrl() {
    return location.href.replace(/[^\/?#]+(?:[?#].*)?$/, '');
}
function getListUrl(interestType) {
    return `${getListBaseUrl()}${interestType}`;
}
function getCacheKey(url) {
    const parsedUrl = new URL(url, location.href);
    parsedUrl.hash = '';
    parsedUrl.searchParams.delete('page');
    return parsedUrl.toString();
}
function isCurrentDocumentFirstPage() {
    return !new URL(location.href).searchParams.has('page');
}
function canUseCurrentDocument(url) {
    if (!isCurrentDocumentFirstPage()) {
        return false;
    }
    return getCacheKey(url) === getCacheKey(location.href);
}
function getPageUrl(url, page) {
    const pageParam = `page=${page}`;
    if (/page=\d+/.test(url)) {
        return url.replace(/page=\d+/, pageParam);
    }
    return `${url}${url.includes('?') ? '&' : '?'}${pageParam}`;
}
async function fetchCollectionPage(url) {
    const rawText = await fetchText(url);
    return new DOMParser().parseFromString(rawText, 'text/html');
}
async function loadCollectionInfo(url) {
    const firstPage = canUseCurrentDocument(url)
        ? document
        : await fetchCollectionPage(url);
    const totalPageNum = getTotalPageNum(firstPage);
    const items = [...getItemInfos(firstPage)];
    let page = 2;
    while (page <= totalPageNum) {
        const reqUrl = getPageUrl(url, page);
        await sleep(COLLECTION_PAGE_DELAY_MS);
        console.info('fetch info: ', reqUrl);
        items.push(...getItemInfos(await fetchCollectionPage(reqUrl)));
        page += 1;
    }
    return items;
}
async function getCollectionInfo(url) {
    const cacheKey = getCacheKey(url);
    if (!collectionCache.has(cacheKey)) {
        collectionCache.set(cacheKey, loadCollectionInfo(url));
    }
    return collectionCache.get(cacheKey);
}
function withInterestType(item, interestType) {
    const collectInfo = {
        ...ensureCollectionInfo(item),
    };
    if (interestType) {
        collectInfo.interestType = interestType;
    }
    return {
        ...item,
        collectInfo,
    };
}
async function getCollectionItems(url, interestType) {
    const items = await getCollectionInfo(url);
    return items.map((item) => withInterestType(item, interestType));
}
async function getAllCollectionItems() {
    let items = [];
    for (const interestType of INTEREST_TYPES) {
        try {
            const pageItems = await getCollectionInfo(getListUrl(interestType));
            items = items.concat(pageItems.map((item) => withInterestType(item, interestType)));
        }
        catch (error) {
            console.error(`抓取${interestType}收藏错误: `, error);
        }
    }
    return items;
}
function downloadItems(filename, items) {
    downloadCollectionExcel(filename, items);
}
async function exportCurrentCollection(menuItem, filename, interestType) {
    const url = interestType ? getListUrl(interestType) : location.href;
    await exportCollectionFromUrl(menuItem, filename, url, interestType);
}
async function exportCollectionFromUrl(menuItem, filename, url, interestType) {
    await withBusyState(menuItem, '导出中...', async () => {
        downloadItems(filename, await getCollectionItems(url, interestType));
        setMenuText(menuItem, '导出完成');
        setActionState(menuItem, 'success');
    });
}
async function exportAllCollections(menuItem, filename) {
    await withBusyState(menuItem, '导出中...', async () => {
        downloadItems(filename, await getAllCollectionItems());
        setMenuText(menuItem, '完成所有导出');
        setActionState(menuItem, 'success');
    });
}
function getImportLogTarget(fallback) {
    return document.querySelector('#columnSubjectBrowserB .menu_inner') || fallback;
}
async function updateUserInterest(subject, data, logTarget) {
    const nameStr = `<span style="color:tomato">《${subject.name}》</span>`;
    try {
        const subjectId = getSubjectId(subject.url);
        if (!subjectId) {
            throw new Error('条目地址无效');
        }
        insertLogInfo(logTarget, `更新收藏 ${nameStr} 中...`);
        await updateInterest(subjectId, data);
        insertLogInfo(logTarget, `更新收藏 ${nameStr} 成功`);
        await randomSleep(2000, 1000);
    }
    catch (error) {
        insertLogInfo(logTarget, `导入 ${nameStr} 错误: ${getErrorMessage(error)}`);
        console.error('导入错误: ', error);
    }
}
async function importCollectionFile(file, logTarget) {
    const rows = await readCollectionSheetRows(file);
    for (const row of rows) {
        try {
            const { item, interestType } = collectionSheetRowToItem(row);
            const subject = {
                name: item.name,
                url: item.url,
            };
            if (!subject.name || !subject.url) {
                throw new Error('没有条目信息');
            }
            const collectInfo = ensureCollectionInfo(item);
            await updateUserInterest(subject, {
                interest: getInterestTypeId(interestType),
                rating: collectInfo.score,
                comment: collectInfo.comment,
                tags: collectInfo.tags,
            }, logTarget);
        }
        catch (error) {
            insertLogInfo(logTarget, `导入条目错误: ${getErrorMessage(error)}`);
            console.error('导入错误: ', error);
        }
    }
}
function createImportControl() {
    const node = htmlToElement(`<li class="e-userjs-collection-tool-action" title="支持和导出表头相同的 csv 和 xlsx 文件">
  <a href="javascript:void(0);"><span><label for="${IMPORT_INPUT_ID}">导入收藏</label></span></a>
  <input type="file" id="${IMPORT_INPUT_ID}" style="display:none" accept=".xlsx,.xls,.csv" />
</li>`);
    const input = node.querySelector(`#${IMPORT_INPUT_ID}`);
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        const logTarget = getImportLogTarget(node);
        clearLogInfo(logTarget);
        try {
            await withBusyState(node, '导入中...', async () => {
                await importCollectionFile(file, logTarget);
                setMenuText(node, '导入完成');
                setActionState(node, 'success');
            });
        }
        catch (error) {
            setMenuText(node, '导入失败');
            setActionState(node, 'error');
            insertLogInfo(logTarget, `导入文件错误: ${getErrorMessage(error)}`);
            console.error('导入文件错误: ', error);
        }
        finally {
            input.value = '';
        }
    });
    return node;
}
function createAllExportControl(filename) {
    return createMenuItem({
        label: '导出所有收藏',
        onClick: (item) => exportAllCollections(item, filename),
    });
}
function createExportControl(filename, interestType) {
    return createMenuItem({
        label: '导出收藏',
        onClick: (item) => exportCurrentCollection(item, filename, interestType),
    });
}
function createInlineExportControl(filename) {
    return createMenuItem({
        tagName: 'span',
        label: '导出目录',
        onClick: (item) => exportCurrentCollection(item, filename),
    });
}
function createIndexExportControl() {
    return createMenuItem({
        label: '导出目录',
        title: '导出当前选中分类',
        onClick: (item) => exportCollectionFromUrl(item, getIndexPageFilename(), getSelectedIndexCatUrl()),
    });
}
function getPageTitle() {
    const header = $q('#header');
    return header?.querySelector('h1')?.textContent?.trim() || '导出收藏';
}
function getPageTitleFilename(ext = COLLECTION_SHEET_EXTENSION) {
    return `${getPageTitle()}.${ext}`;
}
function getSelectedIndexCatLink() {
    const catLinkSelector = '#indexCatBox .cat li:not(.e-userjs-collection-tool-action) a';
    return ($q(`${catLinkSelector}.selected`) ||
        $q(`${catLinkSelector}.focus`) ||
        $q(catLinkSelector));
}
function getSelectedIndexCatUrl() {
    const href = getSelectedIndexCatLink()?.getAttribute('href');
    if (!href || href.startsWith('javascript:')) {
        return location.href;
    }
    return new URL(href, location.href).toString();
}
function getSelectedIndexCatName() {
    const link = getSelectedIndexCatLink();
    const span = link?.querySelector('span');
    if (!span) {
        return '';
    }
    const clone = span.cloneNode(true);
    clone.querySelectorAll('small').forEach((node) => node.remove());
    return clone.textContent?.trim() || '';
}
function getIndexPageFilename(ext = COLLECTION_SHEET_EXTENSION) {
    const catName = getSelectedIndexCatName();
    return `${getPageTitle()}${catName ? `-${catName}` : ''}.${ext}`;
}
function getUserListFilename(ext = COLLECTION_SHEET_EXTENSION) {
    const type = $q('#headerProfile .navSubTabs .focus')?.textContent || '';
    const username = $q('.nameSingle .inner>a')?.textContent?.trim() || '导出收藏';
    return {
        all: `${username}-${formatDate(new Date())}.${ext}`,
        current: `${username}-${type}-${formatDate(new Date())}.${ext}`,
    };
}
function addListPageControls() {
    injectActionStyles();
    const nav = $q('#headerProfile .navSubTabs');
    if (!nav) {
        return;
    }
    const filename = getUserListFilename();
    nav.appendChild(createAllExportControl(filename.all));
    const interestType = getInterestTypeByUrl(location.href);
    if (interestType) {
        nav.appendChild(createExportControl(filename.current, interestType));
    }
    nav.appendChild(createImportControl());
}
function addIndexPageControls() {
    injectActionStyles();
    const catList = $q('#indexCatBox .cat');
    if (catList) {
        catList.appendChild(createIndexExportControl());
        return;
    }
    const header = $q('#header');
    if (!header) {
        return;
    }
    header.appendChild(createInlineExportControl(getPageTitleFilename()));
}
if (location.href.match(/index\/\d+/)) {
    addIndexPageControls();
}
if (location.href.match(/\w+\/list\//)) {
    addListPageControls();
}
