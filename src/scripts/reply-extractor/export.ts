import { REPLY_EXPORT_COLUMNS } from './constants';
import { ExportFormat, ReplyRecord } from './types';
import { normalizeText } from './utils';

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: ReplyRecord[]) {
  const lines = [REPLY_EXPORT_COLUMNS.map((column) => column.label).join(',')];
  for (const row of rows) lines.push(REPLY_EXPORT_COLUMNS.map((column) => csvEscape(row[column.key])).join(','));
  return `\ufeff${lines.join('\r\n')}`;
}

export function toJson(rows: ReplyRecord[]) {
  return JSON.stringify(
    rows.map((row) => {
      const exported: Record<string, string> = {};
      for (const column of REPLY_EXPORT_COLUMNS) exported[column.label] = String(row[column.key] || '');
      return exported;
    }),
    null,
    2
  );
}

function rowsToSheetRows(rows: ReplyRecord[]) {
  return rows.map((row) => {
    const exported: Record<string, string> = {};
    for (const column of REPLY_EXPORT_COLUMNS) exported[column.label] = String(row[column.key] || '');
    return exported;
  });
}

export function downloadExcel(filename: string, rows: ReplyRecord[], sheetName: string) {
  if (typeof XLSX === 'undefined') throw new Error('XLSX 依赖未加载，无法导出 Excel');
  const headers = REPLY_EXPORT_COLUMNS.map((column) => column.label);
  const worksheet = XLSX.utils.json_to_sheet(rowsToSheetRows(rows), { header: headers });
  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.max(12, Math.min(36, String(header).length + 4)),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || '回复');
  XLSX.writeFile(workbook, filename);
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('浏览器拒绝了复制命令');
  } finally {
    textarea.remove();
  }
}

export function safeFilename(ext: ExportFormat, label: string, fallback: string) {
  const title = normalizeText(label).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || fallback;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${title}-${stamp}.${ext}`;
}

export function downloadRows(
  rows: ReplyRecord[],
  format: ExportFormat,
  filename: string,
  sheetName: string
) {
  if (format === 'csv') {
    downloadText(filename, toCsv(rows), 'text/csv;charset=utf-8');
    return;
  }
  if (format === 'json') {
    downloadText(filename, toJson(rows), 'application/json;charset=utf-8');
    return;
  }
  downloadExcel(filename, rows, sheetName);
}
