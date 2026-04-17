import { SearchSubject } from './interface/subject';
import { IInterestData, InterestType, SubjectItem } from './interface/types';
import {
  getInterestTypeId,
  getItemInfos,
  getSubjectId,
  getTotalPageNum,
  insertLogInfo,
  updateInterest,
} from './sites/bangumi/common';
import { randomSleep, sleep } from './utils/async/sleep';
import { $q, htmlToElement } from './utils/domUtils';
import {
  collectionSheetRowToItem,
  downloadCollectionExcel,
  ensureCollectionInfo,
  readCollectionSheetRows,
} from './utils/collectionSheet';
import { fetchText } from './utils/fetchData';
import { formatDate } from './utils/utils';

const INTEREST_TYPES: InterestType[] = [
  'wish',
  'collect',
  'do',
  'on_hold',
  'dropped',
];

const IMPORT_INPUT_ID = 'e-userjs-import-csv-file';
const COLLECTION_SHEET_EXTENSION = 'xlsx';
const COLLECTION_PAGE_DELAY_MS = 500;
const collectionCache = new Map<string, Promise<SubjectItem[]>>();

type MenuItemOptions = {
  title?: string;
  label: string;
  onClick?: (item: HTMLElement) => Promise<void> | void;
  tagName?: 'li' | 'span';
};

