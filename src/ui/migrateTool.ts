import { htmlToElement } from '../utils/domUtils';

export function insertControl(contanerSelector: string, name: string) {
  GM_addStyle(`
  .e-userjs-export-tool-container input {
    margin-bottom: 12px;
  }
  .e-userjs-export-tool-container .title {
    color: #F09199;
    font-weight: bold;
    font-size: 14px;
    margin: 12px 0;
    display: inline-block;
  }
  .e-userjs-export-tool-container .import-btn{
    margin-top: 12px;
  }
  .e-userjs-export-tool-container .export-btn {
    display: none;
  }
  .e-userjs-export-tool-container .retry-btn {
    display: none;
  }
  .ui-button {
    display: inline-block;
    line-height: 20px;
    font-size: 14px;
    text-align: center;
    color: #4c5161;
    border-radius: 4px;
    border: 1px solid #d0d0d5;
    padding: 9px 15px;
    min-width: 80px;
    background-color: #fff;
    background-repeat: no-repeat;
    background-position: center;
    text-decoration: none;
    box-sizing: border-box;
    transition: border-color .15s, box-shadow .15s, opacity .15s;
    font-family: inherit;
    cursor: pointer;
    overflow: visible;

    background-color: #2a80eb;
    color: #fff;
  }
`);
  const $parent = document.querySelector(contanerSelector);
  const $container = htmlToElement(`
<div class="e-userjs-export-tool-container">
<div>
  <span class="title">${name}主页 URL: </span><br/>
  <input placeholder="输入${name}主页的 URL" class="inputtext" autocomplete="off" type="text" size="30" name="tags" value="">
</div>
  <div>
<label for="movie-type-select">选择同步类型:</label>
<select name="movieType" id="movie-type-select">
    <option value="">所有</option>
    <option value="do">在看</option>
    <option value="wish">想看</option>
    <option value="collect">看过</option>
</select>
  </div>
  <button class="ui-button import-btn" type="submit">
导入${name}动画收藏
  </button>
  <br/>
  <button class="ui-button export-btn" type="submit">
导出${name}动画的收藏同步信息
  </button>
  <button class="ui-button retry-btn" type="submit">
重新同步失败的条目
  </button>
</div>
  `) as HTMLElement;
  $parent.appendChild($container);
  return $container;
}
