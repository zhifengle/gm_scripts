import { SearchResult, Subject } from '../interface/subject';
import { randomSleep } from '../utils/async/sleep';
import { fetchJson, fetchText } from '../utils/fetchData';

export const favicon = 'https://cdn.myanimelist.net/images/favicon.ico';

export async function searchAnimeData(
  subjectInfo: Subject
): Promise<SearchResult> {
  const url = `https://myanimelist.net/search/prefix.json?type=anime&keyword=${encodeURIComponent(
    subjectInfo.name
  )}&v=1`;
  console.info('myanimelist search URL: ', url);
  const info = await fetchJson(url);
  let startDate = null;
  let items = info.categories[0].items;
  let pageUrl = '';
  let name = '';
  if (subjectInfo.releaseDate) {
    startDate = new Date(subjectInfo.releaseDate);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let aired = null;
      if (item.payload.aired.match('to')) {
        aired = new Date(item.payload.aired.split('to')[0]);
      } else {
        aired = new Date(item.payload.aired);
      }
      // 选择第一个匹配日期的
      if (
        startDate.getFullYear() === aired.getFullYear() &&
        startDate.getMonth() === aired.getMonth()
      ) {
        pageUrl = item.url;
        name = item.name;
        break;
      }
    }
  } else if (items && items[0]) {
    name = items[0].name;
    pageUrl = items[0].url;
  }
  if (!pageUrl) {
    throw new Error('No match results');
  }
  let result: SearchResult = {
    name,
    url: pageUrl,
  };
  await randomSleep(200, 100);
  const content = await fetchText(pageUrl);
  const $doc = new DOMParser().parseFromString(content, 'text/html');
  let $score = $doc.querySelector('.fl-l.score') as HTMLElement;
  if ($score) {
    //siteScoreInfo.averageScore = parseFloat($score.textContent.trim()).toFixed(1)
    result.score = $score.textContent.trim();
    if (result.score === 'N/A') {
      result.score = 0;
    }
    if ($score.dataset.user) {
      result.count = $score.dataset.user.replace(/users|,/g, '').trim();
    } else {
      throw new Error('Invalid score info');
    }
  } else {
    throw new Error('Invalid results');
  }
  console.info('myanimelist search result: ', result);
  return result;
}
