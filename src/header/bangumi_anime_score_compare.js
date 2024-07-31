// ==UserScript==
// @name        bangumi anime score compare
// @name:zh-CN  bangumi动画和豆瓣及MAL评分对比
// @namespace   https://github.com/22earth
// @description show subject score information of douban and MAL in Bangumi or Douban
// @description:zh-cn 在Bangumi或者豆瓣上面显示其它动画评分网站的评分
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @include     https://movie.douban.com/subject/*
// @version     0.3.5
// @note        0.3.3 支持 Anidb
// @note        0.2.0 支持豆瓣上显示Bangumi评分,暂时禁用豆瓣上显示MAL的评分功能以及修改过滤方式
// @note        0.2.4 豆瓣 api 失效，使用搜索页面查询结果
// @TODO        统一豆瓣和Bangumi的缓存数据信息,
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceURL
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_addValueChangeListener
// @require     https://cdnjs.cloudflare.com/ajax/libs/fuse.js/6.4.0/fuse.min.js
// @resource    bangumi_favicon https://bgm.tv/img/favicon.ico
// @resource    douban_favicon https://img3.doubanio.com/favicon.ico
// @resource    myanimelist_favicon https://cdn.myanimelist.net/images/favicon.ico
// @resource    anidb_favicon https://cdn-us.anidb.net/css/icons/touch/favicon.ico
// ==/UserScript==
