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
