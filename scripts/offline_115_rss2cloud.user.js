// ==UserScript==
// @name        offline 115 for rss2cloud
// @namespace   https://github.com/zhifengle
// @include     https://mikanani.me/*
// @version     0.1
// @author      zhifengle
// @description add offline tasks to rss2cloud server
// @grant       GM_xmlhttpRequest
// @run-at      document-end
// ==/UserScript==

// 配置
const FOLDER_CID = ''

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
   * 添加下载图标
   */
  addDownloadIcon(element, link) {
    const icon = document.createElement('img');
    icon.src = 'https://115.com/favicon.ico';
    icon.className = '115offline';
    icon.dataset.href = link;
    Object.assign(icon.style, {
      zIndex: '9',
      display: 'inline-block',
      cursor: 'pointer',
      margin: '0 5px 2px',
      borderRadius: '50%',
      border: '0',
      verticalAlign: 'middle',
      outline: 'none',
      padding: '0',
      height: '20px',
      width: '20px',
      position: 'static',
    });
    icon.title = `使用rss2cloud离线下载\n${link}`;
    element.after(icon);
  }

  reviseUrl(url) {
    var newUrl = url;
    if (url.startsWith('magnet')) {
      const hash = newUrl.split('&')[0].substring(20) || newUrl.substring(20);
      if (hash.length == 32) {
        hash = base32To16(hash);
      }
      newUrl = 'magnet:?xt=urn:btih:' + hash;
    }
    return newUrl;
  }
}

function handleOfflineClick(e) {
  if (e.target.classList.contains('115offline')) {
    const el = e.target;
    var link = el.dataset.href;
    if (!link) {
      return;
    }
    el.style.opacity = '0.2';
    setTimeout(() => {
      el.style.opacity = '0.7';
    }, 310);
    // 本地开始
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'http://localhost:8115/add',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        tasks: [link],
        cid: FOLDER_CID,
      }),
      onerror: function (response) {
        console.log('请求失败');
      },
    });
  }
}

// 使用示例
var processor = new MagnetLinkProcessor();
processor.processPage();

document.body.addEventListener('click', throttle(handleOfflineClick, 300)); // 300ms节流间隔
