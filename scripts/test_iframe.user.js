// ==UserScript==
// @name        test iframe - baidu.com
// @namespace   https://github.com/22earth
// @match       https://www.baidu.com/
// @match       https://cn.bing.com/
// @grant       none
// @version     1.0
// @author      22earth
// @description test iframe
// @run-at      document-end
// ==/UserScript==

const iframeId = 'e-userjs-search-subject';
let $iframe = document.querySelector(`#${iframeId}`);
if (!$iframe) {
  $iframe = document.createElement('iframe');
  $iframe.style.display = 'none';
  $iframe.id = iframeId;
  $iframe.src = 'https://cn.bing.com/';
  document.body.appendChild($iframe);
}

if (window.top !== window.self) {
  console.log('123123');
  window.postMessage({ code: '00000', data: { a: 1 }, type: 'msg' }, '*');
}

window.addEventListener('message', receiveMessage, false);

function receiveMessage(event) {
  if (event && event.data && event.data.type === 'msg') {
    console.log('msg: ', event.data.data);
  }
}
