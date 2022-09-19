import { SearchResult, Subject } from '../../interface/subject';
import { Selector } from '../../interface/wiki';

export type PageConfig = {
  name: string;
  href: string | string[];
  favicon?: string;
  controlSelector: Selector[];
  pageSelector: Selector[];
  getSearchResult: (subjectInfo: Subject) => Promise<SearchResult>;
  getScoreInfo: () => SearchResult;
  // 插入评分信息的 DOM
  insertScoreInfo: (name: string, info: SearchResult) => void;
};
