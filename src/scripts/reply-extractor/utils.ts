import { ReplyRecord } from './types';

export function normalizeText(text: unknown): string {
  return String(text || '')
    .replace(/\u200b/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function textFromNode(
  node: Node,
  options: {
    removeQuotes?: boolean;
    extraRemoveSelector?: string;
    imagePlaceholder?: (img: HTMLImageElement) => string;
  } = {}
): string {
  const clone = node.cloneNode(true) as Element;
  const removeSelector = [
    'script',
    'style',
    'noscript',
    'iframe',
    'object',
    '.sf-hidden',
    options.extraRemoveSelector,
  ]
    .filter(Boolean)
    .join(',');

  clone.querySelectorAll(removeSelector).forEach((el) => el.remove());
  clone
    .querySelectorAll('[style*="display:none"], [style*="display: none"]')
    .forEach((el) => el.remove());
  if (options.removeQuotes) clone.querySelectorAll('.quote').forEach((el) => el.remove());

  clone.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode('\n')));
  clone.querySelectorAll('img').forEach((img) => {
    const alt = normalizeText(img.getAttribute('alt') || img.getAttribute('title') || '');
    const placeholder = options.imagePlaceholder?.(img) || '[图片]';
    img.replaceWith(document.createTextNode(alt ? `[${alt}]` : placeholder));
  });
  clone.querySelectorAll('svg').forEach((svg) => svg.remove());

  return normalizeText(clone.textContent);
}

export function getCanonicalOrCurrentUrl(): string {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.href;
}

export function getUrlParam(name: string): string {
  const urls = [location.href, getCanonicalOrCurrentUrl()];
  for (const href of urls) {
    try {
      const value = new URL(href, location.href).searchParams.get(name);
      if (value) return value;
    } catch (_) {
      // Ignore malformed saved-page URLs.
    }
  }
  return '';
}

export function hashString(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function getAuthorKey(row: Partial<ReplyRecord>): string {
  const siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '') || 'unknown-site';
  if (row.uid) return `${siteKey}:uid:${row.uid}`;
  if (row['作者name']) return `${siteKey}:name:${row['作者name']}`;
  return `${siteKey}:unknown`;
}

export function buildRecordKey(row: Partial<ReplyRecord>): string {
  const threadKey = row.threadKey || buildThreadKey(row);
  if (threadKey && row.pid) return `pid:${threadKey}:${row.pid}`;
  if (threadKey && row.floor) return `floor:${threadKey}:${row.floor}`;
  const content = row['回复全文'] || row['回复内容'] || '';
  const author = row.uid || row['作者name'] || 'unknown-author';
  const postTime = row['发帖时间'] || 'unknown-time';
  const fingerprint = [threadKey || row.threadId || '', author, postTime, content].join('\n');
  return [
    'fallback',
    threadKey || row.threadId || 'unknown',
    hashString(fingerprint),
    hashString(author),
    hashString(postTime),
    content.length,
  ].join(':');
}

export function inferSiteKeyFromUrl(url: string): string {
  try {
    const host = new URL(url, location.href).host.toLowerCase();
    if (host.includes('nga.cn') || host.includes('nga.178.com')) return 'nga';
    if (host.includes('stage1st.com')) return 's1';
  } catch (_) {
    // Ignore malformed saved-page URLs.
  }
  return '';
}

export function buildThreadKey(row: Partial<ReplyRecord>): string {
  const siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '');
  if (!siteKey || !row.threadId) return '';
  return `${siteKey}:${row.threadId}`;
}

export function finalizeRecord(row: Partial<ReplyRecord>): ReplyRecord {
  row.siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '');
  row.threadKey = row.threadKey || buildThreadKey(row);
  row.authorKey = getAuthorKey(row);
  row._key = buildRecordKey(row);
  return row as ReplyRecord;
}
