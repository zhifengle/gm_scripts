import amazon from './amazon'

var arr = [];
console.log(amazon.itemList.map(i => getWikiItem(i)))
/**
 * dollar 选择符
 * @param {string} selector 
 */
function $(selector) {
  return document.querySelector(selector);
}
/**
 * 生成wiki的项目
 * @param {Object} itemConfig 
 * @returns {Object}
 * @TODO
 */
function getWikiItem(itemConfig) {
  if (itemConfig.selector && !itemConfig.subSelector) {
    var $d = $(itemConfig.selector)
    if (!$d) return {};
    console.log($d.textContent)
    return {
      name: itemConfig.name,
      data: dealRawText($d.textContent)
    }
  } else if (itemConfig.keyWord) {
    return getItemByKeyWord(itemConfig);
  }
}
/**
 * 处理无关字符
 * @param {string} str 
 * @param {Object[]} filterArry
 */
function dealRawText(str, filterArray = []) {
  const textList = [':', '：', '\\(.*\\)', '（.*）', ...filterArray]
  return str.replace(new RegExp(textList.join('|'), 'g'), '').trim()
}
/**
 * 通过关键字提取信息
 * @param {Object} itemConfig 
 * @returns {Object}
 * @TODO
 */
function getItemByKeyWord(itemConfig) {
  // var $t = $(`${itemConfig.tagName}:contains(${itemConfig.keyWord})`)

  var targets;
  if (itemConfig.selector) {
    targets = contains(itemConfig.subSelector, itemConfig.keyWord, $(itemConfig.selector))
  }
  targets = contains(itemConfig.subSelector, itemConfig.keyWord)
  if (targets && targets.length) {
    return {
      name: itemConfig.name,
      data: dealRawText(targets[targets.length - 1].textContent, [itemConfig.keyWord])
    }
  } else {
    return {};
  }
}
/**
 * 查找包含文本的标签
 * @param {string} selector 
 * @param {string} text 
 */
function contains(selector, text, $parent) {
  var elements;
  if ($parent) {
    elements = $parent.querySelectorAll(selector);
  } else {
    elements = document.querySelectorAll(selector);
  }
  return [].filter.call(elements, function (element) {
    return new RegExp(text).test(element.textContent);
  });
}