import { SearchSubject } from './interface/subject';
import {
  IInterestData,
  InterestType,
  InterestTypeId,
  SubjectItem,
  CollectionInfo,
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

function getRowItem(item: SubjectItem) {
  const dict: { [key in keyof SubjectItem]: string } = {
    name: '名称',
    greyName: '别名',
    releaseDate: '发行日期',
    url: '地址',
    cover: '封面地址',
    rawInfos: '其它信息',
  };
  const dictCollection: { [key in keyof CollectionInfo]: string } = {
    date: '收藏日期',
    score: '我的评分',
    tags: '标签',
    comment: '吐槽',
    interestType: WATCH_STATUS_STR,
  };
  const res: any = {};
  for (const [key, value] of Object.entries(dict)) {
    // @ts-ignore
    res[value] = item[key] || '';
  }
  for (const [key, value] of Object.entries(dictCollection)) {
    const collect = item.collectInfo || {};
    if (key === 'interestType') {
      res[value] = getInterestTypeName(item.collectInfo.interestType) || '';
      continue;
    }
    // @ts-ignore
    res[value] = collect[key] || '';
  }
  return res;
}

function downloadExcel(filename: string, items: SubjectItem[]) {
  const rows = items.map((item) => getRowItem(item));
  // @TODO 采用分步写入的方式
  const header = CSV_HEADER.split(',');
  header.push(WATCH_STATUS_STR);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户收藏');
  XLSX.writeFile(workbook, filename);
}

function downloadCSV(filename: string, item: SubjectItem[]) {
  const csv = genCSVHeader() + genCSVContent(item);
  downloadFile(csv, filename);
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
    // 评论使用的 "" 包裹时
    if (/^".*"$/.test(comment)) {
      csvContent += `,""${comment}""`;
    } else {
      csvContent += `,"${comment}"`;
    }
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
    let infos: SubjectItem[] = [];
    for (const t of interestTypeArr) {
      let res: SubjectItem[] = [];
      try {
        res = await getCollectionInfo(genListUrl(t));
      } catch (error) {
        console.error('抓取错误: ', error);
      }
      infos = infos.concat(
        res.map((item) => {
          item.collectInfo.interestType = t;
          return item;
        })
      );
    }
    downloadExcel(filename, infos);
    $text.innerText = '完成所有导出';
    $node.style.pointerEvents = 'auto';
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
    let res: SubjectItem[] = [];
    try {
      res = await getCollectionInfo(location.href);
    } catch (error) {
      console.error('抓取错误: ', error);
    }
    const interestType = getInterestTypeByUrl(location.href);
    downloadExcel(
      filename,
      res.map((item) => {
        item.collectInfo.interestType = interestType;
        return item;
      })
    );
    $text.innerText = '导出完成';
    $node.style.pointerEvents = 'auto';
  });
  return $node;
}

async function updateUserInterest(
  subject: SearchSubject,
  data: IInterestData,
  $infoDom: Element
) {
  const nameStr = `<span style="color:tomato">《${subject.name}》</span>`;
  try {
    const subjectId = getSubjectId(subject.url);
    if (!subjectId) {
      throw new Error('条目地址无效');
    }
    insertLogInfo($infoDom, `更新收藏 ${nameStr} 中...`);
    await updateInterest(subjectId, data);
    insertLogInfo($infoDom, `更新收藏 ${nameStr} 成功`);
    await randomSleep(2000, 1000);
  } catch (error) {
    insertLogInfo($infoDom, `导入 ${nameStr} 错误: ${error}`);
    console.error('导入错误: ', error);
  }
}

function readCSV(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const detectReader = new FileReader();
    detectReader.readAsBinaryString(file);
    detectReader.onload = function (e) {
      const contents = this.result as string;
      const arr = contents.split(/\r\n|\n/);
      // 检测文件编码
      reader.readAsText(file, jschardet.detect(arr[0].toString()).encoding);
    };
    reader.onload = function (e) {
      resolve(this.result);
    };
    reader.onerror = function (e) {
      reject(e);
    };
  });
}

async function handleFileAsync(e: Event) {
  const target = e.target as HTMLInputElement;
  const $parent = this.closest('li') as HTMLElement;
  const file = target.files[0];
  let workbook;
  if (file.name.includes('.csv')) {
    const data = await readCSV(file);
    workbook = XLSX.read(data, { type: 'string' });
  } else {
    const data = await file.arrayBuffer();
    workbook = XLSX.read(data);
  }
  var first_sheet_name = workbook.SheetNames[0];
  var worksheet = workbook.Sheets[first_sheet_name];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  const $menu = document.querySelector('#columnSubjectBrowserB .menu_inner');
  for (const item of jsonData) {
    try {
      const subject: SearchSubject = {
        name: item['名称'],
        url: item['地址'],
      };
      if (!subject.name || !subject.url) {
        throw new Error('没有条目信息');
      }
      const info: IInterestData = {
        interest: getInterestTypeIdByName(item[WATCH_STATUS_STR]),
        rating: item['我的评分'],
        comment: item['吐槽'],
        tags: item['标签'],
      };
      await updateUserInterest(subject, info, $menu);
    } catch (error) {
      console.error('导入错误: ', error);
    }
  }
  $parent.querySelector('a > span').innerHTML = '导入完成';
  $parent.style.pointerEvents = 'auto';
}

function genImportControl() {
  const btnStr = `<li title="支持和导出表头相同的 csv 和 xlsx 文件">
  <a href="javascript:void(0);"><span style="color:tomato;"><label for="e-userjs-import-csv-file">导入收藏</label></span></a>
  <input type="file" id="e-userjs-import-csv-file" style="display:none" />
</li>`;
  const $node = htmlToElement(btnStr) as HTMLElement;
  const $file = $node.querySelector(
    '#e-userjs-import-csv-file'
  ) as HTMLInputElement;
  // $file.addEventListener('change', handleInputChange);
  $file.addEventListener('change', handleFileAsync);
  return $node;
}

function addExportBtn(ext: 'csv' | 'xlsx' = 'xlsx') {
  const $nav = $q('#headerProfile .navSubTabs');
  if (!$nav) return;
  const type = $nav.querySelector('.focus')?.textContent || '';
  const $username = $q('.nameSingle .inner>a');
  let name = '导出收藏';
  if ($username) {
    name = $username.textContent;
  }
  const filename = `${name}-${type}-${formatDate(new Date())}.${ext}`;
  $nav.appendChild(genAllExportBtn(`${name}-${formatDate(new Date())}.${ext}`));
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
  $header.appendChild(genExportBtn(`${title}.xlsx`));
}

if (location.href.match(/\w+\/list\//)) {
  addExportBtn();
}
