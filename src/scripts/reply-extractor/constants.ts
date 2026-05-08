export const PANEL_STATES = ['expanded', 'collapsed', 'closed'] as const;
export const AUTO_SAVE_DEBOUNCE_MS = 900;
export const PAGE_WATCH_INTERVAL_MS = 700;
export const STATUS_RESET_MS = 1800;
export const DB_VERSION = 4;

export const STORES = {
  replies: 'reply_records',
  threads: 'threads',
  authors: 'authors',
} as const;

export const EXPORT_HEADERS = [
  'threadId',
  'threadTitle',
  'forumName',
  'page',
  'floor',
  'pid',
  '作者name',
  'uid',
  '发帖时间',
  '回复内容',
  '引用内容',
  '回复全文',
  '来源URL',
  '采集时间',
] as const;
