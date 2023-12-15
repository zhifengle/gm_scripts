import { SearchSubject } from '../../interface/subject';
import { Selector } from '../../interface/wiki';

export type ScoreMap = Record<string, string>;
export type PageConfig = {
  name: string;
  href: string | string[];
  type?: 'info' | 'search' | 'score';
  favicon?: string;
  expiration?: number;
  searchApi?: string;
  getSubjectId: (url: string) => string;
  genSubjectUrl: (id: string) => string;
  infoSelector: Selector[];
  pageSelector: Selector[];
  getSearchResult: (subjectInfo: SearchSubject) => Promise<SearchSubject>;
  // 可能会解析 html. 所以使用 $q $qa
  getScoreInfo: () => SearchSubject;
  // 插入评分信息的 DOM
  insertScoreInfo: (page: PageConfig, info: SearchSubject) => void;
  controlSelector?: Selector[];
  insertControlDOM?: (
    $el: Element,
    callbacks: Record<string, EventListenerOrEventListenerObject> & {
      clear: EventListenerOrEventListenerObject;
      refresh: EventListenerOrEventListenerObject;
    }
  ) => void;
};
