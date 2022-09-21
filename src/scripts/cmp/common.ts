import { SearchResult } from '../../interface/subject';
import { favicon as anidbFavicon } from '../../sites/anidb';
import { PageConfig } from './types';

export const BLANK_LINK = 'target="_blank" rel="noopener noreferrer nofollow"';
export const NO_MATCH_DATA = '点击搜索';
export const SCORE_ROW_WRAP_CLS = 'e-userjs-score-compare';

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
  return page.searchApi.replace('{kw}', encodeURIComponent(name));
}

export function genScoreRowInfo(
  title: string,
  page: PageConfig,
  info: SearchResult
): ScoreRowInfo {
  const favicon = getFavicon(page);
  const name = page.name.split('-')[0];
  let score: any = '0';
  let count = NO_MATCH_DATA;
  const searchUrl = page.searchApi.replace('{kw}', encodeURIComponent(title));
  let url = searchUrl;
  if (info && info.url) {
    score = Number(info.score || 0).toFixed(2);
    count = (info.count || 0) + ' 人评分';
    url = info.url;
  }
  return { favicon, count, score, url, searchUrl, name };
}
export function getScoreWrapDom(
  adjacentSelector: string,
  cls: string,
  style: string
): HTMLElement {
  let sel = '.' + SCORE_ROW_WRAP_CLS;
  if (cls) {
    sel = `.${cls}.${SCORE_ROW_WRAP_CLS}`;
  }
  let $div: HTMLElement = document.querySelector(sel);
  if (!$div) {
    $div = document.createElement('div');
    cls && $div.classList.add(cls);
    $div.classList.add(SCORE_ROW_WRAP_CLS);
    $div.setAttribute('style', `margin-top:10px;${style}`);
    document
      .querySelector(adjacentSelector)
      .insertAdjacentElement('afterend', $div);
  }
  return $div;
}

export function insertScoreCommon(
  page: PageConfig,
  info: SearchResult,
  opts: {
    title: string;
    adjacentSelector: string;
    cls: string;
    style: string;
  }
) {
  const wrapDom = getScoreWrapDom(opts.adjacentSelector, opts.cls, opts.style);
  const rowInfo = genScoreRowInfo(opts.title, page, info);
  wrapDom.innerHTML += genScoreRowStr(rowInfo);
}
