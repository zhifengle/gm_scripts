// ==UserScript==
// @name        skip audio intro
// @name:zh-CN  音频片头和片尾跳过
// @namespace   https://github.com/22earth
// @description a helper for skipping audio intro/outro
// @description:zh-cn 跳过音频片头和片尾（优化版）
// @author      22earth
// @include     https://www.ximalaya.com/*
// @version     0.1.0
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @run-at      document-start
// @license     MIT
// ==/UserScript==

'use strict';

// ─── 配置 Key ───────────────────────────────────────────────
const SKIP_START_KEY = 'e_user_skip_start_config';
const SKIP_END_KEY = 'e_user_skip_end_config';

// ─── 读取持久化配置（默认：片头20秒，片尾10秒）────────────────
let skipStartSec = GM_getValue(SKIP_START_KEY, 20);
let skipEndSec = GM_getValue(SKIP_END_KEY, 10);

// ─── 输入校验工具 ────────────────────────────────────────────
// 问题：原脚本直接 +prompt(...)，输入 NaN / 负数 / 空字符串均不处理
// 优化：isFinite + >= 0 双重校验，非法输入时保留旧值并提示
function promptSeconds(label, current) {
  const raw = prompt(`设置${label}（秒，当前：${current}）`, current);
  if (raw === null) return current; // 用户点取消 → 不修改
  const val = parseFloat(raw);
  if (!isFinite(val) || val < 0) {
    alert('输入无效，请输入 >= 0 的数字');
    return current;
  }
  return val;
}

// ─── 菜单命令 ────────────────────────────────────────────────
// 优化：用可选链 ?.() 替代 if 判断，更简洁
GM_registerMenuCommand?.('设置跳过片头秒数', () => {
  skipStartSec = promptSeconds('片头', skipStartSec);
  GM_setValue(SKIP_START_KEY, skipStartSec);
});
GM_registerMenuCommand?.('设置跳过片尾秒数', () => {
  skipEndSec = promptSeconds('片尾', skipEndSec);
  GM_setValue(SKIP_END_KEY, skipEndSec);
});

// ─── 节流工具 ────────────────────────────────────────────────
// 问题：timeupdate 每秒可触发 4-250 次，原脚本每次都执行逻辑，浪费性能
// 优化：500ms 节流，大幅减少无效计算
function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// ─── 核心：为单个 audio 元素绑定跳过逻辑 ────────────────────
// 问题1：原脚本用 canplaythrough，该事件在缓冲充足时会多次触发
//        → 导致每次缓冲恢复都强制跳回片头位置
// 优化1：改用 loadedmetadata，duration 已知且整个生命周期只触发一次
//
// 问题2：原脚本 currentTime = duration 会精确踩到边界
//        → 部分浏览器/平台会触发无限 ended 循环或卡死
// 优化2：跳到 duration - 0.1，留出安全边距
//
// 幂等保护：通过 __skipAttached 标记防止同一元素重复绑定
function attachSkip(audio) {
  if (audio.__skipAttached) return; // ← 幂等：已处理过则跳过
  audio.__skipAttached = true;

  // 片头跳过：元数据就绪时执行一次
  audio.addEventListener('loadedmetadata', function () {
    if (skipStartSec > 0 && this.currentTime < skipStartSec) {
      console.log(`[skip-intro] 跳过片头 → ${skipStartSec}s`);
      this.currentTime = skipStartSec;
    }
  });

  // 片尾跳过：节流后的 timeupdate
  audio.addEventListener(
    'timeupdate',
    throttle(function () {
      const remaining = this.duration - this.currentTime;
      // duration 可能是 NaN（流媒体未就绪），需防御
      if (!isFinite(this.duration) || remaining <= 0) return;

      if (skipEndSec > 0 && remaining < skipEndSec) {
        console.log(`[skip-intro] 跳过片尾，剩余 ${remaining.toFixed(1)}s`);
        this.currentTime = this.duration - 0.1; // ← 避免踩边界
      }
    }, 500)
  );
}

// ─── 扫描页面现有 <audio> 元素 ──────────────────────────────
// 问题：原脚本只 hook 构造函数，忽略了 HTML 中静态写死的 <audio> 标签
// 优化：document-start 阶段先扫一次，确保不遗漏
function scanExisting() {
  document.querySelectorAll('audio').forEach(attachSkip);
}

// ─── Hook Audio 构造函数（处理 JS 动态创建的实例）────────────
(function (win) {
  const OriginalAudio = win.Audio;

  const FakeAudio = new Proxy(OriginalAudio, {
    construct(target, args) {
      const inst = new target(...args);
      attachSkip(inst); // 新实例立即绑定
      return inst;
    },
  });

  // 问题：原脚本 defineProperty 没有 configurable: true
  //      → 调试时无法在控制台覆盖，也可能与其他脚本冲突
  // 优化：加 configurable: true
  Object.defineProperty(win, 'Audio', {
    get: () => FakeAudio,
    set: (v) => console.warn('[skip-intro] 检测到尝试覆盖 Audio', v),
    configurable: true,
  });
})(unsafeWindow);

// ─── MutationObserver：处理 SPA 路由切换动态插入的 <audio> ──
// 问题：喜马拉雅是 SPA，换歌时会销毁旧 <audio> 再插入新的
//      原脚本完全没有处理这种情况，换歌后 Hook 失效
// 优化：监听 DOM 变化，自动对新插入节点执行 attachSkip
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      // 新节点本身是 <audio>
      if (node.tagName === 'AUDIO') {
        attachSkip(node);
      }
      // 新节点内部包含 <audio>（常见于组件挂载）
      node.querySelectorAll?.('audio').forEach(attachSkip);
    }
  }
});

// document-start 时 body 可能还不存在，等 DOM 可用后再启动
function startObserver() {
  const target = document.body ?? document.documentElement;
  observer.observe(target, { childList: true, subtree: true });
  scanExisting(); // 同时扫描已有元素
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserver);
} else {
  startObserver(); // 如果脚本注入较晚，DOM 已就绪则直接启动
}
