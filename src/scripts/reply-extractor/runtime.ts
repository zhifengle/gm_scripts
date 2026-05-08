import { AUTO_SAVE_DEBOUNCE_MS, STORES } from './constants';
import { ensureIndexedDbSupported, IndexedDatabase } from './db';
import { copyText, downloadRows, safeFilename, toCsv } from './export';
import {
  formatAuthorClearConfirm,
  formatAuthors,
  formatRecordMatches,
  formatThreads,
} from './format';
import { createMutationWatcher, createPageWatcher, Disposable, startWhenBodyReady } from './lifecycle';
import {
  createPanelLauncher,
  createReplyExtractorPanel,
  getStoredPanelState,
  setStoredPanelState,
} from './panel';
import { migrateLegacyIndexedDb } from './migration';
import { ReplyRepository } from './repository';
import {
  ExportFormat,
  ExportScope,
  PanelAction,
  PanelController,
  ReplyExtractorRuntime,
  ReplyRecord,
} from './types';
import { normalizeText } from './utils';

type RuntimePanel = {
  controller: PanelController;
  disposables: Disposable[];
  autoSaveTimer?: ReturnType<typeof setTimeout>;
  autoSaving: boolean;
  autoSaveQueued: boolean;
  lastAutoSaveSignature: string;
  lastPageStateSignature: string;
  migrationPromise?: Promise<number>;
};

