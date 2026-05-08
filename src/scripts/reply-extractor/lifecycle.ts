import { PAGE_WATCH_INTERVAL_MS } from './constants';

export type Disposable = {
  dispose: () => void;
};

export function createMutationWatcher(options: {
  root: HTMLElement;
  onMutation: (mutations: MutationRecord[]) => void;
}): Disposable {
  const { root, onMutation } = options;
  if (!window.MutationObserver) return { dispose: () => undefined };

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

export function createPageWatcher(onTick: () => void, interval = PAGE_WATCH_INTERVAL_MS): Disposable {
  const timer = setInterval(onTick, interval);
  return {
    dispose() {
      clearInterval(timer);
    },
  };
}

export function startWhenBodyReady(start: () => void) {
  const run = () => {
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else {
        setTimeout(run, 0);
      }
      return;
    }
    start();
  };
  run();
}
