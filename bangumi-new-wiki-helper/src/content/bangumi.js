import browser from 'webextension-polyfill'

export default class Bangumi {
  constructor(subjectType = 1) {
    this.subjectType = subjectType;
  }
  /**
   * 生成infobox的字符串
   * @param {string} infoType
   * @param {Object[]} infoArray
   */
  genWikiString(infoType, infoArray) {
    let infobox = ["{{Infobox " + infoType];
    for (const info of infoArray) {
      if (Array.isArray(info.data)) {
        let d = data.map((item) => {
          if (item.name) {
            return `[${item.name}|${item.data}]`
          } else {
            return `[${item}]`
          }
        }).join('\n');
        infobox.push(`|${info.name}={${d}\n}`)
      } else {
        infobox.push(`|${info.name}=${info.data}`)
      }
    }
    infobox.push('}}');
    console.log('infobox', infobox)
    return infobox.join('\n')
  }
}
