// ==UserScript==
// @name         Reply Extractor IndexedDB
// @namespace    local.reply.extractor
// @version      0.1.0
// @match        https://bbs.nga.cn/*
// @match        https://nga.178.com/*
// @include      file:///*
// @match        https://stage1st.com/2b/*
// @run-at       document-idle
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

const PANEL_STATES = ['expanded', 'collapsed', 'closed'];
const AUTO_SAVE_DEBOUNCE_MS = 900;
const PAGE_WATCH_INTERVAL_MS = 700;
const STATUS_RESET_MS = 1800;
const DB_VERSION = 4;
const STORES = {
    replies: 'reply_records',
    threads: 'threads',
    authors: 'authors',
};
const EXPORT_HEADERS = [
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
];

const DB_SCHEMA = {
    [STORES.replies]: {
        keyPath: '_key',
        indexes: [
            { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
            { name: 'threadKey', keyPath: 'threadKey', options: { unique: false } },
            { name: 'threadId', keyPath: 'threadId', options: { unique: false } },
            { name: 'uid', keyPath: 'uid', options: { unique: false } },
            { name: 'authorKey', keyPath: 'authorKey', options: { unique: false } },
            { name: 'postTime', keyPath: '发帖时间', options: { unique: false } },
            { name: 'pid', keyPath: 'pid', options: { unique: false } },
            { name: 'floor', keyPath: 'floor', options: { unique: false } },
            { name: 'collectedAt', keyPath: '采集时间', options: { unique: false } },
            { name: 'threadId_uid', keyPath: ['threadId', 'uid'], options: { unique: false } },
            { name: 'threadId_postTime', keyPath: ['threadId', '发帖时间'], options: { unique: false } },
            { name: 'threadKey_uid', keyPath: ['threadKey', 'uid'], options: { unique: false } },
            { name: 'threadKey_postTime', keyPath: ['threadKey', '发帖时间'], options: { unique: false } },
        ],
    },
    [STORES.threads]: {
        keyPath: 'threadKey',
        indexes: [
            { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
            { name: 'threadId', keyPath: 'threadId', options: { unique: false } },
            { name: 'forumName', keyPath: 'forumName', options: { unique: false } },
            { name: 'threadTitle', keyPath: 'threadTitle', options: { unique: false } },
            { name: 'lastCollectedAt', keyPath: 'lastCollectedAt', options: { unique: false } },
            { name: 'replyCount', keyPath: 'replyCount', options: { unique: false } },
        ],
    },
    [STORES.authors]: {
        keyPath: 'authorKey',
        indexes: [
            { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
            { name: 'uid', keyPath: 'uid', options: { unique: false } },
            { name: 'authorName', keyPath: 'authorName', options: { unique: false } },
            { name: 'replyCount', keyPath: 'replyCount', options: { unique: false } },
            { name: 'threadCount', keyPath: 'threadCount', options: { unique: false } },
            { name: 'lastSeenAt', keyPath: 'lastSeenAt', options: { unique: false } },
        ],
    },
};
function stopWithMessage(message) {
    alert(message);
    throw new Error(message);
}
function ensureIndexedDbSupported() {
    if (!window.indexedDB)
        stopWithMessage('当前浏览器不支持 IndexedDB，无法记录回复。');
}
class IndexedDatabase {
    name;
    db = null;
    openingPromise = null;
    constructor(name) {
        this.name = name;
    }
    async put(storeName, value) {
        const db = await this.open();
        const tx = db.transaction(storeName, 'readwrite');
        const key = await this.requestToPromise(tx.objectStore(storeName).put(value), `put:${storeName}`);
        await this.transactionDone(tx, `put:${storeName}`);
        return key;
    }
    async putMany(storeName, values) {
        if (!values.length)
            return;
        const db = await this.open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        try {
            for (const value of values)
                store.put(value);
        }
        catch (error) {
            throw this.withContext(error, `putMany:${storeName}`);
        }
        await this.transactionDone(tx, `putMany:${storeName}`);
    }
    async deleteMany(storeName, keys) {
        if (!keys.length)
            return;
        const db = await this.open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        try {
            for (const key of keys)
                store.delete(key);
        }
        catch (error) {
            throw this.withContext(error, `deleteMany:${storeName}`);
        }
        await this.transactionDone(tx, `deleteMany:${storeName}`);
    }
    async getMany(storeName, keys) {
        const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
        if (!uniqueKeys.length)
            return [];
        const db = await this.open();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const results = await Promise.all(uniqueKeys.map((key) => this.requestToPromise(store.get(key), `getMany:${storeName}`)));
        await this.transactionDone(tx, `getMany:${storeName}`);
        return results.filter(Boolean);
    }
    async getAll(storeName) {
        const db = await this.open();
        return this.requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll(), `getAll:${storeName}`);
    }
    async getAllFromIndex(storeName, indexName, query) {
        const db = await this.open();
        const index = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
        return this.requestToPromise(index.getAll(query), `getAllFromIndex:${storeName}.${indexName}`);
    }
    async clearStores(storeNames) {
        const db = await this.open();
        const tx = db.transaction(storeNames, 'readwrite');
        for (const storeName of storeNames)
            tx.objectStore(storeName).clear();
        await this.transactionDone(tx, `clearStores:${storeNames.join(',')}`);
    }
    async count(storeName) {
        const db = await this.open();
        return this.requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).count(), `count:${storeName}`);
    }
    close() {
        if (!this.db)
            return;
        this.db.close();
        this.db = null;
        this.openingPromise = null;
    }
    open() {
        if (this.db)
            return Promise.resolve(this.db);
        if (this.openingPromise)
            return this.openingPromise;
        this.openingPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, DB_VERSION);
            request.onupgradeneeded = () => this.ensureStores(request.result, request.transaction);
            request.onsuccess = () => {
                this.db = request.result;
                this.db.onversionchange = () => this.close();
                this.openingPromise = null;
                resolve(this.db);
            };
            request.onerror = () => {
                this.openingPromise = null;
                reject(this.withContext(request.error, 'open'));
            };
            request.onblocked = () => {
                this.openingPromise = null;
                reject(this.withContext(new Error('IndexedDB upgrade is blocked by another open connection'), 'open'));
            };
        });
        return this.openingPromise;
    }
    ensureStores(db, transaction) {
        for (const [storeName, schema] of Object.entries(DB_SCHEMA)) {
            const storeExists = db.objectStoreNames.contains(storeName);
            if (storeExists && !transaction)
                continue;
            let store;
            if (storeExists) {
                store = transaction.objectStore(storeName);
                if (String(store.keyPath) !== schema.keyPath) {
                    db.deleteObjectStore(storeName);
                    store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
                }
            }
            else {
                store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
            }
            this.ensureIndexes(store, schema);
        }
    }
    ensureIndexes(store, schema) {
        const expectedNames = new Set(schema.indexes.map((index) => index.name));
        for (const name of Array.from(store.indexNames)) {
            if (!expectedNames.has(name))
                store.deleteIndex(name);
        }
        for (const index of schema.indexes) {
            if (store.indexNames.contains(index.name))
                continue;
            store.createIndex(index.name, index.keyPath, index.options || {});
        }
    }
    requestToPromise(request, operation) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(this.withContext(request.error, operation));
        });
    }
    transactionDone(transaction, operation) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(this.withContext(transaction.error, operation));
            transaction.onabort = () => reject(this.withContext(transaction.error, operation));
        });
    }
    withContext(error, operation) {
        const reason = error instanceof Error ? error : new Error(String(error || 'Unknown IndexedDB error'));
        const wrapped = new Error(`IndexedDatabase.${operation} failed (${this.name}): ${reason.message}`);
        wrapped.cause = reason;
        return wrapped;
    }
}

function normalizeText(text) {
    return String(text || '')
        .replace(/\u200b/g, '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
}
function textFromNode(node, options = {}) {
    const clone = node.cloneNode(true);
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
    if (options.removeQuotes)
        clone.querySelectorAll('.quote').forEach((el) => el.remove());
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode('\n')));
    clone.querySelectorAll('img').forEach((img) => {
        const alt = normalizeText(img.getAttribute('alt') || img.getAttribute('title') || '');
        const placeholder = options.imagePlaceholder?.(img) || '[图片]';
        img.replaceWith(document.createTextNode(alt ? `[${alt}]` : placeholder));
    });
    clone.querySelectorAll('svg').forEach((svg) => svg.remove());
    return normalizeText(clone.textContent);
}
function getCanonicalOrCurrentUrl() {
    return document.querySelector('link[rel="canonical"]')?.href || location.href;
}
function getUrlParam(name) {
    const urls = [location.href, getCanonicalOrCurrentUrl()];
    for (const href of urls) {
        try {
            const value = new URL(href, location.href).searchParams.get(name);
            if (value)
                return value;
        }
        catch (_) {
            // Ignore malformed saved-page URLs.
        }
    }
    return '';
}
function hashString(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
}
function getAuthorKey(row) {
    const siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '') || 'unknown-site';
    if (row.uid)
        return `${siteKey}:uid:${row.uid}`;
    if (row['作者name'])
        return `${siteKey}:name:${row['作者name']}`;
    return `${siteKey}:unknown`;
}
function buildRecordKey(row) {
    const threadKey = row.threadKey || buildThreadKey(row);
    if (threadKey && row.pid)
        return `pid:${threadKey}:${row.pid}`;
    if (threadKey && row.floor)
        return `floor:${threadKey}:${row.floor}`;
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
function inferSiteKeyFromUrl(url) {
    try {
        const host = new URL(url, location.href).host.toLowerCase();
        if (host.includes('nga.cn') || host.includes('nga.178.com'))
            return 'nga';
        if (host.includes('stage1st.com'))
            return 's1';
    }
    catch (_) {
        // Ignore malformed saved-page URLs.
    }
    return '';
}
function buildThreadKey(row) {
    const siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '');
    if (!siteKey || !row.threadId)
        return '';
    return `${siteKey}:${row.threadId}`;
}
function finalizeRecord(row) {
    row.siteKey = row.siteKey || inferSiteKeyFromUrl(row['来源URL'] || '');
    row.threadKey = row.threadKey || buildThreadKey(row);
    row.authorKey = getAuthorKey(row);
    row._key = buildRecordKey(row);
    return row;
}

