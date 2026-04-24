// ==UserScript==
// @name        openlist external player
// @namespace   https://github.com/zhifengle
// @include     http://localhost:5244/*
// @version     0.2
// @note        按照实际情况修改 include
// @author      zhifengle
// @description open external player for openlist
// ==/UserScript==

// (function () {
//   const items = []
//   const originFetch = fetch;
//   window.unsafeWindow.fetch = (url, options) => {
//     return originFetch(url, options).then(async (response) => {
//       console.log(url);
//       if (url.includes('/api/fs/list')) {
//         const responseClone = response.clone();
//         let res = await responseClone.json();
//         if (res.code === 200) {
//           console.log('fetch', res.data.content);
//           items.push(...res.data.content);
//         }
//       }
//       return response;
//     });
//   };
// })();

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
          addFilterDropdown(fileList, items);
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
  let name = filename.replace(/^\[ANi\]\s*/, '').replace(/\.\w+$/, '');
  // 匹配 " - XX " 或 " - XX[" 格式的集数，并移除集数部分
  name = name.replace(/\s+-\s+\d+(\s+\[|$).*/, '');
  // 清理多余空格
  return name.trim();
}

function addFilterDropdown(fileList, items) {
  // 避免重复添加
  if (document.querySelector('#e-userjs-filter-select')) {
    return;
  }

  // 提取所有动画名称
  const nameSet = new Set();
  fileList.forEach(file => {
    if (file.type === 2 && /\.(mkv|mp4)$/i.test(file.name)) {
      const animeName = extractAnimeName(file.name);
      if (animeName) {
        nameSet.add(animeName);
      }
    }
  });

  const animeNames = Array.from(nameSet).sort();
  if (animeNames.length === 0) {
    return;
  }

  // 创建筛选容器
  const filterContainer = document.createElement('div');
  filterContainer.style.cssText = 'margin: 10px 0; padding: 0 16px;';
  filterContainer.id = 'e-userjs-filter-container';

  // 创建下拉框
  const select = document.createElement('select');
  select.id = 'e-userjs-filter-select';
  select.style.cssText = 'padding: 6px 12px; font-size: 14px; border-radius: 4px; border: 1px solid #ddd; min-width: 300px; cursor: pointer;';

  // 添加默认选项
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '全部显示';
  select.appendChild(defaultOption);

  // 添加动画名称选项
  animeNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  // 添加标签
  const label = document.createElement('label');
  label.textContent = '筛选: ';
  label.style.cssText = 'margin-right: 8px; font-weight: 500;';

  filterContainer.appendChild(label);
  filterContainer.appendChild(select);

  // 插入到列表上方
  const objBox = document.querySelector('.nav + .obj-box');
  if (objBox) {
    objBox.parentElement.insertBefore(filterContainer, objBox);
  }

  // 绑定筛选事件
  select.addEventListener('change', (e) => {
    const selectedName = e.target.value;
    filterItems(selectedName, fileList, items);
  });
}

function filterItems(selectedName, fileList, items) {
  items.forEach((item, index) => {
    const file = fileList[index];
    if (!file || file.type !== 2 || !/\.(mkv|mp4)$/i.test(file.name)) {
      return;
    }

    const animeName = extractAnimeName(file.name);
    const shouldShow = !selectedName || animeName === selectedName;

    // 找到父级列表项容器
    const listItem = item.closest('.list-item') || item;
    if (listItem) {
      listItem.style.display = shouldShow ? '' : 'none';
    }
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
