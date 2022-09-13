// ==UserScript==
// @name        115 offline dialog
// @name:zh-CN  115离线列表弹窗
// @namespace   https://github.com/22earth
// @description show 115 offline dialog
// @description:zh-cn 显示离线列表弹窗
// @author      22earth
// @include     https://115.com/*
// @version     0.0.1
// @run-at      document-end
// @license     MIT
// ==/UserScript==

function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

function insertBtn($target) {
  const downloadBtnStr = `<a href="javascript:;" class="button btn-line" tab_btn="wangpan" mode-tab="offline">
                <i class="icon-operate ifo-linktask"></i>
                <span>云下载</span>
            </a>`;
  const $btn = htmlToElement(downloadBtnStr);
  $btn.addEventListener('click', () => {
    insertDialog();
  });
  $target.insertAdjacentElement('beforebegin', $btn);
}

function insertDialog() {
  const str = `
<div class="dialog-box dialog-mini offline-box window-current" style="z-index: 1000000006;position: fixed">
  <div class="dialog-header" rel="title_box" ws_property="1">
    <h3 rel="base_title">记录</h3>
  </div>
  <div class="dialog-handle"><a href="javascript:;" class="close" btn="close">关闭</a></div>
  <div rel="base_content" style="z-index: 11;">
    <iframe id="offline-iframe" rel="wangpan" name="wangpan" src="https://115.com/?ct=index&ac=offline_new_tpl&offline=1&tab=offline" frameborder="0" style="position: absolute; top: 0px;"></iframe>
  </div>
  <div class="dialog-bottom" style="overflow: visible">
    bottom
  </div>
</div>
</div>
`;
  document.body.appendChild(htmlToElement(str));
}

const $status = document.querySelector('#js-panel_model_switch');
if ($status) {
  insertBtn($status);
}
