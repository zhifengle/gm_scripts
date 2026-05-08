// ==UserScript==
// @name        offline 115 for rss2cloud
// @namespace   https://github.com/zhifengle
// @include     https://mikanani.me/*
// @include     https://nyaa.si/*
// @include     https://sukebei.nyaa.si/*
// @version     0.1.1
// @author      zhifengle
// @description add offline tasks to rss2cloud server
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @run-at      document-end
// ==/UserScript==

// 配置
const FOLDER_CID_KEY = 'folder_cid';
const RSS2CLOUD_URL_KEY = 'RSS2CLOUD_URL';
const RSS2CLOUD_AUTH_KEY = 'authString';
const DEFAULT_RSS2CLOUD_URL = 'http://localhost:8115';
var folder_cid = GM_getValue(FOLDER_CID_KEY, '');
let RSS2CLOUD_URL = normalizeRss2cloudUrl(GM_getValue(RSS2CLOUD_URL_KEY, DEFAULT_RSS2CLOUD_URL));
let rss2cloudAuth = GM_getValue(RSS2CLOUD_AUTH_KEY, '');
let authString = rss2cloudAuth ? btoa(rss2cloudAuth) : '';

function normalizeRss2cloudUrl(url) {
  return (url || DEFAULT_RSS2CLOUD_URL).trim().replace(/\/+$/, '') || DEFAULT_RSS2CLOUD_URL;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    const dict = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return dict[char];
  });
}

function htmlToElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

if (typeof GM_registerMenuCommand === 'function') {
  GM_registerMenuCommand('rss2cloud 设置', () => showConfigDialog());
}

function getRequestHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authString) {
    headers.Authorization = `Basic ${authString}`;
  }

  return headers;
}

function saveConfig(nextConfig) {
  folder_cid = nextConfig.folderCid.trim();
  RSS2CLOUD_URL = normalizeRss2cloudUrl(nextConfig.rss2cloudUrl);
  rss2cloudAuth = nextConfig.auth.trim();
  authString = rss2cloudAuth ? btoa(rss2cloudAuth) : '';

  GM_setValue(FOLDER_CID_KEY, folder_cid);
  GM_setValue(RSS2CLOUD_URL_KEY, RSS2CLOUD_URL);
  GM_setValue(RSS2CLOUD_AUTH_KEY, rss2cloudAuth);
}