function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function toCsv(rows) {
    const lines = [EXPORT_HEADERS.join(',')];
    for (const row of rows)
        lines.push(EXPORT_HEADERS.map((header) => csvEscape(row[header])).join(','));
    return `\ufeff${lines.join('\r\n')}`;
}
function toJson(rows) {
    return JSON.stringify(rows.map((row) => {
        const exported = {};
        for (const header of EXPORT_HEADERS)
            exported[header] = String(row[header] || '');
        return exported;
    }), null, 2);
}
function rowsToSheetRows(rows) {
    return rows.map((row) => {
        const exported = {};
        for (const header of EXPORT_HEADERS)
            exported[header] = String(row[header] || '');
        return exported;
    });
}
function downloadExcel(filename, rows, sheetName) {
    if (typeof XLSX === 'undefined')
        throw new Error('XLSX 依赖未加载，无法导出 Excel');
    const worksheet = XLSX.utils.json_to_sheet(rowsToSheetRows(rows), { header: EXPORT_HEADERS });
    worksheet['!cols'] = EXPORT_HEADERS.map((header) => ({
        wch: Math.max(12, Math.min(36, String(header).length + 4)),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || '回复');
    XLSX.writeFile(workbook, filename);
}
function downloadText(filename, content, type) {
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
async function copyText(text) {
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
        if (!copied)
            throw new Error('浏览器拒绝了复制命令');
    }
    finally {
        textarea.remove();
    }
}
function safeFilename(ext, label, fallback) {
    const title = normalizeText(label).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || fallback;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${title}-${stamp}.${ext}`;
}
function downloadRows(rows, format, filename, sheetName) {
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

function formatThreads(threads) {
    if (!threads.length)
        return '还没有采集帖子。';
    return threads
        .map((thread, index) => [
        `${index + 1}. ${thread.threadTitle || '(无标题)'}`,
        `   ID: ${thread.threadId}`,
        `   版块: ${thread.forumName || '-'}`,
        `   回复: ${thread.replyCount || 0} 条，作者: ${thread.authorCount || 0}，页数: ${thread.pageCountCollected || 0}`,
        `   最近采集: ${thread.lastCollectedAt || '-'}`,
        `   URL: ${thread.sourceUrl || '-'}`,
    ].join('\n'))
        .join('\n\n');
}
function formatAuthors(authors) {
    if (!authors.length)
        return '还没有作者统计。';
    return authors
        .map((author, index) => [
        `${index + 1}. ${author.authorName || '(未知作者)'}${author.uid ? ` uid:${author.uid}` : ''}`,
        `   回复: ${author.replyCount || 0} 条，帖子: ${author.threadCount || 0}`,
        `   最近出现: ${author.lastSeenAt || '-'}`,
        `   authorKey: ${author.authorKey}`,
    ].join('\n'))
        .join('\n\n');
}
function formatRecordMatches(records) {
    if (!records.length)
        return '没有匹配记录。';
    return records
        .slice(0, 200)
        .map((record, index) => [
        `${index + 1}. ${record.threadTitle || '(无标题)'} #${record.floor || record.pid || '-'}`,
        `   作者: ${record['作者name'] || '-'}${record.uid ? ` uid:${record.uid}` : ''}`,
        `   时间: ${record['发帖时间'] || '-'}`,
        `   内容: ${(record['回复内容'] || record['回复全文'] || '').slice(0, 220)}`,
        `   URL: ${record['来源URL'] || '-'}`,
    ].join('\n'))
        .join('\n\n');
}
function formatAuthorClearConfirm(query, rows, authors) {
    const threadCount = new Set(rows.map((record) => record.threadId).filter(Boolean)).size;
    const preview = authors.slice(0, 8).map((author) => {
        const name = author.authorName || '(未知作者)';
        const uid = author.uid ? ` uid:${author.uid}` : '';
        return `- ${name}${uid}: ${author.replyCount || 0} 条`;
    });
    if (authors.length > preview.length)
        preview.push(`- 另有 ${authors.length - preview.length} 个作者...`);
    return [
        `确定清空作者“${query}”的数据？`,
        `将删除 ${rows.length} 条回复，涉及 ${authors.length} 个作者、${threadCount} 个帖子。`,
        '',
        ...preview,
        '',
        '此操作不可恢复，但会自动重建帖子和作者统计。',
    ].join('\n');
}

