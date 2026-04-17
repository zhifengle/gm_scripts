import { SearchSubject } from '../interface/subject';
import { CollectionInfo, InterestType, SubjectItem } from '../interface/types';
import { getInterestTypeName } from '../sites/bangumi/common';

export type CollectionSheetValue =
  | string
  | number
  | boolean
  | null
  | undefined;
export type CollectionSheetRow = Record<string, CollectionSheetValue>;
export type CollectionSheetItem = SubjectItem & {
  syncStatus?: string;
  syncSubject?: SearchSubject;
};

type CollectionSheetColumn = {
  key: string;
  headers: string[];
  exportValue: (item: CollectionSheetItem) => CollectionSheetValue;
  importValue: (item: CollectionSheetItem, value: string) => void;
};

export const INTEREST_TYPE_HEADERS = ['观看状态', '类别', 'interestType'];
export const SYNC_STATUS_HEADERS = ['同步情况', 'syncStatus'];
export const SYNC_SUBJECT_HEADERS = ['搜索结果信息', 'syncSubject'];
export const DEFAULT_COLLECTION_SHEET_NAME = '用户收藏';

export const COLLECTION_SHEET_COLUMNS: CollectionSheetColumn[] = [
  {
    key: 'name',
    headers: ['名称', 'name', 'title'],
    exportValue: (item) => item.name,
    importValue: (item, value) => {
      item.name = value;
    },
  },
  {
    key: 'greyName',
    headers: ['别名', 'greyName', 'subtitle'],
    exportValue: (item) => item.greyName,
    importValue: (item, value) => {
      item.greyName = value;
    },
  },
  {
    key: 'releaseDate',
    headers: ['发行日期', 'releaseDate'],
    exportValue: (item) => item.releaseDate,
    importValue: (item, value) => {
      item.releaseDate = value;
    },
  },
  {
    key: 'url',
    headers: ['地址', 'url', 'subjectUrl'],
    exportValue: (item) => item.url,
    importValue: (item, value) => {
      item.url = value;
    },
  },
  {
    key: 'cover',
    headers: ['封面地址', 'cover', 'coverUrl'],
    exportValue: (item) => item.cover,
    importValue: (item, value) => {
      item.cover = value;
    },
  },
  {
    key: 'collectDate',
    headers: ['收藏日期', 'collectDate'],
    exportValue: (item) => item.collectInfo?.date,
    importValue: (item, value) => {
      ensureCollectionInfo(item).date = value;
    },
  },
  {
    key: 'score',
    headers: ['我的评分', 'score', 'rating'],
    exportValue: (item) => item.collectInfo?.score,
    importValue: (item, value) => {
      ensureCollectionInfo(item).score = value;
    },
  },
  {
    key: 'tags',
    headers: ['标签', 'tags'],
    exportValue: (item) => item.collectInfo?.tags,
    importValue: (item, value) => {
      ensureCollectionInfo(item).tags = value;
    },
  },
  {
    key: 'comment',
    headers: ['吐槽', 'comment'],
    exportValue: (item) => item.collectInfo?.comment,
    importValue: (item, value) => {
      ensureCollectionInfo(item).comment = value;
    },
  },
  {
    key: 'rawInfos',
    headers: ['其它信息', 'rawInfos', 'info'],
    exportValue: (item) => item.rawInfos,
    importValue: (item, value) => {
      item.rawInfos = value;
    },
  },
];

export type CollectionSheetExportOptions = {
  includeSyncColumns?: boolean;
  interestTypeHeader?: string;
  sheetName?: string;
  getInterestType?: (item: CollectionSheetItem) => InterestType | undefined;
};

export type CollectionSheetImportOptions = {
  fallbackTypes?: InterestType[];
  defaultInterestType?: InterestType;
};

export function ensureCollectionInfo(
  item: CollectionSheetItem
): CollectionInfo {
  if (!item.collectInfo) {
    item.collectInfo = {
      date: '',
      score: '',
      tags: '',
      comment: '',
    };
  }
  return item.collectInfo;
}

