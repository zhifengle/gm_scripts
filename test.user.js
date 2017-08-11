// ==UserScript==
// @name        demo2
// @namespace   demo2
// @description demo2
// @include     http://localhost:3090*
// @version     0.1
// @require     https://cdn.staticfile.org/fuse.js/2.6.2/fuse.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_xmlhttpRequest
// @grant       GM_openInTab
// ==/UserScript==

// ==UserScript==
// @name        bangumi new game subject helper
// @name:zh-CN  bangumi创建黄油条目助手
// @namespace   https://github.com/22earth
// @description assist to create new game subject
// @description:zh-cn 辅助创建Bangumi黄油条目
// @include     http://www.getchu.com/soft.phtml?id=*
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/.*$/
// @include     http://bangumi.tv/subject/*/add_related/person
// @include     http://bangumi.tv/subject/*/edit_detail
// @include     https://bgm.tv/subject/*/add_related/person
// @include     https://bgm.tv/subject/*/edit_detail
// @include     https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w
// @include     /^https?:\/\/erogamescape\.(?:ddo\.jp|dyndns\.org)\/~ap2\/ero\/toukei_kaiseki\/(.*)/
// @include     http://122.219.133.135/~ap2/ero/toukei_kaiseki/*
// @include     http://www.dmm.co.jp/dc/pcgame/*
// @version     0.3.3
// @note        0.3.0 增加上传人物肖像功能，需要和bangumi_blur_image.user.js一起使用
// @note        0.3.1 增加在Getchu上点击检测条目是否功能存在，若条目存在，自动打开条目页面。
// @note        0.3.3 增加添加Getchu游戏封面的功能，需要和bangumi_blur_image.user.js一起使用
// @updateURL   https://raw.githubusercontent.com/bangumi/scripts/master/a_little/bangumi_new_subject_helper.user.js
// @run-at      document-end
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_openInTab
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @require     https://cdn.staticfile.org/jquery/2.1.4/jquery.min.js
// @require     https://cdn.staticfile.org/fuse.js/2.6.2/fuse.min.js
// ==/UserScript==

// /^https?:\/\/(ja|en)\.wikipedia\.org\/wiki\/.*$/

/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function gmFetchBinary(url, TIMEOUT) {
  return new Promise(function (resolve, reject) {
    GM_xmlhttpRequest({
      method: "GET",
      timeout: TIMEOUT || 10 * 1000,
      url: url,
      overrideMimeType: "text\/plain; charset=x-user-defined",
      onreadystatechange: function onreadystatechange(response) {
        if (response.readyState === 4 && response.status === 200) {
          resolve(response.responseText);
        }
      },
      onerror: function onerror(err) {
        reject(err);
      },
      ontimeout: function ontimeout(err) {
        reject(err);
      }
    });
  });
}

