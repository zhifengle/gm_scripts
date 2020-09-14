// ==UserScript==
// @name        nyaa magnet modify
// @namespace   https://github.com/22earth
// @description nyaa magnet modify
// @description:zh-cn 替换nyaa base32编码磁力链接为base16
// @include     /^https:\/\/(sukebei\.)?nyaa.si\/.*$/
// @version     0.2
// @run-at      document-end
// @grant       GM_setClipboard
// ==/UserScript==

const MAGNET_PREFIX = 'magnet:?xt=urn:btih:'
if (window.location.pathname.match('view')) {
  let $a = document.querySelector('.card-footer-item')
  $a.href = $a.href.replace(/btih:(.*)&dn=/, (a, b) => {
    return `btih:${convertToHex(b)}&dn=`
  })
} else {
  let nodeList = document.querySelectorAll('tbody>tr>td:nth-child(3)')
  for (let i = 0, len = nodeList.length; i < len; i++) {
    let $a = nodeList[i].lastElementChild
    $a.href = $a.href.replace(/btih:(.*)&dn=/, (a, b) => {
      return `btih:${convertToHex(b)}&dn=`
    })
  }
  addBtn();
}

function convertToHex(str) {

  function readChar (alphabet, char) {
    let idx = alphabet.indexOf(char)
    if (idx === -1) {
      throw new Error('Invalid character found: ' + char)
    }
    return idx
  }

  if(str.length % 8) return
  const RFC4648 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let value = 0
  let output = ''
  let bits = 0
  for (var i = 0, len = str.length; i < len; i++) {
    value = (value << 5) | readChar(RFC4648, str[i])
    bits += 5
    if (bits >= 8) {
      let val = ((value >>> (bits - 8)) & 255).toString(16)
      output += val.length === 2 ? val : '0'+val
      bits -= 8
    }
  }
  return output
}

function addBtn() {
  var $f = document.querySelector('.navbar-form > .input-group');
  let $d = document.createElement('div');
  $d.classList.add('input-group-btn');
  $d.innerHTML = `<span class="btn btn-primary">
  复制为Markdown
								</span>`;
  $d.addEventListener('click', () => {
    let info = getInfo();
    console.log(info);
    GM_setClipboard(info.join('\n'), 'text')
  });
  $f.appendChild($d);
}
function getInfo() {
  return Array.from(document.querySelectorAll('.container table > tbody > tr')).map(elem => {
    let name = elem.querySelector('td:nth-child(2) > a:last-child').innerText.trim();
    let magnet = elem.querySelector('td:nth-child(3) > a:last-child').href.replace(/&dn=.*$/, '')
    return `[${name}](${magnet})`
  })
}
