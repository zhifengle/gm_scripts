import { favicon as anidbFavicon } from '../../sites/anidb';

export function getFavicon(site: string) {
  let favicon: any = '';
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
