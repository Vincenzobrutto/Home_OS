/** SOLO test: props complete con callback spia, nessun trasporto reale. */
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { DocumentIntakeAssistant, type DocumentIntakeAssistantProps } from '../DocumentIntakeAssistant';
import type { ConfirmBatchOutcome, ConfirmBatchPayload, WriteOutcome } from '../model';
import { CONTEXT, LIMITS, mixedBatch } from './fixtures';

export function intakeProps(over: Partial<DocumentIntakeAssistantProps> = {}): DocumentIntakeAssistantProps {
  return {
    contextKey: CONTEXT,
    load: { status: 'ready' },
    capabilities: { enabled: true, limits: LIMITS },
    batch: mixedBatch(),
    canEdit: true,
    homeName: 'Casa esempio',
    candidates: {},
    loadCandidates: vi.fn(),
    onSelectFiles: vi.fn(),
    onRetryUpload: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'confirmed' })),
    onCancelUpload: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'confirmed' })),
    onSaveReview: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'confirmed' })),
    onRecoverReview: vi.fn(async () => ({ status: 'not_found' as const })),
    onResolveDuplicate: vi.fn(async (): Promise<WriteOutcome> => ({ status: 'confirmed' })),
    onConfirm: vi.fn(async (p: ConfirmBatchPayload): Promise<ConfirmBatchOutcome> => ({ status: 'done', results: p.items.map(i => ({ itemId: i.id, status: 'confirmed' as const })) })),
    onRecoverConfirmation: vi.fn(async () => ({ status: 'not_found' as const })),
    openOriginal: vi.fn(async () => {}),
    ...over,
  };
}

export function renderIntake(props: DocumentIntakeAssistantProps) {
  const view = render(<DocumentIntakeAssistant {...props} />);
  return { ...view, rerenderWith: (next: DocumentIntakeAssistantProps) => view.rerender(<DocumentIntakeAssistant {...next} />) };
}
