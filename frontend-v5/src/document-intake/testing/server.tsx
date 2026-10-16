/**
 * SOLO test: container finto in memoria che applica gli esiti come farebbe il server (versioni incrementate,
 * stati V2). Nessun trasporto, nessuna chiave HTTP: serve a provare il componente dopo le risposte.
 */
import { vi } from 'vitest';
import type { DocumentIntakeAssistantProps } from '../DocumentIntakeAssistant';
import type { ConfirmBatchOutcome, IntakeBatch, IntakeItem, OrganizeBatchPayload, ReviewPayload, WriteOutcome } from '../model';
import { intakeProps, renderIntake } from './renderIntake';

export function withServer(initial: IntakeBatch, over: Partial<DocumentIntakeAssistantProps> = {}) {
  let batch = initial;
  const props = intakeProps({ batch, ...over });
  const view = renderIntake(props);
  const bump = (id: string, patch: Partial<IntakeItem>) => {
    batch = { ...batch, version: Number(batch.version) + 1, items: batch.items.map(i => (i.id === id ? { ...i, version: Number(i.version) + 1, ...patch } : i)) };
  };
  const refresh = () => view.rerenderWith({ ...props, batch });
  if (!over.onOrganize) {
    props.onOrganize = vi.fn(async (p: OrganizeBatchPayload): Promise<ConfirmBatchOutcome> => {
      for (const it of p.items) bump(it.itemId, { reviewState: 'confirmed', selection: it.selection, confirmedOrganization: { title: it.selection.title, parts: it.selection.parts } });
      refresh();
      return { status: 'done', results: p.items.map(i => ({ itemId: i.itemId, status: 'confirmed' as const })) };
    });
  }
  if (!over.onSaveReview) {
    props.onSaveReview = vi.fn(async (p: ReviewPayload): Promise<WriteOutcome> => {
      bump(p.itemId, { reviewState: p.selection.action === 'defer' ? 'deferred' : 'saved', selection: p.selection });
      refresh();
      return { status: 'confirmed' };
    });
  }
  if (!over.onResolveDuplicate) {
    props.onResolveDuplicate = vi.fn(async (id: string): Promise<WriteOutcome> => { bump(id, { reviewState: 'confirmed' }); refresh(); return { status: 'confirmed' }; });
  }
  refresh();
  return { props, view, refresh, get batch() { return batch; }, set batch(next: IntakeBatch) { batch = next; } };
}
