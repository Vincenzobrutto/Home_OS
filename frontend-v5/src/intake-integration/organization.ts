import { canonical, KINDS } from '../document-intake/model';
import type { ConfirmBatchOutcome, DocumentKind, IntakeItem, OrganizeItemPayload, OrganizeBatchPayload } from '../document-intake/model';
import type { IntakeClient, BatchWire, CapabilityWire } from './client';

export type OrganizationPayload = OrganizeBatchPayload;

/** A user-confirmed type from the already-read object draft, never fabricated extraction evidence. */
export function organizationFromObjectKind(item: IntakeItem, hint?: string): OrganizeItemPayload | null {
  const kinds: Record<string, DocumentKind> = { conformity_declaration:'conformity_declaration',invoice:'invoice',receipt:'receipt',product_label:'product_label',ape:'ape',floor_plan:'floor_plan',utility_bill:'utility_bill', purchase_document: 'purchase_document', delivery_notice: 'delivery_notice', appliance_label: 'product_label', device_label:'product_label',product_document:'manual',order_confirmation:'purchase_order' };
  const kind = hint ? kinds[hint] ?? (hint!=='other'&&KINDS.includes(hint as DocumentKind)?hint as DocumentKind:undefined) : undefined;
  if (!kind || !item.permissions.review || item.uploadState !== 'stored' || item.documentLink.state !== 'linked' || !item.documentLink.document || item.reviewState !== 'unreviewed' || item.confirmedOrganization || item.organizationVersion || item.duplicate || item.proposal || item.selection || item.selectionStale || ['queued', 'running', 'uncertain'].includes(item.analysisState)) return null;
  const title = (item.filename || item.documentLink.document.name).normalize('NFC').trim().slice(0, 120);
  if (!title) return null;
  return { itemId: item.id, expectedVersion: item.version, expectedOrganizationVersion: 0, replaceOrganization: false,
    selection: { action: 'organize', title, parts: [{ kind, pageFrom: null, pageTo: null }], target: { kind: 'home' } } };
}

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
  // BL-04: la lettura locale legge solo il testo dei PDF; foto e immagini non avviano alcuna analisi.
  return batch.items.filter(item => item.permissions.includes('edit') && item.mimeType === 'application/pdf' && ['stored', 'duplicate'].includes(item.uploadState) && item.documentLink.state === 'linked' && item.analysisState === 'not_started' && item.reviewState === 'unreviewed' && !attempted.has(batch.id + ':' + item.id))
    .map(item => ({ id: item.id, expectedVersion: item.version }));
}

/** Manual workspace intent survives local analysis, never changed sources, rights or saved decisions. */
export function sameManualOrganizationContext(before:BatchWire,after:BatchWire,itemId:string){
 const context=(batch:BatchWire)=>{const item=batch.items.find(i=>i.id===itemId);return item?{batchId:batch.id,homeId:batch.homeId,permissions:batch.permissions,item:{id:item.id,filename:item.filename,byteSize:item.byteSize,mimeType:item.mimeType,uploadState:item.uploadState,reviewState:item.reviewState,documentLink:item.documentLink,permissions:item.permissions,organizationVersion:item.organizationVersion,organization:item.organization,selection:item.selection,selectionStale:item.selectionStale,duplicate:item.duplicate}}:null;};
 const first=context(before),last=context(after);
 return !!first&&!!last&&after.version>=before.version&&after.items.find(i=>i.id===itemId)!.version>=before.items.find(i=>i.id===itemId)!.version&&canonical(first)===canonical(last);
}
