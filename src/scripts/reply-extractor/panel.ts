import { PANEL_STATES, STATUS_RESET_MS } from './constants';
import { ExtractorConfig, PanelAction, PanelController, PanelState, StatusState } from './types';

type StatusStyle = {
  color: string;
  pulse: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function styleButton(button: HTMLButtonElement) {
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

function ensureStatusAnimationStyle(config: ExtractorConfig) {
  if (document.getElementById(`${config.idPrefix}-status-style`)) return;
  const style = document.createElement('style');
  style.id = `${config.idPrefix}-status-style`;
  style.textContent = `@keyframes ${config.statusAnimationName} { 0%,100% { opacity: .45; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.18); } }`;
  document.head.appendChild(style);
}

function getStatusStyles(config: ExtractorConfig): Record<StatusState, StatusStyle> {
  return {
    idle: { color: '#9aa8ad', pulse: 'none' },
    saving: { color: '#3b82f6', pulse: `${config.statusAnimationName} 1s ease-in-out infinite` },
    saved: { color: '#16a34a', pulse: 'none' },
    skipped: { color: '#9aa8ad', pulse: 'none' },
    error: { color: '#dc2626', pulse: 'none' },
  };
}

export function getStoredPanelState(key: string): PanelState {
  const saved = GM_getValue(key, 'expanded');
  return PANEL_STATES.includes(saved) ? saved : 'expanded';
}

export function setStoredPanelState(key: string, state: PanelState) {
  GM_setValue(key, PANEL_STATES.includes(state) ? state : 'expanded');
}

export function createReplyExtractorPanel(options: {
  config: ExtractorConfig;
  initialState: PanelState;
  onAction: (panel: PanelController, action: PanelAction) => Promise<void>;
}): PanelController {
  const { config, initialState, onAction } = options;
  const statusStyles = getStatusStyles(config);
  let statusResetTimer: ReturnType<typeof setTimeout> | undefined;

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

  panel.querySelectorAll<HTMLButtonElement>('button').forEach(styleButton);
  panel.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
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

  const compact = panel.querySelector<HTMLElement>('[data-role="compact"]');
  const compactMain = panel.querySelector<HTMLElement>('[data-role="compact-main"]');
  const compactClose = panel.querySelector<HTMLElement>('[data-role="compact-close"]');
  const statusDot = panel.querySelector<HTMLElement>('[data-role="status-dot"]');

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

  const controller: PanelController = {
    element: panel,
    getState: () => (PANEL_STATES.includes(panel.dataset.state as PanelState) ? (panel.dataset.state as PanelState) : 'expanded'),
    applyState,
    setStatus,
    showTextModal,
    dispose() {
      clearTimeout(statusResetTimer);
    },
  };

  panel.addEventListener('click', async (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;

    try {
      await onAction(controller, button.dataset.action as PanelAction);
    } catch (error) {
      console.error(error);
      setStatus(`失败：${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  });

  setStatus('准备读取当前页', 'idle');
  applyState(initialState);
  return controller;

  function setCompactCloseVisible(visible: boolean) {
    if (!compactClose) return;
    compactClose.style.opacity = visible ? '1' : '0';
    compactClose.style.pointerEvents = visible ? 'auto' : 'none';
  }

  function setStatus(text: string, statusState: StatusState = 'idle') {
    const status = panel.querySelector<HTMLElement>('[data-role="status"]');
    const compactMainButton = panel.querySelector<HTMLElement>('[data-role="compact-main"]');
    const dot = panel.querySelector<HTMLElement>('[data-role="status-dot"]');
    const statusStyle = statusStyles[statusState] || statusStyles.idle;

    if (status) {
      status.textContent = text;
      status.style.color = statusState === 'error' ? '#b91c1c' : '#555';
    }
    if (compactMainButton) compactMainButton.title = `${config.displayName}: ${text}`;
    if (dot) {
      dot.style.background = statusStyle.color;
      dot.style.animation = statusStyle.pulse;
    }

    clearTimeout(statusResetTimer);
    if (statusState === 'saved' || statusState === 'error') {
      statusResetTimer = setTimeout(() => {
        const resetDot = panel.querySelector<HTMLElement>('[data-role="status-dot"]');
        if (resetDot) {
          resetDot.style.background = statusStyles.idle.color;
          resetDot.style.animation = statusStyles.idle.pulse;
        }
      }, STATUS_RESET_MS);
    }
  }

  function applyState(state: PanelState) {
    const normalizedState = PANEL_STATES.includes(state) ? state : 'expanded';
    const collapsed = normalizedState === 'collapsed';
    panel.dataset.state = normalizedState;

    const toggleButton = panel.querySelector<HTMLElement>('[data-role="expanded-panel"] [data-action="toggle"]');
    const extendedBlocks = panel.querySelectorAll<HTMLElement>('[data-expanded-only]');
    const compactBlock = panel.querySelector<HTMLElement>('[data-role="compact"]');
    const expandedPanel = panel.querySelector<HTMLElement>('[data-role="expanded-panel"]');

    if (toggleButton) toggleButton.textContent = collapsed ? '展开' : '收起';
    extendedBlocks.forEach((block) => {
      block.style.display = collapsed ? 'none' : '';
    });
    if (compactBlock) compactBlock.style.display = collapsed ? 'flex' : 'none';
    if (expandedPanel) expandedPanel.style.display = collapsed ? 'none' : 'block';
    panel.style.padding = collapsed ? '0' : '10px';
    panel.style.border = collapsed ? '0' : '1px solid #9fb3bb';
    panel.style.background = collapsed ? 'transparent' : '#f6fafb';
    panel.style.boxShadow = collapsed ? 'none' : '0 4px 18px rgba(0,0,0,.18)';
  }

  function showTextModal(title: string, content: string) {
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

    const dialog = overlay.querySelector<HTMLElement>('[data-role="dialog"]')!;
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

    const header = overlay.querySelector<HTMLElement>('[data-role="dialog-header"]')!;
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px',
    });

    const textarea = overlay.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = content;
    Object.assign(textarea.style, {
      width: '100%',
      height: '65vh',
      boxSizing: 'border-box',
      whiteSpace: 'pre',
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
    });

    overlay.querySelectorAll<HTMLButtonElement>('button').forEach(styleButton);
    overlay.addEventListener('click', (event) => {
      const target = event.target as Element;
      if (event.target === overlay || target.closest('[data-action="close"]')) overlay.remove();
    });
    document.body.appendChild(overlay);
  }
}

export function createPanelLauncher(options: {
  config: ExtractorConfig;
  onClick: () => void;
}): HTMLButtonElement {
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
