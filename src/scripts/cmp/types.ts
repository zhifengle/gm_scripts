import { SearchResult, Subject } from '../../interface/subject';
import { Selector } from '../../interface/wiki';

export type PageConfig = {
  name: string;
  href: string | string[];
  favicon?: string;
  expiration?: number;
  searchApi?: string;
  getSubjectId: (url: string) => string;
  genSubjectUrl: (id: string) => string;
  controlSelector: Selector[];
  pageSelector: Selector[];
  getSearchResult: (subjectInfo: Subject) => Promise<SearchResult>;
  getScoreInfo: () => SearchResult;
  // 插入评分信息的 DOM
  insertScoreInfo: (page: PageConfig, info: SearchResult) => void;
};
