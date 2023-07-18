// ==UserScript==
// @name        bangumi infobox fold
// @namespace   https://github.com/zhifengle
// @description 番组计划折叠信息框
// @description:en-US fold infoobox on bangumi.tv
// @description:zh-CN 自定义折叠信息框
// @author      zhifengle
// @homepage    https://github.com/zhifengle/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @version     0.0.1
// @grant       GM_registerMenuCommand
// @run-at      document-end
// ==/UserScript==

(function () {
  'use strict';

  function addClass(el, className) {
      if (!el.classList.contains(className)) {
          el.classList.add(className);
      }
  }
  const subjectTypes = ["anime", "game", "music", "book", "real"];
  const TYPE_LABLE_WHITE_LIST = {
      anime: ["中文名", "话数", "放送开始", "放送星期", "原作"],
  };
  if (GM_registerMenuCommand) {
      GM_registerMenuCommand("设置动画显示标签(半角逗号分隔)", () => {
          const whiteList = TYPE_LABLE_WHITE_LIST["anime"];
          const str = prompt("设置动画显示标签", whiteList.join(","));
          localStorage.setItem("e_user_show_labels_anime", str);
      });
      GM_registerMenuCommand("设置游戏显示标签", () => {
          const whiteList = TYPE_LABLE_WHITE_LIST["game"];
          const str = prompt("设置显示标签", whiteList.join(","));
          localStorage.setItem("e_user_show_labels_game", str);
      });
  }
  function initWhiteList() {
      subjectTypes.forEach((type) => {
          const key = `e_user_show_labels_${type}`;
          const whiteList = localStorage.getItem(key);
          if (whiteList) {
              TYPE_LABLE_WHITE_LIST[type] = whiteList.split(",");
          }
      });
  }
  function isShowLabel(label) {
      const type = getSubjectType();
      const whiteList = TYPE_LABLE_WHITE_LIST[type];
      if (whiteList && Array.isArray(whiteList)) {
          return whiteList.some((item) => label.includes(item));
      }
      return true;
  }
  function addFolded() {
      document.querySelectorAll("ul#infobox li").forEach((node) => {
          const label = node.querySelector("span").innerText.trim();
          if (!isShowLabel(label)) {
              addClass(node, "folded");
          }
      });
  }
  function getSubjectType() {
      const href = document
          .querySelector("#navMenuNeue .focus")
          .getAttribute("href");
      return href.split("/")[1];
  }
  function main() {
      initWhiteList();
      const type = getSubjectType();
      if (!TYPE_LABLE_WHITE_LIST[type]) {
          return;
      }
      addFolded();
  }
  main();

})();
