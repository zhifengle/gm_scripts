import { SubjectItem } from './interface/types';
import {
  getBgmHost,
  getItemInfos,
  getTotalPageNum,
} from './sites/bangumi/common';
import { sleep } from './utils/async/sleep';
import { downloadFile, htmlToElement } from './utils/domUtils';
import { fetchText } from './utils/fetchData';
import { formatDate } from './utils/utils';

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

function genCSVContent(res: SubjectItem[]) {
  const hostUrl = getBgmHost();
  let csvContent =
    '\ufeff名称,别名,发行日期,地址,封面地址,收藏日期,我的评分,标签,吐槽,其它信息';
  res.forEach((item) => {
    csvContent += `\r\n${item.name || ''},${item.greyName || ''},${
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
    csvContent += `,${tag}`;
    const comment = collectInfo.comment || '';
    csvContent += `,"${comment}"`;
    const rawInfos = item.rawInfos || '';
    csvContent += `,"${rawInfos}"`;
  });
  return csvContent;
}

function genExportBtn(filename: string) {
  const btnStr = `<li><a href="#"><span style="color:tomato;">导出收藏</span></a></li>`;
  const $node = htmlToElement(btnStr);
  $node.addEventListener('click', async (e) => {
    const $text = ($node as HTMLElement).querySelector('span');
    $text.innerText = '导出中...';
    const res = await getCollectionInfo(location.href);
    const csv = genCSVContent(res);
    $text.innerText = '导出完成';
    downloadFile(csv, filename);
  });
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
  $nav.appendChild(genExportBtn(filename));
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
