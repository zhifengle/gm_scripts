import { favicon as anidbFavicon } from '../../sites/anidb';

export const BLANK_LINK = 'target="_blank" rel="noopener noreferrer nofollow"';
export const NO_MATCH_DATA = '点击搜索';

export function getFavicon(site: string) {
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
  return favicon;
}

export function genScoreRowStr(info: {
  favicon: string;
  searchUrl: string;
  score: string;
  url: string;
  count: string;
}): string {
  return `
<div class="e-userjs-score-compare-row" style="display:flex;align-items:center;margin-bottom:10px;">
<a target="_blank" rel="noopener noreferrer nofollow"
  style="margin-right:1em;"  title="点击搜索" href="${info.searchUrl}">
<img style="width:16px;" src="${info.favicon}"/>
</a>
<strong style="margin-right:1em;">${info.score}</strong>
<a href="${info.url}"
  target="_blank" rel="noopener noreferrer nofollow">
  ${info.count}
</a>
</div>
`;
}
