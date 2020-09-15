import { getAllPageInfo, InterestType } from './sites/douban';
import { htmlToElement } from './utils/domUtils';

// @include     https://movie.douban.com/people/*/collect
let bangumiData: any = null;
try {
  bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
} catch (e) {
  console.log('parse JSON:', e);
}

function getBangumiSubjectId(jp = '') {
  const obj = bangumiData.items.find((item: any) => item.title === jp);
  return obj?.sites?.find((item: any) => item.site === 'bangumi').id;
}

function init() {
  const $headerTab = document.querySelector('#columnHomeB');
  const $container = htmlToElement(`
<div class="e-userjs-export-tool-container">
  <label>豆瓣主页 URL: </label><br/>
  <input placeholder="输入豆瓣主页的 URL" class="inputtext" autocomplete="off" type="text" size="30" name="tags" value="">
  <a class="import-btn" style="color: tomato;" href="javascript:void(0)"><span>导入豆瓣动画收藏</span></a>
</div>
  `) as HTMLElement;
  const $input = $container.querySelector('input');
  const $btn = $container.querySelector('.import-btn');
  $btn.addEventListener('click', async (e) => {
    const val = $input.value;
    if (!val) {
      alert('请输入豆瓣主页地址');
      return;
    }
    let m = val.match(/douban.com\/people\/([^\/]*)\//);
    if (!m) {
      alert('无效豆瓣主页地址');
    }
    const userId = m[1];

    const arr: InterestType[] = ['do', 'collect', 'wish'];
    for (let type of arr) {
      const res = await getAllPageInfo(userId, 'movie', type);
      console.log(res);
    }
  });
  $headerTab.appendChild($container);
}
init();
