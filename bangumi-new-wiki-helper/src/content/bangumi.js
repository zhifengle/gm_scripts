import $ from 'jquery'

document.body.style.border = "5px solid green";

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
  /**
   * 生成wiki的项目
   * @param {Object} itemConfig 
   * @returns {Object}
   * @TODO
   */
  getWikiItem(itemConfig) {
    var $d = $(itemConfig.selector)
    $d.textContent
    return {
      name: itemConfig.name,
      data: ''
    }
  }
  /**
   * 处理无关字符
   * @param {string} str 
   * @param {Object[]} filterArry
   */
  dealRawText(str, filterArray = []) {
    const textList = [':', '：', '\\(.*\\)', '（.*）', ...filterArray]
    return str.replace(new RegExp(textList.join('|'), 'g'), '').trim()
  }
  fetchHTML(url) {
      console.log('dddddddddddddd')
    $.ajax({
      url: url,
      crossDomain: true

    }).then((d) => {
      console.log(d)
    })
  }
}