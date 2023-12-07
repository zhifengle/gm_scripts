import { SearchResult } from '../interface/subject';

export function genRandomStr(len: number): string {
  return Array.apply(null, Array(len))
    .map(function () {
      return (function (chars) {
        return chars.charAt(Math.floor(Math.random() * chars.length));
      })('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
    })
    .join('');
}

export function randomNum(max: number, min: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDate(time: any, fmt: string = 'yyyy-MM-dd') {
  const date = new Date(time);
  var o: any = {
    'M+': date.getMonth() + 1, //月份
    'd+': date.getDate(), //日
    'h+': date.getHours(), //小时
    'm+': date.getMinutes(), //分
    's+': date.getSeconds(), //秒
    'q+': Math.floor((date.getMonth() + 3) / 3), //季度
    S: date.getMilliseconds(), //毫秒
  };
  if (/(y+)/i.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    );
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')', 'i').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      );
    }
  }
  return fmt;
}

export function dealDate(dataStr: string): string {
  // 2019年12月19
  let l: string[] = [];
  if (/\d{4}年\d{1,2}月(\d{1,2}日?)?/.test(dataStr)) {
    l = dataStr
      .replace('日', '')
      .split(/年|月/)
      .filter((i) => i);
  } else if (/\d{4}\/\d{1,2}(\/\d{1,2})?/.test(dataStr)) {
    l = dataStr.split('/');
  } else if (/\d{4}-\d{1,2}(-\d{1,2})?/.test(dataStr)) {
    return dataStr;
  } else {
    return dataStr;
  }
  return l
    .map((i) => {
      if (i.length === 1) {
        return `0${i}`;
      }
      return i;
    })
    .join('-');
}

export function isEqualDate(d1: string, d2: string): boolean {
  const resultDate = new Date(d1);
  const originDate = new Date(d2);
  if (
    resultDate.getFullYear() === originDate.getFullYear() &&
    resultDate.getMonth() === originDate.getMonth() &&
    resultDate.getDate() === originDate.getDate()
  ) {
    return true;
  }
  return false;
}
export function isEqualMonth(d1: string, d2: string): boolean {
  const resultDate = new Date(d1);
  const originDate = new Date(d2);
  if (
    resultDate.getFullYear() === originDate.getFullYear() &&
    resultDate.getMonth() === originDate.getMonth()
  ) {
    return true;
  }
  return false;
}

export function numToPercent(num: number) {
  return Number(num || 0).toLocaleString(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
  });
}

export function roundNum(num: number, len: number = 2) {
  //@ts-ignore
  return +(Math.round(num + `e+${len}`) + `e-${len}`);
}

/**
 * replace special char to space
 * @param str
 * @returns string
 */
export function replaceCharToSpace(str: string): string {
  // start U+0080 - U+00FF	Latin-1 Supplement
  // U+2E00 - U+2E7F	Supplemental Punctuation
  // Miscellaneous Symbols, U+2600 - U+26FF
  // Halfwidth and Fullwidth Forms, U+FF00 - U+FFEF
  // CJK Symbols and Punctuation, U+3000 - U+303F
  return str.replace(
    /[\u0080-\u2E7F\u3000-\u303f\uff00-\uffef]/g,
    function (s) {
      if (/[Ａ-Ｚａ-ｚ０-９々〆〤]/.test(s)) {
        return s;
      }
      return ' ';
    }
  );
}

export function normalizeQuery(query: string): string {
  let newQuery = query
    .replace(/^(.*?～)(.*)(～[^～]*)$/, function (_, p1, p2, p3) {
      return p1.replace(/～/g, ' ') + p2 + p3.replace(/～/g, ' ');
    })
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
    .replace(/Ⅹ/g, 'X')
    .replace(/[－―～〜━\[\]『』~'…！？。♥☆\/♡★‥○, 【】◆×▼’&＇"＊?]/g, ' ')
    .replace(/[．・]/g, ' ')
    //.replace(/ー/g, " ")
    .replace(/\.\.\./g, ' ')
    .replace(/～っ.*/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\（.*?\）/g, ' ')
    .replace(/＜.+?＞/, '')
    .replace(/<.+?>/, '')
    .replace(/-.+?-/, '')
    .trim();
  // newQuery = replaceCharToSpace(newQuery);
  newQuery = newQuery.replace(/\s{2,}/g, ' ');
  return newQuery;
}

export function getShortenedQuery(query: string): string {
  let newQuery = query;
  let parts = newQuery.split(' ');
  let englishWordCount = 0;
  let nonEnglishDetected = false;
  let japaneseWordCount = 0;
  let isJapaneseWord = false;

  for (let i = 0; i < parts.length; i++) {
    let isEnglishWord = /^[a-zA-Z]+$/.test(parts[i]);

    if (isEnglishWord) {
      englishWordCount++;
    } else {
      isJapaneseWord =
        /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ーa-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]/u.test(
          parts[i]
        );
      if (isJapaneseWord) {
        nonEnglishDetected = true;
        japaneseWordCount++;
      }
    }

    if (nonEnglishDetected && englishWordCount > 0) {
      parts = parts.slice(0, i);
      break;
    }

    if (isEnglishWord && englishWordCount == 2) {
      parts = parts.slice(0, i + 1);
      break;
    }

    if (isJapaneseWord && japaneseWordCount == 2) {
      for (let j = 0; j <= i; j++) {
        if (parts[j].length <= 1 && j < i) {
          continue;
        } else {
          parts = parts.slice(0, j + 1);
          break;
        }
      }
      break;
    }
  }

  newQuery = parts.join(' ');
  return newQuery;
}
