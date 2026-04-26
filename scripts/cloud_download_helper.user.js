// ==UserScript==
// @name        离线任务助手 Pro
// @namespace   https://github.com/zhifengle
// @description 通用离线下载助手，支持多云盘自定义接入
// @version     0.0.1
// @author      zhifengle
// @license     MIT
// @match       *://*/*
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// ==/UserScript==

'use strict';

// ============================================================
// 1. 配置层
// ============================================================

const DEFAULT_CONFIG = {
  activeProviders: ['115'],
  siteRules: [/^https:\/\/(sukebei\.)?nyaa\.si\//, /^https:\/\/mikanani\.me\//, /^https:\/\/dmhy\.org\//],
  downloadProtocols: /^(magnet|thunder|ftp|ed2k):/i,
  downloadExtensions: /\.(torrent|rar|zip|7z|mp4|mkv|avi)$/i,
};

// 策略枚举
const TaskStrategy = Object.freeze({
  API: 'api',
  PAGE: 'page',
  API_THEN_PAGE: 'api_then_page', // 原降级逻辑
});

// ============================================================
// 2. Provider 基类 + 注册表
// ============================================================

class Provider {
  name = '';
  icon = '';
  color = '#333';

  strategy = TaskStrategy.API; // 子类声明自己用哪种

  isEnabled() {
    return false;
  }

  /** @param {string} _url @returns {Promise<unknown>} */
  async addTask(_url) {
    throw new Error(`${this.name}: addTask 未实现`);
  }
  pageTask(url) {
    return null; // 默认不支持，返回 null 表示无此策略
  }
  run(url) {
    switch (this.strategy) {
      case TaskStrategy.API:
        return this.addTask(url);
      case TaskStrategy.PAGE:
        return PageTaskRunner.run(this.pageTask(url));
      case TaskStrategy.API_THEN_PAGE:
        return this.addTask(url).catch(() => {
          const task = this.pageTask(url);
          if (!task) throw new Error(`${this.name}: API 失败且无页面降级`);
          return PageTaskRunner.run(task);
        });
    }
  }
}

class ProviderRegistry {
  #map = new Map();

  register(key, provider) {
    this.#map.set(key, provider);
    return this;
  }

  get(key) {
    return this.#map.get(key);
  }

  getActive(keys) {
    return keys.map((k) => this.#map.get(k)).filter((p) => p?.isEnabled());
  }
}

// ============================================================
// 3. 具体 Provider 实现
// ============================================================

class Provider115 extends Provider {
  name = '115';
  icon = 'https://cdn.jsdelivr.net/gh/zxf10608/JavaScript/icon/115logo.ico';
  color = '#f60';

  isEnabled() {
    return document.cookie.includes('UID') || GM_getValue('115_enabled', false);
  }

  addTask(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://115.com/web/lixian/?ct=lixian&ac=add_task_url',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `url=${encodeURIComponent(url)}&savepath=&wp_path_id=0`,
        onload({ responseText }) {
          try {
            const json = JSON.parse(responseText);
            json.state ? resolve(json) : reject(new Error(json.error_msg));
          } catch (e) {
            reject(e);
          }
        },
        onerror: reject,
      });
    });
  }
  pageTask(url) {
    return {
      targetUrl: 'https://115.com/?ct=offline&ac=task_add',
      inject: async function () {
        // 这段代码运行在 115 页面上下文里
        await waitElement('#js_offline_url'); // 等待输入框出现
        document.querySelector('#js_offline_url').value = '__URL__';
        document.querySelector('#js_offline_submit').click();
        await waitElement('.success-tip'); // 等待成功提示
        return { done: true };
      },
      // url 插值：inject 函数字符串里用占位符替换
      injectArgs: { url },
    };
  }
}

class ProviderXunlei extends Provider {
  name = '迅雷';
  icon = 'https://www.xunlei.com/favicon.ico';
  color = '#4a90e2';

  isEnabled() {
    return GM_getValue('xunlei_enabled', false);
  }

  async addTask(_url) {
    throw new Error('迅雷接入开发中');
  }
}

class ProviderAria2Web extends Provider {
  name = 'Aria2 WebUI';
  icon = '...';
  strategy = TaskStrategy.PAGE; // 声明：只走页面自动化

  // addTask 不需要实现

  pageTask(url) {
    return {
      targetUrl: 'http://localhost:6800/webui-aria2',
      inject: async ({ url }) => {
        await waitElement('#add-btn');
        document.querySelector('#url-input').value = url;
        document.querySelector('#add-btn').click();
        await waitElement('.task-added');
      },
      injectArgs: { url },
    };
  }
}

