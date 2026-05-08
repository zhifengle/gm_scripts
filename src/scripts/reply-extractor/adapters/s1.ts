import { ReplyExtractorAdapter, ReplyRecord } from '../types';
import {
  finalizeRecord,
  getCanonicalOrCurrentUrl,
  getUrlParam,
  normalizeText,
  textFromNode,
} from '../utils';

type AuthorInfo = {
  '作者name': string;
  uid: string;
};

function isElement(node: Node | null): node is Element {
  return node?.nodeType === Node.ELEMENT_NODE;
}

function s1ImagePlaceholder(img: HTMLImageElement): string {
  return img.hasAttribute('smilieid') ? '[表情]' : '[图片]';
}

function hasS1ReplyDom(): boolean {
  return Boolean(
    document.querySelector('#postlist td.t_f[id^="postmessage_"], div[id^="post_"] td.t_f[id^="postmessage_"]') &&
      document.querySelector('[id^="authorposton"]')
  );
}

function isThreadDetailPage(): boolean {
  return Boolean(getThreadIdFromS1Url() && hasS1ReplyDom());
}

function getThreadIdFromS1Url(): string {
  const candidates = [
    location.href,
    getCanonicalOrCurrentUrl(),
    document.querySelector<HTMLAnchorElement>('a[href*="thread-"]')?.href || '',
    document.querySelector<HTMLAnchorElement>('a[href*="tid="], a[href*="ptid="]')?.href || '',
  ];

  for (const href of candidates) {
    const threadMatch = String(href).match(/thread-(\d+)-/);
    if (threadMatch) return threadMatch[1];

    try {
      const url = new URL(href, location.href);
      const id = url.searchParams.get('tid') || url.searchParams.get('ptid');
      if (id) return id;
    } catch (_) {
      // Ignore malformed saved-page URLs.
    }
  }

  return '';
}

function getPageNumber(): string {
  const pageFromUrl = getUrlParam('page');
  if (pageFromUrl) return pageFromUrl;

  const urlPage = [location.href, getCanonicalOrCurrentUrl()]
    .map((href) => String(href).match(/thread-\d+-(\d+)-/)?.[1])
    .find(Boolean);
  if (urlPage) return urlPage;

  const pageInput = document.querySelector<HTMLInputElement>('input[name="custompage"]');
  if (pageInput?.value) return normalizeText(pageInput.value).replace(/[^\d]/g, '');

  const currentPage = document.querySelector('#pgt .pg strong, .pg strong');
  return normalizeText(currentPage?.textContent || '').replace(/[^\d]/g, '');
}

function getThreadInfo() {
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('#pt .z a'));
  const forumLink = navLinks.find((a) => /forum-\d+-\d+\.html|forumdisplay&fid=/.test(a.href));
  const titleNode =
    document.querySelector('#thread_subject') ||
    navLinks.find((a) => /thread-\d+-\d+-\d+\.html/.test(a.href));

  return {
    threadId: getThreadIdFromS1Url(),
    threadTitle: normalizeText(titleNode?.textContent || document.title.replace(/\s+-\s+Stage1st.*$/i, '')),
    forumName: normalizeText(forumLink?.textContent || ''),
    page: getPageNumber(),
  };
}

function getContentNode(container: Element): Element | null {
  return Array.from(container.querySelectorAll<HTMLElement>('td.t_f[id^="postmessage_"]')).find((el) => /^postmessage_\d+$/.test(el.id)) || null;
}

function getFloor(container: Element): string {
  const floorLink = container.querySelector('a[id^="postnum"]') || container.querySelector('.pi strong a[href*="pid="]');
  const floorText = normalizeText(floorLink?.textContent || '');
  if (floorText.includes('楼主')) return '1';
  return floorText.replace(/[^\d]/g, '');
}

function getPid(container: Element): string {
  const containerMatch = container?.id?.match(/^post_(\d+)$/);
  if (containerMatch) return containerMatch[1];

  const tableMatch = container.querySelector('table[id^="pid"]')?.id?.match(/^pid(\d+)$/);
  if (tableMatch) return tableMatch[1];

  const contentMatch = getContentNode(container)?.id?.match(/^postmessage_(\d+)$/);
  if (contentMatch) return contentMatch[1];

  const postNumMatch = container.querySelector('a[id^="postnum"]')?.id?.match(/^postnum(\d+)$/);
  if (postNumMatch) return postNumMatch[1];

  const href = container.querySelector('a[href*="pid="]')?.getAttribute('href') || '';
  return href.match(/[?&]pid=(\d+)/)?.[1] || '';
}

function getAuthorInfo(container: Element): AuthorInfo {
  const authorEl = container.querySelector<HTMLAnchorElement>('.pls .authi a.xw1') || container.querySelector<HTMLAnchorElement>('.pls a[href*="space-uid-"]');
  const uidEl = authorEl || container.querySelector('.pls a[href*="uid="], .pls a[href*="space-uid-"]');
  const author = normalizeText(authorEl?.textContent || '');
  let uid = normalizeText(uidEl?.textContent || '');

  if (!/^\d+$/.test(uid)) {
    const href = authorEl?.getAttribute('href') || uidEl?.getAttribute('href') || '';
    uid =
      href.match(/[?&]uid=(\d+)/)?.[1] ||
      href.match(/uid%3D(\d+)/i)?.[1] ||
      href.match(/space-uid-(\d+)\.html/)?.[1] ||
      '';
  }

  return {
    '作者name': author,
    uid,
  };
}

