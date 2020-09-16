import { AllSubject, Subject } from './interface/subject';
import {
  IInterestData,
  InterestType,
  InterestTypeId,
  SiteUtils,
  SubjectItem,
  SubjectType,
} from './interface/types';
import { SubjectTypeId } from './interface/wiki';
import { siteUtils as bangumiUtils } from './sites/bangumi';
import { siteUtils as doubanUtils } from './sites/douban';
import {
  getSubjectId,
  insertLogInfo,
  updateInterest,
} from './sites/bangumi/common';
import { sleep } from './utils/async/sleep';
import { downloadFile, htmlToElement } from './utils/domUtils';
import { formatDate } from './utils/utils';

type SubjectItemWithSync = SubjectItem & { syncStatus: string };
type InterestInfos = { [key in InterestType]: SubjectItemWithSync[] };

let bangumiData: any = null;

const typeIdDict: {
  [key in InterestType]: { name: string; id: InterestTypeId };
} = {
  dropped: {
    name: '抛弃',
    id: '5',
  },
  on_hold: {
    name: '搁置',
    id: '4',
  },
  do: {
    name: '在看',
    id: '3',
  },
  collect: {
    name: '看过',
    id: '2',
  },
  wish: {
    name: '想看',
    id: '1',
  },
};

function getBangumiSubjectId(name = '', greyName = '') {
  if (!bangumiData) return;
  const obj = bangumiData.items.find((item: any) => {
    let cnNames = [];
    if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
      cnNames = item.titleTranslate['zh-Hans'];
    }
    return (
      item.title === name ||
      item.title === greyName ||
      cnNames.includes(greyName)
    );
  });
  return obj?.sites?.find((item: any) => item.site === 'bangumi').id;
}
function genCSVContent(infos: InterestInfos) {
  const header =
    '\ufeff名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息,类别,同步情况';
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
      const tag = collectInfo.tags || '';
      csvContent += `,${tag}`;
      const comment = collectInfo.comment || '';
      csvContent += `,"${comment}"`;
      const rawInfos = item.rawInfos || '';
      csvContent += `,"${rawInfos}"`;
      csvContent += `,"${typeIdDict[key].name}"`;
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

function init(site: 'douban' | 'bangumi') {
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
  let targetUtils: SiteUtils;
  let originUtils: SiteUtils;
  if (site === 'bangumi') {
    targetUtils = doubanUtils;
    originUtils = bangumiUtils;
  } else {
    targetUtils = bangumiUtils;
    originUtils = doubanUtils;
  }
  const name = targetUtils.name;
  const $parent = document.querySelector(originUtils.contanerSelector);
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
</div>
  `) as HTMLElement;
  const $input = $container.querySelector('input');
  const $btn = $container.querySelector('.import-btn');
  const $exportBtn = $container.querySelector(
    '.export-btn'
  ) as HTMLInputElement;
  const interestInfos: InterestInfos = {
    do: [],
    collect: [],
    wish: [],
    dropped: [],
    on_hold: [],
  };
  $exportBtn.addEventListener('click', async (e) => {
    const $text = e.target as HTMLInputElement;
    $text.value = '导出中...';
    let strName = `${name}动画的收藏`;
    const csv = genCSVContent(interestInfos);
    // $text.value = '导出完成';
    $text.style.display = 'none';
    downloadFile(csv, `${strName}-${formatDate(new Date())}.csv`);
  });
  $btn.addEventListener('click', async (e) => {
    try {
      bangumiData = JSON.parse(GM_getResourceText('bangumiDataURL'));
    } catch (e) {
      console.log('parse JSON:', e);
    }
    const val = $input.value;
    if (!val) {
      alert(`请输入${name}主页地址`);
      return;
    }
    const userId = targetUtils.getUserId(val);
    if (!userId) {
      alert(`无效${name}主页地址`);
      return;
    }
    const $select = $container.querySelector(
      '#movie-type-select'
    ) as HTMLSelectElement;

    // const arr: InterestType[] = ['wish'];
    let arr: InterestType[] = ['do', 'collect', 'wish'];
    if ($select && $select.value) {
      arr = [$select.value as any];
    }
    for (let type of arr) {
      try {
        const res = (await targetUtils.getAllPageInfo(
          userId,
          'movie',
          type
        )) as SubjectItemWithSync[];
        for (let i = 0; i < res.length; i++) {
          const item = res[i];
          // 在 Bangumi 上 非日语的条目跳过
          if (site === 'bangumi' && !isJpMovie(item)) {
            interestInfos[type].push(item);
            continue;
          }
          let subjectId = '';
          // 使用 bangumi data
          if (site === 'bangumi') {
            subjectId = getBangumiSubjectId(item.name, item.greyName);
          }
          if (!subjectId) {
            const result = await originUtils.checkSubjectExist({
              name: item.name,
              releaseDate: item.releaseDate,
            } as Subject);
            if (result && result.url) {
              subjectId = originUtils.getSubjectId(result.url);
            }
          }
          if (subjectId) {
            clearLogInfo($container);
            const nameStr = `<span style="color:tomato">《${item.name}》</span>`;
            insertLogInfo($btn, `更新收藏 ${nameStr} 中...`);
            await originUtils.updateInterest(subjectId, {
              interest: typeIdDict[type].id,
              ...item.collectInfo,
              rating: item.collectInfo.score || '',
            });
            await sleep(300);
            insertLogInfo($btn, `更新收藏 ${nameStr} 成功`);
            item.syncStatus = '成功';
          }
        }
        interestInfos[type] = [...res];
      } catch (error) {
        console.error(error);
      }
    }
    clearLogInfo($container);
    $exportBtn.style.display = 'inline-block';
  });
  $parent.appendChild($container);
}
if (location.href.match(/bgm.tv|bangumi.tv|chii.in/)) {
  init('bangumi');
}

if (location.href.match(/douban.com/)) {
  init('douban');
}
