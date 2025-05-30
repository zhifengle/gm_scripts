// ==UserScript==
// @name        qiandao
// @name:zh-CN  qiandao
// @namespace   https://github.com/22earth
// @description qiandao for personal use
// @description:zh-cn 自用签到.
// @include     https://www.v2ex.com/
// @include     https://v2ex.com/
// @include     https://www.south-plus.net/
// @include     https://www.south-plus.net/index.php
// @include     https://www.south-plus.net/thread.php?fid-6.html
// @include     /https:\/\/www\.52pojie\.cn\/(forum\.php)?$/
// @include     https://bbs4.2djgame.net/home/forum.php
// @include     https://zodgame.xyz/
// @match       https://zodgame.xyz/forum.php?mod=forumdisplay&fid=13*
// @include     https://ddfan.org/
// @match       https://ddfan.org/subjects/incoming/*
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @version     0.0.8
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  function sleep(num) {
      return new Promise((resolve) => {
          setTimeout(resolve, num);
      });
  }

  /**
   * 为页面添加样式
   * @param style
   */
  /**
   * 载入 iframe
   * @param $iframe iframe DOM
   * @param src iframe URL
   * @param TIMEOUT time out
   */
  function loadIframe($iframe, src, TIMEOUT = 5000) {
      return new Promise((resolve, reject) => {
          $iframe.src = src;
          let timer = setTimeout(() => {
              timer = null;
              $iframe.onload = undefined;
              reject('iframe timeout');
          }, TIMEOUT);
          $iframe.onload = () => {
              clearTimeout(timer);
              $iframe.onload = null;
              resolve(null);
          };
      });
  }

  // support GM_XMLHttpRequest
  let retryCounter = 0;
  let USER_SITE_CONFIG = {};
  function getSiteConfg(url, host) {
      let hostname = host;
      if (!host) {
          hostname = new URL(url)?.hostname;
      }
      const config = USER_SITE_CONFIG[hostname] || {};
      return config;
  }
  function mergeOpts(opts, config) {
      return {
          ...opts,
          ...config,
          headers: {
              ...opts?.headers,
              ...config?.headers,
          },
      };
  }
  function fetchInfo(url, type, opts = {}, TIMEOUT = 10 * 1000) {
      const method = opts?.method?.toUpperCase() || 'GET';
      opts = mergeOpts(opts, getSiteConfg(url));
      if (method === 'POST' && opts.data) {
          opts.body = opts.data;
      }
      return internalFetch(fetch(url, {
          method,
          // credentials: 'include',
          // mode: 'cors',
          // cache: 'default',
          ...opts,
      }), TIMEOUT).then((response) => {
          if (response.status === 302 && retryCounter < 5) {
              retryCounter++;
              return fetchInfo(response.url, type, opts, TIMEOUT);
          }
          else if (response.ok) {
              retryCounter = 0;
              if (opts.decode) {
                  return response.arrayBuffer().then((buffer) => {
                      let decoder = new TextDecoder(opts.decode);
                      let text = decoder.decode(buffer);
                      return text;
                  });
              }
              return response[type]();
          }
          retryCounter = 0;
          throw new Error('Not 2xx response');
      }, (err) => console.log('fetch err: ', err));
  }
  function fetchText(url, opts = {}, TIMEOUT = 10 * 1000) {
      return fetchInfo(url, 'text', opts, TIMEOUT);
  }
  // TODO: promise type
  function internalFetch(fetchPromise, TIMEOUT) {
      let abortFn = null;
      const abortPromise = new Promise(function (resolve, reject) {
          abortFn = function () {
              reject('abort promise');
          };
      });
      let abortablePromise = Promise.race([fetchPromise, abortPromise]);
      setTimeout(function () {
          abortFn();
      }, TIMEOUT);
      return abortablePromise;
  }

  // 暂时使用控制台
  const logger = {
      info(str) {
          console.info(str);
      },
      log(str) {
          console.log(str);
      },
      error(str) {
          console.error(str);
      },
  };

  function randomNum(max, min) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const USERJS_PREFIX = 'E_USERJS_SIGN_';
  const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
  const ALL_SITES = 'ALL_SITES';
  async function loadSignInIframe(url) {
      const iframeId = 'e-userjs-qiandao';
      let $iframe = document.querySelector(`#${iframeId}`);
      if (!$iframe) {
          $iframe = document.createElement('iframe');
          $iframe.style.position = 'absolute';
          $iframe.style.left = '-9999px';
          $iframe.id = iframeId;
          document.body.appendChild($iframe);
      }
      await loadIframe($iframe, url);
      return $iframe;
  }
  async function signSouth() {
      const site_name = this.name;
      const sign = async (taskId) => {
          const res = await fetchText(genUrl(this.href, `plugin.php?H_name=tasks&action=ajax&actions=job&cid=${taskId}`), {
              headers: this.headers,
          });
          // 未登录
          if (res.match('您还不是论坛会员,请先登录论坛')) {
              logger.error(`${this.name} 需要登录`);
              return;
          }
          if (res.includes('success') || res.includes('未完成')) {
              await fetchText(genUrl(this.href, `plugin.php?H_name=tasks&action=ajax&actions=job2&cid=${taskId}`), {
                  headers: this.headers,
              });
              setSignResult('south-plus' + taskId, true);
          }
          else if (res.includes('上次申请')) {
              setSignResult('south-plus' + taskId, true);
              // 已经签到了
          }
      };
      if (!getSignResult(site_name + '14', 7)) {
          await sign(14);
      }
      else {
          logger.info(`${site_name} 已签到`);
      }
      if (!getSignResult(site_name + '15')) {
          await sign(15);
      }
      else {
          logger.info(`${site_name} 已签到`);
      }
  }
  function setSignResult(site, result) {
      GM_setValue(USERJS_PREFIX + site.toUpperCase(), {
          result: Number(result),
          date: +new Date(),
      });
  }
  function getSignResult(site, numOfDays) {
      let obj = GM_getValue(USERJS_PREFIX + site.toUpperCase());
      if (obj) {
          const now = new Date();
          const preDate = new Date(obj.date);
          // 存在时间限制
          if (numOfDays) {
              // 小于时间限制
              if (+now - +preDate < UPDATE_INTERVAL * numOfDays) {
                  return Number(obj.result) === 1 ? true : false;
              }
              else {
                  return false;
              }
          }
          else {
              return now.getDate() === preDate.getDate();
          }
      }
      return false;
  }
  function genUrl(href, pathname) {
      const url = new URL(href);
      return `${url.origin}/${pathname}`;
  }
  const siteDict = [
      {
          name: 'south-plus',
          href: 'https://www.south-plus.net/',
          headers: {
              Referer: 'https://www.south-plus.net/plugin.php?H_name-tasks.html',
          },
          signFn: signSouth,
      },
      {
          name: '52pojie',
          href: 'https://www.52pojie.cn/',
          async signFn() {
              if (window.top !== window.self) {
                  return;
              }
              if (getSignResult(this.name)) {
                  logger.info(`${this.name} 已签到`);
                  return;
              }
              const pathname = 'home.php?mod=task&do=apply&id=2';
              if (!globalThis?.location?.href) {
                  logger.error('52pojie 只支持在浏览器上签到');
                  return;
              }
              if (!document.querySelector('#myprompt_check')) {
                  logger.error(`${this.name} 需要登录`);
                  return;
              }
              const $btn = document.querySelector(`a[href^="${pathname}"`);
              if ($btn) {
                  const $iframe = await loadSignInIframe(globalThis.location.href);
                  const $signBtn = $iframe.contentDocument.querySelector(`a[href^="${pathname}"`);
                  $signBtn.click();
              }
              setSignResult(this.name, true);
          },
      },
      {
          name: '2dfan',
          href: 'https://ddfan.org/',
          async signFn() {
              if (window.top !== window.self) {
                  return;
              }
              if (getSignResult(this.name)) {
                  logger.info(`${this.name} 已签到`);
                  return;
              }
              if (!globalThis?.location?.href) {
                  logger.error(`${this.name} 只支持在浏览器上签到`);
                  return;
              }
              const $profile = document.querySelector('ul.nav.pull-right > li.dropdown > a');
              if (!$profile) {
                  logger.error(`${this.name} 需要登录`);
                  return;
              }
              const checkinUrl = `${$profile.href}/recheckin`;
              const $iframe = await loadSignInIframe(checkinUrl);
              await sleep(3000);
              let $signBtn = $iframe.contentDocument.querySelector('#do_checkin[type="submit"]');
              let count = 5;
              while (count > 0 && !$signBtn) {
                  $signBtn = $iframe.contentDocument.querySelector('#do_checkin[type="submit"]');
                  count--;
                  await sleep(1000);
              }
              if ($signBtn) {
                  $signBtn.click();
                  setSignResult(this.name, true);
              }
              logger.info(`${this.name} 获取签到按钮失败`);
          },
      },
      {
          name: 'v2ex',
          href: ['https://v2ex.com/', 'https://www.v2ex.com/'],
          headers: {
              Referer: 'https://v2ex.com/',
          },
          async signFn() {
              if (getSignResult(this.name)) {
                  logger.info(`${this.name} 已签到`);
                  return;
              }
              let href = this.href[0];
              const curHref = globalThis?.location?.href;
              if (curHref && this.href.includes(curHref)) {
                  href = curHref;
              }
              const missionUrl = genUrl(href, 'mission/daily');
              const content = await fetchText(genUrl(href, 'mission/daily'));
              if (content.match(/你是机器人么？/)) {
                  logger.error(`${this.name} 需要登录`);
                  return;
              }
              const m = content.match(/mission\/daily\/redeem\?once=\d+/);
              if (m) {
                  await fetchText(genUrl(href, m[0]), {
                      headers: {
                          Referer: missionUrl,
                      },
                  });
                  setSignResult(this.name, true);
              }
              else if (content.includes('每日登录奖励已领取')) {
                  logger.info(`${this.name} 已签到`);
                  setSignResult(this.name, true);
              }
          },
      },
      {
          name: '2djgame',
          href: 'https://bbs4.2djgame.net/home/forum.php',
          headers: {
              Referer: 'https://bbs4.2djgame.net/home/forum.php',
          },
          async signFn() {
              if (getSignResult(this.name)) {
                  logger.info(`${this.name} 已签到`);
                  return;
              }
              const content = await fetchText(genUrl(this.href, 'home.php?mod=task&do=apply&id=1'));
              if (content.match('抱歉，本期您已申請過此任務，請下期再來')) {
                  logger.info(`${this.name} 已签到`);
              }
              else if (content.match('您需要先登錄才能繼續本操作')) {
                  logger.error(`${this.name} 需要登录`);
                  return;
              }
              setSignResult(this.name, true);
          },
      },
      {
          name: 'zodgame',
          href: 'https://zodgame.xyz/',
          headers: {
              Referer: 'https://zodgame.xyz/',
          },
          async signFn() {
              if (getSignResult(this.name)) {
                  logger.info(`${this.name} 已签到`);
                  return;
              }
              const content = await fetchText(genUrl(this.href, 'plugin.php?id=dsu_paulsign:sign'), {
                  headers: this.headers,
              });
              if (content.includes('您好！登录后享受更多精彩')) {
                  logger.error(`${this.name} 需要登录`);
                  return;
              }
              else if (content.includes('您今天已经签到过了或者签到时间还未开始')) {
                  setSignResult(this.name, true);
                  return;
              }
              const formhashRe = /<input\s*type="hidden"\s*name="formhash"\s*value="([^"]+)"\s*\/?>/;
              const matchFormhash = content.match(formhashRe);
              if (matchFormhash &&
                  /<form\s*id="qiandao"\s*method="post"/.test(content)) {
                  const url = 'plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=1&inajax=1';
                  const fd = new URLSearchParams();
                  fd.append('formhash', matchFormhash[1]);
                  const arr = ['kx', 'ym', 'wl', 'nu', 'ch', 'fd', 'yl', 'shuai'];
                  fd.append('qdxq', arr[randomNum(5, 0)]);
                  const signRes = await fetchInfo(
                  // genUrl(this.href, $form.getAttribute('action')),
                  genUrl(this.href, url), 'text', {
                      method: 'POST',
                      body: fd,
                      headers: { 'content-type': 'application/x-www-form-urlencoded' },
                  });
                  if (signRes.includes('未定义操作')) {
                      return;
                  }
                  else if (signRes.includes('恭喜你签到成功')) {
                      // 刷新
                      await fetchText(genUrl(this.href, 'plugin.php?id=dsu_paulsign:sign'));
                      setSignResult(this.name, true);
                      return;
                  }
              }
          },
      },
  ];
  async function main() {
      const site = siteDict.find((obj) => {
          if (Array.isArray(obj.href)) {
              return obj.href.some((href) => href.includes(location.host));
          }
          else {
              return obj.href.includes(location.host);
          }
      });
      const skipSites = ['south-plus', '2dfan', '2djgame'];
      if (site && !skipSites.includes(site.name)) {
          site.signFn();
      }
  }
  main();
  function qiandaoAllSites() {
      siteDict.forEach((obj) => {
          obj.signFn();
      });
      setSignResult(ALL_SITES, true);
  }
  // 签到脚本命令
  if (GM_registerMenuCommand) {
      GM_registerMenuCommand('一键签到', qiandaoAllSites);
  }

})();
