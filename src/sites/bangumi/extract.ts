import { AllSubject, SearchSubject } from "../../interface/subject";
import { $q, $qa } from "../../utils/domUtils";
import { dealDate, isEqualDate } from "../../utils/utils";

export function getSearchItem($item: HTMLElement): SearchSubject {
  let $subjectTitle = $item.querySelector('h3>a.l');
  let info: SearchSubject = {
    name: $subjectTitle.textContent.trim(),
    // url 没有协议和域名
    url: $subjectTitle.getAttribute('href'),
    greyName: $item.querySelector('h3>.grey') ? $item.querySelector('h3>.grey').textContent.trim() : '',
  };
  let matchDate = $item.querySelector('.info').textContent.match(/\d{4}[\-\/\年]\d{1,2}[\-\/\月]\d{1,2}/);
  if (matchDate) {
    info.releaseDate = dealDate(matchDate[0]);
  }
  let $rateInfo = $item.querySelector('.rateInfo');
  if ($rateInfo) {
    if ($rateInfo.querySelector('.fade')) {
      info.score = $rateInfo.querySelector('.fade').textContent;
      info.count = $rateInfo.querySelector('.tip_j').textContent.replace(/[^0-9]/g, '');
    } else {
      info.score = '0';
      info.count = '少于10';
    }
  } else {
    info.score = '0';
    info.count = '0';
  }
  return info;
}

export function extractInfoList($doc: Document | HTMLElement | Element): SearchSubject[] {
  return [...$doc.querySelectorAll<HTMLElement>('#browserItemList>li')].map(($item) => {
    return getSearchItem($item);
  });
}

export function getTotalPageNum($doc: Document | Element = document) {
  const $multipage = $doc.querySelector('#multipage');
  let totalPageNum = 1;
  const pList = $multipage?.querySelectorAll('.page_inner>.p');
  if (pList && pList.length) {
    let tempNum = parseInt(
      pList[pList.length - 2].getAttribute('href').match(/page=(\d*)/)[1]
    );
    totalPageNum = parseInt(
      pList[pList.length - 1].getAttribute('href').match(/page=(\d*)/)[1]
    );
    totalPageNum = totalPageNum > tempNum ? totalPageNum : tempNum;
  }
  return totalPageNum;
}

// extract info from bangumi api
export function convertInfoToSubject(dataArr: any, bgmHost: string = 'https://bgm.tv'): SearchSubject[] {
  return dataArr.map((item: any) => {
    let greyName = '';
    let name = item.name;
    if (item.name_cn) {
      name = item.name_cn;
      greyName = item.name;
    }
    return {
      name,
      greyName,
      url: `${bgmHost}/subject/${item.id}`,
      releaseDate: item.data,
      score: item.score,
      // count: item.count,
    };
  });
}


export function filterSubjectByNameAndDate(items: SearchSubject[], subjectInfo: AllSubject) {
  const list = items.filter((item) => isEqualDate(item.releaseDate, subjectInfo.releaseDate));
  if (list.length === 0) return;
  let res = list.find((item) => item.name === subjectInfo.name);
  if (res) {
    return res;
  }
  return list.find((item) => item.greyName === subjectInfo.name);
}

export function getSearchSubject() {
  const info: SearchSubject = {
    name: $q('h1>a').textContent.trim(),
    score: $q('.global_score span[property="v:average"')?.textContent ?? 0,
    count: $q('span[property="v:votes"')?.textContent ?? 0,
    url: location.href,
  };
  let infoList = $qa('#infobox>li');
  if (infoList && infoList.length) {
    for (let i = 0, len = infoList.length; i < len; i++) {
      let el = infoList[i];
      if (el.innerHTML.match(/放送开始|上映年度|发行日期/)) {
        info.releaseDate = dealDate(el.textContent.split(':')[1].trim());
      }
      // if (el.innerHTML.match('播放结束')) {
      //   info.endDate = dealDate(el.textContent.split(':')[1].trim());
      // }
    }
  }
  return info;
}
