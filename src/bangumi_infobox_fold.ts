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

function insertSettingDom() {
  const $infobox = document.querySelector("#infobox");
  const $btn = htmlToElement(
    `<div class="infobox_expand" style="position: static;"><a href="javascript:void(0);">设置显示标签 +</a></div>`
  ) as HTMLDivElement;
  $btn.onclick = () => {
    const type = getSubjectType();
    const whiteList = TYPE_LABLE_WHITE_LIST[type] || [];
    const str = prompt("设置显示标签", whiteList.join(","));
    if (str) {
      localStorage.setItem(`e_user_show_labels_${type}`, str);
    } else {
      localStorage.removeItem(`e_user_show_labels_${type}`);
    }
  };
  const type = getSubjectType();
  const whiteList = TYPE_LABLE_WHITE_LIST[type];
  // 没有更多制作人员按钮并且没用设置白名单时，添加按钮
  if (
    !document.querySelector(".infobox_container > .infobox_expand") &&
    whiteList &&
    Array.isArray(whiteList)
  ) {
    const $showMoreBtn = htmlToElement(
      `<div class="infobox_expand" style="position: static;"><a href="javascript:void(0);">更多制作人员 +</a></div>`
    ) as HTMLDivElement;
    $showMoreBtn.onclick = () => {
      removeFoldedClass();
      $showMoreBtn.remove();
    };
    $infobox.insertAdjacentElement("afterend", $showMoreBtn);
  }
  $infobox.insertAdjacentElement("afterend", $btn);
}

function initWhiteList() {
  subjectTypes.forEach((type) => {
    const key = `e_user_show_labels_${type}`;
    const whiteList = localStorage.getItem(key);
    if (whiteList && whiteList !== "null") {
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
    const label = node.querySelector("span").innerHTML.trim();
    if (!isShowLabel(label)) {
      addClass(node as HTMLLIElement, "folded");
    } else {
      removeClass(node as HTMLLIElement, "folded");
    }
  });
}

function removeFoldedClass() {
  document.querySelectorAll("ul#infobox li").forEach((node) => {
    removeClass(node as HTMLLIElement, "folded");
  });
}

function getSubjectType(): SubjectType {
  const href = document
    .querySelector("#navMenuNeue .focus")
    .getAttribute("href");
  return href.split("/")[1] as SubjectType;
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
