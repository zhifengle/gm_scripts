export function getAlias(name: string) {
  const pairs = {
    '─': '─',
    '~': '~',
    '～': '～',
    '－': '－',
    '-': '-',
    '<': '>',
    '＜': '＞',
  };
  const opens = Object.keys(pairs);
  const closes = Object.values(pairs);
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
  let alias = getAlias(name);
  if (alias.length === 0 && name.split(' ').length === 2) {
    alias = name.split(' ');
  }
  // const jpRe = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
  const hanAndHiraganaRe = /[\p{Script=Hiragana}\p{Script=Han}]/u;
  if (alias && alias.length > 0) {
    if (hanAndHiraganaRe.test(alias[1])) {
      // 以假名开头的、包含版本号的
      if (
        /^\p{Script=Katakana}/.test(alias[0]) ||
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
    /\s[^ ]*?(スペシャルプライス版|体験版|ダウンロード版|パッケージ版|限定版|通常版|廉価版|復刻版|初回.*?版|描き下ろし|DVDPG).*?$/g,
    ''
  );
}
