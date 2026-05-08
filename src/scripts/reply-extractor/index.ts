import { createReplyExtractor } from './core';
import { ngaReplyExtractorAdapter } from './adapters/nga';
import { s1ReplyExtractorAdapter } from './adapters/s1';
import { ReplyExtractorAdapter } from './types';

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

function getActiveAdapter(): ReplyExtractorAdapter | null {
  return adapters.find((adapter) => adapter.isThreadDetailPage()) || null;
}

createReplyExtractor({
  config,
  isThreadDetailPage() {
    return Boolean(getActiveAdapter());
  },
  getThreadInfo() {
    return (
      getActiveAdapter()?.getThreadInfo() || {
        threadId: '',
        threadTitle: '',
        forumName: '',
        page: '',
      }
    );
  },
  extractReplies() {
    return getActiveAdapter()?.extractReplies() || [];
  },
  isRelevantMutation(mutation, isExtractorUiNode) {
    return Boolean(getActiveAdapter()?.isRelevantMutation(mutation, isExtractorUiNode));
  },
});
