import { SearchResult } from '../../interface/subject';
import { Selector } from '../../interface/wiki';
import { favicon as anidbFavicon } from '../../sites/anidb';
import { findElement, htmlToElement } from '../../utils/domUtils';
import { normalizeQuery } from '../../utils/utils';
import { PageConfig } from './types';

export const BLANK_LINK = 'target="_blank" rel="noopener noreferrer nofollow"';
export const NO_MATCH_DATA = '点击搜索';
export const SCORE_ROW_WRAP_CLS = 'e-userjs-score-compare';
const SCORE_ROW_CLS = 'e-userjs-score-compare-row';
const SEARCH_ICON_CLS = 'e-userjs-score-search-icon';

export function getFavicon(page: PageConfig) {
  let site = page.name;
  let favicon: any = '';
  site = site.split('-')[0];
  const dict: Record<string, string> = {
    anidb: anidbFavicon,
  };
  if (dict[site]) {
    return dict[site];
  }
  try {
    favicon = GM_getResourceURL(`${site}_favicon`);
  } catch (error) {}
  if (!favicon) {
    favicon = page.favicon || '';
  }
  return favicon;
}

type ScoreRowInfo = {
  favicon: string;
  searchUrl: string;
  score: string;
  url: string;
  count: string;
  name: string;
};

export const DOM_STYLE = `
.${SCORE_ROW_WRAP_CLS} { margin-bottom:-10px; }
.${SCORE_ROW_CLS} { display:flex;align-items:center;margin-bottom:10px; }
.${SEARCH_ICON_CLS} { margin-right:1em;}
.${SEARCH_ICON_CLS} > img { width:16px; }
`;

function genIconStr(name: string, favicon: string, searchUrl: string): string {
  return `
<a class="${SEARCH_ICON_CLS}" ${BLANK_LINK}
  title="点击在${name}搜索" href="${searchUrl}">
<img alt="${name}" src="${favicon}"/>
</a>
`;
}

export function insertIcons(title: string, pages: PageConfig[]) {
  const $wrap: HTMLElement = document.querySelector(`.${SCORE_ROW_WRAP_CLS}`);
  const $icons = document.createElement('div');
  $icons.classList.add('icons');
  $icons.classList.add(SCORE_ROW_CLS);
  let str = '';
  pages.forEach((page) => {
    const favicon = getFavicon(page);
    const name = page.name.split('-')[0];
    const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(normalizeQuery(title)));
    str += genIconStr(name, favicon, searchUrl);
  });
  $icons.innerHTML = str;
  $wrap.appendChild($icons);
}

export function genScoreRowStr(info: ScoreRowInfo): string {
  return `
<div class="e-userjs-score-compare-row" style="display:flex;align-items:center;margin-bottom:10px;">
<a target="_blank" rel="noopener noreferrer nofollow"
  style="margin-right:1em;"  title="点击在${info.name}搜索" href="${info.searchUrl}">
<img alt="${info.name}" style="width:16px;" src="${info.favicon}"/>
</a>
<strong style="margin-right:1em;">${info.score}</strong>
<a href="${info.url}"
  target="_blank" rel="noopener noreferrer nofollow">
  ${info.count}
</a>
</div>
`;
}

export function genSearchUrl(
  page: PageConfig,
  titleSelector: string,
  name: string
) {
  const $title = document.querySelector(titleSelector);
  if ($title) {
    name = $title.textContent.trim();
  }
  return page.searchApi.replace('{kw}', encodeURIComponent(normalizeQuery(name)));
}

export function genScoreRowInfo(
  title: string,
  page: PageConfig,
  info: SearchResult
): ScoreRowInfo {
  const favicon = getFavicon(page);
  const name = page.name.split('-')[0];
  let score: any = '0.00';
  let count = NO_MATCH_DATA;
  const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(normalizeQuery(title)));
  let url = searchUrl;
  if (info && info.url) {
    if (!isNaN(Number(info.score))) {
      score = Number(info.score || 0).toFixed(2);
    } else {
      score = '0.00';
    }
    count = (info.count || 0) + ' 人评分';
    url = info.url;
  }
  return { favicon, count, score, url, searchUrl, name };
}
export function getScoreWrapDom(
  adjacentSelector: Selector[],
  cls: string = '',
  style: string = ''
): HTMLElement {
  let $div: HTMLElement = document.querySelector('.' + SCORE_ROW_WRAP_CLS);
  if (!$div) {
    $div = document.createElement('div');
    $div.className = `${SCORE_ROW_WRAP_CLS} ${cls}`;
    $div.setAttribute('style', `margin-top:10px;${style}`);
    findElement(adjacentSelector)?.insertAdjacentElement('afterend', $div);
  }
  return $div;
}

export function insertScoreRow(wrapDom: HTMLElement, rowInfo: ScoreRowInfo) {
  wrapDom.appendChild(htmlToElement(genScoreRowStr(rowInfo)));
}

export function insertScoreCommon(
  page: PageConfig,
  info: SearchResult,
  opts: {
    title: string;
    adjacentSelector: Selector[];
    cls?: string;
    style?: string;
  }
) {
  const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls, opts.style);
  const rowInfo = genScoreRowInfo(opts.title, page, info);
  insertScoreRow(wrapDom, rowInfo);
}
