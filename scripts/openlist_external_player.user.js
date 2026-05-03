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

const APIInterceptor = {
 handlers: new Map(),

 register(urlPattern, callback) {
   this.handlers.set(urlPattern, callback);
 },

 dispatch(url, data) {
   for (const [pattern, cb] of this.handlers) {
     if (url.includes(pattern)) {
       try { cb(data); } catch (e) { console.error(e); }
     }
   }
 },

 init() {
   const self = this;

   const originalOpen = XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open = function (method, url, ...args) {
     this.__url = url;
     originalOpen.call(this, method, url, ...args);
   };

   const originalSend = XMLHttpRequest.prototype.send;
   XMLHttpRequest.prototype.send = function (...args) {
     this.addEventListener('readystatechange', function () {
       if (this.readyState === 4) {
         try {
           self.dispatch(this.__url, JSON.parse(this.response));
         } catch {}
       }
     });
     originalSend.apply(this, args);
   };
 }
};

// 初始化拦截
APIInterceptor.init();

// 注册业务逻辑
APIInterceptor.register('/api/fs/list', (res) => {
 if (res?.code === 200) {
   detectListRenderComplete(res.data.content);
 }
});


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
        const items = document.querySelectorAll('.obj-box a.list-item');
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
  return filename
    // 1. 移除文件扩展名
    .replace(/\.\w+$/, '')

    // 2. 移除开头的字幕组标签，如 [SubsPlease] 或 (SubsPlease)
    .replace(/^[\[(][^\]\)]*[\])]\s*/, '')

    // 3. 移除分辨率标签，如 [1080p] [4K] [2160P]
    .replace(/[\[(]\s*(?:4K|[248]K|720[Pp]|1080[Pp]|2160[Pp]|480[Pp])\s*[\])]/g, '')

    // 4. 移除视频编码标签
    .replace(/[\[(]\s*(?:HEVC|x26[45]|AVC|H\.?26[45]|Hi10P?|Hi10|8[Bb]it|10[Bb]it|12[Bb]it|AV1|VP9)\s*[\])]/gi, '')

    // 5. 移除来源标签
    .replace(/[\[(]\s*(?:WEB-DL|WEBRip|BDRip|BluRay|Blu-Ray|BD|WebRip|HDTV|DVD|AMZN|NF|CR|DSNP)\s*[\])]/gi, '')

    // 6. 移除语言标签
    .replace(/[\[(]\s*(?:JPSC|CHS|CHT|BIG5|GB|ENG|JPN|DUAL|Multi(?:[-\s]?[Ss]ub)?)\s*[\])]/gi, '')

    // 7. 移除容器格式标签
    .replace(/[\[(]\s*(?:MP4|MKV|AVI|AAC|FLAC|AC3|DTS)\s*[\])]/gi, '')

    // 8. 移除平台标签
    .replace(/[\[(]\s*(?:Baha|Bilibili|B-Global|Netflix|Amazon)\s*[\])]/gi, '')

    // 9. 移除纯数字集数标签，如 [03] (04) —— 放在通用括号清理前
    .replace(/[\[(]\s*\d{1,4}\s*[\])]/g, '')

    // 10. 移除末尾集数，如 " - 03" " – 12"
    .replace(/\s*[-–—]\s*\d{1,4}\s*(?:[vV]\d)?\s*$/g, '')

    // 11. 移除开头集数，如 "03 - "
    .replace(/^\s*\d{1,4}\s*[-–—]\s*/, '')

    // 12. 移除末尾的版本号，如 "v2" "V2"
    .replace(/\s+[vV]\d+\s*$/, '')

    // 13. 移除开头残余的 [Title] → Title（上面步骤可能已处理，兜底）
    .replace(/^\[([^\[\]]+)\]/, '$1')

    // 14. 移除剩余的括号块（仅当内容不含中日文，避免误删含括号的标题）
    .replace(/[\[(][^\]\)]*[\])]/g, (match) => {
      // 保留含中日韩字符的括号内容（可能是副标题）
      return /[\u3000-\u9fff\uff00-\uffef]/.test(match) ? match : ' ';
    })

    // 15. 收尾：合并空格、去掉多余标点
    .replace(/\s*[-–—]\s*$/, '')   // 末尾残余连字符
    .replace(/\s+/g, ' ')
    .trim();
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

/**
 * 简单的防抖动函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
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

function bindFilterEvents(input) {
  const debouncedFilter = debounce((value) => {
    filterItems(value.trim());
  }, 200);

  input.addEventListener('input', (e) => {
    debouncedFilter(e.target.value);
  });
}

function addFilterDropdown(fileList) {
  if (document.querySelector(`#${FILTER_IDS.input}`)) return;

  const animeNames = extractAnimeNames(fileList);

  const datalist = createDatalist(FILTER_IDS.datalist, animeNames);
  const { wrapper, input, clearBtn } = createSearchInput(FILTER_IDS.datalist);

  const container = createFilterContainer(wrapper, datalist);
  if (!insertFilterContainer(container)) return;

  bindFilterEvents(input);
}


function filterItems(searchQuery) {
  const query = searchQuery.toLowerCase();
  const items = [...document.querySelectorAll('.obj-box a.list-item')];

  items.forEach((item) => {
    if (!item.parentElement) return;

    const text = item.querySelector('.name')?.textContent.toLowerCase();
    if (!text) return;
    const shouldShow = !query ||
      text.includes(query) ||
      (() => {
        const [fullPinyin, firstLetters] = generatePinyinTitles(item.textContent);
        return (fullPinyin && fullPinyin.toLowerCase().includes(query)) ||
          (firstLetters && firstLetters.toLowerCase().includes(query));
      })();

    item.parentElement.style.display = shouldShow ? '' : 'none';
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

function openByScheme(url) {
  // 创建宿主元素，附加 Shadow DOM
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  // 在 Shadow DOM 内创建 <a>
  const a = document.createElement('a');
  a.href = url;
  shadow.appendChild(a);
  document.body.appendChild(host);

  a.click();

  // 清理
  setTimeout(() => document.body.removeChild(host), 1000);
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
    openByScheme(url);
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
