// ==UserScript==
// @name        openlist external player
// @namespace   https://github.com/zhifengle
// @include     http://localhost:5244/*
// @version     0.1
// @note        按照实际情况修改 include
// @author      zhifengle
// @description open external player for openlist
// @grant       unsafeWindow
// @run-at      document-start
// ==/UserScript==

var currentHref = window.location.href;

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
        }
      }
    }
  };
  const observer = new MutationObserver(callback);
  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
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
      copyTextToClipboard(url);
      window.open(url, '_self');
    };
    el.parentElement.replaceChild(newElement, el);
  }
}

function copyTextToClipboard(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
