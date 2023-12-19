// ==UserScript==
// @name        评分对比助手
// @name:en     score comparation helper
// @namespace   https://github.com/22earth
// @description 在Bangumi、VNDB等上面显示其它网站的评分
// @description:en show subject score information from other site
// @author      22earth
// @license     MIT
// @homepage    https://github.com/zhifengle/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @include     https://movie.douban.com/subject/*
// @include     https://myanimelist.net/anime/*
// @include     https://anidb.net/anime/*
// @include     https://anidb.net/a*
// @include     https://2dfan.org/subjects/*
// @include     https://vndb.org/v*
// @include     https://erogamescape.org/~ap2/ero/toukei_kaiseki/*.php?game=*
// @include     https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/*.php?game=*
// @include     https://moepedia.net/game/*
// @include     http://www.getchu.com/soft.phtml?id=*
// @version     0.1.24
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
// ==/UserScript==
