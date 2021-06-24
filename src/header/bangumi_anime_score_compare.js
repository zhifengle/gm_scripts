// ==UserScript==
// @name        bangumi anime score compare
// @name:zh-CN  bangumi动画和豆瓣及MAL评分对比
// @namespace   https://github.com/22earth
// @description show subject score information of douban and MAL in bangumi.tv
// @description:zh-cn bangumi动画页面显示豆瓣和MAL的评分
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @include     https://movie.douban.com/subject/*
// @updateURL   https://raw.githubusercontent.com/bangumi/scripts/master/a_little/bangumi_anime_score_compare.user.js
// @version     0.3.0
// @note        0.2.0 支持豆瓣上显示Bangumi评分,暂时禁用豆瓣上显示MAL的评分功能以及修改过滤方式
// @note        0.2.4 豆瓣 api 失效，使用搜索页面查询结果
// @TODO        统一豆瓣和Bangumi的缓存数据信息,
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @require     https://cdn.staticfile.org/fuse.js/6.4.0/fuse.min.js
// ==/UserScript==
