const SUB_TITLE_PAIRS = ['--', '──', '~~', '～～', '－－', '<>', '＜＞'];

export function getAliasByName(name: string) {
  const opens = SUB_TITLE_PAIRS.map(pair => pair[0]);
  const closes = SUB_TITLE_PAIRS.map(pair => pair[1]);
  const len = name.length;
  if (closes.includes(name[len - 1])) {
    let i = len - 1;
    const c = name[len - 1];
    let idx = closes.indexOf(c);
    const openChar = opens[idx];
    const j = name.lastIndexOf(openChar, i - 1);
    if (j >= 0) {
      return [name.slice(0, j).trim(), name.slice(j + 1, i)];
    }
  }
  return [];
}

export function getHiraganaSubTitle(name: string): string {
  let alias = getAliasByName(name);
  if (alias.length === 0 && name.split(' ').length === 2) {
    alias = name.split(' ');
  }
  // const jpRe = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
  const hanAndHiraganaRe = /[\p{Script=Hiragana}\p{Script=Han}]/u;
  if (alias && alias.length > 0) {
    if (hanAndHiraganaRe.test(alias[1])) {
      // 以假名开头的、包含版本号的
      if (
        /^\p{Script=Katakana}/u.test(alias[0]) ||
        /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}][ａ-ｚＡ-Ｚ0-9０-９]/u.test(alias[0])
      ) {
        return alias[1];
      }
    }
  }
  return '';
}

export function normalizeEditionName(str: string): string {
  return str.replace(
    /\s[^ ]*?(スペシャルプライス版|体験版|ダウンロード版|パッケージ版|限定版|通常版|廉価版|復刻版|初回.*?版|描き下ろし|DVDPG.*|DVD.*?版|Windows版|リニューアル|完全版|リメイク版).*?$/g,
    ''
  ).replace(/Memorial Edition$/, '')
  // fix いろとりどりのセカイ WORLD'S END COMPLETE
  .replace(/ WORLD'S END COMPLETE$/,'');

}

export function isSimpleStr(str: string): boolean {
  if (str.length === 1) {
    return true;
  }
  // English word
  if (/^[A-Za-z]+$/.test(str)) {
    return true;
  }
}

export function removePairs(str: string, pairs: string[] = []) {
  for (let i = 0; i < pairs.length; i++) {
    if (pairs.length < 2) {
      continue;
    }
    const [open, close] = pairs[i];
    str = str.replace(new RegExp(open + '.+?' + close, 'g'), '');
  }
  return str
    .replace(/\(.*?\)/g, '')
    .replace(/\（.*?\）/g, '')
    .replace(/＜.+?＞/, '')
    .replace(/<.+?>/, '');
}

export function removeSubTitle(str: string): string {
  return removePairs(str, SUB_TITLE_PAIRS).trim();
}

function unique(str: string) {
  var result = '';
  for(var i = 0; i < str.length; i++) {
    if(result.indexOf(str[i]) < 0) {
      result += str[i];
    }
  }
  return result;
}

export function charsToSpace(originStr: string, chars: string) {
  return originStr.replace(new RegExp(`[${chars}]`, 'g'), ' ').replace(/\s{2,}/g, ' ');
}

export function replaceCharsToSpace(str: string, excludes: string = '', extra: string = '') {
  const fullwidthPair = '～－＜＞'
  // @TODO 需要更多测试
  var symbolString = '―〜━『』~\'…！？。♥☆/♡★‥○【】◆×▼’＇"＊?' + '．・　' + fullwidthPair;
  if (excludes) {
    symbolString = symbolString.replace(new RegExp(`[${excludes}]`, 'g'), '');
  }
  symbolString = symbolString + extra
  let output = charsToSpace(str, unique(symbolString))
  // output =  output.replace(/[&,\[\]]/g, ' ');
  return output
}

export function pairCharsToSpace(str: string) {
  return charsToSpace(str, unique(SUB_TITLE_PAIRS.join(''))).trim()
}

export function replaceToASCII(str: string) {
  return str
    .replace(/＝|=/g, ' ')
    .replace(/　/g, ' ')
    .replace(/０/g, '0')
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/３/g, '3')
    .replace(/４/g, '4')
    .replace(/５/g, '5')
    .replace(/６/g, '6')
    .replace(/７/g, '7')
    .replace(/８/g, '8')
    .replace(/９/g, '9')
    .replace(/Ⅰ/g, 'I')
    .replace(/Ⅱ/g, 'II')
    .replace(/Ⅲ/g, 'III')
    .replace(/Ⅳ/g, 'IV')
    .replace(/Ⅴ/g, 'V')
    .replace(/Ⅵ/g, 'VI')
    .replace(/Ⅶ/g, 'VII')
    .replace(/Ⅷ/g, 'VIII')
    .replace(/Ⅸ/g, 'IX')
    .replace(/Ⅹ/g, 'X');
}

export function isEnglishName(name: string) {
  return /^[a-zA-Z][a-zA-Z\s.-]*[a-zA-Z]$/.test(name);
}

export function isKatakanaName(name: string) {
  // ァ-ン
  return /^[ァ-ヶ][ァ-ヶー・\s]*[ァ-ヶー]?$/.test(name);
}