export function toCellText(value: CollectionSheetValue) {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

export function readFirstCell(row: CollectionSheetRow, headers: string[]) {
  for (const header of headers) {
    const value = toCellText(row[header]);
    if (value) {
      return value;
    }
  }
  return '';
}

export function getInterestTypeByName(
  name: CollectionSheetValue
): InterestType | undefined {
  const text = toCellText(name);
  return (['wish', 'collect', 'do', 'on_hold', 'dropped'] as InterestType[]).find(
    (type) => type === text || getInterestTypeName(type) === text
  );
}

export function createEmptyCollectionSheetItem(): CollectionSheetItem {
  return {
    name: '',
    url: '',
    rawInfos: '',
    syncStatus: '',
    collectInfo: {
      date: '',
      score: '',
      tags: '',
      comment: '',
    },
  };
}

export function serializeSearchSubject(subject?: SearchSubject) {
  if (!subject) {
    return '';
  }
  return [
    subject.name || '',
    subject.greyName || '',
    subject.url || '',
    subject.rawName || '',
  ].join(';');
}

export function parseSearchSubject(
  value: CollectionSheetValue
): SearchSubject | undefined {
  const text = toCellText(value);
  if (!text) {
    return;
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed?.name || parsed?.url) {
      return {
        name: parsed.name || '',
        greyName: parsed.greyName || '',
        url: parsed.url || '',
        rawName: parsed.rawName || '',
      };
    }
  } catch (error) {
    // Older exports use "name;greyName;url;rawName".
  }
  const [name, greyName, url, rawName] = text.split(';');
  if (!name && !url) {
    return;
  }
  return {
    name: name || '',
    greyName: greyName || '',
    url: url || '',
    rawName: rawName || '',
  };
}

export function getCollectionSheetHeaders(
  options: CollectionSheetExportOptions = {}
) {
  const headers = COLLECTION_SHEET_COLUMNS.map((column) => column.headers[0]);
  headers.push(options.interestTypeHeader || INTEREST_TYPE_HEADERS[0]);
  if (options.includeSyncColumns) {
    headers.push(SYNC_STATUS_HEADERS[0], SYNC_SUBJECT_HEADERS[0]);
  }
  return headers;
}

export function collectionItemToSheetRow(
  item: CollectionSheetItem,
  options: CollectionSheetExportOptions = {}
): CollectionSheetRow {
  const row = COLLECTION_SHEET_COLUMNS.reduce((res, column) => {
    res[column.headers[0]] = column.exportValue(item) || '';
    return res;
  }, {} as CollectionSheetRow);
  const interestType =
    options.getInterestType?.(item) || item.collectInfo?.interestType;
  row[options.interestTypeHeader || INTEREST_TYPE_HEADERS[0]] = interestType
    ? getInterestTypeName(interestType)
    : '';
  if (options.includeSyncColumns) {
    row[SYNC_STATUS_HEADERS[0]] = item.syncStatus || '';
    row[SYNC_SUBJECT_HEADERS[0]] = serializeSearchSubject(item.syncSubject);
  }
  return row;
}

export function collectionItemsToSheetRows(
  items: CollectionSheetItem[],
  options: CollectionSheetExportOptions = {}
) {
  return items.map((item) => collectionItemToSheetRow(item, options));
}

export function collectionSheetRowToItem(
  row: CollectionSheetRow,
  options: CollectionSheetImportOptions = {}
): { item: CollectionSheetItem; interestType: InterestType } {
  const item = createEmptyCollectionSheetItem();
  COLLECTION_SHEET_COLUMNS.forEach((column) => {
    column.importValue(item, readFirstCell(row, column.headers));
  });
  item.syncStatus = readFirstCell(row, SYNC_STATUS_HEADERS);
  item.syncSubject = parseSearchSubject(readFirstCell(row, SYNC_SUBJECT_HEADERS));
  if (!item.name && item.syncSubject?.name) {
    item.name = item.syncSubject.name;
  }
  const fallbackTypes = options.fallbackTypes || [];
  const interestType =
    getInterestTypeByName(readFirstCell(row, INTEREST_TYPE_HEADERS)) ||
    (fallbackTypes.length === 1
      ? fallbackTypes[0]
      : options.defaultInterestType || 'collect');
  ensureCollectionInfo(item).interestType = interestType;
  return { item, interestType };
}

export function createCollectionWorkbook(
  items: CollectionSheetItem[],
  options: CollectionSheetExportOptions = {}
) {
  const worksheet = XLSX.utils.json_to_sheet(
    collectionItemsToSheetRows(items, options),
    {
      header: getCollectionSheetHeaders(options),
    }
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || DEFAULT_COLLECTION_SHEET_NAME
  );
  return workbook;
}

export function downloadCollectionExcel(
  filename: string,
  items: CollectionSheetItem[],
  options: CollectionSheetExportOptions = {}
) {
  XLSX.writeFile(createCollectionWorkbook(items, options), filename);
}

export async function readCollectionWorkbook(file: File) {
  if (/\.csv$/i.test(file.name)) {
    const data = await file.text();
    return XLSX.read(data, { type: 'string' });
  }
  const data = await file.arrayBuffer();
  return XLSX.read(data);
}

export async function readCollectionSheetRows(
  file: File
): Promise<CollectionSheetRow[]> {
  const workbook = await readCollectionWorkbook(file);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('文件中没有工作表');
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`找不到工作表: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  }) as CollectionSheetRow[];
}
