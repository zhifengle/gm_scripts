export type ReplyRecord = {
  _key: string;
  siteKey: string;
  threadKey: string;
  authorKey: string;
  threadId: string;
  threadTitle: string;
  forumName: string;
  page: string;
  floor: string;
  pid: string;
  uid: string;
  authorName: string;
  postTime: string;
  replyContent: string;
  quoteContent: string;
  replyFullText: string;
  sourceUrl: string;
  collectedAt: string;
  [key: string]: string | undefined;
};

export type LegacyReplyRecordFields = {
  '作者name'?: string;
  '发帖时间'?: string;
  '回复内容'?: string;
  '引用内容'?: string;
  '回复全文'?: string;
  '来源URL'?: string;
  '采集时间'?: string;
};

export type ReplyRecordInput = Partial<ReplyRecord> & LegacyReplyRecordFields;

export type ThreadInfo = Pick<
  ReplyRecord,
  'threadId' | 'threadTitle' | 'forumName' | 'page'
>;

export type ExtractorConfig = {
  idPrefix: string;
  storageName: string;
  panelStateKey: string;
  runtimeKey: string;
  statusAnimationName: string;
  displayName: string;
  compactLabel: string;
  compactWidth: string;
  excelSheetName: string;
  filenamePrefix: string;
};

export type PanelState = 'expanded' | 'collapsed' | 'closed';
export type StatusState = 'idle' | 'saving' | 'saved' | 'skipped' | 'error';
export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ExportScope = 'current' | 'author' | 'all';
export type PanelAction =
  | 'toggle'
  | 'close'
  | 'save'
  | 'export-current-xlsx'
  | 'export-author-xlsx'
  | 'clear-current'
  | 'clear-author'
  | 'threads'
  | 'authors'
  | 'search'
  | 'export-selected'
  | 'copy-all-csv'
  | 'clear-all';

export type ThreadMeta = {
  siteKey: string;
  threadKey: string;
  threadId: string;
  threadTitle: string;
  forumName: string;
  sourceUrl: string;
  firstCollectedAt: string;
  lastCollectedAt: string;
  pageCountCollected: number;
  pagesCollected: string[];
  lastPage: string;
  replyCount: number;
  authorCount: number;
};

export type AuthorStats = {
  siteKey: string;
  authorKey: string;
  uid: string;
  authorName: string;
  replyCount: number;
  threadCount: number;
  threadIds: string[];
  threadKeys: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SaveRecordsResult = {
  added: number;
  currentThreadTotal: number;
  total: number;
};

export type ClearAuthorRecordsResult = {
  deleted: number;
  threadCount: number;
  authors: AuthorStats[];
};

export type ReplyExtractorAdapter = {
  isThreadDetailPage: () => boolean;
  getThreadInfo: () => ThreadInfo;
  extractReplies: () => ReplyRecord[];
  isRelevantMutation: (
    mutation: MutationRecord,
    isExtractorUiNode: (node: Node) => boolean
  ) => boolean;
};

export type ReplyExtractorRuntime = ReplyExtractorAdapter & {
  config: ExtractorConfig;
};

export type PanelController = {
  element: HTMLElement;
  getState: () => PanelState;
  applyState: (state: PanelState) => void;
  setStatus: (text: string, state?: StatusState) => void;
  showTextModal: (title: string, content: string) => void;
  dispose: () => void;
};
