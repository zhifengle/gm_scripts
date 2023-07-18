// ==UserScript==
// @name        bangumi infobox fold
// @namespace   https://github.com/zhifengle
// @description 番组计划折叠信息框
// @description:en-US fold infoobox on bangumi.tv
// @description:zh-CN 自定义折叠信息框
// @author      zhifengle
// @homepage    https://github.com/zhifengle/gm_scripts
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/subject\/.*$/
// @version     0.0.3
// @run-at      document-end
// ==/UserScript==

(function () {
  'use strict';

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

  function addClass(el, className) {
      if (!el.classList.contains(className)) {
          el.classList.add(className);
      }
  }
  const subjectTypes = ["anime", "game", "music", "book", "real"];
  const TYPE_LABLE_WHITE_LIST = {
      anime: ["中文名", "话数", "放送开始", "放送星期", "原作"],
  };
  function insertSettingDom() {
      const $infobox = document.querySelector("#infobox");
      const $btn = htmlToElement(`<div class="infobox_expand" style="position: static;"><a href="javascript:void(0);">设置显示标签 +</a></div>`);
      $btn.onclick = () => {
          const type = getSubjectType();
          const whiteList = TYPE_LABLE_WHITE_LIST[type] || [];
          const str = prompt("设置显示标签", whiteList.join(","));
          if (str) {
              localStorage.setItem(`e_user_show_labels_${type}`, str);
          }
          else {
              localStorage.removeItem(`e_user_show_labels_${type}`);
          }
      };
      $infobox.insertAdjacentElement("afterend", $btn);
  }
  function initWhiteList() {
      subjectTypes.forEach((type) => {
          const key = `e_user_show_labels_${type}`;
          const whiteList = localStorage.getItem(key);
          if (whiteList && whiteList !== 'null') {
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
      insertSettingDom();
      const type = getSubjectType();
      if (!TYPE_LABLE_WHITE_LIST[type]) {
          return;
      }
      addFolded();
  }
  main();

})();
