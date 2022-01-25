// ==UserScript==
// @name        fill form
// @namespace   https://github.com/22earth
// @description fill form
// @include     https://115.com/
// @match       https://greasyfork.org/zh-CN/users/sign_in
// @version     0.0.1
// @grant       GM_setValue
// @grant       GM_getValue
// @require     https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// ==/UserScript==

var db = {};

function getInputNameEl() {
  let $username = document.querySelector('input[name=username]');
  if (!$username) {
    $username = document.querySelector('input[name=account]');
  }
  if (!$username) {
    $username = document.querySelector('input[type=email]');
  }
  if (!$username) {
    $username = document.querySelector('input[placeholder*="输入用户名"]');
  }
  return $username;
}

function getInputPwEl() {
  let $pw = document.querySelector('input[type=password]');
  return $pw;
}

/**
 * AES-256-ECB对称加密
 * @param text {string} 要加密的明文
 * @param secretKey {string} 密钥，43位随机大小写与数字
 * @returns {string} 加密后的密文，Base64格式
 */
function AES_ECB_ENCRYPT(text, secretKey) {
  var keyHex = CryptoJS.enc.Base64.parse(secretKey);
  var messageHex = CryptoJS.enc.Utf8.parse(text);
  var encrypted = CryptoJS.AES.encrypt(messageHex, keyHex, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

/**
 * AES-256-ECB对称解密
 * @param textBase64 {string} 要解密的密文，Base64格式
 * @param secretKey {string} 密钥，43位随机大小写与数字
 * @returns {string} 解密后的明文
 */
function AES_ECB_DECRYPT(textBase64, secretKey) {
  var keyHex = CryptoJS.enc.Base64.parse(secretKey);
  var decrypt = CryptoJS.AES.decrypt(textBase64, keyHex, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Utf8.stringify(decrypt);
}

function readDB() {
  const dbStr = GM_getValue('db');
  const key = GM_getValue('db_key');
  if (!dbStr || !key) {
    return;
  }
  var decryptStr = AES_ECB_DECRYPT(dbStr, key);
  try {
    db = JSON.parse(decryptStr);
  } catch (error) {
    console.log(error);
  }
}

function getAccount() {
  const site = db[location.host];
  return site;
}

// fill form
function fillForm() {
  const account = getAccount();
  if (!account) return;
  var evt = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
  const $name = getInputNameEl();
  if ($name) {
    $name.value = account.name;
    $name.dispatchEvent(evt);
  }
  const $pw = getInputPwEl();
  if ($pw) {
    $pw.value = account.pw;
    $pw.dispatchEvent(evt);
  }
}
function init() {
  readDB();
  fillForm();
}

init();
