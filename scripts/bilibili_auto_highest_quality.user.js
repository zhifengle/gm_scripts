// ==UserScript==
// @name         Bilibili 自动选择最高可用画质
// @namespace    https://github.com/zhifengle
// @version      0.1.0
// @description  播放 Bilibili 视频时自动切换到当前账号可用的最高画质，兼容大会员与非大会员。
// @author       zhifengle
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/bangumi/play/*
// @icon         https://www.bilibili.com/favicon.ico
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const VIDEO_SELECTOR = '#bilibili-player video, .bpx-player-container video';
  const QUALITY_ITEM_SELECTOR = '.bpx-player-ctrl-quality-menu-item';
  const VIP_CACHE_KEY = 'e_user_bilibili_has_big_vip';
  const VIP_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  let hasBigVip = false;

  const cachedVipStatus = readVipCache();
  if (cachedVipStatus === null) {
    fetch('https://api.bilibili.com/x/web-interface/nav', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((res) => {
        const data = res?.data ?? {};
        hasBigVip = data.vipStatus === 1 || data.vip?.status === 1;
        writeVipCache(hasBigVip);
      })
      .catch(() => {})
      .finally(() => {
        selectBestQuality();
      });
  } else {
    hasBigVip = cachedVipStatus;
  }

  function readVipCache() {
    const cache = GM_getValue(VIP_CACHE_KEY);
    if (cache && Date.now() - cache.time < VIP_CACHE_MAX_AGE) return Boolean(cache.hasBigVip);

    return null;
  }

  function writeVipCache(value) {
    GM_setValue(VIP_CACHE_KEY, {
      hasBigVip: value,
      time: Date.now(),
    });
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function isUnavailable(item) {
    const className = item.className.toString();
    const text = normalizeText(item.textContent || '');

    return text.includes('自动')
      || item.hasAttribute('disabled')
      || item.getAttribute('aria-disabled') === 'true'
      || item.dataset.disabled === 'true'
      || /disabled|disable|lock/.test(className)
      || (!hasBigVip && (
        item.querySelector('.bpx-player-ctrl-quality-badge-bigvip')
        || text.includes('大会员')
        || text.includes('会员专享')
        || /\bVIP\b/i.test(text)
      ));
  }

  function isSelected(item) {
    return item.classList.contains('bpx-state-active')
      || item.classList.contains('bpx-player-ctrl-quality-menu-item-active')
      || item.getAttribute('aria-checked') === 'true';
  }

  function selectBestQuality() {
    const best = [...document.querySelectorAll(QUALITY_ITEM_SELECTOR)].find((item) => !isUnavailable(item));
    if (best && !isSelected(best)) best.click();
  }

  function laterSelect() {
    window.setTimeout(selectBestQuality, 800);
  }

  document.querySelector(VIDEO_SELECTOR)?.addEventListener('play', laterSelect);
  laterSelect();
})();
