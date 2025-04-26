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
// @version     0.0.9
// @run-at      document-end
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_getResourceText
// @require     https://cdnjs.cloudflare.com/ajax/libs/fuse.js/6.4.0/fuse.min.js
// @resource    bangumiDataURL https://unpkg.com/bangumi-data@0.3/dist/data.json
// ==/UserScript==