class PageTaskRunner {
  // 打开目标页面，等待加载完成后注入操作
  static run({ targetUrl, inject, windowFeatures = 'width=900,height=600' }) {
    return new Promise((resolve, reject) => {
      const win = window.open(targetUrl, '_blank', windowFeatures);
      if (!win) {
        reject(new Error('弹窗被拦截，请允许弹窗后重试'));
        return;
      }

      // 轮询等待目标页面 ready，再注入
      const timer = setInterval(() => {
        try {
          if (win.closed) {
            clearInterval(timer);
            reject(new Error('窗口被关闭'));
            return;
          }
          // 同源才能访问 contentWindow，跨域走 postMessage
          win.postMessage({ type: 'ODH_INJECT', payload: inject.toString() }, '*');
        } catch {
          /* 跨域等待 */
        }
      }, 800);

      // 监听目标页面回传结果
      const onMessage = ({ data }) => {
        if (data?.type !== 'ODH_RESULT') return;
        clearInterval(timer);
        window.removeEventListener('message', onMessage);
        data.success ? resolve(data) : reject(new Error(data.error));
      };
      window.addEventListener('message', onMessage);

      // 超时保护
      setTimeout(() => {
        clearInterval(timer);
        reject(new Error('页面自动化超时'));
      }, 30_000);
    });
  }
}
// 在脚本初始化时注册 message 监听（所有页面都挂载）
window.addEventListener('message', async ({ data }) => {
  if (data?.type !== 'ODH_INJECT') return;
  try {
    const fn = new Function(`return (${data.payload})`)();
    const result = await fn();
    window.opener?.postMessage({ type: 'ODH_RESULT', success: true, result }, '*');
  } catch (e) {
    window.opener?.postMessage({ type: 'ODH_RESULT', success: false, error: e.message }, '*');
  }
});

// ============================================================
// 4. 站点适配层
// ============================================================

class SiteAdapter {
  /** @returns {{ element: Element, url: string, text: string }[]} */
  getLinks() {
    return [...document.querySelectorAll('[href]')]
      .filter((a) => {
        const { href } = a;
        return DEFAULT_CONFIG.downloadProtocols.test(href) || DEFAULT_CONFIG.downloadExtensions.test(href);
      })
      .map((a) => ({ element: a, url: a.href, text: a.textContent.trim() }));
  }

  insertIcon(linkObj, iconEl) {
    linkObj.element.insertAdjacentElement('afterend', iconEl);
  }
}

class NyaaAdapter extends SiteAdapter {
  getLinks() {
    const links = super.getLinks();
    const existing = new Set(links.map((l) => l.url));

    document.querySelectorAll('a[href$=".torrent"]').forEach((a) => {
      if (!existing.has(a.href)) {
        links.push({ element: a, url: a.href, text: a.textContent.trim() });
      }
    });

    return links;
  }
}

class SiteAdapterRegistry {
  #rules = [];
  #fallback = new SiteAdapter();

  register(pattern, adapter) {
    this.#rules.push({ pattern, adapter });
    return this;
  }

  match(url = location.href) {
    return this.#rules.find((r) => r.pattern.test(url))?.adapter ?? this.#fallback;
  }
}

// ============================================================
// 5. Toast 通知
// ============================================================

