import { SEARCH_RESULT } from '../contants';
import { AllSubject, SearchResult } from '../interface/subject';
import { InterestType, InterestTypeId, MsgResponse } from '../interface/types';
import { sleep } from '../utils/async/sleep';
import { isEqualDate } from '../utils/utils';

/**
 * 过滤搜索结果： 通过名称以及日期
 * @param items
 * @param subjectInfo
 * @param opts
 */
export function filterResults(
  items: SearchResult[],
  subjectInfo: AllSubject,
  opts: { releaseDate?: boolean } & Record<string, any> = {},
  isSearch: boolean = true
) {
  if (!items) return;
  // 只有一个结果时直接返回, 不再比较日期
  if (items.length === 1 && isSearch) {
    return items[0];
  }
  // 使用发行日期过滤
  if (subjectInfo.releaseDate && opts.releaseDate) {
    const obj = items.find((item) =>
      isEqualDate(item.releaseDate, subjectInfo.releaseDate)
    );
    if (obj) {
      return obj;
    }
  }
  var results = new Fuse(items, Object.assign({}, opts)).search(
    subjectInfo.name
  );
  // 去掉括号包裹的，再次模糊查询
  if (!results.length && /<|＜|\(|（/.test(subjectInfo.name)) {
    results = new Fuse(items, Object.assign({}, opts)).search(
      subjectInfo.name
        .replace(/＜.+＞/g, '')
        .replace(/<.+>/g, '')
        .replace(/（.+）/g, '')
        .replace(/\(.+\)/g, '')
    );
  }
  if (!results.length) {
    return;
  }
  // 有参考的发布时间
  if (subjectInfo.releaseDate) {
    const sameYearResults = [];
    const sameMonthResults = [];
    for (const obj of results) {
      const result = obj.item;
      if (result.releaseDate) {
        // 只有年的时候
        if (result.releaseDate.length === 4) {
          if (result.releaseDate === subjectInfo.releaseDate.slice(0, 4)) {
            return result;
          }
        } else {
          if (isEqualDate(result.releaseDate, subjectInfo.releaseDate)) {
            return result;
          }
        }
        if (isEqualDate(result.releaseDate, subjectInfo.releaseDate, 'm')) {
          sameMonthResults.push(obj);
          continue;
        }
        if (isEqualDate(result.releaseDate, subjectInfo.releaseDate, 'y')) {
          sameYearResults.push(obj);
        }
      }
    }
    if (sameMonthResults.length) {
      return sameMonthResults[0].item;
    }
    if (sameYearResults.length) {
      return sameYearResults[0].item;
    }
  }
  // 比较名称
  const nameRe = new RegExp(subjectInfo.name.trim());
  for (const item of results) {
    const result = item.item;
    if (
      nameRe.test(result.name) ||
      nameRe.test(result.greyName) ||
      nameRe.test(result.rawName)
    ) {
      return result;
    }
  }
}

export const typeIdDict: {
  [key in InterestType]: { name: string; id: InterestTypeId };
} = {
  dropped: {
    name: '抛弃',
    id: '5',
  },
  on_hold: {
    name: '搁置',
    id: '4',
  },
  do: {
    name: '在看',
    id: '3',
  },
  collect: {
    name: '看过',
    id: '2',
  },
  wish: {
    name: '想看',
    id: '1',
  },
};
export function findInterestStatusById(id: InterestTypeId): {
  key: InterestType;
  id: InterestTypeId;
  name: string;
} {
  for (let key in typeIdDict) {
    const obj = typeIdDict[key as InterestType];
    if (obj.id === id) {
      return {
        key: key as InterestType,
        ...obj,
      };
    }
  }
}

export async function getSearchResultByGM(): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const listenId = window.gm_val_listen_id;
    if (listenId) {
      GM_removeValueChangeListener(listenId);
    }
    window.gm_val_listen_id = GM_addValueChangeListener(
      // const listenId = GM_addValueChangeListener(
      SEARCH_RESULT,
      (n, oldValue, newValue: MsgResponse) => {
        console.log('enter promise');
        const now = +new Date();
        if (
          newValue.type === SEARCH_RESULT &&
          newValue.timestamp &&
          newValue.timestamp < now
        ) {
          // GM_removeValueChangeListener(listenId);
          resolve(newValue.data);
        }
        reject('mismatch timestamp');
      }
    );
  });
}

export async function setSearchResultByGM(data: any) {
  const res: MsgResponse = {
    type: SEARCH_RESULT,
    timestamp: +new Date(),
    data,
  };
  GM_setValue(SEARCH_RESULT, res);
}

/**
 * search data by queryNames
 * @param subjectInfo SearchResult
 * @param searchFn
 * @returns Promise<SearchResult>
 */
export async function searchDataByNames(
  subjectInfo: SearchResult,
  searchFn: (info: SearchResult) => Promise<SearchResult>
): Promise<SearchResult> {
  let queryList: string[] = [];
  if (subjectInfo.alias) {
    queryList = subjectInfo.alias;
  }
  for (const s of queryList) {
    const res = await searchFn({
      ...subjectInfo,
      name: s,
      alias: undefined,
    });
    if (res) {
      return res;
    }
    await sleep(200);
  }
}
