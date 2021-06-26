import { SEARCH_RESULT } from './contants';
import { MsgResponse } from './interface/types';
import { checkAnimeSubjectExist, sendSearchResults } from './sites/douban';

async function main() {
  const r = await checkAnimeSubjectExist(
    {
      name: '战斗员派遣中',
      releaseDate: '2021-04-04',
    },
    'subject_search'
  );

  console.log('rrrrrrrrrrrr: ', r);
}

if (location.href.includes('https://search.douban.com/movie/subject_search')) {
  sendSearchResults();
}
if (location.href.includes('https://movie.douban.com/subject')) {
  main();
}
