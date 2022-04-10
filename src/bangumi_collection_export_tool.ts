import {
  IInterestData,
  InterestType,
  InterestTypeId,
  SubjectItem,
} from './interface/types';
import {
  getBgmHost,
  getInterestTypeId,
  getInterestTypeIdByName,
  getInterestTypeName,
  getItemInfos,
  getSubjectId,
  getTotalPageNum,
  insertLogInfo,
  updateInterest,
} from './sites/bangumi/common';
import { randomSleep, sleep } from './utils/async/sleep';
import { $q, downloadFile, htmlToElement } from './utils/domUtils';
import { fetchText } from './utils/fetchData';
import { formatDate } from './utils/utils';

// 目前写死
const CSV_HEADER =
  '名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息';

const WATCH_STATUS_STR = '观看状态';

const interestTypeArr: Array<InterestType> = [
  'wish',
  'collect',
  'do',
  'on_hold',
  'dropped',
];
function genListUrl(t: InterestType) {
  let u = location.href.replace(/[^\/]+?$/, '');
  return u + t;
}

function clearLogInfo($container: HTMLElement) {
  $container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

// 通过 URL 获取收藏的状态
function getInterestTypeByUrl(url: string) {
  let m = url.match(/[^\/]+?$/);
  return m[0].split('#')[0] as InterestType;
}

async function getCollectionInfo(url: string) {
  const rawText = await fetchText(url);
  const $doc = new DOMParser().parseFromString(rawText, 'text/html');
  const totalPageNum = getTotalPageNum($doc);
  const res = [...getItemInfos($doc)];
  let page = 2;
  while (page <= totalPageNum) {
    let reqUrl = url;
    const m = url.match(/page=(\d*)/);
    if (m) {
      reqUrl = reqUrl.replace(m[0], `page=${page}`);
    } else {
      reqUrl = `${reqUrl}?page=${page}`;
    }
    await sleep(500);
    console.info('fetch info: ', reqUrl);
    const rawText = await fetchText(reqUrl);
    const $doc = new DOMParser().parseFromString(rawText, 'text/html');
    res.push(...getItemInfos($doc));
    page += 1;
  }
  return res;
}

function genCSVHeader(type: boolean = false) {
  let csvHeader = `\ufeff${CSV_HEADER}`;
  // 添加 想看 在看 搁置
  if (type) {
    csvHeader += `,${WATCH_STATUS_STR}`;
  }
  return csvHeader;
}

function genCSVContent(res: SubjectItem[], status?: string) {
  const hostUrl = getBgmHost();
  let csvContent = '';
  res.forEach((item) => {
    csvContent += `\r\n"${item.name || ''}","${item.greyName || ''}",${
      item.releaseDate || ''
    }`;
    const subjectUrl = hostUrl + item.url;
    csvContent += `,${subjectUrl}`;
    const cover = item.cover || '';
    csvContent += `,${cover}`;
    const collectInfo: any = item.collectInfo || {};
    const collectDate = collectInfo.date || '';
    csvContent += `,${collectDate}`;
    const score = collectInfo.score || '';
    csvContent += `,${score}`;
    const tag = collectInfo.tag || '';
    csvContent += `,"${tag}"`;
    const comment = collectInfo.comment || '';
    csvContent += `,"${comment}"`;
    const rawInfos = item.rawInfos || '';
    csvContent += `,"${rawInfos}"`;
    if (status) {
      csvContent += `,${status}`;
    }
  });
  return csvContent;
}

function genAllExportBtn(filename: string) {
  const btnStr = `<li><a href="javascript:void(0);"><span style="color:tomato;">导出所有收藏</span></a></li>`;
  const $node = htmlToElement(btnStr) as HTMLElement;
  $node.addEventListener('click', async (e) => {
    const $text = $node.querySelector('span');
    $text.innerText = '导出中...';
    $node.style.pointerEvents = 'none';
    let csvContent = '';
    for (const t of interestTypeArr) {
      const res = await getCollectionInfo(genListUrl(t));
      csvContent += genCSVContent(res, getInterestTypeName(t));
    }
    const csv = genCSVHeader(true) + csvContent;
    $text.innerText = '完成所有导出';
    $node.style.pointerEvents = 'auto';
    downloadFile(csv, filename);
  });
  return $node;
}
function genExportBtn(filename: string) {
  const btnStr = `<li><a href="javascript:void(0);"><span style="color:tomato;">导出收藏</span></a></li>`;
  const $node = htmlToElement(btnStr) as HTMLElement;
  $node.addEventListener('click', async (e) => {
    const $text = ($node as HTMLElement).querySelector('span');
    $text.innerText = '导出中...';
    $node.style.pointerEvents = 'none';
    const res = await getCollectionInfo(location.href);
    const csv = genCSVHeader() + genCSVContent(res);
    $text.innerText = '导出完成';
    $node.style.pointerEvents = 'auto';
    downloadFile(csv, filename);
  });
  return $node;
}

function handleInputChange() {
  const file = this.files[0];
  const $parent = this.closest('li') as HTMLElement;
  const reader = new FileReader();
  const detectReader = new FileReader();
  detectReader.onload = function (e) {
    const contents = this.result as string;
    const arr = contents.split(/\r\n|\n/);
    // 检测文件编码
    reader.readAsText(file, jschardet.detect(arr[0].toString()).encoding);
  };
  reader.onload = async function (e) {
    const contents = this.result as string;
    var contentsArr = contents.split(/\r\n|\n/);
    const $container = document.querySelector(
      '#columnSubjectBrowserB'
    ) as HTMLElement;
    clearLogInfo($container);
    $parent.style.pointerEvents = 'none';
    $parent.querySelector('a > span').innerHTML = '导入中...';
    const $menu = document.querySelector('#columnSubjectBrowserB .menu_inner');
    for (let i = 0; i < contentsArr.length; i++) {
      const str = contentsArr[i];
      if (i === 0) {
        // 为了避免错误，暂时只支持导出格式的 csv.
        if (!str.includes(CSV_HEADER)) {
          alert(`只支持 csv 文件\r\n文件开头为:\r\n"${CSV_HEADER}"`);
          break;
        }
        console.log('==========Header==========');
        console.log(str);
        continue;
      }
      console.log(str);
      if (!str.includes(',')) {
        continue;
      }
      try {
        // @TODO 硬编码的索引
        // 剔除开头和结尾的引号
        const arr = str.split(',').map((s) => s.replace(/^"|"$/g, ''));
        const subjectId = getSubjectId(arr[3]);
        let interest: InterestTypeId = '2';
        // 为空时，取 URL 的
        if (!arr[10]) {
          interest = getInterestTypeId(getInterestTypeByUrl(location.href));
        } else {
          interest = getInterestTypeIdByName(arr[10]);
        }
        if (subjectId) {
          const data: IInterestData = {
            interest: interest,
            rating: arr[6],
            tags: arr[7],
            // 剔除多余引号
            comment: arr[8]?.replace(/^"|"$/g, ''),
          };
          const nameStr = `<span style="color:tomato">《${arr[0]}》</span>`;
          insertLogInfo($menu, `更新收藏 ${nameStr} 中...`);
          await updateInterest(subjectId, data);
          insertLogInfo($menu, `更新收藏 ${nameStr} 成功`);
          await randomSleep(2000, 1000);
        }
      } catch (error) {
        console.error('导入错误: ', error);
      }
    }
    $parent.querySelector('a > span').innerHTML = '导入完成';
    $parent.style.pointerEvents = 'auto';
  };
  detectReader.readAsBinaryString(file);
}

function genImportControl() {
  const btnStr = `<li title="只支持和导出格式一致的 csv 文件">
  <a href="javascript:void(0);"><span style="color:tomato;"><label for="e-userjs-import-csv-file">导入收藏</label></span></a>
  <input type="file" id="e-userjs-import-csv-file" style="display:none" />
</li>`;
  const $node = htmlToElement(btnStr) as HTMLElement;
  const $file = $node.querySelector(
    '#e-userjs-import-csv-file'
  ) as HTMLInputElement;
  $file.addEventListener('change', handleInputChange);
  return $node;
}

function addExportBtn() {
  const $nav = $q('#headerProfile .navSubTabs');
  if (!$nav) return;
  const type = $nav.querySelector('.focus')?.textContent || '';
  const $username = $q('.nameSingle .inner>a');
  let name = '导出收藏';
  if ($username) {
    name = $username.textContent;
  }
  const filename = `${name}-${type}-${formatDate(new Date())}.csv`;
  $nav.appendChild(genAllExportBtn(`${name}-${formatDate(new Date())}.csv`));
  // 判断是否在单个分类页面
  const interestType = getInterestTypeByUrl(location.href);
  if (interestTypeArr.includes(interestType)) {
    $nav.appendChild(genExportBtn(filename));
  }
  $nav.appendChild(genImportControl());
}

// 索引
if (location.href.match(/index\/\d+/)) {
  const $header = $q('#header');
  const title = $header.querySelector('h1').textContent.trim();
  $header.appendChild(genExportBtn(`${title}.csv`));
}

if (location.href.match(/\w+\/list\//)) {
  addExportBtn();
}
