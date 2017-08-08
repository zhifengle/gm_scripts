const gmFetch = require('./gmFetch');
const filterResults = require('./filterResults')

let G_BANGUMI_RETRY_COUNT = 0;

function dealDate(dateStr) {
  return dateStr.replace(/年|月|日/g, '/').replace(/\/$/, '');
}

function dealRawDOM(info) {
  var rawInfoList = [];
  let $doc = (new DOMParser()).parseFromString(info, "text/html");
  let items = $doc.querySelectorAll('#browserItemList>li>div.inner');
  // get number of page
  let numOfPage = null;
  let pList = $doc.querySelectorAll('.page_inner>.p');
  if (pList && pList.length) {
    numOfPage = parseInt(pList[pList.length - 1].href.split('?page=')[1]);
  }
  if (items && items.length) {
    for (var item of items) {
      let $subjectTitle = item.querySelector('h3>a.l');
      let itemSubject = {
        subjectTitle: $subjectTitle.textContent.trim(),
        subjectURL: 'https://bgm.tv' + $subjectTitle.getAttribute('href'),
        subjectGreyTitle: item.querySelector('h3>.grey') ?
          item.querySelector('h3>.grey').textContent.trim() : '',
      };
      let matchDate = item.querySelector('.info').textContent.match(/\d{4}[\-\/\年]\d{1,2}[\-\/\月]\d{1,2}/);
      if (matchDate) {
        itemSubject.startDate = dealDate(matchDate[0]);
      }
      let $rateInfo = item.querySelector('.rateInfo');
      if ($rateInfo) {
        if ($rateInfo.querySelector('.fade')) {
          itemSubject.averageScore = $rateInfo.querySelector('.fade').textContent;
          itemSubject.ratingsCount = $rateInfo.querySelector('.tip_j').textContent.replace(/[^0-9]/g, '');
        } else {
          itemSubject.averageScore = '0';
          itemSubject.ratingsCount = '少于10';
        }
      } else {
        itemSubject.averageScore = '0';
        itemSubject.ratingsCount = '0';
      }
      rawInfoList.push(itemSubject);
    }
  } else {
    return;
  }
  return [rawInfoList, numOfPage];
}

function fetchBangumiDataBySearch(subjectInfo) {
  if (!subjectInfo || !subjectInfo.startDate) return;
  const startDate = new Date(subjectInfo.startDate);
  const url = `https://bgm.tv/subject_search/${encodeURIComponent(subjectInfo.subjectName)}?cat=4`;
  gmFetch(url).then((info) => {
    [rawInfoList, numOfPage] = dealRawDOM(info);
    let results = filterResults(rawInfoList, subjectInfo.subjectName, {
      keys: ['subjectTitle', 'subjectGreyTitle'],
      startDate
    })
    if (!results.length) {
      return Promise.resolve().then(() => {
        return fetchBangumiDataByDate(subjectInfo);
      })
    }
    return results[0];
  })
}

function fetchBangumiDataByDate(subjectInfo, pageNumber, type) {
  if (!subjectInfo || !subjectInfo.startDate) return;
  const startDate = new Date(subjectInfo.startDate);
  const SUBJECT_TYPE = type || 'game';
  const sort = startDate.getDate() > 15 ? 'sort=date' : '';
  const page = pageNumber ? `page=${pageNumber}` : '';
  let query = '';
  if (sort && page) {
    query = '?' + sort + '&' + page;
  } else if (sort) {
    query = '?' + sort;
  } else if (page) {
    query = '?' + page;
  }
  const url = `https://bgm.tv/${SUBJECT_TYPE}/browser/airtime/${startDate.getFullYear()}-${startDate.getMonth() + 1}${query}`;

  gmFetch(url).then((info) => {
    [rawInfoList, numOfPage] = dealRawDOM(info);
    let results = filterResults(rawInfoList, subjectInfo.subjectName, {
      keys: ['subjectTitle', 'subjectGreyTitle'],
      startDate
    })
    if (!results.length) {
      if (items.length === 24 && (!pageNumber || pageNumber < numOfPage)) {
        return Promise.resolve().then(() => {
          return fetchBangumiDataByDate(subjectInfo, pageNumber ? pageNumber + 1 : 2);
        })
      }
      throw 'notmatched';
    }
    let finalResults = results[0];
    for (var result of results) {
      if (result.startDate && new Date(result.startDate) - startDate === 0) {
        finalResults = result;
      }
    }
    return finalResults;
  })
}

module.exports = {
  fetchBangumiDataByDate,
  fetchBangumiDataBySearch
}