export function createReplyExtractor(runtime: ReplyExtractorRuntime) {
  const { config } = runtime;
  const panelId = `${config.idPrefix}-panel`;
  const launcherId = `${config.idPrefix}-launcher`;
  const db = new IndexedDatabase(config.storageName);
  const repository = new ReplyRepository(db);
  let activePanel: RuntimePanel | null = null;
  let launcherWatcher: Disposable | null = null;
  let inactiveWatcher: Disposable | null = null;

  function currentThreadKey() {
    return runtime.extractReplies()[0]?.threadKey || '';
  }

  function isExtractorUiNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return Boolean((node as Element).closest?.(`#${panelId}, #${launcherId}, #${config.idPrefix}-modal`));
  }

  function getCurrentPageSignature(rows = runtime.extractReplies(), options: { allowEmptyRows?: boolean } = {}) {
    if (!rows.length && !options.allowEmptyRows) return '';
    const threadInfo = runtime.getThreadInfo();
    const rowSignature = rows.map((row) => row._key).sort().join('|');
    return [location.href, rows[0]?.threadKey || threadInfo.threadId, threadInfo.page, rows.length, rowSignature].join('::');
  }

  function panelIsAutoSaveActive(panel: RuntimePanel) {
    return document.body.contains(panel.controller.element) && panel.controller.getState() !== 'closed';
  }

  function stopInactiveWatcher() {
    inactiveWatcher?.dispose();
    inactiveWatcher = null;
  }

  function watchForThreadPage() {
    if (!document.body || inactiveWatcher || runtime.isThreadDetailPage()) return;

    const disposables: Disposable[] = [
      createPageWatcher(() => {
        if (!runtime.isThreadDetailPage()) return;
        stopInactiveWatcher();
        mountPanelRuntime();
      }),
      createMutationWatcher({
        root: document.body,
        onMutation: () => {
          if (!runtime.isThreadDetailPage()) return;
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

  function scheduleAutoSave(panel: RuntimePanel, delay = AUTO_SAVE_DEBOUNCE_MS) {
    if (!panelIsAutoSaveActive(panel)) return;
    clearTimeout(panel.autoSaveTimer);
    panel.autoSaveTimer = setTimeout(() => {
      autoSaveCurrentPage(panel).catch((error) => {
        console.error(error);
        panel.controller.setStatus(`自动记录失败：${error instanceof Error ? error.message : String(error)}`, 'error');
      });
    }, delay);
  }

  async function autoSaveCurrentPage(panel: RuntimePanel) {
    if (!panelIsAutoSaveActive(panel)) return;
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
      if (panel.lastAutoSaveSignature === signature) return;

      panel.controller.setStatus('正在自动记录当前页...', 'saving');
      const saved = await saveCurrentPageRecords(panel, '面板已启用，但没有找到可记录的回复');
      if (saved) panel.lastAutoSaveSignature = signature;
    } finally {
      panel.autoSaving = false;
      if (panel.autoSaveQueued) {
        panel.autoSaveQueued = false;
        scheduleAutoSave(panel, 0);
      }
    }
  }

  async function saveCurrentPageRecords(panel: RuntimePanel, emptyMessage = '没有找到可记录的回复') {
    const rows = runtime.extractReplies();
    if (!rows.length) {
      panel.controller.setStatus(emptyMessage, 'error');
      return null;
    }

    const result = await repository.saveRecords(rows);
    panel.controller.setStatus(
      `本页 ${rows.length} 条，新增 ${result.added} 条，当前帖 ${result.currentThreadTotal} 条，全库 ${result.total} 条`,
      'saved'
    );
    return { rows, result };
  }

  async function exportRows(panel: RuntimePanel, rowsPromise: Promise<ReplyRecord[]>, ext: ExportFormat, scopeLabel: string) {
    const rows = await rowsPromise;
    if (!rows.length) {
      panel.controller.setStatus(`${scopeLabel}没有可导出的记录`, 'error');
      return;
    }

    downloadRows(rows, ext, safeFilename(ext, scopeLabel, config.filenamePrefix), scopeLabel);
    panel.controller.setStatus(`已导出 ${scopeLabel} ${rows.length} 条`, 'saved');
  }

  async function exportRowsByAuthor(panel: RuntimePanel, ext: ExportFormat) {
    const query = prompt('输入作者名或 uid');
    if (!query) return;

    const normalizedQuery = normalizeText(query);
    const rows = await repository.readRecordsByAuthorQuery(normalizedQuery);
    await exportRows(panel, Promise.resolve(rows), ext, `作者-${normalizedQuery}`);
  }

  async function clearRecordsByAuthor(panel: RuntimePanel) {
    const query = prompt('输入要清空的作者名或 uid');
    if (!query) return;

    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return;

    const rows = await repository.readRecordsByExactAuthorQuery(normalizedQuery);
    if (!rows.length) {
      panel.controller.setStatus(`没有找到作者“${normalizedQuery}”的记录`);
      return;
    }

    const authors = repository.summarizeAuthorsFromRecords(rows);
    if (!confirm(formatAuthorClearConfirm(normalizedQuery, rows, authors))) return;

    const result = await repository.clearAuthorRecords(normalizedQuery);
    panel.controller.setStatus(`已清空作者“${normalizedQuery}” ${result.deleted} 条记录，影响 ${result.threadCount} 个帖子`);
  }

  async function exportSelectedRows(panel: RuntimePanel) {
    const scope = panel.controller.element.querySelector<HTMLSelectElement>('[data-role="export-scope"]')?.value as ExportScope || 'current';
    const ext = panel.controller.element.querySelector<HTMLSelectElement>('[data-role="export-format"]')?.value as ExportFormat || 'xlsx';

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

  async function initializePanel(panel: RuntimePanel) {
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
        panel.controller.setStatus(
          `当前页 ${currentPageCount} 条，当前帖已记录 ${currentRecords.length} 条，资料库 ${threads.length} 帖/${total} 条${migratedCount ? `，迁移旧数据 ${migratedCount} 条` : ''}`
        );
      }

      if (panel.controller.getState() !== 'closed') await autoSaveCurrentPage(panel);
    } catch (error) {
      console.error(error);
      panel.controller.setStatus(`IndexedDB 初始化失败：${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  async function handlePanelAction(panel: RuntimePanel, action: PanelAction) {
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
      if (!confirm('确定清空当前帖子在 IndexedDB 中的所有回复？')) return;
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
      if (!keyword) return;
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
      if (!confirm('确定清空 IndexedDB 中所有帖子、回复和作者统计？')) return;
      await repository.clearAllRecords();
      panel.controller.setStatus('已清空全部资料库');
    }
  }

  function mountPanelRuntime() {
    if (!document.body) return false;
    if (!runtime.isThreadDetailPage()) {
      removePanelUi();
      watchForThreadPage();
      return false;
    }
    stopInactiveWatcher();
    if (document.getElementById(panelId)) return true;

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
        if (activePanel) await handlePanelAction(activePanel, action);
      },
    });

    const panelRuntime: RuntimePanel = {
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

    panelRuntime.disposables.push(
      createMutationWatcher({
        root: document.body,
        onMutation: (mutations) => {
          if (mutations.some((mutation) => runtime.isRelevantMutation(mutation, isExtractorUiNode))) {
            scheduleAutoSave(panelRuntime);
          }
        },
      }),
      createPageWatcher(() => {
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
        if (signature === panelRuntime.lastPageStateSignature) return;
        panelRuntime.lastPageStateSignature = signature;
        scheduleAutoSave(panelRuntime);
      })
    );

    initializePanel(panelRuntime);
    return true;
  }

  function unmountPanel() {
    if (!activePanel) return;
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
    if (!document.body) return;
    if (!runtime.isThreadDetailPage()) {
      removePanelUi();
      watchForThreadPage();
      return;
    }
    if (document.getElementById(launcherId)) return;
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
    if (!mountPanelRuntime()) watchForThreadPage();
  });
  window.addEventListener('pagehide', () => db.close());
}
