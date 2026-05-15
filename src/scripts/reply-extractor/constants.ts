export const PANEL_STATES = ['expanded', 'collapsed', 'closed'] as const;
export const AUTO_SAVE_DEBOUNCE_MS = 900;
export const PAGE_WATCH_INTERVAL_MS = 700;
export const STATUS_RESET_MS = 1800;
export const DB_VERSION = 5;

export const STORES = {
  replies: 'reply_records',
  threads: 'threads',
  authors: 'authors',
} as const;

export const REPLY_EXPORT_COLUMNS = [
  { key: 'threadId', label: 'threadId' },
  { key: 'threadTitle', label: 'threadTitle' },
  { key: 'forumName', label: 'forumName' },
  { key: 'page', label: 'page' },
  { key: 'floor', label: 'floor' },
  { key: 'pid', label: 'pid' },
  { key: 'authorName', label: '作者name' },
  { key: 'uid', label: 'uid' },
  { key: 'postTime', label: '发帖时间' },
  { key: 'replyContent', label: '回复内容' },
  { key: 'quoteContent', label: '引用内容' },
  { key: 'replyFullText', label: '回复全文' },
  { key: 'sourceUrl', label: '来源URL' },
  { key: 'collectedAt', label: '采集时间' },
] as const;
