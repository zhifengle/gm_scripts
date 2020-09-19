import { AllSubject } from './interface/subject';
import { filterResults } from './sites/common';
import { convertItemInfo, convertSubjectSearchItem } from './sites/douban';

try {
  const items = document.querySelectorAll('#root .item-root');
  const searchItems = Array.prototype.slice
    .call(items)
    .map(($item: HTMLElement) => convertSubjectSearchItem($item));

  const options = {
    keys: ['name', 'greyName'],
  };
  let searchResult = filterResults(
    searchItems,
    {
      name: '魔王学院的不适任者～史上最强的魔王始祖，转生就读子孙们的学校～',
      kind: 'subject',
      greyName:
        '魔王学院の不適合者 ～史上最強の魔王の始祖、転生して子孫たちの学校へ通う～',
      releaseDate: '2020-07-04',
    } as AllSubject,
    options,
    true
  );

  console.log(searchResult);
} catch (error) {}
