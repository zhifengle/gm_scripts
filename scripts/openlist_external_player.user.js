// ==UserScript==
// @name        openlist external player
// @namespace   https://github.com/zhifengle
// @include     http://localhost:5244/*
// @version     0.2
// @note        按照实际情况修改 include
// @author      zhifengle
// @description open external player for openlist
// @grant       GM_addStyle
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

const ACTIVE_CLASS = 'e-userjs-active-item';

GM_addStyle(`
  .${ACTIVE_CLASS} {
    text-decoration: underline;
    transform: scale(1.01);
    background-color: rgba(236, 245, 255);
  }
`);

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
  let name = filename
    .replace(/\.\w+$/, '')           // 移除扩展名
    .replace(/^\[.*?\]\s*/g, '')     // 移除所有前缀中括号 [ANi][1080P]...
    .replace(/\s+-\s+\d+/g, ' ')     // 移除集数 "- 01"
    .replace(/\s*\[.*?\]\s*/g, ' ')  // 移除剩余的中括号标签 [HEVC][CHS]
    .replace(/\s+/g, ' ')            // 合并多余空格
    .trim();
  return name || '';
}

const FILTER_STYLES = {
  container: 'margin: 10px 0; padding: 0 16px;',
  inputWrapper: 'position: relative; display: inline-block; min-width: 300px;',
  input: 'width: 100%; padding: 6px 28px 6px 12px; font-size: 14px; border-radius: 4px; border: 1px solid #ddd; box-sizing: border-box;',
  clearBtn: 'position: absolute; right: 4px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 16px; color: #999; line-height: 1; padding: 0 4px; display: none;',
  label: 'margin-right: 8px; font-weight: 500;'
};


const FILTER_IDS = {
  input: 'e-userjs-filter-input',
  datalist: 'e-userjs-filter-datalist',
  container: 'e-userjs-filter-container'
};

function isVideoFile(filename) {
  return /\.(mkv|mp4)$/i.test(filename);
}

function extractAnimeNames(fileList) {
  const nameSet = new Set();
  for (const file of fileList) {
    if (file.type !== 2) continue;
    if (!isVideoFile(file.name)) continue;
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
  const wrapper = document.createElement('div');
  wrapper.style.cssText = FILTER_STYLES.inputWrapper;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = FILTER_IDS.input;
  input.setAttribute('list', datalistId);
  input.placeholder = '输入名称筛选（支持拼音）...';
  input.style.cssText = FILTER_STYLES.input;

  const clearBtn = document.createElement('span');
  clearBtn.innerHTML = '&times;';
  clearBtn.style.cssText = FILTER_STYLES.clearBtn;
  clearBtn.title = '清除';

  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  });

  input.addEventListener('input', () => {
    clearBtn.style.display = input.value ? 'block' : 'none';
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);

  return { wrapper, input, clearBtn };
}

function createDatalist(id, animeNames) {
  const datalist = document.createElement('datalist');
  datalist.id = id;
  datalist.appendChild(createDatalistOptions(animeNames));
  return datalist;
}

function createFilterContainer(wrapperElement, datalistElement) {
  const container = document.createElement('div');
  container.id = FILTER_IDS.container;
  container.style.cssText = FILTER_STYLES.container;

  const label = document.createElement('label');
  label.textContent = '筛选: ';
  label.style.cssText = FILTER_STYLES.label;

  container.appendChild(label);
  container.appendChild(wrapperElement);
  container.appendChild(datalistElement);

  return container;
}


function insertFilterContainer(container) {
  const objBox = document.querySelector('.nav + .obj-box');
  if (!objBox) return false;
  objBox.parentElement.insertBefore(container, objBox);
  return true;
}

function bindFilterEvents(input, fileList, datalist) {
  input.addEventListener('input', (e) => {
    filterItems(e.target.value.trim(), fileList, datalist);
  });
}

function addFilterDropdown(fileList) {
  if (document.querySelector(`#${FILTER_IDS.input}`)) return;

  const animeNames = extractAnimeNames(fileList);
  if (animeNames.length === 0) return;

  const datalist = createDatalist(FILTER_IDS.datalist, animeNames);
  const { wrapper, input, clearBtn } = createSearchInput(FILTER_IDS.datalist);

  const container = createFilterContainer(wrapper, datalist);
  if (!insertFilterContainer(container)) return;

  bindFilterEvents(input, fileList, datalist);
}

function updateDatalistOptions(datalist, fileList, query) {
  datalist.innerHTML = '';
  if (!query) {
    datalist.appendChild(createDatalistOptions(extractAnimeNames(fileList)));
    return;
  }
  const visibleNames = new Set();
  const items = [...document.querySelectorAll('.obj-box a.list-item')];
  fileList.forEach((file, index) => {
    if (!file || file.type !== 2 || !isVideoFile(file.name)) return;
    if (items[index].parentElement.style.display === 'none') return;
    const animeName = extractAnimeName(file.name);
    if (animeName) visibleNames.add(animeName);
  });
  datalist.appendChild(createDatalistOptions(Array.from(visibleNames)));
}

function filterItems(searchQuery, fileList, datalist) {
  const query = searchQuery.toLowerCase();
  const items = [...document.querySelectorAll('.obj-box a.list-item')];

  fileList.forEach((file, index) => {
    if (!file || file.type !== 2 || !isVideoFile(file.name)) {
      return;
    }

    const animeName = extractAnimeName(file.name) || file.name;
    const [fullPinyin, firstLetters] = generatePinyinTitles(animeName);

    const shouldShow = !query ||
      animeName.toLowerCase().includes(query) ||
      (fullPinyin && fullPinyin.toLowerCase().includes(query)) ||
      (firstLetters && firstLetters.toLowerCase().includes(query));

    items[index].parentElement.style.display = shouldShow ? '' : 'none';
  });

  updateDatalistOptions(datalist, fileList, searchQuery);
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

function createMpvUrl(href, sign) {
  const dUrl = `${location.origin}/d/${href}?sign=${sign}`;
  return `mpv://${encodeURIComponent(dUrl)}`;
}

function clearActiveItem() {
  const active = document.querySelector(`.${ACTIVE_CLASS}`);
  if (active) {
    active.classList.remove(ACTIVE_CLASS);
  }
}

function setActiveItem(element) {
  clearActiveItem();
  element.classList.add(ACTIVE_CLASS);
}

function patchItemClick(item, file) {
  if (file.type !== 2) return;
  if (!/\.mkv|\.mp4$/i.test(item.href)) return;

  const clonedItem = item.cloneNode(true);

  clonedItem.addEventListener('click', (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();

    const href = item.getAttribute('href');
    const url = createMpvUrl(href, file.sign);

    console.log(url);
    openByIframe(url);
    setActiveItem(clonedItem);
  });

  item.parentElement.replaceChild(clonedItem, item);
}

function copyTextToClipboard(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