function createMutationWatcher(options) {
    const { root, onMutation } = options;
    if (!window.MutationObserver)
        return { dispose: () => undefined };
    const observer = new MutationObserver(onMutation);
    observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'href', 'id'],
    });
    return {
        dispose() {
            observer.disconnect();
        },
    };
}
function createPageWatcher(onTick, interval = PAGE_WATCH_INTERVAL_MS) {
    const timer = setInterval(onTick, interval);
    return {
        dispose() {
            clearInterval(timer);
        },
    };
}
function startWhenBodyReady(start) {
    const run = () => {
        if (!document.body) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', run, { once: true });
            }
            else {
                setTimeout(run, 0);
            }
            return;
        }
        start();
    };
    run();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function styleButton(button) {
    Object.assign(button.style, {
        margin: '2px',
        padding: '4px 7px',
        border: '1px solid #b7c7cc',
        borderRadius: '4px',
        background: '#fff',
        color: '#10273f',
        cursor: 'pointer',
        fontSize: '12px',
        lineHeight: '1.2',
    });
}
function ensureStatusAnimationStyle(config) {
    if (document.getElementById(`${config.idPrefix}-status-style`))
        return;
    const style = document.createElement('style');
    style.id = `${config.idPrefix}-status-style`;
    style.textContent = `@keyframes ${config.statusAnimationName} { 0%,100% { opacity: .45; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.18); } }`;
    document.head.appendChild(style);
}
function getStatusStyles(config) {
    return {
        idle: { color: '#9aa8ad', pulse: 'none' },
        saving: { color: '#3b82f6', pulse: `${config.statusAnimationName} 1s ease-in-out infinite` },
        saved: { color: '#16a34a', pulse: 'none' },
        skipped: { color: '#9aa8ad', pulse: 'none' },
        error: { color: '#dc2626', pulse: 'none' },
    };
}
function getStoredPanelState(key) {
    const saved = GM_getValue(key, 'expanded');
    return PANEL_STATES.includes(saved) ? saved : 'expanded';
}
function setStoredPanelState(key, state) {
    GM_setValue(key, PANEL_STATES.includes(state) ? state : 'expanded');
}
function createReplyExtractorPanel(options) {
    const { config, initialState, onAction } = options;
    const statusStyles = getStatusStyles(config);
    let statusResetTimer;
    ensureStatusAnimationStyle(config);
    const panel = document.createElement('div');
    panel.id = `${config.idPrefix}-panel`;
    panel.innerHTML = `
    <div data-role="compact" style="display:none;position:relative;align-items:center;">
      <button type="button" data-action="toggle" data-role="compact-main" title="${config.displayName}：点击展开">
        <span>${config.compactLabel}</span>
        <span data-role="status-dot"></span>
      </button>
      <button type="button" data-action="close" data-role="compact-close" title="关闭 ${config.displayName}">×</button>
    </div>
    <div data-role="expanded-panel">
      <div data-role="panel-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
        <div style="font-weight:700;">${config.displayName}</div>
        <div style="white-space:nowrap;">
          <button type="button" data-action="toggle">收起</button>
          <button type="button" data-action="close">关闭</button>
        </div>
      </div>
      <div data-role="status" style="margin-bottom:8px;color:#555;">准备读取当前页</div>
      <div data-role="actions">
        <div>
          <button type="button" data-action="save">记录本页</button>
          <button type="button" data-action="export-current-xlsx">当前帖 Excel</button>
          <button type="button" data-action="export-author-xlsx">作者 Excel</button>
        </div>
        <details data-expanded-only style="margin-top:6px;border-top:1px solid #d0dde1;padding-top:6px;">
          <summary style="cursor:pointer;user-select:none;">更多</summary>
          <div style="margin-top:6px;">
            <div style="font-weight:700;margin:4px 2px 2px;">查看</div>
            <button type="button" data-action="threads">帖子列表</button>
            <button type="button" data-action="authors">作者统计</button>
            <button type="button" data-action="search">跨帖检索</button>
          </div>
          <div style="margin-top:8px;">
            <div style="font-weight:700;margin:4px 2px 2px;">导出</div>
            <label style="margin:2px;">范围
              <select data-role="export-scope">
                <option value="current">当前帖</option>
                <option value="author">作者</option>
                <option value="all">全部帖子</option>
              </select>
            </label>
            <label style="margin:2px;">格式
              <select data-role="export-format">
                <option value="xlsx">Excel</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <button type="button" data-action="export-selected">导出</button>
          </div>
          <div style="margin-top:8px;">
            <div style="font-weight:700;margin:4px 2px 2px;">维护</div>
            <button type="button" data-action="clear-current">清空当前帖</button>
            <button type="button" data-action="clear-author">清空作者</button>
            <button type="button" data-action="copy-all-csv">复制全部 CSV</button>
            <button type="button" data-action="clear-all">清空全部</button>
          </div>
        </details>
      </div>
    </div>
  `;
    Object.assign(panel.style, {
        position: 'fixed',
        right: '14px',
        bottom: '14px',
        zIndex: '2147483647',
        padding: '10px',
        border: '1px solid #9fb3bb',
        borderRadius: '6px',
        background: '#f6fafb',
        color: '#10273f',
        boxShadow: '0 4px 18px rgba(0,0,0,.18)',
        fontSize: '13px',
        lineHeight: '1.4',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        maxWidth: '420px',
    });
    panel.querySelectorAll('button').forEach(styleButton);
    panel.querySelectorAll('select').forEach((select) => {
        Object.assign(select.style, {
            margin: '2px',
            padding: '3px 6px',
            border: '1px solid #b7c7cc',
            borderRadius: '4px',
            background: '#fff',
            color: '#10273f',
            fontSize: '12px',
        });
    });
    const compact = panel.querySelector('[data-role="compact"]');
    const compactMain = panel.querySelector('[data-role="compact-main"]');
    const compactClose = panel.querySelector('[data-role="compact-close"]');
    const statusDot = panel.querySelector('[data-role="status-dot"]');
    if (compact) {
        compact.addEventListener('mouseenter', () => setCompactCloseVisible(true));
        compact.addEventListener('mouseleave', () => setCompactCloseVisible(false));
    }
    if (compactMain) {
        Object.assign(compactMain.style, {
            position: 'relative',
            width: config.compactWidth,
            height: '28px',
            margin: '0',
            padding: '0',
            border: '1px solid rgba(143, 162, 170, .42)',
            borderRadius: '6px',
            background: 'rgba(246, 250, 251, .72)',
            color: 'rgba(16, 39, 63, .72)',
            boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            fontSize: '12px',
            lineHeight: '26px',
            fontWeight: '700',
            cursor: 'pointer',
        });
    }
    if (statusDot) {
        Object.assign(statusDot.style, {
            position: 'absolute',
            right: '4px',
            top: '4px',
            width: '5px',
            height: '5px',
            borderRadius: '999px',
            background: statusStyles.idle.color,
            boxShadow: '0 0 0 1px rgba(255,255,255,.85)',
        });
    }
    if (compactClose) {
        Object.assign(compactClose.style, {
            position: 'absolute',
            right: '-7px',
            top: '-7px',
            width: '16px',
            height: '16px',
            margin: '0',
            padding: '0',
            border: '1px solid rgba(143, 162, 170, .38)',
            borderRadius: '999px',
            background: 'rgba(255,255,255,.92)',
            color: 'rgba(16,39,63,.68)',
            boxShadow: '0 1px 5px rgba(0,0,0,.12)',
            fontSize: '12px',
            lineHeight: '14px',
            cursor: 'pointer',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity .12s ease',
        });
    }
    const controller = {
        element: panel,
        getState: () => (PANEL_STATES.includes(panel.dataset.state) ? panel.dataset.state : 'expanded'),
        applyState,
        setStatus,
        showTextModal,
        dispose() {
            clearTimeout(statusResetTimer);
        },
    };
    panel.addEventListener('click', async (event) => {
        const button = event.target?.closest('button[data-action]');
        if (!button)
            return;
        try {
            await onAction(controller, button.dataset.action);
        }
        catch (error) {
            console.error(error);
            setStatus(`失败：${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    });
    setStatus('准备读取当前页', 'idle');
    applyState(initialState);
    return controller;
    function setCompactCloseVisible(visible) {
        if (!compactClose)
            return;
        compactClose.style.opacity = visible ? '1' : '0';
        compactClose.style.pointerEvents = visible ? 'auto' : 'none';
    }
    function setStatus(text, statusState = 'idle') {
        const status = panel.querySelector('[data-role="status"]');
        const compactMainButton = panel.querySelector('[data-role="compact-main"]');
        const dot = panel.querySelector('[data-role="status-dot"]');
        const statusStyle = statusStyles[statusState] || statusStyles.idle;
        if (status) {
            status.textContent = text;
            status.style.color = statusState === 'error' ? '#b91c1c' : '#555';
        }
        if (compactMainButton)
            compactMainButton.title = `${config.displayName}: ${text}`;
        if (dot) {
            dot.style.background = statusStyle.color;
            dot.style.animation = statusStyle.pulse;
        }
        clearTimeout(statusResetTimer);
        if (statusState === 'saved' || statusState === 'error') {
            statusResetTimer = setTimeout(() => {
                const resetDot = panel.querySelector('[data-role="status-dot"]');
                if (resetDot) {
                    resetDot.style.background = statusStyles.idle.color;
                    resetDot.style.animation = statusStyles.idle.pulse;
                }
            }, STATUS_RESET_MS);
        }
    }
    function applyState(state) {
        const normalizedState = PANEL_STATES.includes(state) ? state : 'expanded';
        const collapsed = normalizedState === 'collapsed';
        panel.dataset.state = normalizedState;
        const toggleButton = panel.querySelector('[data-role="expanded-panel"] [data-action="toggle"]');
        const extendedBlocks = panel.querySelectorAll('[data-expanded-only]');
        const compactBlock = panel.querySelector('[data-role="compact"]');
        const expandedPanel = panel.querySelector('[data-role="expanded-panel"]');
        if (toggleButton)
            toggleButton.textContent = collapsed ? '展开' : '收起';
        extendedBlocks.forEach((block) => {
            block.style.display = collapsed ? 'none' : '';
        });
        if (compactBlock)
            compactBlock.style.display = collapsed ? 'flex' : 'none';
        if (expandedPanel)
            expandedPanel.style.display = collapsed ? 'none' : 'block';
        panel.style.padding = collapsed ? '0' : '10px';
        panel.style.border = collapsed ? '0' : '1px solid #9fb3bb';
        panel.style.background = collapsed ? 'transparent' : '#f6fafb';
        panel.style.boxShadow = collapsed ? 'none' : '0 4px 18px rgba(0,0,0,.18)';
    }
    function showTextModal(title, content) {
        const modalId = `${config.idPrefix}-modal`;
        document.getElementById(modalId)?.remove();
        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.innerHTML = `
      <div data-role="dialog">
        <div data-role="dialog-header">
          <strong>${escapeHtml(title)}</strong>
          <button type="button" data-action="close">关闭</button>
        </div>
        <textarea readonly></textarea>
      </div>
    `;
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            background: 'rgba(0,0,0,.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        });
        const dialog = overlay.querySelector('[data-role="dialog"]');
        Object.assign(dialog.style, {
            width: 'min(760px, 96vw)',
            maxHeight: '86vh',
            background: '#f6fafb',
            color: '#10273f',
            border: '1px solid #9fb3bb',
            borderRadius: '6px',
            boxShadow: '0 8px 26px rgba(0,0,0,.24)',
            padding: '10px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        });
        const header = overlay.querySelector('[data-role="dialog-header"]');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
        });
        const textarea = overlay.querySelector('textarea');
        textarea.value = content;
        Object.assign(textarea.style, {
            width: '100%',
            height: '65vh',
            boxSizing: 'border-box',
            whiteSpace: 'pre',
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
        });
        overlay.querySelectorAll('button').forEach(styleButton);
        overlay.addEventListener('click', (event) => {
            const target = event.target;
            if (event.target === overlay || target.closest('[data-action="close"]'))
                overlay.remove();
        });
        document.body.appendChild(overlay);
    }
}
function createPanelLauncher(options) {
    const { config, onClick } = options;
    const launcher = document.createElement('button');
    launcher.id = `${config.idPrefix}-launcher`;
    launcher.type = 'button';
    launcher.textContent = config.compactLabel;
    launcher.title = `展开 ${config.displayName} 面板`;
    Object.assign(launcher.style, {
        position: 'fixed',
        right: '14px',
        bottom: '14px',
        zIndex: '2147483647',
        padding: '6px 9px',
        border: '1px solid #9fb3bb',
        borderRadius: '6px',
        background: '#f6fafb',
        color: '#10273f',
        boxShadow: '0 4px 18px rgba(0,0,0,.18)',
        cursor: 'pointer',
        fontSize: '13px',
        lineHeight: '1.2',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    });
    launcher.addEventListener('click', onClick);
    return launcher;
}

const LEGACY_MIGRATION_KEY_PREFIX = 'reply-extractor-legacy-migration-v3';
const LEGACY_DATABASES = [
    { name: 'nga-reply-extractor', siteKey: 'nga' },
    { name: 's1-reply-extractor', siteKey: 's1' },
];
function requestToPromise(request, operation) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`${operation} failed: ${request.error?.message || request.error || 'unknown error'}`));
    });
}
function openDatabase(name) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`open legacy database ${name} failed: ${request.error?.message || request.error || 'unknown error'}`));
        request.onblocked = () => reject(new Error(`open legacy database ${name} blocked`));
    });
}
async function readLegacyReplies(databaseName) {
    const db = await openDatabase(databaseName);
    try {
        if (!db.objectStoreNames.contains(STORES.replies))
            return [];
        return await requestToPromise(db.transaction(STORES.replies, 'readonly').objectStore(STORES.replies).getAll(), `read ${databaseName}.${STORES.replies}`);
    }
    finally {
        db.close();
    }
}
function getLegacySiteKey(record, fallbackSiteKey) {
    if (record.siteKey)
        return record.siteKey;
    const legacySite = String(record.site || '').toLowerCase();
    if (legacySite === 'nga')
        return 'nga';
    if (legacySite === 's1')
        return 's1';
    return inferSiteKeyFromUrl(record['来源URL'] || '') || fallbackSiteKey;
}
function normalizeLegacyRecord(record, fallbackSiteKey) {
    const siteKey = getLegacySiteKey(record, fallbackSiteKey);
    const threadId = record.threadId || '';
    if (!siteKey || !threadId)
        return null;
    return finalizeRecord({
        ...record,
        siteKey,
        threadKey: `${siteKey}:${threadId}`,
    });
}
function getCurrentSiteKey() {
    return inferSiteKeyFromUrl(location.href);
}
function getMigrationKey(databaseName) {
    return `${LEGACY_MIGRATION_KEY_PREFIX}:${location.origin}:${databaseName}`;
}
async function migrateLegacyIndexedDb(repository) {
    await repository.normalizeStoredRecords();
    const records = [];
    const completedMigrationKeys = [];
    let hasFailure = false;
    const currentSiteKey = getCurrentSiteKey();
    const legacyDatabases = LEGACY_DATABASES.filter((legacyDb) => legacyDb.siteKey === currentSiteKey);
    for (const legacyDb of legacyDatabases) {
        const migrationKey = getMigrationKey(legacyDb.name);
        if (GM_getValue(migrationKey, '') === 'done')
            continue;
        try {
            const legacyRecords = await readLegacyReplies(legacyDb.name);
            for (const record of legacyRecords) {
                const normalizedRecord = normalizeLegacyRecord(record, legacyDb.siteKey);
                if (normalizedRecord)
                    records.push(normalizedRecord);
            }
            completedMigrationKeys.push(migrationKey);
        }
        catch (error) {
            hasFailure = true;
            console.error(error);
        }
    }
    const imported = await repository.importRecords(records);
    if (!hasFailure)
        completedMigrationKeys.forEach((migrationKey) => GM_setValue(migrationKey, 'done'));
    return imported;
}

function compareRecords(a, b) {
    const timeCompare = String(a['发帖时间'] || '').localeCompare(String(b['发帖时间'] || ''));
    if (timeCompare)
        return timeCompare;
    const floorCompare = String(a.floor || '').localeCompare(String(b.floor || ''), undefined, { numeric: true });
    if (floorCompare)
        return floorCompare;
    return String(a.pid || '').localeCompare(String(b.pid || ''), undefined, { numeric: true });
}
function compareThreads(a, b) {
    return String(b.lastCollectedAt || '').localeCompare(String(a.lastCollectedAt || ''));
}
function compareAuthors(a, b) {
    const replyCompare = Number(b.replyCount || 0) - Number(a.replyCount || 0);
    if (replyCompare)
        return replyCompare;
    return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
}
function buildThreadMeta(records) {
    const first = records[0];
    const pages = new Set(records.map((record) => record.page).filter(Boolean));
    const authors = new Set(records.map((record) => record.authorKey).filter(Boolean));
    const collectedTimes = records.map((record) => record['采集时间']).filter(Boolean).sort();
    const pagesCollected = Array.from(pages).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    return {
        siteKey: first?.siteKey || '',
        threadKey: first?.threadKey || '',
        threadId: first?.threadId || '',
        threadTitle: first?.threadTitle || '',
        forumName: first?.forumName || '',
        sourceUrl: first?.['来源URL'] || '',
        firstCollectedAt: collectedTimes[0] || '',
        lastCollectedAt: collectedTimes[collectedTimes.length - 1] || '',
        pageCountCollected: pages.size,
        pagesCollected,
        lastPage: pagesCollected[pagesCollected.length - 1] || '',
        replyCount: records.length,
        authorCount: authors.size,
    };
}
function buildAuthorStats(records) {
    const authorMap = new Map();
    for (const record of records) {
        const authorKey = record.authorKey || getAuthorKey(record);
        if (!authorKey || authorKey === 'unknown')
            continue;
        if (!authorMap.has(authorKey)) {
            authorMap.set(authorKey, {
                siteKey: record.siteKey || '',
                authorKey,
                uid: record.uid || '',
                authorName: record['作者name'] || '',
                replyCount: 0,
                threadIds: new Set(),
                threadKeys: new Set(),
                firstSeenAt: record['采集时间'] || '',
                lastSeenAt: record['采集时间'] || '',
            });
        }
        const stat = authorMap.get(authorKey);
        stat.replyCount += 1;
        if (record.threadId)
            stat.threadIds.add(record.threadId);
        if (record.threadKey)
            stat.threadKeys.add(record.threadKey);
        if (record.uid && !stat.uid)
            stat.uid = record.uid;
        if (record['作者name'] && !stat.authorName)
            stat.authorName = record['作者name'];
        if (record['采集时间'] && (!stat.firstSeenAt || record['采集时间'] < stat.firstSeenAt))
            stat.firstSeenAt = record['采集时间'];
        if (record['采集时间'] && (!stat.lastSeenAt || record['采集时间'] > stat.lastSeenAt))
            stat.lastSeenAt = record['采集时间'];
    }
    return Array.from(authorMap.values()).map((stat) => ({
        ...stat,
        threadCount: stat.threadKeys.size,
        threadIds: Array.from(stat.threadIds),
        threadKeys: Array.from(stat.threadKeys),
    }));
}
function uniqueRecords(records) {
    const seenKeys = new Set();
    return records.filter((record) => {
        const key = record?._key;
        if (!key || seenKeys.has(key))
            return false;
        seenKeys.add(key);
        return true;
    });
}
function affectedAuthorKeys(records) {
    return Array.from(new Set(records.map((record) => record.authorKey || getAuthorKey(record)).filter(Boolean)));
}
class ReplyRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async readAllRecords() {
        const records = await this.db.getAll(STORES.replies);
        return records.sort(compareRecords);
    }
    async readRecordsByThread(threadKey) {
        if (!threadKey)
            return [];
        const records = await this.db.getAllFromIndex(STORES.replies, 'threadKey', IDBKeyRange.only(threadKey));
        return records.sort(compareRecords);
    }
    async readThreads() {
        const threads = await this.db.getAll(STORES.threads);
        return threads.sort(compareThreads);
    }
    async readAuthors() {
        const authors = await this.db.getAll(STORES.authors);
        return authors.sort(compareAuthors);
    }
    async readRecordsByAuthorKey(authorKey) {
        if (!authorKey)
            return [];
        const indexedRecords = await this.db.getAllFromIndex(STORES.replies, 'authorKey', IDBKeyRange.only(authorKey));
        let legacyRecords = [];
        const uidMatch = authorKey.match(/^[^:]+:uid:(.+)$/);
        if (uidMatch) {
            const uid = uidMatch[1];
            if (uid)
                legacyRecords = await this.db.getAllFromIndex(STORES.replies, 'uid', IDBKeyRange.only(uid));
        }
        return uniqueRecords([...indexedRecords, ...legacyRecords])
            .filter((record) => (record.authorKey || getAuthorKey(record)) === authorKey)
            .sort(compareRecords);
    }
    async readRecordsByAuthorQuery(query) {
        const normalizedQuery = normalizeText(query).toLowerCase();
        if (!normalizedQuery)
            return [];
        const records = await this.readAllRecords();
        return records.filter((record) => {
            const authorKey = String(record.authorKey || '').toLowerCase();
            const uid = String(record.uid || '').toLowerCase();
            const authorName = String(record['作者name'] || '').toLowerCase();
            return authorKey === normalizedQuery || uid.includes(normalizedQuery) || authorName.includes(normalizedQuery);
        });
    }
    async readRecordsByExactAuthorQuery(query) {
        const normalizedQuery = normalizeText(query);
        const queryLower = normalizedQuery.toLowerCase();
        if (!queryLower)
            return [];
        const records = await this.readAllRecords();
        return records.filter((record) => {
            const authorKey = String(record.authorKey || '').toLowerCase();
            const uid = String(record.uid || '').toLowerCase();
            const authorName = String(record['作者name'] || '').toLowerCase();
            return authorKey === queryLower || uid === queryLower || authorName === queryLower;
        });
    }
    async saveRecords(rows) {
        const normalizedRows = rows.map((row) => finalizeRecord({ ...row }));
        const threadKey = normalizedRows[0]?.threadKey || '';
        const overwrittenRecords = await this.db.getMany(STORES.replies, normalizedRows.map((row) => row._key));
        const overwrittenKeys = new Set(overwrittenRecords.map((record) => record._key));
        const authorKeys = affectedAuthorKeys([...normalizedRows, ...overwrittenRecords]);
        await this.db.putMany(STORES.replies, normalizedRows);
        await this.rebuildThreadMeta(threadKey);
        await this.rebuildAuthorStatsByKeys(authorKeys);
        const added = normalizedRows.filter((row) => !overwrittenKeys.has(row._key)).length;
        const currentThreadTotal = (await this.readRecordsByThread(threadKey)).length;
        const total = await this.db.count(STORES.replies);
        return { added, currentThreadTotal, total };
    }
    async importRecords(rows) {
        const normalizedRows = rows.map((row) => finalizeRecord(row));
        if (!normalizedRows.length)
            return 0;
        await this.db.putMany(STORES.replies, normalizedRows);
        await this.rebuildThreadMetas(Array.from(new Set(normalizedRows.map((record) => record.threadKey).filter(Boolean))));
        await this.rebuildAuthorStatsByKeys(affectedAuthorKeys(normalizedRows));
        return normalizedRows.length;
    }
    async normalizeStoredRecords() {
        const records = await this.readAllRecords();
        if (!records.length)
            return 0;
        const originalKeys = records.map((record) => record._key);
        const normalizedRecords = records.map((record) => finalizeRecord({ ...record }));
        const changedKeys = records
            .map((_record, index) => (originalKeys[index] !== normalizedRecords[index]._key ? originalKeys[index] : ''))
            .filter(Boolean);
        await this.db.deleteMany(STORES.replies, changedKeys);
        await this.db.clearStores([STORES.threads, STORES.authors]);
        await this.importRecords(normalizedRecords);
        return normalizedRecords.length;
    }
    async clearAllRecords() {
        await this.db.clearStores([STORES.replies, STORES.threads, STORES.authors]);
    }
    async clearCurrentThreadRecords(threadKey) {
        const records = await this.readRecordsByThread(threadKey);
        const authorKeys = affectedAuthorKeys(records);
        await this.db.deleteMany(STORES.replies, records.map((record) => record._key));
        await this.db.deleteMany(STORES.threads, [threadKey]);
        await this.rebuildAuthorStatsByKeys(authorKeys);
        return records.length;
    }
    summarizeAuthorsFromRecords(records) {
        return buildAuthorStats(records).sort(compareAuthors);
    }
    async clearAuthorRecords(query) {
        const records = await this.readRecordsByExactAuthorQuery(query);
        const keys = Array.from(new Set(records.map((record) => record._key).filter(Boolean)));
        const threadKeys = Array.from(new Set(records.map((record) => record.threadKey).filter(Boolean)));
        const authors = this.summarizeAuthorsFromRecords(records);
        const authorKeys = affectedAuthorKeys(records);
        await this.db.deleteMany(STORES.replies, keys);
        await this.rebuildThreadMetas(threadKeys);
        await this.rebuildAuthorStatsByKeys(authorKeys);
        return { deleted: keys.length, threadCount: threadKeys.length, authors };
    }
    async searchRecords(keyword) {
        const normalizedKeyword = normalizeText(keyword).toLowerCase();
        if (!normalizedKeyword)
            return [];
        const records = await this.readAllRecords();
        return records.filter((record) => ['threadTitle', 'forumName', '作者name', 'uid', '发帖时间', '回复内容', '引用内容', '回复全文'].some((key) => String(record[key] || '').toLowerCase().includes(normalizedKeyword)));
    }
    async rebuildAllDerivedData() {
        const records = await this.readAllRecords();
        await this.rebuildThreadMetas(Array.from(new Set(records.map((record) => record.threadKey).filter(Boolean))));
        await this.rebuildAuthorStatsByKeys(affectedAuthorKeys(records));
    }
    async rebuildThreadMeta(threadKey) {
        const records = await this.readRecordsByThread(threadKey);
        if (!records.length)
            return;
        await this.db.put(STORES.threads, buildThreadMeta(records));
    }
    async rebuildThreadMetas(threadKeys) {
        for (const threadKey of Array.from(new Set(threadKeys)).filter(Boolean))
            await this.rebuildThreadMeta(threadKey);
    }
    async rebuildAuthorStatsByKeys(authorKeys) {
        const keys = Array.from(new Set(authorKeys.filter(Boolean)));
        const authorsToUpsert = [];
        const authorsToDelete = [];
        for (const authorKey of keys) {
            const records = await this.readRecordsByAuthorKey(authorKey);
            const authorStats = buildAuthorStats(records);
            if (authorStats[0])
                authorsToUpsert.push(authorStats[0]);
            else
                authorsToDelete.push(authorKey);
        }
        await this.db.putMany(STORES.authors, authorsToUpsert);
        await this.db.deleteMany(STORES.authors, authorsToDelete);
    }
}

function createReplyExtractor(runtime) {
    const { config } = runtime;
    const panelId = `${config.idPrefix}-panel`;
    const launcherId = `${config.idPrefix}-launcher`;
    const db = new IndexedDatabase(config.storageName);
    const repository = new ReplyRepository(db);
    let activePanel = null;
    let launcherWatcher = null;
    let inactiveWatcher = null;
    function currentThreadKey() {
        return runtime.extractReplies()[0]?.threadKey || '';
    }
    function isExtractorUiNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE)
            return false;
        return Boolean(node.closest?.(`#${panelId}, #${launcherId}, #${config.idPrefix}-modal`));
    }
    function getCurrentPageSignature(rows = runtime.extractReplies(), options = {}) {
        if (!rows.length && !options.allowEmptyRows)
            return '';
        const threadInfo = runtime.getThreadInfo();
        const rowSignature = rows.map((row) => row._key).sort().join('|');
        return [location.href, rows[0]?.threadKey || threadInfo.threadId, threadInfo.page, rows.length, rowSignature].join('::');
    }
    function panelIsAutoSaveActive(panel) {
        return document.body.contains(panel.controller.element) && panel.controller.getState() !== 'closed';
    }
    function stopInactiveWatcher() {
        inactiveWatcher?.dispose();
        inactiveWatcher = null;
    }
    function watchForThreadPage() {
        if (!document.body || inactiveWatcher || runtime.isThreadDetailPage())
            return;
        const disposables = [
            createPageWatcher(() => {
                if (!runtime.isThreadDetailPage())
                    return;
                stopInactiveWatcher();
                mountPanelRuntime();
            }),
            createMutationWatcher({
                root: document.body,
                onMutation: () => {
                    if (!runtime.isThreadDetailPage())
                        return;
                    stopInactiveWatcher();
                    mountPanelRuntime();
                },
            }),
        ];
        inactiveWatcher = {
            dispose() {
                disposables.forEach((disposable) => disposable.dispose());
            },
        };
    }
    function scheduleAutoSave(panel, delay = AUTO_SAVE_DEBOUNCE_MS) {
        if (!panelIsAutoSaveActive(panel))
            return;
        clearTimeout(panel.autoSaveTimer);
        panel.autoSaveTimer = setTimeout(() => {
            autoSaveCurrentPage(panel).catch((error) => {
                console.error(error);
                panel.controller.setStatus(`自动记录失败：${error instanceof Error ? error.message : String(error)}`, 'error');
            });
        }, delay);
    }
    async function autoSaveCurrentPage(panel) {
        if (!panelIsAutoSaveActive(panel))
            return;
        if (panel.autoSaving) {
            panel.autoSaveQueued = true;
            return;
        }
        panel.autoSaving = true;
        try {
            const signature = getCurrentPageSignature();
            if (!signature) {
                panel.controller.setStatus('面板已启用，但没有找到可记录的回复', 'error');
                return;
            }
            if (panel.lastAutoSaveSignature === signature)
                return;
            panel.controller.setStatus('正在自动记录当前页...', 'saving');
            const saved = await saveCurrentPageRecords(panel, '面板已启用，但没有找到可记录的回复');
            if (saved)
                panel.lastAutoSaveSignature = signature;
        }
        finally {
            panel.autoSaving = false;
            if (panel.autoSaveQueued) {
                panel.autoSaveQueued = false;
                scheduleAutoSave(panel, 0);
            }
        }
    }
    async function saveCurrentPageRecords(panel, emptyMessage = '没有找到可记录的回复') {
        const rows = runtime.extractReplies();
        if (!rows.length) {
            panel.controller.setStatus(emptyMessage, 'error');
            return null;
        }
        const result = await repository.saveRecords(rows);
        panel.controller.setStatus(`本页 ${rows.length} 条，新增 ${result.added} 条，当前帖 ${result.currentThreadTotal} 条，全库 ${result.total} 条`, 'saved');
        return { rows, result };
    }
    async function exportRows(panel, rowsPromise, ext, scopeLabel) {
        const rows = await rowsPromise;
        if (!rows.length) {
            panel.controller.setStatus(`${scopeLabel}没有可导出的记录`, 'error');
            return;
        }
        downloadRows(rows, ext, safeFilename(ext, scopeLabel, config.filenamePrefix), scopeLabel);
        panel.controller.setStatus(`已导出 ${scopeLabel} ${rows.length} 条`, 'saved');
    }
    async function exportRowsByAuthor(panel, ext) {
        const query = prompt('输入作者名或 uid');
        if (!query)
            return;
        const normalizedQuery = normalizeText(query);
        const rows = await repository.readRecordsByAuthorQuery(normalizedQuery);
        await exportRows(panel, Promise.resolve(rows), ext, `作者-${normalizedQuery}`);
    }
    async function clearRecordsByAuthor(panel) {
        const query = prompt('输入要清空的作者名或 uid');
        if (!query)
            return;
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery)
            return;
        const rows = await repository.readRecordsByExactAuthorQuery(normalizedQuery);
        if (!rows.length) {
            panel.controller.setStatus(`没有找到作者“${normalizedQuery}”的记录`);
            return;
        }
        const authors = repository.summarizeAuthorsFromRecords(rows);
        if (!confirm(formatAuthorClearConfirm(normalizedQuery, rows, authors)))
            return;
        const result = await repository.clearAuthorRecords(normalizedQuery);
        panel.controller.setStatus(`已清空作者“${normalizedQuery}” ${result.deleted} 条记录，影响 ${result.threadCount} 个帖子`);
    }
    async function exportSelectedRows(panel) {
        const scope = panel.controller.element.querySelector('[data-role="export-scope"]')?.value || 'current';
        const ext = panel.controller.element.querySelector('[data-role="export-format"]')?.value || 'xlsx';
        if (scope === 'current') {
            await exportRows(panel, repository.readRecordsByThread(currentThreadKey()), ext, '当前帖');
            return;
        }
        if (scope === 'author') {
            await exportRowsByAuthor(panel, ext);
            return;
        }
        await exportRows(panel, repository.readAllRecords(), ext, '全部帖子');
    }
    async function initializePanel(panel) {
        try {
            panel.migrationPromise = panel.migrationPromise || migrateLegacyIndexedDb(repository);
            const migratedCount = await panel.migrationPromise;
            const currentPageCount = runtime.extractReplies().length;
            const [currentRecords, threads, total] = await Promise.all([
                repository.readRecordsByThread(currentThreadKey()),
                repository.readThreads(),
                db.count(STORES.replies),
            ]);
            if (!panel.autoSaving) {
                panel.controller.setStatus(`当前页 ${currentPageCount} 条，当前帖已记录 ${currentRecords.length} 条，资料库 ${threads.length} 帖/${total} 条${migratedCount ? `，迁移旧数据 ${migratedCount} 条` : ''}`);
            }
            if (panel.controller.getState() !== 'closed')
                await autoSaveCurrentPage(panel);
        }
        catch (error) {
            console.error(error);
            panel.controller.setStatus(`IndexedDB 初始化失败：${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    }
    async function handlePanelAction(panel, action) {
        if (action === 'toggle') {
            const nextState = panel.controller.getState() === 'collapsed' ? 'expanded' : 'collapsed';
            if (!runtime.isThreadDetailPage()) {
                removePanelUi();
                return;
            }
            setStoredPanelState(config.panelStateKey, nextState);
            panel.controller.applyState(nextState);
            await autoSaveCurrentPage(panel);
            return;
        }
        if (action === 'close') {
            setStoredPanelState(config.panelStateKey, 'closed');
            unmountPanel();
            buildPanelLauncher();
            return;
        }
        if (action === 'save') {
            await saveCurrentPageRecords(panel);
            return;
        }
        if (action === 'export-current-xlsx') {
            await exportRows(panel, repository.readRecordsByThread(currentThreadKey()), 'xlsx', '当前帖');
            return;
        }
        if (action === 'clear-current') {
            if (!confirm('确定清空当前帖子在 IndexedDB 中的所有回复？'))
                return;
            const deleted = await repository.clearCurrentThreadRecords(currentThreadKey());
            panel.controller.setStatus(`已清空当前帖 ${deleted} 条记录`);
            return;
        }
        if (action === 'clear-author') {
            await clearRecordsByAuthor(panel);
            return;
        }
        if (action === 'threads') {
            const threads = await repository.readThreads();
            panel.controller.showTextModal('已采集帖子', formatThreads(threads));
            panel.controller.setStatus(`资料库已有 ${threads.length} 个帖子`);
            return;
        }
        if (action === 'authors') {
            const authors = await repository.readAuthors();
            panel.controller.showTextModal('作者统计', formatAuthors(authors));
            panel.controller.setStatus(`资料库已有 ${authors.length} 个作者`);
            return;
        }
        if (action === 'search') {
            const keyword = prompt('输入跨帖检索关键词');
            if (!keyword)
                return;
            const rows = await repository.searchRecords(keyword);
            panel.controller.showTextModal(`检索结果：${keyword}`, formatRecordMatches(rows));
            panel.controller.setStatus(`关键词“${keyword}”匹配 ${rows.length} 条`);
            return;
        }
        if (action === 'export-author-xlsx') {
            await exportRowsByAuthor(panel, 'xlsx');
            return;
        }
        if (action === 'export-selected') {
            await exportSelectedRows(panel);
            return;
        }
        if (action === 'copy-all-csv') {
            const rows = await repository.readAllRecords();
            if (!rows.length) {
                panel.controller.setStatus('还没有记录，先点“记录本页”', 'error');
                return;
            }
            await copyText(toCsv(rows).replace(/^\ufeff/, ''));
            panel.controller.setStatus(`已复制全部帖子 ${rows.length} 条`, 'saved');
            return;
        }
        if (action === 'clear-all') {
            if (!confirm('确定清空 IndexedDB 中所有帖子、回复和作者统计？'))
                return;
            await repository.clearAllRecords();
            panel.controller.setStatus('已清空全部资料库');
        }
    }
    function mountPanelRuntime() {
        if (!document.body)
            return false;
        if (!runtime.isThreadDetailPage()) {
            removePanelUi();
            watchForThreadPage();
            return false;
        }
        stopInactiveWatcher();
        if (document.getElementById(panelId))
            return true;
        const initialState = getStoredPanelState(config.panelStateKey);
        if (initialState === 'closed') {
            buildPanelLauncher();
            return true;
        }
        document.getElementById(launcherId)?.remove();
        launcherWatcher?.dispose();
        launcherWatcher = null;
        ensureIndexedDbSupported();
        const controller = createReplyExtractorPanel({
            config,
            initialState,
            onAction: async (_controller, action) => {
                if (activePanel)
                    await handlePanelAction(activePanel, action);
            },
        });
        const panelRuntime = {
            controller,
            disposables: [],
            autoSaving: false,
            autoSaveQueued: false,
            lastAutoSaveSignature: '',
            lastPageStateSignature: getCurrentPageSignature(undefined, { allowEmptyRows: true }),
            migrationPromise: undefined,
        };
        activePanel = panelRuntime;
        document.body.appendChild(controller.element);
        panelRuntime.disposables.push(createMutationWatcher({
            root: document.body,
            onMutation: (mutations) => {
                if (mutations.some((mutation) => runtime.isRelevantMutation(mutation, isExtractorUiNode))) {
                    scheduleAutoSave(panelRuntime);
                }
            },
        }), createPageWatcher(() => {
            if (!document.body.contains(controller.element)) {
                unmountPanel();
                return;
            }
            if (!runtime.isThreadDetailPage()) {
                removePanelUi();
                watchForThreadPage();
                return;
            }
            const signature = getCurrentPageSignature(undefined, { allowEmptyRows: true });
            if (signature === panelRuntime.lastPageStateSignature)
                return;
            panelRuntime.lastPageStateSignature = signature;
            scheduleAutoSave(panelRuntime);
        }));
        initializePanel(panelRuntime);
        return true;
    }
    function unmountPanel() {
        if (!activePanel)
            return;
        clearTimeout(activePanel.autoSaveTimer);
        activePanel.disposables.forEach((disposable) => disposable.dispose());
        activePanel.controller.dispose();
        activePanel.controller.element.remove();
        activePanel = null;
    }
    function removePanelUi() {
        unmountPanel();
        launcherWatcher?.dispose();
        launcherWatcher = null;
        document.getElementById(launcherId)?.remove();
    }
    function buildPanelLauncher() {
        if (!document.body)
            return;
        if (!runtime.isThreadDetailPage()) {
            removePanelUi();
            watchForThreadPage();
            return;
        }
        if (document.getElementById(launcherId))
            return;
        unmountPanel();
        const launcher = createPanelLauncher({
            config,
            onClick: () => {
                if (!runtime.isThreadDetailPage()) {
                    removePanelUi();
                    return;
                }
                setStoredPanelState(config.panelStateKey, 'expanded');
                document.getElementById(launcherId)?.remove();
                launcherWatcher?.dispose();
                launcherWatcher = null;
                mountPanelRuntime();
            },
        });
        document.body.appendChild(launcher);
        launcherWatcher = createPageWatcher(() => {
            if (!document.body.contains(launcher)) {
                launcherWatcher?.dispose();
                launcherWatcher = null;
                return;
            }
            if (!runtime.isThreadDetailPage()) {
                removePanelUi();
                watchForThreadPage();
            }
        });
    }
    startWhenBodyReady(() => {
        if (!mountPanelRuntime())
            watchForThreadPage();
    });
    window.addEventListener('pagehide', () => db.close());
}

function isElement$1(node) {
    return node?.nodeType === Node.ELEMENT_NODE;
}
function hasNgaReplyDom() {
    const postboxes = Array.from(document.querySelectorAll('table.postbox'));
    if (postboxes.some((container) => {
        const hasDate = container.querySelector('[id^="postdate"], .postdatec, .postinfot');
        const hasContent = Array.from(container.querySelectorAll('[id^="postcontent"]')).some((el) => /^postcontent\d+$/.test(el.id)) ||
            container.querySelector('.postcontent.ubbcode, .postcontent');
        return hasDate && hasContent;
    })) {
        return true;
    }
    const contentEl = Array.from(document.querySelectorAll('[id^="postcontent"]')).find((el) => /^postcontent\d+$/.test(el.id)) ||
        document.querySelector('.postcontent.ubbcode, .postcontent');
    const dateEl = document.querySelector('[id^="postdate"], .postdatec, .postinfot');
    return Boolean(contentEl && dateEl);
}
function isThreadDetailPage$1() {
    return Boolean(getUrlParam('tid') && hasNgaReplyDom());
}
function getPageNumber$1() {
    const pageFromUrl = getUrlParam('page');
    if (pageFromUrl)
        return pageFromUrl;
    const currentPage = document.querySelector('[name="pageball"] .invert, #pagebbtm .invert, #pagebtop .invert');
    return normalizeText(currentPage?.textContent || '').replace(/[^\d]/g, '');
}
function getThreadInfo$1() {
    const navLinks = Array.from(document.querySelectorAll('.nav a'));
    const forumLink = navLinks.find((a) => /thread\.php\?fid=/.test(a.href));
    const threadLink = navLinks.find((a) => /read\.php\?tid=/.test(a.href) && !/authorid=/.test(a.href));
    return {
        threadId: getUrlParam('tid'),
        threadTitle: normalizeText(threadLink?.textContent || document.title),
        forumName: normalizeText(forumLink?.textContent || ''),
        page: getPageNumber$1(),
    };
}
function getContentNode$1(container) {
    return (Array.from(container.querySelectorAll('[id^="postcontent"]')).find((el) => /^postcontent\d+$/.test(el.id)) ||
        container.querySelector('.postcontent.ubbcode, .postcontent') ||
        null);
}
function getFloor$1(container) {
    const floorLink = container.querySelector('.posterinfo a[name^="l"]') || container.querySelector('a.vertmod[href*="#pid"]') || container.querySelector('a[name^="l"]');
    return normalizeText(floorLink?.textContent || '').replace(/[^\d]/g, '');
}
function getPid$1(container) {
    const anchor = container.querySelector('a[id^="pid"][id$="Anchor"]');
    const idMatch = anchor?.id?.match(/^pid(\d+)Anchor$/);
    if (idMatch)
        return idMatch[1];
    const href = container.querySelector('a[href*="#pid"][href*="Anchor"]')?.getAttribute('href') || '';
    return href.match(/#pid(\d+)Anchor/)?.[1] || '';
}
function getAuthorInfo$1(container) {
    const authorEl = Array.from(container.querySelectorAll('[id^="postauthor"]')).find((el) => /^postauthor\d+$/.test(el.id)) ||
        container.querySelector('.author, .userlink');
    const uidEl = container.querySelector('[name="uid"]') || container.querySelector('a[href*="uid="], a[href*="uid%3D"]');
    const author = normalizeText(authorEl?.textContent || '');
    let uid = normalizeText(uidEl?.textContent || '');
    if (!/^\d+$/.test(uid)) {
        const href = authorEl?.getAttribute('href') || uidEl?.getAttribute('href') || '';
        uid = href.match(/[?&]uid=(\d+)/)?.[1] || href.match(/uid%3D(\d+)/i)?.[1] || '';
    }
    return {
        '作者name': author,
        uid,
    };
}
function getQuoteText$1(contentEl) {
    return Array.from(contentEl.querySelectorAll('.quote'))
        .map((quote) => textFromNode(quote))
        .filter(Boolean)
        .join('\n---\n');
}
function extractFromNgaDom() {
    const containers = Array.from(document.querySelectorAll('table.postbox'));
    const threadInfo = getThreadInfo$1();
    const collectedAt = new Date().toISOString();
    const sourceUrl = getCanonicalOrCurrentUrl();
    const rows = [];
    const seen = new Set();
    for (const container of containers) {
        const dateEl = container.querySelector('[id^="postdate"], .postdatec, .postinfot');
        const contentEl = getContentNode$1(container);
        if (!dateEl || !contentEl)
            continue;
        const postTime = normalizeText(dateEl.textContent);
        const replyContent = textFromNode(contentEl, { removeQuotes: true });
        const quoteContent = getQuoteText$1(contentEl);
        const fullContent = textFromNode(contentEl);
        if (!postTime || !fullContent)
            continue;
        const row = finalizeRecord({
            siteKey: 'nga',
            ...threadInfo,
            floor: getFloor$1(container),
            pid: getPid$1(container),
            ...getAuthorInfo$1(container),
            '发帖时间': postTime,
            '回复内容': replyContent || fullContent,
            '引用内容': quoteContent,
            '回复全文': fullContent,
            '来源URL': sourceUrl,
            '采集时间': collectedAt,
        });
        if (seen.has(row._key))
            continue;
        seen.add(row._key);
        rows.push(row);
    }
    return rows;
}
function extractReplies$1() {
    const rows = extractFromNgaDom();
    if (rows.length)
        return rows;
    const timeSelector = ['[id^="postdate"]', '.postdatec', '.post-time', '.post_time', '.postdate', 'time'].join(',');
    const contentSelector = ['[id^="postcontent"]', '.postcontent', '.reply-content', '.reply_content', '.content', 'article'].join(',');
    const threadInfo = getThreadInfo$1();
    const sourceUrl = getCanonicalOrCurrentUrl();
    const collectedAt = new Date().toISOString();
    const result = [];
    const seen = new Set();
    for (const timeNode of Array.from(document.querySelectorAll(timeSelector))) {
        const container = timeNode.closest('table, article, li, .post, .reply, .postrow') || timeNode.parentElement;
        if (!container)
            continue;
        const contentNode = container?.querySelector(contentSelector);
        const postTime = normalizeText(timeNode.textContent || timeNode.getAttribute('datetime'));
        const fullContent = contentNode ? textFromNode(contentNode) : '';
        if (!postTime || !fullContent)
            continue;
        const row = finalizeRecord({
            siteKey: 'nga',
            ...threadInfo,
            floor: getFloor$1(container),
            pid: getPid$1(container),
            ...getAuthorInfo$1(container),
            '发帖时间': postTime,
            '回复内容': contentNode ? textFromNode(contentNode, { removeQuotes: true }) || fullContent : fullContent,
            '引用内容': contentNode ? getQuoteText$1(contentNode) : '',
            '回复全文': fullContent,
            '来源URL': sourceUrl,
            '采集时间': collectedAt,
        });
        if (seen.has(row._key))
            continue;
        seen.add(row._key);
        result.push(row);
    }
    return result;
}
function isRelevantMutation$1(mutation, isExtractorUiNode) {
    if (isExtractorUiNode(mutation.target))
        return false;
    const relevantSelector = 'table.postbox, #m_posts, #m_posts_c, [id^="postcontent"], [id^="postdate"], .postcontent';
    if (mutation.type === 'attributes')
        return isElement$1(mutation.target) && Boolean(mutation.target.closest(relevantSelector));
    const nodes = [...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])].filter((node) => node.nodeType === Node.ELEMENT_NODE);
    if (!nodes.length)
        return isElement$1(mutation.target) && Boolean(mutation.target.closest(relevantSelector));
    return nodes.some((node) => {
        if (isExtractorUiNode(node))
            return false;
        if (!isElement$1(node))
            return false;
        return Boolean(node.matches?.(relevantSelector) || node.querySelector?.('table.postbox, [id^="postcontent"], [id^="postdate"], .postcontent'));
    });
}
const ngaReplyExtractorAdapter = {
    isThreadDetailPage: isThreadDetailPage$1,
    getThreadInfo: getThreadInfo$1,
    extractReplies: extractReplies$1,
    isRelevantMutation: isRelevantMutation$1,
};

function isElement(node) {
    return node?.nodeType === Node.ELEMENT_NODE;
}
function s1ImagePlaceholder(img) {
    return img.hasAttribute('smilieid') ? '[表情]' : '[图片]';
}
function hasS1ReplyDom() {
    return Boolean(document.querySelector('#postlist td.t_f[id^="postmessage_"], div[id^="post_"] td.t_f[id^="postmessage_"]') &&
        document.querySelector('[id^="authorposton"]'));
}
function isThreadDetailPage() {
    return Boolean(getThreadIdFromS1Url() && hasS1ReplyDom());
}
function getThreadIdFromS1Url() {
    const candidates = [
        location.href,
        getCanonicalOrCurrentUrl(),
        document.querySelector('a[href*="thread-"]')?.href || '',
        document.querySelector('a[href*="tid="], a[href*="ptid="]')?.href || '',
    ];
    for (const href of candidates) {
        const threadMatch = String(href).match(/thread-(\d+)-/);
        if (threadMatch)
            return threadMatch[1];
        try {
            const url = new URL(href, location.href);
            const id = url.searchParams.get('tid') || url.searchParams.get('ptid');
            if (id)
                return id;
        }
        catch (_) {
            // Ignore malformed saved-page URLs.
        }
    }
    return '';
}
function getPageNumber() {
    const pageFromUrl = getUrlParam('page');
    if (pageFromUrl)
        return pageFromUrl;
    const urlPage = [location.href, getCanonicalOrCurrentUrl()]
        .map((href) => String(href).match(/thread-\d+-(\d+)-/)?.[1])
        .find(Boolean);
    if (urlPage)
        return urlPage;
    const pageInput = document.querySelector('input[name="custompage"]');
    if (pageInput?.value)
        return normalizeText(pageInput.value).replace(/[^\d]/g, '');
    const currentPage = document.querySelector('#pgt .pg strong, .pg strong');
    return normalizeText(currentPage?.textContent || '').replace(/[^\d]/g, '');
}
function getThreadInfo() {
    const navLinks = Array.from(document.querySelectorAll('#pt .z a'));
    const forumLink = navLinks.find((a) => /forum-\d+-\d+\.html|forumdisplay&fid=/.test(a.href));
    const titleNode = document.querySelector('#thread_subject') ||
        navLinks.find((a) => /thread-\d+-\d+-\d+\.html/.test(a.href));
    return {
        threadId: getThreadIdFromS1Url(),
        threadTitle: normalizeText(titleNode?.textContent || document.title.replace(/\s+-\s+Stage1st.*$/i, '')),
        forumName: normalizeText(forumLink?.textContent || ''),
        page: getPageNumber(),
    };
}
function getContentNode(container) {
    return Array.from(container.querySelectorAll('td.t_f[id^="postmessage_"]')).find((el) => /^postmessage_\d+$/.test(el.id)) || null;
}
function getFloor(container) {
    const floorLink = container.querySelector('a[id^="postnum"]') || container.querySelector('.pi strong a[href*="pid="]');
    const floorText = normalizeText(floorLink?.textContent || '');
    if (floorText.includes('楼主'))
        return '1';
    return floorText.replace(/[^\d]/g, '');
}
function getPid(container) {
    const containerMatch = container?.id?.match(/^post_(\d+)$/);
    if (containerMatch)
        return containerMatch[1];
    const tableMatch = container.querySelector('table[id^="pid"]')?.id?.match(/^pid(\d+)$/);
    if (tableMatch)
        return tableMatch[1];
    const contentMatch = getContentNode(container)?.id?.match(/^postmessage_(\d+)$/);
    if (contentMatch)
        return contentMatch[1];
    const postNumMatch = container.querySelector('a[id^="postnum"]')?.id?.match(/^postnum(\d+)$/);
    if (postNumMatch)
        return postNumMatch[1];
    const href = container.querySelector('a[href*="pid="]')?.getAttribute('href') || '';
    return href.match(/[?&]pid=(\d+)/)?.[1] || '';
}
function getAuthorInfo(container) {
    const authorEl = container.querySelector('.pls .authi a.xw1') || container.querySelector('.pls a[href*="space-uid-"]');
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
function getQuoteText(contentEl) {
    return Array.from(contentEl.querySelectorAll('.quote'))
        .map((quote) => textFromNode(quote, { extraRemoveSelector: '.aimg_tip' }))
        .filter(Boolean)
        .join('\n---\n');
}
function getPostTime(container) {
    const pid = getPid(container);
    const dateEl = (pid ? container.querySelector(`#authorposton${pid}`) : null) || container.querySelector('[id^="authorposton"]');
    return normalizeText(dateEl?.textContent || '').replace(/^发表于\s*/, '');
}
function getS1PostContainers() {
    return Array.from(document.querySelectorAll('div[id^="post_"]')).filter((container) => /^post_\d+$/.test(container.id) && getContentNode(container));
}
function extractFromS1Dom() {
    const containers = getS1PostContainers();
    const threadInfo = getThreadInfo();
    const collectedAt = new Date().toISOString();
    const sourceUrl = getCanonicalOrCurrentUrl();
    const rows = [];
    const seen = new Set();
    for (const container of containers) {
        const contentEl = getContentNode(container);
        if (!contentEl)
            continue;
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
        if (!postTime || !fullContent)
            continue;
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
        if (seen.has(row._key))
            continue;
        seen.add(row._key);
        rows.push(row);
    }
    return rows;
}
function extractReplies() {
    const rows = extractFromS1Dom();
    if (rows.length)
        return rows;
    const timeSelector = ['[id^="authorposton"]', '.post-time', '.post_time', '.postdate', 'time'].join(',');
    const contentSelector = ['td.t_f[id^="postmessage_"]', '.reply-content', '.reply_content', '.content', 'article'].join(',');
    const threadInfo = getThreadInfo();
    const sourceUrl = getCanonicalOrCurrentUrl();
    const collectedAt = new Date().toISOString();
    const result = [];
    const seen = new Set();
    for (const timeNode of Array.from(document.querySelectorAll(timeSelector))) {
        const container = timeNode.closest('div[id^="post_"], table, article, li, .post, .reply, .postrow') || timeNode.parentElement;
        if (!container)
            continue;
        const contentNode = container?.querySelector(contentSelector);
        const postTime = normalizeText(timeNode.textContent || timeNode.getAttribute('datetime')).replace(/^发表于\s*/, '');
        const fullContent = contentNode ? textFromNode(contentNode, { extraRemoveSelector: '.aimg_tip' }) : '';
        if (!postTime || !fullContent)
            continue;
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
        if (seen.has(row._key))
            continue;
        seen.add(row._key);
        result.push(row);
    }
    return result;
}
function isRelevantMutation(mutation, isExtractorUiNode) {
    if (isExtractorUiNode(mutation.target))
        return false;
    const relevantSelector = '#postlist, div[id^="post_"], td.t_f[id^="postmessage_"], [id^="authorposton"]';
    if (mutation.type === 'attributes')
        return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));
    const nodes = [...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])].filter((node) => node.nodeType === Node.ELEMENT_NODE);
    if (!nodes.length)
        return isElement(mutation.target) && Boolean(mutation.target.closest(relevantSelector));
    return nodes.some((node) => {
        if (isExtractorUiNode(node))
            return false;
        if (!isElement(node))
            return false;
        return Boolean(node.matches?.(relevantSelector) || node.querySelector?.('div[id^="post_"], td.t_f[id^="postmessage_"], [id^="authorposton"]'));
    });
}
const s1ReplyExtractorAdapter = {
    isThreadDetailPage,
    getThreadInfo,
    extractReplies,
    isRelevantMutation,
};

const adapters = [ngaReplyExtractorAdapter, s1ReplyExtractorAdapter];
const config = {
    idPrefix: 'reply-extractor',
    storageName: 'reply-extractor',
    panelStateKey: 'reply-extractor-panel-state',
    runtimeKey: '_replyExtractor',
    statusAnimationName: 'replyExtractorPulse',
    displayName: '回复提取',
    compactLabel: 'RE',
    compactWidth: '36px',
    excelSheetName: '回复',
    filenamePrefix: 'replies',
};
function getActiveAdapter() {
    return adapters.find((adapter) => adapter.isThreadDetailPage()) || null;
}
createReplyExtractor({
    config,
    isThreadDetailPage() {
        return Boolean(getActiveAdapter());
    },
    getThreadInfo() {
        return (getActiveAdapter()?.getThreadInfo() || {
            threadId: '',
            threadTitle: '',
            forumName: '',
            page: '',
        });
    },
    extractReplies() {
        return getActiveAdapter()?.extractReplies() || [];
    },
    isRelevantMutation(mutation, isExtractorUiNode) {
        return Boolean(getActiveAdapter()?.isRelevantMutation(mutation, isExtractorUiNode));
    },
});