class Toast {
  static #styles = `
    .odh-toast {
      position: fixed;
      bottom: 30px; right: 30px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: #fff;
      z-index: 99999;
      opacity: 0;
      transition: opacity .3s;
      pointer-events: none;
    }
    .odh-toast.show  { opacity: 1; }
    .odh-toast.success { background: #4caf50; }
    .odh-toast.error   { background: #f44336; }
    .odh-toast.info    { background: #2196f3; }
  `;

  static #injected = false;

  static #inject() {
    if (this.#injected) return;
    GM_addStyle(this.#styles);
    this.#injected = true;
  }

  static show(msg, type = 'info', duration = 2500) {
    this.#inject();
    const el = Object.assign(document.createElement('div'), {
      className: `odh-toast ${type}`,
      textContent: msg,
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }
}

// ============================================================
// 6. 下载菜单
// ============================================================

class DownloadMenu {
  #el = Object.assign(document.createElement('div'), { className: 'odh-menu' });
  #currentUrl = '';

  static #styles = `
    .odh-menu {
      position: absolute;
      z-index: 9999;
      display: none;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
      padding: 4px 0;
      min-width: 140px;
    }
    .odh-menu-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      white-space: nowrap;
    }
    .odh-menu-item:hover { background: #f0f4ff; color: #2777f8; }
    .odh-menu-item img { width: 16px; height: 16px; }
  `;

  constructor() {
    GM_addStyle(DownloadMenu.#styles);
    document.body.appendChild(this.#el);
    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', () => this.hide());
  }

  show(x, y, url, providers) {
    this.#currentUrl = url;
    this.#el.replaceChildren(this.#makeCopyItem(url), ...providers.map((p) => this.#makeProviderItem(p, url)));
    Object.assign(this.#el.style, { left: `${x}px`, top: `${y}px`, display: 'block' });
  }

  hide() {
    this.#el.style.display = 'none';
  }

  #makeCopyItem(url) {
    const item = this.#makeItem('📋 复制链接');
    item.onclick = () => {
      GM_setClipboard(url);
      Toast.show('已复制', 'info');
      this.hide();
    };
    return item;
  }

  #makeProviderItem(provider, url) {
    const item = this.#makeItem(`发送到 ${provider.name}`);
    const img = Object.assign(document.createElement('img'), { src: provider.icon });
    item.prepend(img);
    item.onclick = async () => {
      this.hide();
      Toast.show(`正在发送到 ${provider.name}...`, 'info');
      try {
        await provider.run(url);
        Toast.show(`✅ 已添加到 ${provider.name}`, 'success');
      } catch (e) {
        Toast.show(`❌ 失败: ${e.message}`, 'error');
      }
    };
    return item;
  }

  #makeItem(text) {
    return Object.assign(document.createElement('div'), {
      className: 'odh-menu-item',
      textContent: text,
    });
  }
}

// ============================================================
// 7. 图标注入器
// ============================================================

class IconInjector {
  static #styles = `
    .odh-icon {
      display: inline-block;
      cursor: pointer;
      width: 20px; height: 20px;
      margin: 0 4px 2px;
      vertical-align: middle;
      border-radius: 50%;
      transition: transform .15s;
    }
    .odh-icon:hover { transform: scale(1.2); }
  `;

  #menu;
  #adapter;
  #providers;

  constructor({ menu, adapter, providers }) {
    GM_addStyle(IconInjector.#styles);
    this.#menu = menu;
    this.#adapter = adapter;
    this.#providers = providers;
  }

  inject() {
    for (const linkObj of this.#adapter.getLinks()) {
      if (linkObj.element.dataset.odhInjected) continue;
      linkObj.element.dataset.odhInjected = '1';

      const icon = this.#createIcon(linkObj.url);
      this.#adapter.insertIcon(linkObj, icon);
    }
  }

  #createIcon(url) {
    const icon = Object.assign(document.createElement('img'), {
      src: this.#providers[0].icon,
      className: 'odh-icon',
      title: `离线下载: ${url}`,
    });
    icon.dataset.url = url;
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.#menu.show(e.pageX, e.pageY, url, this.#providers);
    });
    return icon;
  }
}

// ============================================================
// 8. 配置管理
// ============================================================

class ConfigManager {
  #key = 'userConfig';

  load() {
    return { ...DEFAULT_CONFIG, ...GM_getValue(this.#key, {}) };
  }

  save(patch) {
    GM_setValue(this.#key, { ...this.load(), ...patch });
  }

  openDialog() {
    const current = this.load().activeProviders.join(',');
    const input = prompt('输入启用的云盘（逗号分隔）\n可选: 115, xunlei', current);
    if (input === null) return;
    this.save({ activeProviders: input.split(',').map((s) => s.trim()) });
    location.reload();
  }
}

// ============================================================
// 8. 工具函数
// ============================================================

function waitElement(selector, { timeout = 10_000, root = document, visible = false } = {}) {
  return new Promise((resolve, reject) => {
    // 已存在直接返回
    const existing = root.querySelector(selector);
    if (existing && (!visible || isVisible(existing))) {
      return resolve(existing);
    }

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitElement: "${selector}" 超时`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el && (!visible || isVisible(el))) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}

function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

// ============================================================
// 9. 应用入口
// ============================================================

class App {
  #registry = new ProviderRegistry();
  #adapters = new SiteAdapterRegistry();
  #config = new ConfigManager();

  run() {
    this.#registerProviders();
    this.#registerAdapters();
    const config = this.#config.load();
    if (!config.siteRules.some((r) => r.test(location.href))) return;

    const providers = this.#registry.getActive(config.activeProviders);
    if (!providers.length) {
      Toast.show('⚠️ 无可用云盘，请在脚本菜单中配置', 'error', 4000);
      return;
    }

    const adapter = this.#adapters.match();
    const menu = new DownloadMenu();
    const injector = new IconInjector({ menu, adapter, providers });

    injector.inject();

    // SPA 动态页面支持
    new MutationObserver(() => injector.inject()).observe(document.body, { childList: true, subtree: true });

    GM_registerMenuCommand('⚙️ 配置离线助手', () => this.#config.openDialog());
  }
  #registerProviders() {
    this.#registry
      .register('115', new Provider115())
      .register('xunlei', new ProviderXunlei())
      .register('aria2', new ProviderAria2Web());
  }
  #registerAdapters() {
    this.#adapters.register(/^https:\/\/(sukebei\.)?nyaa\.si\//, new NyaaAdapter());
  }
  // App 暴露公共注册入口
  registerProvider(key, provider) {
    this.#registry.register(key, provider);
    return this;
  }
}

const app = new App();
// app.registerProvider('myCloud', new MyCloudProvider());
app.run();
