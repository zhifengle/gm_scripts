// ==UserScript==
// @name        nyaa magnet modify
// @namespace   https://github.com/22earth
// @description nyaa magnet modify
// @description:zh-cn Ìæ»»nyaa base32±àÂë´ÅÁ¦Á´½ÓÎªbase16
// @include     /^https:\/\/(sukebei\.)?nyaa.si\/.*$/
// @version     0.1
// @grant       none
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