function gmFetch(url, TIMEOUT) {
  return new Promise(function (resolve, reject) {
    GM_xmlhttpRequest({
      method: "GET",
      timeout: TIMEOUT || 10 * 1000,
      url: url,
      onreadystatechange: function onreadystatechange(response) {
        if (response.readyState === 4 && response.status === 200) {
          resolve(response.responseText);
        }
      },
      onerror: function onerror(err) {
        reject(err);
      },
      ontimeout: function ontimeout(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  gmFetch: gmFetch,
  gmFetchBinary: gmFetchBinary
};

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var gmFetch = __webpack_require__(0).gmFetch;
var delayPromise = __webpack_require__(2);
var filterResults = __webpack_require__(3);

function dealDate(dateStr) {
  return dateStr.replace(/年|月|日/g, '/').replace(/\/$/, '');
}

/**
 * @return {array}
 */
function dealRawHTML(info) {
  var rawInfoList = [];
  var $doc = new DOMParser().parseFromString(info, "text/html");
  var items = $doc.querySelectorAll('#browserItemList>li>div.inner');
  // get number of page
  var numOfPage = 1;
  var pList = $doc.querySelectorAll('.page_inner>.p');
  if (pList && pList.length) {
    var tempNum = parseInt(pList[pList.length - 2].href.match(/page=(\d*)/)[1]);
    numOfPage = parseInt(pList[pList.length - 1].href.match(/page=(\d*)/)[1]);
    numOfPage = numOfPage > tempNum ? numOfPage : tempNum;
  }
  if (items && items.length) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var item = _step.value;

        var $subjectTitle = item.querySelector('h3>a.l');
        var itemSubject = {
          subjectTitle: $subjectTitle.textContent.trim(),
          subjectURL: 'https://bgm.tv' + $subjectTitle.getAttribute('href'),
          subjectGreyTitle: item.querySelector('h3>.grey') ? item.querySelector('h3>.grey').textContent.trim() : ''
        };
        var matchDate = item.querySelector('.info').textContent.match(/\d{4}[\-\/\年]\d{1,2}[\-\/\月]\d{1,2}/);
        if (matchDate) {
          itemSubject.startDate = dealDate(matchDate[0]);
        }
        var $rateInfo = item.querySelector('.rateInfo');
        if ($rateInfo) {
          if ($rateInfo.querySelector('.fade')) {
            itemSubject.averageScore = $rateInfo.querySelector('.fade').textContent;
            itemSubject.ratingsCount = $rateInfo.querySelector('.tip_j').textContent.replace(/[^0-9]/g, '');
          } else {
            itemSubject.averageScore = '0';
            itemSubject.ratingsCount = '少于10';
          }
        } else {
          itemSubject.averageScore = '0';
          itemSubject.ratingsCount = '0';
        }
        rawInfoList.push(itemSubject);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  } else {
    return [];
  }
  return [rawInfoList, numOfPage];
}

function fetchBangumiDataBySearch(subjectInfo, typeNumber) {
  if (!subjectInfo || !subjectInfo.startDate) throw 'no date info';
  var startDate = new Date(subjectInfo.startDate);
  typeNumber = typeNumber || 4; // 4 game
  var url = 'https://bgm.tv/subject_search/' + encodeURIComponent(subjectInfo.subjectName) + '?cat=' + typeNumber;
  return gmFetch(url).then(function (info) {
    var _dealRawHTML = dealRawHTML(info),
        _dealRawHTML2 = _slicedToArray(_dealRawHTML, 2),
        rawInfoList = _dealRawHTML2[0],
        numOfPage = _dealRawHTML2[1];

    return filterResults(rawInfoList, subjectInfo.subjectName, {
      keys: ['subjectTitle', 'subjectGreyTitle'],
      startDate: subjectInfo.startDate
    });
  });
}

function fetchBangumiDataByDate(subjectInfo, pageNumber, type, allInfoList) {
  if (!subjectInfo || !subjectInfo.startDate) throw 'no date info';
  var startDate = new Date(subjectInfo.startDate);
  var SUBJECT_TYPE = type || 'game';
  var sort = startDate.getDate() > 15 ? 'sort=date' : '';
  var page = pageNumber ? 'page=' + pageNumber : '';
  var query = '';
  if (sort && page) {
    query = '?' + sort + '&' + page;
  } else if (sort) {
    query = '?' + sort;
  } else if (page) {
    query = '?' + page;
  }
  var url = 'https://bgm.tv/' + SUBJECT_TYPE + '/browser/airtime/' + startDate.getFullYear() + '-' + (startDate.getMonth() + 1) + query;

  console.log('uuuuuuuu', url);
  return gmFetch(url).then(function (info) {
    var _dealRawHTML3 = dealRawHTML(info),
        _dealRawHTML4 = _slicedToArray(_dealRawHTML3, 2),
        rawInfoList = _dealRawHTML4[0],
        numOfPage = _dealRawHTML4[1];

    pageNumber = pageNumber || 1;

    if (allInfoList) {
      numOfPage = 3;
      allInfoList = [].concat(_toConsumableArray(allInfoList), _toConsumableArray(rawInfoList));
      if (pageNumber < numOfPage) {
        return delayPromise(1000).then(function () {
          return fetchBangumiDataByDate(subjectInfo, pageNumber + 1, SUBJECT_TYPE, allInfoList);
        });
      }
      return allInfoList;
    }

    var result = filterResults(rawInfoList, subjectInfo.subjectName, {
      keys: ['subjectTitle', 'subjectGreyTitle'],
      startDate: subjectInfo.startDate
    });
    pageNumber = pageNumber || 1;
    if (!result) {
      if (pageNumber < numOfPage) {
        return delayPromise(300).then(function () {
          return fetchBangumiDataByDate(subjectInfo, pageNumber + 1, SUBJECT_TYPE);
        });
      } else {
        throw 'notmatched';
      }
    }
    return result;
  });
}

module.exports = {
  fetchBangumiDataByDate: fetchBangumiDataByDate,
  fetchBangumiDataBySearch: fetchBangumiDataBySearch
};

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function delayPromise(t) {
  var max = 400;
  var min = 200;
  t = t || Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(function (resolve) {
    setTimeout(resolve, t);
  });
}

module.exports = delayPromise;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function filterResults(items, searchstring, opts) {
  if (!items) return;
  var results = new Fuse(items, opts).search(searchstring);
  if (!results.length) return;
  if (opts.startdate) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = results[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var result = _step.value;

        if (result.startdate && new date(result.startdate) - new date(opts.startdate) === 0) {
          return result;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  } else {
    return results[0];
  }
}

module.exports = filterResults;

/***/ }),
/* 4 */,
/* 5 */,
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var search = __webpack_require__(1);

var subjectInfo = {
  subjectName: '夜蝶の未来',
  startDate: '2017/6/23'
};

search.fetchBangumiDataBySearch(subjectInfo).then(function (i) {
  if (i) return i;
  return search.fetchBangumiDataBySearch(subjectInfo);
}).then(function (i) {
  console.log(i);
}).catch(function (r) {
  console.log(r);
});

/*
 *search.fetchBangumiDataByDate(subjectInfo, null, 'game')
 *  .then((i) => {
 *    console.log(i);
 *  })
 */

/***/ })
/******/ ]);