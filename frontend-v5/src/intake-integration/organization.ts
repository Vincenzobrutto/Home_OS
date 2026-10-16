import type { ConfirmBatchOutcome, OpaqueId, OpaqueVersion, ReviewPayload } from '../document-intake/model';
import type { IntakeClient, BatchWire, CapabilityWire } from './client';

// Structural match of the additive component contract; Claude owns model.ts.
export type OrganizationPayload = { batchId: OpaqueId; expectedVersion: OpaqueVersion; mode: 'single' | 'multiple'; items: ReviewPayload[] };

function receiptResults(raw: Record<string, unknown>, ids: string[]) {
  const value = raw.results;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Ricevuta di organizzazione non valida.');
  const results = value as Record<string, { state?: unknown; code?: unknown }>;
  for (const id of ids) {
    const result = results[id];
    if (result !== undefined && (!result || typeof result !== 'object' || !['confirmed', 'rejected'].includes(String(result.state)))) throw Error('Esito di organizzazione non valido.');
  }
  return results;
}

/** Recovery always uses the exact submitted body/key, including the observed versions. */
export async function organizeDocuments(client: IntakeClient, payload: OrganizationPayload, key: string, recover = false): Promise<{ wire: BatchWire; outcome: ConfirmBatchOutcome }> {
  const body = { expectedVersion: payload.expectedVersion, mode: payload.mode, items: payload.items };
  const ids = payload.items.map(item => item.itemId);
  let response = recover ? await client.recovery(payload.batchId, '/organizations/' + encodeURIComponent(key)) : await client.post(payload.batchId, '/organizations', body, key);
  let results = receiptResults(response.raw, ids);
  if (recover && ids.some(id => !results[id])) {
    response = await client.post(payload.batchId, '/organizations', body, key);
    results = receiptResults(response.raw, ids);
  }
  if (ids.some(id => !results[id])) return { wire: response.wire, outcome: { status: 'uncertain', message: 'Alcuni esiti sono ancora da verificare. Recupera l’operazione prima di confermare altre scelte.' } };
  return { wire: response.wire, outcome: { status: 'done', results: ids.map(itemId => ({ itemId, status: results[itemId]!.state === 'confirmed' ? 'confirmed' : 'rejected', ...(results[itemId]!.state === 'rejected' ? { message: 'Rivedi questo documento: proposta, dati o permessi sono cambiati.' } : {}) })) } };
}

/** Local acquisition aid only: no saved/deferred decision, external provider or organization write. */
export function localAnalysisCandidates(capability: CapabilityWire | undefined, batch: BatchWire | undefined, attempted: ReadonlySet<string>) {
  if (!capability?.enabled || !capability.analysis.enabled || capability.analysis.provider !== 'local_text_v1' || capability.analysis.externalTransmission !== false || !batch?.permissions.includes('edit')) return [];
  return batch.items.filter(item => item.permissions.includes('edit') && ['stored', 'duplicate'].includes(item.uploadState) && item.documentLink.state === 'linked' && item.analysisState === 'not_started' && item.reviewState === 'unreviewed' && !attempted.has(batch.id + ':' + item.id))
    .map(item => ({ id: item.id, expectedVersion: item.version }));
}
