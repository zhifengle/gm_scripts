import { htmlToElement } from "./utils/domUtils";

function addClass(el: HTMLElement, className: string) {
  if (!el.classList.contains(className)) {
    el.classList.add(className);
  }
}
function removeClass(el: HTMLElement, className: string) {
  if (el.classList.contains(className)) {
    el.classList.remove(className);
  }
}
const subjectTypes = ["anime", "game", "music", "book", "real"] as const;

type SubjectType = (typeof subjectTypes)[number];

const TYPE_LABLE_WHITE_LIST: { [key in SubjectType]?: string[] } = {
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

function isShowLabel(label: string): boolean {
  const type = getSubjectType();
  const whiteList = TYPE_LABLE_WHITE_LIST[type];
  if (whiteList && Array.isArray(whiteList)) {
    return whiteList.some((item) => label.includes(item));
  }
  return true;
}

function getLabels() {
  return [...document.querySelectorAll("ul#infobox li")].map((node) => {
    const label = node
      .querySelector("span")
      .innerText.trim()
      .replace(/:|：/g, "");
    return label;
  });
}

function addFolded() {
  document.querySelectorAll("ul#infobox li").forEach((node) => {
    const label = node.querySelector("span").innerText.trim();
    if (!isShowLabel(label)) {
      addClass(node as HTMLLIElement, "folded");
    }
  });
}

function getSubjectType(): SubjectType {
  const href = document
    .querySelector("#navMenuNeue .focus")
    .getAttribute("href");
  return href.split("/")[1] as SubjectType;
}

function showDialog() {
  htmlToElement(`
<div id="TB_window" style="margin-left: -265px; width: 530px; margin-top: -195px; display: block;"><div id="TB_title"><div id="TB_ajaxWindowTitle">加入收藏</div><div id="TB_closeWindowButton" title="Close">X 关闭</div><div id="TB_closeAjaxWindow"><small>Esc键可以快速关闭</small></div></div><div id="TB_ajaxContent" style="width:530px;height:390px">
  <p class="tip"><label for="tags">标签 (使用半角空格或逗号隔开)</label></p>
  <input id="tags" class="inputtext" type="text" size="30" name="tags" value="">
</div>
`);
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
