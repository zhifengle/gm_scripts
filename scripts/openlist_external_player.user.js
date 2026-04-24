// ==UserScript==
// @name        openlist external player
// @namespace   https://github.com/zhifengle
// @include     http://localhost:5244/*
// @version     0.2
// @note        按照实际情况修改 include
// @author      zhifengle
// @description open external player for openlist
// @require     https://cdn.jsdelivr.net/npm/pinyin@4.0.0/lib/umd/pinyin.min.js
// ==/UserScript==

(function (open) {
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener(
      'readystatechange',
      function () {
        if (this.readyState === 4 && this.responseURL.includes('/api/fs/list')) {
          let res = JSON.parse(this.response);
          if (res.code === 200) {
            const fileList = res.data.content;
            detectListRenderComplete(fileList);
          }
        }
      },
      false
    );
    open.apply(this, arguments);
  };
})(XMLHttpRequest.prototype.open);

/**
 * 生成字符串对应的全拼 + 首字母拼音
 * @param {string} title - 输入的中文字符串
 * @returns {Array} [全拼字符串, 首字母字符串]
 */
function generatePinyinTitles(title) {
  // 空值判断
  if (!title || typeof title !== 'string') {
    return [];
  }

  // 生成全拼
  const fullPinyin = pinyin.pinyin(title, {
    style: 'normal',
  });

  // 生成首字母
  const firstLetter = pinyin.pinyin(title, {
    style: 'first_letter',
  });

  // 扁平化 + 拼接成字符串
  const fullStr = fullPinyin.flat().join('');
  const firstStr = firstLetter.flat().join('');

  return [fullStr, firstStr];
}

function detectListRenderComplete(fileList) {
  const callback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const items = document.querySelectorAll('.nav + .obj-box a.list-item');
        if (items.length === fileList.length) {
          observer.disconnect();
          console.log('list render complete');
          items.forEach((item, index) => {
            patchItemClick(item, fileList[index]);
          });
          addFilterDropdown(fileList);
        }
      }
    }
  };
  const observer = new MutationObserver(callback);
  // 不需要 subtree: true
  const config = { childList: true };
  observer.observe(document.body, config);
}

function extractAnimeName(filename) {
  // 移除 [ANi] 前缀和文件扩展名
  let name = filename.replace(/^\[.*?\]\s*/, '').replace(/\.\w+$/, '');
  // 匹配 " - XX " 或 " - XX[" 格式的集数，并移除集数部分
  name = name.replace(/\s+-\s+\d+(\s+\[|$).*/, '');
  // 清理多余空格
  return name.trim();
}

const FILTER_STYLES = {
  container: 'margin: 10px 0; padding: 0 16px;',
  input: 'padding: 6px 12px; font-size: 14px; border-radius: 4px; border: 1px solid #ddd; min-width: 300px;',
  label: 'margin-right: 8px; font-weight: 500;'
};

const FILTER_IDS = {
  input: 'e-userjs-filter-input',
  datalist: 'e-userjs-filter-datalist',
  container: 'e-userjs-filter-container'
};

function extractAnimeNames(fileList) {
  const nameSet = new Set();
  for (const file of fileList) {
    if (file.type !== 2) continue;
    if (!/\.(mkv|mp4)$/i.test(file.name)) continue;
    const animeName = extractAnimeName(file.name);
    if (animeName) {
      nameSet.add(animeName);
    }
  }
  return Array.from(nameSet).sort();
}

function createDatalistOptions(animeNames) {
  const fragment = document.createDocumentFragment();
  for (const name of animeNames) {
    const option = document.createElement('option');
    option.value = name;
    fragment.appendChild(option);
  }
  return fragment;
}

function createSearchInput(datalistId) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = FILTER_IDS.input;
  input.setAttribute('list', datalistId);
  input.placeholder = '输入名称筛选（支持拼音）...';
  input.style.cssText = FILTER_STYLES.input;
  return input;
}

function createDatalist(id, animeNames) {
  const datalist = document.createElement('datalist');
  datalist.id = id;
  datalist.appendChild(createDatalistOptions(animeNames));
  return datalist;
}

function createFilterContainer(inputElement, datalistElement) {
  const container = document.createElement('div');
  container.id = FILTER_IDS.container;
  container.style.cssText = FILTER_STYLES.container;

  const label = document.createElement('label');
  label.textContent = '筛选: ';
  label.style.cssText = FILTER_STYLES.label;

  container.appendChild(label);
  container.appendChild(inputElement);
  container.appendChild(datalistElement);

  return container;
}


function insertFilterContainer(container) {
  const objBox = document.querySelector('.nav + .obj-box');
  if (!objBox) return false;
  objBox.parentElement.insertBefore(container, objBox);
  return true;
}

function bindFilterEvents(input, fileList) {
  input.addEventListener('input', (e) => {
    filterItems(e.target.value.trim(), fileList);
  });
}

function addFilterDropdown(fileList) {
  if (document.querySelector(`#${FILTER_IDS.input}`)) return;

  const animeNames = extractAnimeNames(fileList);
  if (animeNames.length === 0) return;

  const datalist = createDatalist(FILTER_IDS.datalist, animeNames);
  const input = createSearchInput(FILTER_IDS.datalist);

  const container = createFilterContainer(input, datalist);
  if (!insertFilterContainer(container)) return;

  bindFilterEvents(input, fileList);
}

function filterItems(searchQuery, fileList) {
  const query = searchQuery.toLowerCase();
  const items = [...document.querySelectorAll('.obj-box a.list-item')];

  fileList.forEach((file, index) => {
    if (!file || file.type !== 2 || !/\.(mkv|mp4)$/i.test(file.name)) {
      return;
    }

    const animeName = extractAnimeName(file.name);
    const [fullPinyin, firstLetters] = generatePinyinTitles(animeName);

    const shouldShow = !query ||
      animeName.toLowerCase().includes(query) ||
      (fullPinyin && fullPinyin.toLowerCase().includes(query)) ||
      (firstLetters && firstLetters.toLowerCase().includes(query));

    items[index].parentElement.style.display = shouldShow ? '' : 'none';
  });
}

function openByIframe(url) {
  const iframeId = 'e-userjs-open-iframe';
  let $iframe = document.querySelector(`#${iframeId}`);
  if (!$iframe) {
    $iframe = document.createElement('iframe');
    $iframe.style.display = 'none';
    $iframe.id = iframeId;
    document.body.appendChild($iframe);
  }
  $iframe.src = url;
  return $iframe;
}

function patchItemClick(item, file) {
  if (/\.mkv|\.mp4$/.test(item.href) && file.type === 2) {
    const el = item;

    const newElement = el.cloneNode(true);
    newElement.onclick = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      const href = el.getAttribute('href');
      const dUrl = `${location.origin}/d/${href}?sign=${file.sign}`;
      const url = `mpv://${encodeURIComponent(dUrl)}`;
      // copyTextToClipboard(url);
      console.log(url);
      openByIframe(url);
      removeActiveClass();
      newElement.style.textDecoration = 'underline';
      newElement.style.transform = 'scale(1.01)';
      newElement.style.backgroundColor = 'rgba(236, 245, 255)';
    };
    el.parentElement.replaceChild(newElement, el);
  }
}
function removeActiveClass() {
  const items = document.querySelectorAll('.nav + .obj-box a.list-item');
  items.forEach((item) => {
    item.style.textDecoration = '';
    item.style.transform = '';
    item.style.backgroundColor = '';
  });
}

function copyTextToClipboard(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
