import { AllSubject, SearchResult } from '../interface/subject';
import { InterestType, InterestTypeId } from '../interface/types';
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
  opts: any = {},
  isSearch: boolean = true
) {
  if (!items) return;
  // 只有一个结果时直接返回, 不再比较日期
  if (items.length === 1 && isSearch) {
    const result = items[0];
    return result;
    // if (isEqualDate(result.releaseDate, subjectInfo.releaseDate)) {
    // }
  }
  let results = new Fuse(items, Object.assign({}, opts)).search(
    subjectInfo.name
  );
  if (!results.length) return;
  // 有参考的发布时间
  if (subjectInfo.releaseDate) {
    for (const item of results) {
      const result = item.item;
      if (result.releaseDate) {
        if (isEqualDate(result.releaseDate, subjectInfo.releaseDate)) {
          return result;
        }
      }
    }
  }
  // 比较名称
  const nameRe = new RegExp(subjectInfo.name.trim());
  for (const item of results) {
    const result = item.item;
    if (nameRe.test(result.name) || nameRe.test(result.greyName)) {
      return result;
    }
  }
  return results[0]?.item;
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
export function findInterestStatusById(
  id: InterestTypeId
): { key: InterestType; id: InterestTypeId; name: string } {
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
