import {
  getSearchResultByGM,
  getSubjectSearchResults,
  setSearchResultByGM,
} from './sites/douban';
import { sleep } from './utils/async/sleep';

if (location.href.match(/search\.douban\.com\/movie\/subject_search/)) {
  if (window.top !== window.self) {
    window.console.log = () => {};
    window.console.info = () => {};
    setSearchResultByGM();
  }
}

if (location.href.match(/movie.douban.com/)) {
  const init = async () => {
    const arr = ['电磁炮', '魔王学院'];
    const logRes = async (str: string) => {
      const res = await getSubjectSearchResults(str, 'message');
      console.log('vvvvvvv: ', res);
    };
    for (let str of arr) {
      console.time(str);
      console.log('query str: ', str);
      await logRes(str);
      console.timeEnd(str);
    }
  };
  init();
}
