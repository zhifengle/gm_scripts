// ==UserScript==
// @name        migrate douban collection to bangumi
// @name:zh-CN  迁移豆瓣收藏到 Bangumi
// @namespace   https://github.com/22earth
// @description migrate douban collection to bangumi
// @description:zh-cn 迁移豆瓣动画收藏到 Bangumi.
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/?$/
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @version     0.0.1
// @run-at      document-end
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceText
// @require     https://cdn.staticfile.org/fuse.js/6.4.0/fuse.min.js
// @resource    bangumiDataURL https://cdn.jsdelivr.net/npm/bangumi-data@0.3/dist/data.json
// ==/UserScript==


/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function sleep(num) {
    return new Promise(resolve => {
        setTimeout(resolve, num);
    });
}

// support GM_XMLHttpRequest
function fetchInfo(url, type, opts = {}, TIMEOUT = 10 * 1000) {
    // @ts-ignore
    {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            GM_xmlhttpRequest(Object.assign({ method: 'GET', timeout: TIMEOUT, url, responseType: type, onload: function (res) {
                    resolve(res.response);
                }, onerror: reject }, opts));
        });
    }
}
function fetchText(url, TIMEOUT = 10 * 1000) {
    return fetchInfo(url, 'text', {}, TIMEOUT);
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
function convertItemInfo($item) {
    var _a, _b, _c;
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
        collectInfo.date = (_a = $collectInfo
            .querySelector('li .date')) === null || _a === void 0 ? void 0 : _a.textContent.trim();
        collectInfo.tags = (_b = $collectInfo
            .querySelector('li .tags')) === null || _b === void 0 ? void 0 : _b.textContent.replace('标签: ', '').trim();
        collectInfo.comment = (_c = $collectInfo
            .querySelector('li .comment')) === null || _c === void 0 ? void 0 : _c.textContent.trim();
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
function getItemInfos($doc = document) {
    const items = $doc.querySelectorAll('#content .grid-view > .item');
    const res = [];
    for (const item of Array.from(items)) {
        res.push(convertItemInfo(item));
    }
    return res;
}
// https://movie.douban.com/people/y4950/collect?start=75&sort=time&rating=all&filter=all&mode=grid
function getAllPageInfo(userId, subjectType = 'movie') {
    return __awaiter(this, void 0, void 0, function* () {
        const arr = ['do'];
        // const arr: InterestType[] = ['do', 'collect', 'wish'];
        let res = [];
        for (let type of arr) {
            const url = genCollectionURL(userId, type, subjectType);
            const rawText = yield fetchText(url);
            const $doc = new DOMParser().parseFromString(rawText, 'text/html');
            const totalPageNum = getTotalPageNum($doc);
            res = [...getItemInfos($doc)];
            // 16 分割
            let page = 16;
            while (page <= totalPageNum) {
                let reqUrl = genCollectionURL(userId, type, subjectType, page);
                yield sleep(500);
                console.info('fetch info: ', reqUrl);
                const rawText = yield fetchText(reqUrl);
                const $doc = new DOMParser().parseFromString(rawText, 'text/html');
                res.push(...getItemInfos($doc));
                page += 15;
            }
        }
        return res;
    });
}

/**
 * 为页面添加样式
 * @param style
 */
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

// @include     https://movie.douban.com/people/*/collect
let bangumiData = null;
try {
    bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
}
catch (e) {
    console.log('parse JSON:', e);
}
function init() {
    const $headerTab = document.querySelector('#columnHomeB');
    const $container = htmlToElement(`
<div class="e-userjs-export-tool-container">
  <label>豆瓣主页 URL: </label><br/>
  <input placeholder="输入豆瓣主页的 URL" class="inputtext" autocomplete="off" type="text" size="30" name="tags" value="">
  <a class="import-btn" style="color: tomato;" href="javascript:void(0)"><span>导入豆瓣动画收藏</span></a>
</div>
  `);
    const $input = $container.querySelector('input');
    const $btn = $container.querySelector('.import-btn');
    $btn.addEventListener('click', (e) => __awaiter(this, void 0, void 0, function* () {
        const val = $input.value;
        if (!val) {
            alert('请输入豆瓣主页地址');
            return;
        }
        let m = val.match(/douban.com\/people\/([^\/]*)\//);
        if (!m) {
            alert('无效豆瓣主页地址');
        }
        const userId = m[1];
        const res = yield getAllPageInfo(userId, 'movie');
        console.log(res);
    }));
    $headerTab.appendChild($container);
}
init();
