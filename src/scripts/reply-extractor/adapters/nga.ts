import { ReplyExtractorAdapter, ReplyRecord } from '../types';
import {
  finalizeRecord,
  getCanonicalOrCurrentUrl,
  getUrlParam,
  normalizeText,
  textFromNode,
} from '../utils';

type AuthorInfo = {
  authorName: string;
  uid: string;
};

function isElement(node: Node | null): node is Element {
  return node?.nodeType === Node.ELEMENT_NODE;
}

function hasNgaReplyDom(): boolean {
  const postboxes = Array.from(document.querySelectorAll<HTMLTableElement>('table.postbox'));
  if (
    postboxes.some((container) => {
      const hasDate = container.querySelector('[id^="postdate"], .postdatec, .postinfot');
      const hasContent =
        Array.from(container.querySelectorAll<HTMLElement>('[id^="postcontent"]')).some((el) => /^postcontent\d+$/.test(el.id)) ||
        container.querySelector('.postcontent.ubbcode, .postcontent');
      return hasDate && hasContent;
    })
  ) {
    return true;
  }

  const contentEl =
    Array.from(document.querySelectorAll<HTMLElement>('[id^="postcontent"]')).find((el) => /^postcontent\d+$/.test(el.id)) ||
    document.querySelector('.postcontent.ubbcode, .postcontent');
  const dateEl = document.querySelector('[id^="postdate"], .postdatec, .postinfot');
  return Boolean(contentEl && dateEl);
}

function isThreadDetailPage(): boolean {
  return Boolean(getUrlParam('tid') && hasNgaReplyDom());
}

function getPageNumber(): string {
  const pageFromUrl = getUrlParam('page');
  if (pageFromUrl) return pageFromUrl;

  const currentPage = document.querySelector('[name="pageball"] .invert, #pagebbtm .invert, #pagebtop .invert');
  return normalizeText(currentPage?.textContent || '').replace(/[^\d]/g, '');
}

function getThreadInfo() {
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav a'));
  const forumLink = navLinks.find((a) => /thread\.php\?fid=/.test(a.href));
  const threadLink = navLinks.find((a) => /read\.php\?tid=/.test(a.href) && !/authorid=/.test(a.href));

  return {
    threadId: getUrlParam('tid'),
    threadTitle: normalizeText(threadLink?.textContent || document.title),
    forumName: normalizeText(forumLink?.textContent || ''),
    page: getPageNumber(),
  };
}

function getContentNode(container: Element): Element | null {
  return (
    Array.from(container.querySelectorAll<HTMLElement>('[id^="postcontent"]')).find((el) => /^postcontent\d+$/.test(el.id)) ||
    container.querySelector('.postcontent.ubbcode, .postcontent') ||
    null
  );
}

function getFloor(container: Element): string {
  const floorLink = container.querySelector('.posterinfo a[name^="l"]') || container.querySelector('a.vertmod[href*="#pid"]') || container.querySelector('a[name^="l"]');
  return normalizeText(floorLink?.textContent || '').replace(/[^\d]/g, '');
}

