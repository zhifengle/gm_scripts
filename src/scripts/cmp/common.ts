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
