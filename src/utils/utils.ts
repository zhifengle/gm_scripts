export function genRandomStr(len: number): string {
  return Array.apply(null, Array(len))
    .map(function () {
      return (function (chars) {
        return chars.charAt(Math.floor(Math.random() * chars.length));
      })("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
    })
    .join("");
}

export function randomNum(max: number, min: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDate(time: any, fmt: string = "yyyy-MM-dd") {
  const date = new Date(time);
  var o: any = {
    "M+": date.getMonth() + 1, //月份
    "d+": date.getDate(), //日
    "h+": date.getHours(), //小时
    "m+": date.getMinutes(), //分
    "s+": date.getSeconds(), //秒
    "q+": Math.floor((date.getMonth() + 3) / 3), //季度
    S: date.getMilliseconds(), //毫秒
  };
  if (/(y+)/i.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  }
  for (var k in o) {
    if (new RegExp("(" + k + ")", "i").test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
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
      .replace("日", "")
      .split(/年|月/)
      .filter((i) => i);
  } else if (/\d{4}\/\d{1,2}(\/\d{1,2})?/.test(dataStr)) {
    l = dataStr.split("/");
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
    .join("-");
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
    style: "percent",
    minimumFractionDigits: 2,
  });
}

export function roundNum(num: number, len: number = 2) {
  //@ts-ignore
  return +(Math.round(num + `e+${len}`) + `e-${len}`);
}

export function normalizeQuery(query: string): string {
  let newQuery = query
    .replace(/([^～]*～[^～]*～[^～]*)/g, function (match) {
      return match.replace(/~|～/g, " ");
    })
    .replace(/＝|=/g, " ")
    .replace(/０/g, "0")
    .replace(/１/g, "1")
    .replace(/２/g, "2")
    .replace(/３/g, "3")
    .replace(/４/g, "4")
    .replace(/５/g, "5")
    .replace(/６/g, "6")
    .replace(/７/g, "7")
    .replace(/８/g, "8")
    .replace(/９/g, "9")
    .replace(/Ⅰ/g, "I")
    .replace(/Ⅱ/g, "II")
    .replace(/Ⅲ/g, "III")
    .replace(/Ⅳ/g, "IV")
    .replace(/Ⅴ/g, "V")
    .replace(/Ⅵ/g, "VI")
    .replace(/Ⅶ/g, "VII")
    .replace(/Ⅷ/g, "VIII")
    .replace(/Ⅸ/g, "IX")
    .replace(/Ⅹ/g, "X")
    .replace(/－|-/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/～/g, "～")
    .trim();
  return newQuery;
}
