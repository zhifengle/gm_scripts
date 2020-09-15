import { AllSubject } from './interface/subject';
import { SubjectItem } from './interface/types';
import { SubjectTypeId } from './interface/wiki';
import { checkSubjectExit } from './sites/bangumi';
import {
  getBgmHost,
  getSubjectId,
  insertLogInfo,
  updateInterest,
} from './sites/bangumi/common';
import { getAllPageInfo, InterestType } from './sites/douban';
import { sleep } from './utils/async/sleep';
import { downloadFile, htmlToElement } from './utils/domUtils';
import { formatDate } from './utils/utils';

type DoubanSubjectItem = SubjectItem & { syncStatus: string };
type InterestInfos = { [key in InterestType]: DoubanSubjectItem[] };

let bangumiData: any = null;

function getBangumiSubjectId(jp = '', greyName = '') {
  if (!bangumiData) return;
  const obj = bangumiData.items.find((item: any) => {
    let cnNames = [];
    if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
      cnNames = item.titleTranslate['zh-Hans'];
    }
    return item.title === jp || cnNames.includes(greyName);
  });
  return obj?.sites?.find((item: any) => item.site === 'bangumi').id;
}
function genCSVContent(infos: InterestInfos) {
  const header =
    '\ufeff名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息,类别,bangumi同步情况';
  const dict = {
    do: '在看',
    wish: '想看',
    collect: '看过',
  };
  let csvContent = '';
  const keys = Object.keys(infos) as InterestType[];
  keys.forEach((key) => {
    infos[key].forEach((item) => {
      csvContent += `\r\n${item.name || ''},${item.greyName || ''},${
        item.releaseDate || ''
      }`;
      const subjectUrl = item.url;
      csvContent += `,${subjectUrl}`;
      const cover = item.cover || '';
      csvContent += `,${cover}`;
      const collectInfo: any = item.collectInfo || {};
      const collectDate = collectInfo.date || '';
      csvContent += `,${collectDate}`;
      const score = collectInfo.score || '';
      csvContent += `,${score}`;
      const tag = collectInfo.tag || '';
      csvContent += `,${tag}`;
      const comment = collectInfo.comment || '';
      csvContent += `,"${comment}"`;
      const rawInfos = item.rawInfos || '';
      csvContent += `,"${rawInfos}"`;
      csvContent += `,"${dict[key]}"`;
      csvContent += `,"${item.syncStatus || ''}"`;
    });
  });
  return header + csvContent;
}

// 区分是否为动画
function isJpMovie(item: SubjectItem) {
  return item.rawInfos.indexOf('日本') !== -1;
}
function clearLogInfo($container: HTMLElement) {
  $container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

function init() {
  GM_addStyle(`
  .e-userjs-export-tool-container input {
    margin-bottom: 12px;
  }
  .e-userjs-export-tool-container .import-btn{
    margin-top: 12px;
  }
  .e-userjs-export-tool-container .export-btn {
    display: none;
  }
`);
  const $headerTab = document.querySelector('#columnHomeB');
  const $container = htmlToElement(`
<div class="e-userjs-export-tool-container">
  <label>豆瓣主页 URL: </label><br/>
  <input placeholder="输入豆瓣主页的 URL" class="inputtext" autocomplete="off" type="text" size="30" name="tags" value="">
<label for="movie-type-select">选择同步类型:</label>
<select name="movieType" id="movie-type-select">
    <option value="">所有</option>
    <option value="do">在看</option>
    <option value="wish">想看</option>
    <option value="collect">看过</option>
</select><br/>
  <input class="inputBtn import-btn" value="导入豆瓣动画收藏" name="importBtn" type="submit">
  <input class="inputBtn export-btn" value="导出豆瓣动画的收藏同步信息" name="exportBtn" type="submit">
</div>
  `) as HTMLElement;
  const $input = $container.querySelector('input');
  const $btn = $container.querySelector('.import-btn');
  const $exportBtn = $container.querySelector(
    '.export-btn'
  ) as HTMLInputElement;
  const doubanAllSubject: InterestInfos = {
    do: [],
    collect: [],
    wish: [],
  };
  $exportBtn.addEventListener('click', async (e) => {
    const $text = e.target as HTMLInputElement;
    $text.value = '导出中...';
    let name = '豆瓣动画的收藏';
    const csv = genCSVContent(doubanAllSubject);
    // $text.value = '导出完成';
    $text.style.display = 'none';
    downloadFile(csv, `${name}-${formatDate(new Date())}.csv`);
  });
  $btn.addEventListener('click', async (e) => {
    try {
      bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
    } catch (e) {
      console.log('parse JSON:', e);
    }
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
    const $select = $container.querySelector(
      '#movie-type-select'
    ) as HTMLSelectElement;

    // const arr: InterestType[] = ['wish'];
    const typeIdDict: { [key in InterestType]: '1' | '2' | '3' | '4' | '5' } = {
      do: '3',
      collect: '2',
      wish: '1',
    };
    let arr: InterestType[] = ['do', 'collect', 'wish'];
    if ($select && $select.value) {
      arr = [$select.value as any];
    }
    for (let type of arr) {
      try {
        const res = await getAllPageInfo(userId, 'movie', type);
        for (let i = 0; i < res.length; i++) {
          const item = res[i] as DoubanSubjectItem;
          if (isJpMovie(item)) {
            // 使用 bangumi data
            let subjectId = getBangumiSubjectId(item.name, item.greyName);
            if (!subjectId) {
              const result = await checkSubjectExit(
                {
                  name: item.name,
                  releaseDate: item.releaseDate,
                } as AllSubject,
                getBgmHost(),
                SubjectTypeId.anime,
                true
              );
              console.info('search results: ', result);
              if (result && result.url) {
                subjectId = getSubjectId(result.url);
              }
            }
            if (subjectId) {
              clearLogInfo($container);
              const nameStr = `<span style="color:tomato">《${item.name}》</span>`;
              insertLogInfo($btn, `更新收藏 ${nameStr} 中...`);
              await updateInterest(subjectId, {
                interest: typeIdDict[type],
                ...item.collectInfo,
                rating: item.collectInfo.score || '',
              });
              await sleep(300);
              insertLogInfo($btn, `更新收藏 ${nameStr} 成功`);
              item.syncStatus = '成功';
            }
          }
          doubanAllSubject[type].push(item);
        }
      } catch (error) {
        console.error(error);
      }
    }
    clearLogInfo($container);
    $exportBtn.style.display = 'inline-block';
  });
  $headerTab.appendChild($container);
}
init();