function injectActionStyles() {
  GM_addStyle(`
.e-userjs-collection-tool-action {
  --action-border: rgba(112, 154, 174, .38);
  --action-bg: rgba(112, 154, 174, .08);
  --action-color: #6c93a6;
  --action-hover-border: rgba(84, 144, 176, .58);
  --action-hover-bg: rgba(112, 154, 174, .14);
  --action-hover-color: #4f8fad;
  display: inline-flex;
  align-items: center;
  margin: 0 0 0 6px;
  padding: 0;
  list-style: none;
  vertical-align: middle;
}
.navSubTabs .e-userjs-collection-tool-action {
  flex: 0 0 auto;
  margin-left: 6px;
}
.navSubTabs .e-userjs-collection-tool-action + .e-userjs-collection-tool-action {
  margin-left: 0;
}
.e-userjs-collection-tool-action > a {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  margin: 2px 0;
  border: 1px solid var(--action-border);
  border-radius: 8px;
  padding: 3px 9px;
  background: var(--action-bg);
  color: var(--action-color);
  font-size: 13px;
  line-height: 16px;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6);
  transition: border-color .15s, background-color .15s, box-shadow .15s, color .15s, opacity .15s;
}
.navSubTabs .e-userjs-collection-tool-action > a {
  display: inline-flex;
  padding: 3px 9px;
  color: var(--action-color);
}
.e-userjs-collection-tool-action > a:hover {
  border-color: var(--action-hover-border);
  background: var(--action-hover-bg);
  color: var(--action-hover-color);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .75), 0 1px 3px rgba(112, 154, 174, .18);
}
.navSubTabs .e-userjs-collection-tool-action > a:hover {
  color: var(--action-hover-color);
}
.e-userjs-collection-tool-action span {
  color: inherit !important;
}
.e-userjs-collection-tool-action--inline {
  margin-left: 10px;
}
#indexCatBox .e-userjs-collection-tool-action {
  margin-left: auto;
  padding-right: 2px;
}
#indexCatBox .e-userjs-collection-tool-action > a {
  border: 1px solid var(--action-border);
  padding: 4px 10px;
  background: var(--action-bg);
  color: var(--action-color);
  transform: none;
}
#indexCatBox .e-userjs-collection-tool-action > a:hover {
  border-color: var(--action-hover-border);
  background: var(--action-hover-bg);
  color: var(--action-hover-color);
  transform: none;
}
#indexCatBox .e-userjs-collection-tool-action > a::after {
  content: none;
  display: none;
}
.e-userjs-collection-tool-action.is-busy > a {
  opacity: .62;
  cursor: wait;
}
.e-userjs-collection-tool-action.is-success {
  --action-border: rgba(87, 166, 114, .6);
  --action-bg: rgba(87, 166, 114, .1);
  --action-color: #3b9461;
}
.e-userjs-collection-tool-action.is-error {
  --action-border: rgba(203, 84, 84, .6);
  --action-bg: rgba(203, 84, 84, .1);
  --action-color: #bd4a4a;
}
.e-userjs-collection-tool-action.is-success > a:hover,
.e-userjs-collection-tool-action.is-error > a:hover {
  border-color: var(--action-border);
  background: var(--action-bg);
  color: var(--action-color);
}
#header .e-userjs-collection-tool-action--inline > a {
  min-height: 23px;
  padding: 3px 10px;
  font-size: 12px;
}
html[data-theme="dark"] .e-userjs-collection-tool-action {
  --action-border: rgba(132, 174, 195, .45);
  --action-bg: rgba(132, 174, 195, .12);
  --action-color: #a7c9da;
  --action-hover-border: rgba(159, 199, 218, .7);
  --action-hover-bg: rgba(132, 174, 195, .2);
  --action-hover-color: #d2edf7;
}
html[data-theme="dark"] .e-userjs-collection-tool-action > a {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
}
html[data-theme="dark"] .e-userjs-collection-tool-action > a:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, .22);
}
html[data-theme="dark"] .e-userjs-collection-tool-action.is-success {
  --action-border: rgba(90, 180, 124, .55);
  --action-bg: rgba(90, 180, 124, .14);
  --action-color: #8bd0a2;
}
html[data-theme="dark"] .e-userjs-collection-tool-action.is-error {
  --action-border: rgba(218, 100, 100, .6);
  --action-bg: rgba(218, 100, 100, .14);
  --action-color: #ef9a9a;
}
`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function setMenuText(item: HTMLElement, text: string) {
  const span = item.querySelector('span');
  if (span) {
    span.innerText = text;
  }
}

function setActionState(
  item: HTMLElement,
  state: 'idle' | 'busy' | 'success' | 'error'
) {
  item.classList.toggle('is-busy', state === 'busy');
  item.classList.toggle('is-success', state === 'success');
  item.classList.toggle('is-error', state === 'error');
}

async function withBusyState(
  item: HTMLElement,
  busyText: string,
  fn: () => Promise<void>
) {
  setMenuText(item, busyText);
  setActionState(item, 'busy');
  item.style.pointerEvents = 'none';
  try {
    await fn();
  } finally {
    item.style.pointerEvents = 'auto';
    if (item.classList.contains('is-busy')) {
      setActionState(item, 'idle');
    }
  }
}

function createMenuItem(options: MenuItemOptions) {
  const tagName = options.tagName || 'li';
  const className = [
    'e-userjs-collection-tool-action',
    tagName === 'span' ? 'e-userjs-collection-tool-action--inline' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const node = htmlToElement(
    `<${tagName} class="${className}"${options.title ? ` title="${options.title}"` : ''}>
  <a href="javascript:void(0);"><span>${options.label}</span></a>
</${tagName}>`
  ) as HTMLElement;
  if (options.onClick) {
    node.addEventListener('click', async () => {
      try {
        await options.onClick(node);
      } catch (error) {
        setMenuText(node, '操作失败');
        setActionState(node, 'error');
        console.error('操作失败: ', error);
      }
    });
  }
  return node;
}

function clearLogInfo(container: HTMLElement | Element) {
  container
    .querySelectorAll('.e-wiki-log-info')
    .forEach((node) => node.remove());
}

function getInterestTypeByUrl(url: string): InterestType | undefined {
  const currentType = url.match(/[^\/?#]+(?=[?#]?[^\/]*$)/)?.[0];
  return INTEREST_TYPES.find((type) => type === currentType);
}

function getListBaseUrl() {
  return location.href.replace(/[^\/?#]+(?:[?#].*)?$/, '');
}

function getListUrl(interestType: InterestType) {
  return `${getListBaseUrl()}${interestType}`;
}

function getCacheKey(url: string) {
  const parsedUrl = new URL(url, location.href);
  parsedUrl.hash = '';
  parsedUrl.searchParams.delete('page');
  return parsedUrl.toString();
}

function isCurrentDocumentFirstPage() {
  return !new URL(location.href).searchParams.has('page');
}

function canUseCurrentDocument(url: string) {
  if (!isCurrentDocumentFirstPage()) {
    return false;
  }
  return getCacheKey(url) === getCacheKey(location.href);
}

function getPageUrl(url: string, page: number) {
  const pageParam = `page=${page}`;
  if (/page=\d+/.test(url)) {
    return url.replace(/page=\d+/, pageParam);
  }
  return `${url}${url.includes('?') ? '&' : '?'}${pageParam}`;
}

async function fetchCollectionPage(url: string) {
  const rawText = await fetchText(url);
  return new DOMParser().parseFromString(rawText, 'text/html');
}

async function loadCollectionInfo(url: string) {
  const firstPage = canUseCurrentDocument(url)
    ? document
    : await fetchCollectionPage(url);
  const totalPageNum = getTotalPageNum(firstPage);
  const items = [...getItemInfos(firstPage)];
  let page = 2;
  while (page <= totalPageNum) {
    const reqUrl = getPageUrl(url, page);
    await sleep(COLLECTION_PAGE_DELAY_MS);
    console.info('fetch info: ', reqUrl);
    items.push(...getItemInfos(await fetchCollectionPage(reqUrl)));
    page += 1;
  }
  return items;
}

async function getCollectionInfo(url: string) {
  const cacheKey = getCacheKey(url);
  if (!collectionCache.has(cacheKey)) {
    collectionCache.set(cacheKey, loadCollectionInfo(url));
  }
  return collectionCache.get(cacheKey);
}

function withInterestType(item: SubjectItem, interestType?: InterestType) {
  const collectInfo = {
    ...ensureCollectionInfo(item),
  };
  if (interestType) {
    collectInfo.interestType = interestType;
  }
  return {
    ...item,
    collectInfo,
  };
}

async function getCurrentCollectionItems(interestType?: InterestType) {
  return getCollectionItems(
    interestType ? getListUrl(interestType) : location.href,
    interestType
  );
}

async function getCollectionItems(url: string, interestType?: InterestType) {
  const items = await getCollectionInfo(url);
  return items.map((item) => withInterestType(item, interestType));
}

async function getAllCollectionItems() {
  let items: SubjectItem[] = [];
  for (const interestType of INTEREST_TYPES) {
    try {
      const pageItems = await getCollectionInfo(getListUrl(interestType));
      items = items.concat(
        pageItems.map((item) => withInterestType(item, interestType))
      );
    } catch (error) {
      console.error(`抓取${interestType}收藏错误: `, error);
    }
  }
  return items;
}

function downloadItems(filename: string, items: SubjectItem[]) {
  downloadCollectionExcel(filename, items);
}

async function exportCurrentCollection(
  menuItem: HTMLElement,
  filename: string,
  interestType?: InterestType
) {
  const url = interestType ? getListUrl(interestType) : location.href;
  await exportCollectionFromUrl(menuItem, filename, url, interestType);
}

async function exportCollectionFromUrl(
  menuItem: HTMLElement,
  filename: string,
  url: string,
  interestType?: InterestType
) {
  await withBusyState(menuItem, '导出中...', async () => {
    downloadItems(filename, await getCollectionItems(url, interestType));
    setMenuText(menuItem, '导出完成');
    setActionState(menuItem, 'success');
  });
}

async function exportAllCollections(menuItem: HTMLElement, filename: string) {
  await withBusyState(menuItem, '导出中...', async () => {
    downloadItems(filename, await getAllCollectionItems());
    setMenuText(menuItem, '完成所有导出');
    setActionState(menuItem, 'success');
  });
}

function getImportLogTarget(fallback: Element) {
  return document.querySelector('#columnSubjectBrowserB .menu_inner') || fallback;
}

async function updateUserInterest(
  subject: SearchSubject,
  data: IInterestData,
  logTarget: Element
) {
  const nameStr = `<span style="color:tomato">《${subject.name}》</span>`;
  try {
    const subjectId = getSubjectId(subject.url);
    if (!subjectId) {
      throw new Error('条目地址无效');
    }
    insertLogInfo(logTarget, `更新收藏 ${nameStr} 中...`);
    await updateInterest(subjectId, data);
    insertLogInfo(logTarget, `更新收藏 ${nameStr} 成功`);
    await randomSleep(2000, 1000);
  } catch (error) {
    insertLogInfo(logTarget, `导入 ${nameStr} 错误: ${getErrorMessage(error)}`);
    console.error('导入错误: ', error);
  }
}

async function importCollectionFile(file: File, logTarget: Element) {
  const rows = await readCollectionSheetRows(file);
  for (const row of rows) {
    try {
      const { item, interestType } = collectionSheetRowToItem(row);
      const subject: SearchSubject = {
        name: item.name,
        url: item.url,
      };
      if (!subject.name || !subject.url) {
        throw new Error('没有条目信息');
      }
      const collectInfo = ensureCollectionInfo(item);
      await updateUserInterest(
        subject,
        {
          interest: getInterestTypeId(interestType),
          rating: collectInfo.score,
          comment: collectInfo.comment,
          tags: collectInfo.tags,
        },
        logTarget
      );
    } catch (error) {
      insertLogInfo(logTarget, `导入条目错误: ${getErrorMessage(error)}`);
      console.error('导入错误: ', error);
    }
  }
}

function createImportControl() {
  const node = htmlToElement(`<li class="e-userjs-collection-tool-action" title="支持和导出表头相同的 csv 和 xlsx 文件">
  <a href="javascript:void(0);"><span><label for="${IMPORT_INPUT_ID}">导入收藏</label></span></a>
  <input type="file" id="${IMPORT_INPUT_ID}" style="display:none" accept=".xlsx,.xls,.csv" />
</li>`) as HTMLElement;
  const input = node.querySelector(`#${IMPORT_INPUT_ID}`) as HTMLInputElement;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const logTarget = getImportLogTarget(node);
    clearLogInfo(logTarget);
    try {
      await withBusyState(node, '导入中...', async () => {
        await importCollectionFile(file, logTarget);
        setMenuText(node, '导入完成');
        setActionState(node, 'success');
      });
    } catch (error) {
      setMenuText(node, '导入失败');
      setActionState(node, 'error');
      insertLogInfo(logTarget, `导入文件错误: ${getErrorMessage(error)}`);
      console.error('导入文件错误: ', error);
    } finally {
      input.value = '';
    }
  });
  return node;
}

function createAllExportControl(filename: string) {
  return createMenuItem({
    label: '导出所有收藏',
    onClick: (item) => exportAllCollections(item, filename),
  });
}

function createExportControl(filename: string, interestType?: InterestType) {
  return createMenuItem({
    label: '导出收藏',
    onClick: (item) => exportCurrentCollection(item, filename, interestType),
  });
}

function createInlineExportControl(filename: string) {
  return createMenuItem({
    tagName: 'span',
    label: '导出目录',
    onClick: (item) => exportCurrentCollection(item, filename),
  });
}

function createIndexExportControl() {
  return createMenuItem({
    label: '导出目录',
    title: '导出当前选中分类',
    onClick: (item) =>
      exportCollectionFromUrl(
        item,
        getIndexPageFilename(),
        getSelectedIndexCatUrl()
      ),
  });
}

function getPageTitle() {
  const header = $q('#header');
  return header?.querySelector('h1')?.textContent?.trim() || '导出收藏';
}

function getPageTitleFilename(ext = COLLECTION_SHEET_EXTENSION) {
  return `${getPageTitle()}.${ext}`;
}

function getSelectedIndexCatLink() {
  const catLinkSelector =
    '#indexCatBox .cat li:not(.e-userjs-collection-tool-action) a';
  return (
    $q<HTMLAnchorElement>(`${catLinkSelector}.selected`) ||
    $q<HTMLAnchorElement>(`${catLinkSelector}.focus`) ||
    $q<HTMLAnchorElement>(catLinkSelector)
  );
}

function getSelectedIndexCatUrl() {
  const href = getSelectedIndexCatLink()?.getAttribute('href');
  if (!href || href.startsWith('javascript:')) {
    return location.href;
  }
  return new URL(href, location.href).toString();
}

function getSelectedIndexCatName() {
  const link = getSelectedIndexCatLink();
  const span = link?.querySelector('span');
  if (!span) {
    return '';
  }
  const clone = span.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('small').forEach((node) => node.remove());
  return clone.textContent?.trim() || '';
}

function getIndexPageFilename(ext = COLLECTION_SHEET_EXTENSION) {
  const catName = getSelectedIndexCatName();
  return `${getPageTitle()}${catName ? `-${catName}` : ''}.${ext}`;
}

function getUserListFilename(ext = COLLECTION_SHEET_EXTENSION) {
  const type = $q('#headerProfile .navSubTabs .focus')?.textContent || '';
  const username =
    $q('.nameSingle .inner>a')?.textContent?.trim() || '导出收藏';
  return {
    all: `${username}-${formatDate(new Date())}.${ext}`,
    current: `${username}-${type}-${formatDate(new Date())}.${ext}`,
  };
}

function addListPageControls() {
  injectActionStyles();
  const nav = $q('#headerProfile .navSubTabs');
  if (!nav) {
    return;
  }
  const filename = getUserListFilename();
  nav.appendChild(createAllExportControl(filename.all));
  const interestType = getInterestTypeByUrl(location.href);
  if (interestType) {
    nav.appendChild(createExportControl(filename.current, interestType));
  }
  nav.appendChild(createImportControl());
}

function addIndexPageControls() {
  injectActionStyles();
  const catList = $q('#indexCatBox .cat');
  if (catList) {
    catList.appendChild(createIndexExportControl());
    return;
  }
  const header = $q('#header');
  if (!header) {
    return;
  }
  header.appendChild(createInlineExportControl(getPageTitleFilename()));
}

if (location.href.match(/index\/\d+/)) {
  addIndexPageControls();
}

if (location.href.match(/\w+\/list\//)) {
  addListPageControls();
}