function showConfigDialog() {
  const existingDialog = document.querySelector('.offline115-config-dialog');
  if (existingDialog) {
    if (!existingDialog.open) {
      existingDialog.showModal();
    }
    existingDialog.querySelector('.offline115-config-save')?.focus();
    return;
  }

  const dialog = htmlToElement(`
<dialog class="offline115-config-dialog" aria-labelledby="offline115-config-title">
  <style>
    .offline115-config-dialog {
      width: min(420px, calc(100vw - 32px));
      padding: 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #09090b;
      background: #ffffff;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .offline115-config-dialog::backdrop {
      background: rgba(15, 23, 42, 0.42);
    }
    .offline115-config-content {
      padding: 20px;
    }
    .offline115-config-header {
      margin-bottom: 18px;
    }
    .offline115-config-title {
      margin: 0;
      color: #09090b;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
    }
    .offline115-config-desc {
      margin: 6px 0 0;
      color: #71717a;
      font-size: 13px;
      line-height: 1.5;
    }
    .offline115-config-section {
      padding: 14px 0;
      border-top: 1px solid #e5e7eb;
    }
    .offline115-config-section-title,
    .offline115-config-label {
      margin: 0 0 10px;
      color: #27272a;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
    }
    .offline115-config-section-desc {
      margin: 0;
      color: #71717a;
      font-size: 12px;
      line-height: 1.45;
    }
    .offline115-config-section-desc {
      margin-bottom: 10px;
    }
    .offline115-config-field {
      display: grid;
      gap: 8px;
    }
    .offline115-config-input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      height: 36px;
      padding: 0 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #09090b;
      background: #ffffff;
      font-size: 13px;
    }
    .offline115-config-input::placeholder {
      color: #a1a1aa;
    }
    .offline115-config-input:focus-visible,
    .offline115-config-button:focus-visible {
      outline: 2px solid #18181b;
      outline-offset: 2px;
    }
    .offline115-config-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .offline115-config-footer {
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    .offline115-config-button {
      height: 36px;
      padding: 0 14px;
      border: 1px solid #18181b;
      border-radius: 8px;
      color: #ffffff;
      background: #18181b;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .offline115-config-button.secondary {
      border-color: #e5e7eb;
      color: #18181b;
      background: #ffffff;
    }
    .offline115-config-button:hover {
      background: #27272a;
    }
    .offline115-config-button.secondary:hover {
      background: #f8fafc;
    }
  </style>
  <div class="offline115-config-content">
    <div class="offline115-config-header">
      <p id="offline115-config-title" class="offline115-config-title">rss2cloud 设置</p>
      <p class="offline115-config-desc">集中管理提交地址、115 目录 cid 和可选的 Basic Auth。</p>
    </div>
    <div class="offline115-config-section">
      <label class="offline115-config-field" for="offline115-rss2cloud-url">
        <span class="offline115-config-label">RSS2CLOUD_URL</span>
        <input class="offline115-config-input" id="offline115-rss2cloud-url" type="url" value="${escapeHtml(RSS2CLOUD_URL)}" placeholder="${DEFAULT_RSS2CLOUD_URL}">
      </label>
      <p class="offline115-config-section-desc">提交任务时会请求该地址的 /add 接口。</p>
    </div>
    <div class="offline115-config-section">
      <label class="offline115-config-field" for="offline115-folder-cid">
        <span class="offline115-config-label">115 目录 cid</span>
        <input class="offline115-config-input" id="offline115-folder-cid" type="text" value="${escapeHtml(folder_cid)}" placeholder="留空使用服务端默认目录">
      </label>
    </div>
    <div class="offline115-config-section">
      <label class="offline115-config-field" for="offline115-auth">
        <span class="offline115-config-label">Basic Auth</span>
        <input class="offline115-config-input" id="offline115-auth" type="text" value="${escapeHtml(rss2cloudAuth)}" placeholder="username:password">
      </label>
      <p class="offline115-config-section-desc">留空则不会发送 Authorization 请求头。</p>
    </div>
    <div class="offline115-config-footer">
      <button class="offline115-config-button offline115-config-save" type="button" autofocus>保存</button>
    </div>
  </div>
</dialog>
  `);
  const urlInput = dialog.querySelector('#offline115-rss2cloud-url');
  const cidInput = dialog.querySelector('#offline115-folder-cid');
  const authInput = dialog.querySelector('#offline115-auth');

  const handleSave = () => {
    saveConfig({
      folderCid: cidInput.value,
      rss2cloudUrl: urlInput.value,
      auth: authInput.value,
    });
    dialog.close();
  };

  dialog.querySelector('.offline115-config-save').addEventListener('click', handleSave);
  dialog.addEventListener('close', () => {
    dialog.remove();
  }, { once: true });

  document.body.appendChild(dialog);
  dialog.showModal();
}

GM_addStyle(`
.offline115-anchor {
  display: inline-block;
}
.offline115-anchor:focus,
.offline115-anchor:hover {
  outline: none;
}
.offline115-icon {
  display: inline-block;
  cursor: pointer;
  margin: 0 5px;
  border-radius: 50%;
  border: 0;
  vertical-align: middle;
  outline: none;
  padding: 0;
  height: 20px;
  width: 20px;
  position: static;
}
.offline115-checkbox {
  vertical-align: middle;
  margin-right: 4px;
}
.offline115-batch-toolbar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 9999;
  display: none;
  align-items: center;
  gap: 10px;
}
.offline115-batch-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}
.offline115-batch-btn:hover {
  background: #0056b3;
}
.offline115-batch-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
`);

