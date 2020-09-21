import { SearchResult, Subject } from './subject';

export type IFuncPromise = (...args: any) => Promise<any>;
export type ITiming = 'beforeCreate' | 'afterCreate' | 'afterGetWikiData';
export type SubjectType = 'book' | 'movie' | 'music';

export type InterestType = 'collect' | 'do' | 'wish' | 'on_hold' | 'dropped';

// 想看 看过 在看 搁置 抛弃
export type InterestTypeId = '1' | '2' | '3' | '4' | '5';
export type IInterestData = {
  interest: InterestTypeId;
  tags?: string;
  comment?: string;
  rating?: string;
  // 1 为自己可见
  privacy?: '1' | '0';
};
export interface SubjectItem {
  name: string;
  url: string;
  rawInfos: string;
  rank?: string;
  releaseDate?: string;
  greyName?: string;
  cover?: string;
  rateInfo?: {
    score?: number | string;
    count?: number | string;
  };
  collectInfo?: {
    date: string;
    score?: string;
    tags?: string;
    comment?: string;
  };
}

export interface SiteUtils {
  name: string;
  contanerSelector: string;
  getUserId: (str: string) => string;
  getSubjectId: (str: string) => string;
  getAllPageInfo: (
    userId: string,
    type: SubjectType,
    interestType: InterestType
  ) => Promise<SubjectItem[]>;
  updateInterest: (
    subjectId: string,
    insterestData: IInterestData
  ) => Promise<void>;
  checkSubjectExist: (subject: Subject, type?: string) => Promise<SearchResult>;
}

export interface MsgResponse {
  type: string;
  timestamp?: number;
  data: any;
}
