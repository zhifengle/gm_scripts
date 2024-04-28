// ==UserScript==
// @name        离线任务助手
// @name:en     cloud download helper
// @namespace   https://github.com/zhifengle
// @description 辅助添加离线任务
// @description:en assist in adding cloud download tasks
// @author      zhifengle
// @license     MIT
// @homepage    https://github.com/zhifengle/gm_scripts
// @include     /^https:\/\/(sukebei\.)?nyaa.si\/.*$/
// @version     0.0.1
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// ==/UserScript==

GM_addStyle(`
.e-user-menu {
  width: 97px;
  height: 85px;
  z-index: 9999;
  overflow: hidden;
  position: absolute;
  display: none;
  background-color: #D0D0D0;
}

.e-user-menu ul {
  padding: 5px 7px;
  margin: 0px;
  list-style: none;
}

.e-user-menu li>a,
.menu-link {
  line-height: 25px;
  text-decoration: none;
  color: #2C3E50;
  padding: 1px 5px;
  font-size: 16px;
  font-family: arial;
}

.e-user-menu li>a:hover,
.menu-link:hover {
  background-color: #2777F8;
  color: #FFF;
}

.e-user-menu-icon {
  z-index: 999;
  display: inline-block;
  cursor: pointer;
  margin: 0px 5px 2px;
  border-radius: 50%;
  border: 0px;
  vertical-align: middle;
  outline: none;
  padding: 0px;
  height: 20px;
  width: 20px;
  left: 0px;
  top: 0px;
}
`);

function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

function addContextMenu() {
  document.body.appendChild(
    htmlToElement(`
<div class="e-user-menu">
  <ul>
    <li><a href="javascript:;" class="menu-link menu-link-all">全选</a></li>
    <li><a href="javascript:;" class="menu-link menu-link-invert">反选</a></li>
    <li><a href="javascript:;" class="menu-link menu-link-copy">复制所选</a></li>
    <li><a href="javascript:;" class="menu-link menu-link-copyall">复制地址</a></li>
  </ul>
</div>`)
  );
  const $menu = document.querySelector('.e-user-menu');
  $menu.addEventListener('click', (e) => {
    const $target = e.target;
    if ($target.classList.contains('menu-link-all')) {
      const $checkboxes = document.querySelectorAll('input[type="checkbox"]');
      $checkboxes.forEach((checkbox) => {
        checkbox.checked = true;
      });
    } else if ($target.classList.contains('menu-link-invert')) {
      const $checkboxes = document.querySelectorAll('input[type="checkbox"]');
      $checkboxes.forEach((checkbox) => {
        checkbox.checked = !checkbox.checked;
      });
    } else if ($target.classList.contains('menu-link-copy')) {
      const $checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
      const text = $checkboxes.map((checkbox) => checkbox.nextSibling.textContent).join('\n');
      GM_setClipboard(text);
    } else if ($target.classList.contains('menu-link-copyall')) {
      const $checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const text = $checkboxes.map((checkbox) => checkbox.nextSibling.textContent).join('\n');
      GM_setClipboard(text);
    }
  });
}

function addLinkMenuIcon(iconSrc) {
  document.querySelectorAll('[href]').forEach((node) => {
    const url = node.href;
    const downReg = /^(magnet|thunder|ftp|ed2k):/i;
    // const fileReg = /\.(torrent|rar|zip|7z|mp4|rmvb|mkv|avi)$/i;
    // if (!downReg.test(url) && !fileReg.test(url)) {
    if (!downReg.test(url)) {
      return;
    }
    if (node.parentElement.querySelectorAll('[searched]').length > 1) {
      return;
    }
    if (downReg.test(url)){
      node.setAttribute('searched',url.split(':')[0]);
    }else if(/torrent$/i.test(url)){
      node.setAttribute('searched','torrent');
    }else{
      node.setAttribute('searched','other');
    };

    const $icon = htmlToElement(
      `<img src="${iconSrc}" class="e-user-menu-icon" data-href="${url}" title="点击离线下载，右键复制地址\n${url}">`
    );
    node.insertAdjacentElement('afterend', $icon);
  });
}

function initDom() {
  addLinkMenuIcon('https://cdn.jsdelivr.net/gh/zxf10608/JavaScript/icon/115logo.ico');
  addContextMenu();
}

function initEvent() {
  document.addEventListener('click', function (e) {
    if (e.type === 'click') {
      document.querySelector('.e-user-menu').style.display = 'none';
      return;
    }
  });
  document.body.addEventListener('contextmenu', function (e) {
    const target = e.target;
    if (target.classList.contains('e-user-menu-icon')) {
      const menu = document.querySelector('.e-user-menu');
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';
      menu.style.display = 'block';

      const link = target.getAttribute('data-href') || '';
      if (target.classList.contains('e-user-menu-icon-all')) {
      } else if (/^magnet/i.test(link)) {
      } else {
        menu.style.display = 'none';
      }
      GM_setClipboard(link);

      e.preventDefault();
    }
  });
}

initDom();
initEvent();
