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
// @version     0.0.7
// @note        0.0.6 导出格式改为 excel 和支持 excel 的导入。
// @note        0.0.4 添加导入功能。注意：不支持是否对自己可见的导入
// @grant       GM_xmlhttpRequest
// @require     https://cdnjs.cloudflare.com/ajax/libs/jschardet/1.4.1/jschardet.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @run-at      document-end
// ==/UserScript==
