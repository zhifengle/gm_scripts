import { AuthorStats, ReplyRecord, ThreadMeta } from './types';

export function formatThreads(threads: ThreadMeta[]) {
  if (!threads.length) return '还没有采集帖子。';
  return threads
    .map((thread, index) =>
      [
        `${index + 1}. ${thread.threadTitle || '(无标题)'}`,
        `   ID: ${thread.threadId}`,
        `   版块: ${thread.forumName || '-'}`,
        `   回复: ${thread.replyCount || 0} 条，作者: ${thread.authorCount || 0}，页数: ${thread.pageCountCollected || 0}`,
        `   最近采集: ${thread.lastCollectedAt || '-'}`,
        `   URL: ${thread.sourceUrl || '-'}`,
      ].join('\n')
    )
    .join('\n\n');
}

export function formatAuthors(authors: AuthorStats[]) {
  if (!authors.length) return '还没有作者统计。';
  return authors
    .map((author, index) =>
      [
        `${index + 1}. ${author.authorName || '(未知作者)'}${author.uid ? ` uid:${author.uid}` : ''}`,
        `   回复: ${author.replyCount || 0} 条，帖子: ${author.threadCount || 0}`,
        `   最近出现: ${author.lastSeenAt || '-'}`,
        `   authorKey: ${author.authorKey}`,
      ].join('\n')
    )
    .join('\n\n');
}

export function formatRecordMatches(records: ReplyRecord[]) {
  if (!records.length) return '没有匹配记录。';
  return records
    .slice(0, 200)
    .map((record, index) =>
      [
        `${index + 1}. ${record.threadTitle || '(无标题)'} #${record.floor || record.pid || '-'}`,
        `   作者: ${record['作者name'] || '-'}${record.uid ? ` uid:${record.uid}` : ''}`,
        `   时间: ${record['发帖时间'] || '-'}`,
        `   内容: ${(record['回复内容'] || record['回复全文'] || '').slice(0, 220)}`,
        `   URL: ${record['来源URL'] || '-'}`,
      ].join('\n')
    )
    .join('\n\n');
}

export function formatAuthorClearConfirm(query: string, rows: ReplyRecord[], authors: AuthorStats[]) {
  const threadCount = new Set(rows.map((record) => record.threadId).filter(Boolean)).size;
  const preview = authors.slice(0, 8).map((author) => {
    const name = author.authorName || '(未知作者)';
    const uid = author.uid ? ` uid:${author.uid}` : '';
    return `- ${name}${uid}: ${author.replyCount || 0} 条`;
  });
  if (authors.length > preview.length) preview.push(`- 另有 ${authors.length - preview.length} 个作者...`);

  return [
    `确定清空作者“${query}”的数据？`,
    `将删除 ${rows.length} 条回复，涉及 ${authors.length} 个作者、${threadCount} 个帖子。`,
    '',
    ...preview,
    '',
    '此操作不可恢复，但会自动重建帖子和作者统计。',
  ].join('\n');
}
