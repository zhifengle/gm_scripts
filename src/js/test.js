const search = require('../utils/searchBangumiSubject');

const subjectInfo = {
    subjectName: '夜蝶の未来',
    startDate: '2017/6/23'
}

search.fetchBangumiDataBySearch(subjectInfo)
  .then((i) => {
    if (i) return i;
    return search.fetchBangumiDataBySearch(subjectInfo)
  })
  .then((i) => {
    console.log(i);
  })
  .catch((r) => {
    console.log(r);
  })

/*
 *search.fetchBangumiDataByDate(subjectInfo, null, 'game')
 *  .then((i) => {
 *    console.log(i);
 *  })
 */
