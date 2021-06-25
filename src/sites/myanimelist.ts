import { AllSubject, SearchResult } from '../interface/subject';
import { fetchJson, fetchText } from '../utils/fetchData';

export async function searchAnimeData(
  subjectInfo: AllSubject
): Promise<SearchResult> {
  const url = `https://myanimelist.net/search/prefix.json?type=anime&keyword=${subjectInfo.name}&v=1`;
  console.info('myanimelist search URL: ', url);
  const info = await fetchJson(url);
  let startDate = null;
  let items = info.categories[0].items;
  let pageUrl = '';
  if (subjectInfo.releaseDate) {
    startDate = new Date(subjectInfo.releaseDate);
    for (var item of items) {
      let aired = null;
      if (item.payload.aired.match('to')) {
        aired = new Date(item.payload.aired.split('to')[0]);
      } else {
        aired = new Date(item.payload.aired);
      }
      if (
        startDate.getFullYear() === aired.getFullYear() &&
        startDate.getDate() === aired.getDate()
      ) {
        pageUrl = item.url;
      }
    }
  } else if (items && items[0]) {
    pageUrl = items[0].url;
  }
  if (!pageUrl) {
    throw new Error('No match results');
  }
  let result: SearchResult = {
    name: '',
    url: pageUrl,
  };
  const content = await fetchText(pageUrl);
  const $doc = new DOMParser().parseFromString(content, 'text/html');
  let $score = $doc.querySelector('.fl-l.score') as HTMLElement;
  if ($score) {
    //siteScoreInfo.averageScore = parseFloat($score.textContent.trim()).toFixed(1)
    result.score = $score.textContent.trim();
    if ($score.dataset.user) {
      result.count = $score.dataset.user.replace(/users|,/g, '').trim();
    } else {
      throw new Error('Invalid score info');
    }
  } else {
    throw new Error('Invalid results');
  }
  return result;
}