// 节流函数
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func.apply(this, args);
  };
}
function base32To16(str) {
  if (str.length % 8 !== 0 || /[0189]/.test(str)) {
    return str;
  }
  str = str.toUpperCase();
  var bin = '',
    newStr = '',
    i;
  for (i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    if (charCode < 65) charCode -= 24;
    else charCode -= 65;
    charCode = '0000' + charCode.toString(2);
    charCode = charCode.substr(charCode.length - 5);
    bin += charCode;
  }
  for (i = 0; i < bin.length; i += 4) {
    newStr += parseInt(bin.substring(i, i + 4), 2).toString(16);
  }
  return newStr;
}
/**
 * 处理页面中的磁力链接
 * 功能：扫描页面中的链接和按钮，识别磁力链接并添加115离线下载图标
 */
class MagnetLinkProcessor {
  downloadRegex = /^(magnet|ftp|ed2k):/i;
  // 正则表达式常量
  REGEX = {
    HASH: /(^|\/|&|-|\.|\?|=|:|#|_|@)([a-f0-9]{40}|[A-Z2-7]{32})(?!\w)/i,
    EXCLUDE: /[a-z]{40}|[a-z]{32}/i,
  };

  // 需要排除的域名
  EXCLUDED_DOMAINS = ['google'];

  constructor() {
    this.processedLinks = new Set();
  }

  /**
   * 主处理函数
   */
  processPage() {
    document.querySelectorAll('a, button').forEach((element) => {
      if (this.shouldSkipElement(element)) return;

      const urls = this.extractUrls(element);
      this.processUrls(urls, element);
    });
  }

  /**
   * 判断是否应该跳过该元素
   */
  shouldSkipElement(element) {
    return (
      element.hasAttribute('Searched') ||
      this.EXCLUDED_DOMAINS.some((domain) => element.href && element.href.includes(domain)) ||
      element.querySelector('img')
    );
  }

  /**
   * 从元素中提取URL
   */
  extractUrls(element) {
    return [element.href, element?.dataset.clipboardText].filter(Boolean);
  }

  /**
   * 处理URL并添加图标
   */
  processUrls(urls, element) {
    for (const url of urls) {
      const match = url.match(this.REGEX.HASH);

      if (this.downloadRegex.test(url) || (match && !this.REGEX.EXCLUDE.test(match[2]))) {
        const { value, templink } = this.prepareLinkData(url, match);
        const processedLink = this.reviseUrl(templink);

        if (this.isLinkProcessed(processedLink)) return;

        this.markElement(element, value);
        this.addDownloadIcon(element, processedLink);
        return;
      }
    }
  }

  /**
   * 准备链接数据
   */
  prepareLinkData(url, match) {
    if (this.downloadRegex.test(url)) {
      return {
        value: url.split(':')[0],
        templink: url,
      };
    }
    return {
      value: 'magnet',
      templink: `magnet:?xt=urn:btih:${match[2]}`,
    };
  }

  /**
   * 检查链接是否已处理
   */
  isLinkProcessed(link) {
    if (this.processedLinks.has(link)) return true;
    this.processedLinks.add(link);
    return false;
  }

  /**
   * 标记已处理的元素
   */
  markElement(element, value) {
    element.setAttribute('Searched', value);
  }

  /**
   * 添加下载图标和复选框
   */
  addDownloadIcon(element, link) {
    const container = document.createElement('span');
    container.style.display = 'inline-block';
    container.style.whiteSpace = 'nowrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'offline115-checkbox';
    checkbox.dataset.link = link;
    checkbox.onchange = () => updateBatchToolbar();

    const anchor = document.createElement('a');
    anchor.href = 'javascript:void(0)';
    anchor.className = 'offline115-anchor';
    const icon = document.createElement('img');
    icon.className = 'offline115-icon';
    icon.title = `使用rss2cloud离线下载\n${link}`;
    icon.dataset.link = link;
    icon.src = 'https://115.com/favicon.ico';
    anchor.appendChild(icon);

    container.appendChild(checkbox);
    container.appendChild(anchor);
    element.after(container);
  }

  reviseUrl(url) {
    var newUrl = url;
    if (url.startsWith('magnet')) {
      let hash = newUrl.split('&')[0].substring(20) || newUrl.substring(20);
      if (hash.length == 32) {
        hash = base32To16(hash);
      }
      newUrl = 'magnet:?xt=urn:btih:' + hash;
    }
    return newUrl;
  }
}

function createBatchToolbar() {
  if (document.querySelector('.offline115-batch-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.className = 'offline115-batch-toolbar';
  toolbar.innerHTML = `
    <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
      <input type="checkbox" id="offline115-select-all"> 全选
    </label>
    <span id="offline115-selected-count">已选 0 项</span>
    <button class="offline115-batch-btn" id="offline115-submit-batch">提交任务</button>
  `;
  document.body.appendChild(toolbar);

  document.getElementById('offline115-select-all').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.offline115-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateBatchToolbar();
  });

  document.getElementById('offline115-submit-batch').addEventListener('click', handleBatchSubmit);
}

function updateBatchToolbar() {
  const checkboxes = document.querySelectorAll('.offline115-checkbox:checked');
  const toolbar = document.querySelector('.offline115-batch-toolbar');
  const countSpan = document.getElementById('offline115-selected-count');
  const submitBtn = document.getElementById('offline115-submit-batch');
  const selectAll = document.getElementById('offline115-select-all');
  const allCheckboxes = document.querySelectorAll('.offline115-checkbox');

  if (checkboxes.length > 0) {
    toolbar.style.display = 'flex';
    countSpan.textContent = `已选 ${checkboxes.length} 项`;
    submitBtn.disabled = false;
    selectAll.checked = checkboxes.length === allCheckboxes.length;
  } else {
    toolbar.style.display = 'none';
  }
}

function handleBatchSubmit() {
  const checkboxes = document.querySelectorAll('.offline115-checkbox:checked');
  const links = Array.from(checkboxes).map(cb => cb.dataset.link);
  const submitBtn = document.getElementById('offline115-submit-batch');

  if (links.length === 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = '提交中...';

  GM_xmlhttpRequest({
    method: 'POST',
    url: `${RSS2CLOUD_URL}/add`,
    headers: getRequestHeaders(),
    data: JSON.stringify({
      tasks: links,
      cid: folder_cid,
    }),
    onload: function (response) {
      submitBtn.textContent = '提交任务';
      submitBtn.disabled = false;
      if (response.status === 200) {
        checkboxes.forEach(cb => {
          cb.checked = false;
          const icon = cb.nextSibling.querySelector('.offline115-icon');
          if (icon) icon.style.opacity = '0.7';
        });
        updateBatchToolbar();
      } else {
        alert('提交失败: ' + response.statusText);
      }
    },
    onerror: function (response) {
      submitBtn.textContent = '提交任务';
      submitBtn.disabled = false;
      alert('请求错误');
      console.error('Batch request failed:', response);
    },
  });
}

function handleOfflineClick(e) {
  let el = null;
  if (e.target.classList.contains('offline115-icon')) {
    el = e.target;
  }
  if (e.target.classList.contains('offline115-anchor')) {
    el = e.target.querySelector('.offline115-icon');
  }
  if (!el) {
    return;
  }
  var link = el.dataset.link;
  if (!link) {
    return;
  }
  if (el.style.opacity === '0.7') {
    return;
  }
  el.style.opacity = '0.2';
  setTimeout(() => {
    el.style.opacity = '0.7';
  }, 310);
  // 本地开始
  GM_xmlhttpRequest({
    method: 'POST',
    url: `${RSS2CLOUD_URL}/add`,
    headers: getRequestHeaders(),
    data: JSON.stringify({
      tasks: [link],
      cid: folder_cid,
      //savepath: "文件夹名称",
    }),
    onload: function (response) {
      if (response.status === 200) {
        const checkbox = el.closest('span')?.querySelector('.offline115-checkbox');
        if (checkbox) {
          checkbox.checked = false;
          updateBatchToolbar();
        }
      }
    },
    onerror: function (response) {
      el.style.opacity = '1'
      console.error('请求失败:\n', response);
    },
  });
}

// 使用示例
var processor = new MagnetLinkProcessor();
processor.processPage();
createBatchToolbar();

// 监听动态加载的内容
const observer = new MutationObserver(throttle(() => {
  processor.processPage();
}, 1000));
observer.observe(document.body, { childList: true, subtree: true });

document.body.addEventListener('click', throttle(handleOfflineClick, 300)); // 300ms节流间隔
