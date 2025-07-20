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
        }
      }
    }
  };
  const observer = new MutationObserver(callback);
  // 不需要 subtree: true
  const config = { childList: true };
  observer.observe(document.body, config);
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