function getQuoteText(contentEl: Element): string {
  return Array.from(contentEl.querySelectorAll('.quote'))
    .map((quote) => textFromNode(quote, { extraRemoveSelector: '.aimg_tip' }))
    .filter(Boolean)
    .join('\n---\n');
}

function getPostTime(container: Element): string {
  const pid = getPid(container);
  const dateEl = (pid ? container.querySelector(`#authorposton${pid}`) : null) || container.querySelector('[id^="authorposton"]');
  return normalizeText(dateEl?.textContent || '').replace(/^发表于\s*/, '');
}

function getS1PostContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('div[id^="post_"]')).filter((container) => /^post_\d+$/.test(container.id) && getContentNode(container));
}

function extractFromS1Dom(): ReplyRecord[] {
  const containers = getS1PostContainers();
  const threadInfo = getThreadInfo();
  const collectedAt = new Date().toISOString();
  const sourceUrl = getCanonicalOrCurrentUrl();
  const rows: ReplyRecord[] = [];
  const seen = new Set<string>();

  for (const container of containers) {
    const contentEl = getContentNode(container);
    if (!contentEl) continue;

    const postTime = getPostTime(container);
    const replyContent = textFromNode(contentEl, {
      removeQuotes: true,
      extraRemoveSelector: '.aimg_tip',
      imagePlaceholder: s1ImagePlaceholder,
    });
    const quoteContent = getQuoteText(contentEl);
    const fullContent = textFromNode(contentEl, {
      extraRemoveSelector: '.aimg_tip',
      imagePlaceholder: s1ImagePlaceholder,
    });
    if (!postTime || !fullContent) continue;

    const row = finalizeRecord({
      siteKey: 's1',
      ...threadInfo,
      floor: getFloor(container),
      pid: getPid(container),
      ...getAuthorInfo(container),
      '发帖时间': postTime,
      '回复内容': replyContent || fullContent,
      '引用内容': quoteContent,
      '回复全文': fullContent,
      '来源URL': sourceUrl,
      '采集时间': collectedAt,
    });

    if (seen.has(row._key)) continue;
    seen.add(row._key);
    rows.push(row);
  }

  return rows;
}

function extractReplies(): ReplyRecord[] {
  const rows = extractFromS1Dom();
  if (rows.length) return rows;

  const timeSelector = ['[id^="authorposton"]', '.post-time', '.post_time', '.postdate', 'time'].join(',');
  const contentSelector = ['td.t_f[id^="postmessage_"]', '.reply-content', '.reply_content', '.content', 'article'].join(',');
  const threadInfo = getThreadInfo();
  const sourceUrl = getCanonicalOrCurrentUrl();
  const collectedAt = new Date().toISOString();
  const result: ReplyRecord[] = [];
  const seen = new Set<string>();

  for (const timeNode of Array.from(document.querySelectorAll(timeSelector))) {
    const container = timeNode.closest('div[id^="post_"], table, article, li, .post, .reply, .postrow') || timeNode.parentElement;
    if (!container) continue;
    const contentNode = container?.querySelector(contentSelector);
    const postTime = normalizeText(timeNode.textContent || timeNode.getAttribute('datetime')).replace(/^发表于\s*/, '');
    const fullContent = contentNode ? textFromNode(contentNode, { extraRemoveSelector: '.aimg_tip' }) : '';
    if (!postTime || !fullContent) continue;

    const row = finalizeRecord({
      siteKey: 's1',
      ...threadInfo,
      floor: getFloor(container),
      pid: getPid(container),
      ...getAuthorInfo(container),
      '发帖时间': postTime,
      '回复内容': contentNode ? textFromNode(contentNode, { removeQuotes: true, extraRemoveSelector: '.aimg_tip' }) || fullContent : fullContent,
      '引用内容': contentNode ? getQuoteText(contentNode) : '',
      '回复全文': fullContent,
      '来源URL': sourceUrl,
      '采集时间': collectedAt,
    });

    if (seen.has(row._key)) continue;
    seen.add(row._key);
    result.push(row);
  }

  return result;
}

function isRelevantMutation(mutation: MutationRecord, isExtractorUiNode: (node: Node) => boolean): boolean {
  if (isExtractorUiNode(mutation.target)) return false;
  const relevantSelector = '#postlist, div[id^="post_"], td.t_f[id^="postmessage_"], [id^="authorposton"]';
  if (mutation.type === 'attributes') return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));

  const nodes = [...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])].filter((node) => node.nodeType === Node.ELEMENT_NODE);
  if (!nodes.length) return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));

  return nodes.some((node) => {
    if (isExtractorUiNode(node)) return false;
    if (!isElement(node)) return false;
    return Boolean(node.matches?.(relevantSelector) || node.querySelector?.('div[id^="post_"], td.t_f[id^="postmessage_"], [id^="authorposton"]'));
  });
}

export const s1ReplyExtractorAdapter: ReplyExtractorAdapter = {
  isThreadDetailPage,
  getThreadInfo,
  extractReplies,
  isRelevantMutation,
};
