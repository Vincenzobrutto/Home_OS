/** SOLO test: props complete con callback spia. Nessun trasporto reale. */
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ReceiptAssistant, type ReceiptAssistantProps } from '../ReceiptAssistant';
import type { ConfirmOutcome } from '../model';
import { CONTEXT, TODAY, scenarios } from './fixtures';

export function assistantProps(name: keyof typeof scenarios, over: Partial<ReceiptAssistantProps> = {}): ReceiptAssistantProps {
  const s = scenarios[name]();
  return {
    contextKey: CONTEXT,
    load: { status: 'ready' },
    capabilities: { enabled: true, manualEnabled: true, providers: [{ id: 'prov-test', label: 'Servizio di prova', requiresConsent: true, consentText: 'Il contenuto necessario verrà inviato al servizio indicato.', costNote: null }] },
    original: { status: 'available', name: 'Ricevuta macchina del caffè.pdf', pageCount: 1 },
    draft: s.draft,
    job: { status: 'none' },
    objectCandidates: { items: s.objectCandidates, hasMore: false, status: 'idle' },
    expenseCandidates: { items: s.expenseCandidates, hasMore: false, status: 'idle' },
    today: TODAY,
    canEdit: true,
    onStartAnalysis: vi.fn(),
    onStartManual: vi.fn(),
    openOriginal: vi.fn(async () => {}),
    loadMoreCandidates: vi.fn(),
    onReview: vi.fn(),
    onConfirm: vi.fn(async (): Promise<ConfirmOutcome> => ({ status: 'confirmed', result: { newObjects: 0, newExpenses: 0, object: null, expense: null, openComparisons: 0 } })),
    onRecoverOutcome: vi.fn(async () => ({ status: 'not_found' as const })),
    onPark: vi.fn(async () => ({ status: 'parked' as const })),
    ...over,
  };
}

export function renderAssistant(props: ReceiptAssistantProps) {
  const view = render(<ReceiptAssistant {...props} />);
  return { ...view, rerenderWith: (next: ReceiptAssistantProps) => view.rerender(<ReceiptAssistant {...next} />) };
}