function getPid(container: Element): string {
  const anchor = container.querySelector<HTMLAnchorElement>('a[id^="pid"][id$="Anchor"]');
  const idMatch = anchor?.id?.match(/^pid(\d+)Anchor$/);
  if (idMatch) return idMatch[1];

  const href = container.querySelector('a[href*="#pid"][href*="Anchor"]')?.getAttribute('href') || '';
  return href.match(/#pid(\d+)Anchor/)?.[1] || '';
}

function getAuthorInfo(container: Element): AuthorInfo {
  const authorEl =
    Array.from(container.querySelectorAll<HTMLElement>('[id^="postauthor"]')).find((el) => /^postauthor\d+$/.test(el.id)) ||
    container.querySelector<HTMLElement>('.author, .userlink');
  const uidEl = container.querySelector('[name="uid"]') || container.querySelector('a[href*="uid="], a[href*="uid%3D"]');
  const author = normalizeText(authorEl?.textContent || '');
  let uid = normalizeText(uidEl?.textContent || '');

  if (!/^\d+$/.test(uid)) {
    const href = authorEl?.getAttribute('href') || uidEl?.getAttribute('href') || '';
    uid = href.match(/[?&]uid=(\d+)/)?.[1] || href.match(/uid%3D(\d+)/i)?.[1] || '';
  }

  return {
    authorName: author,
    uid,
  };
}

function getQuoteText(contentEl: Element): string {
  return Array.from(contentEl.querySelectorAll('.quote'))
    .map((quote) => textFromNode(quote))
    .filter(Boolean)
    .join('\n---\n');
}

function extractFromNgaDom(): ReplyRecord[] {
  const containers = Array.from(document.querySelectorAll<HTMLTableElement>('table.postbox'));
  const threadInfo = getThreadInfo();
  const collectedAt = new Date().toISOString();
  const sourceUrl = getCanonicalOrCurrentUrl();
  const rows: ReplyRecord[] = [];
  const seen = new Set<string>();

  for (const container of containers) {
    const dateEl = container.querySelector('[id^="postdate"], .postdatec, .postinfot');
    const contentEl = getContentNode(container);
    if (!dateEl || !contentEl) continue;

    const postTime = normalizeText(dateEl.textContent);
    const replyContent = textFromNode(contentEl, { removeQuotes: true });
    const quoteContent = getQuoteText(contentEl);
    const fullContent = textFromNode(contentEl);
    if (!postTime || !fullContent) continue;

    const row = finalizeRecord({
      siteKey: 'nga',
      ...threadInfo,
      floor: getFloor(container),
      pid: getPid(container),
      ...getAuthorInfo(container),
      postTime,
      replyContent: replyContent || fullContent,
      quoteContent,
      replyFullText: fullContent,
      sourceUrl,
      collectedAt,
    });

    if (seen.has(row._key)) continue;
    seen.add(row._key);
    rows.push(row);
  }

  return rows;
}

function extractReplies(): ReplyRecord[] {
  const rows = extractFromNgaDom();
  if (rows.length) return rows;

  const timeSelector = ['[id^="postdate"]', '.postdatec', '.post-time', '.post_time', '.postdate', 'time'].join(',');
  const contentSelector = ['[id^="postcontent"]', '.postcontent', '.reply-content', '.reply_content', '.content', 'article'].join(',');
  const threadInfo = getThreadInfo();
  const sourceUrl = getCanonicalOrCurrentUrl();
  const collectedAt = new Date().toISOString();
  const result: ReplyRecord[] = [];
  const seen = new Set<string>();

  for (const timeNode of Array.from(document.querySelectorAll(timeSelector))) {
    const container = timeNode.closest('table, article, li, .post, .reply, .postrow') || timeNode.parentElement;
    if (!container) continue;
    const contentNode = container?.querySelector(contentSelector);
    const postTime = normalizeText(timeNode.textContent || timeNode.getAttribute('datetime'));
    const fullContent = contentNode ? textFromNode(contentNode) : '';
    if (!postTime || !fullContent) continue;

    const row = finalizeRecord({
      siteKey: 'nga',
      ...threadInfo,
      floor: getFloor(container),
      pid: getPid(container),
      ...getAuthorInfo(container),
      postTime,
      replyContent: contentNode ? textFromNode(contentNode, { removeQuotes: true }) || fullContent : fullContent,
      quoteContent: contentNode ? getQuoteText(contentNode) : '',
      replyFullText: fullContent,
      sourceUrl,
      collectedAt,
    });

    if (seen.has(row._key)) continue;
    seen.add(row._key);
    result.push(row);
  }

  return result;
}

function isRelevantMutation(mutation: MutationRecord, isExtractorUiNode: (node: Node) => boolean): boolean {
  if (isExtractorUiNode(mutation.target)) return false;
  const relevantSelector = 'table.postbox, #m_posts, #m_posts_c, [id^="postcontent"], [id^="postdate"], .postcontent';
  if (mutation.type === 'attributes') return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));

  const nodes = [...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])].filter((node) => node.nodeType === Node.ELEMENT_NODE);
  if (!nodes.length) return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));

  return nodes.some((node) => {
    if (isExtractorUiNode(node)) return false;
    if (!isElement(node)) return false;
    return Boolean(node.matches?.(relevantSelector) || node.querySelector?.('table.postbox, [id^="postcontent"], [id^="postdate"], .postcontent'));
  });
}

export const ngaReplyExtractorAdapter: ReplyExtractorAdapter = {
  isThreadDetailPage,
  getThreadInfo,
  extractReplies,
  isRelevantMutation,
};
