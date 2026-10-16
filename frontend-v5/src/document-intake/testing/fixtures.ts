/**
 * SOLO test e harness dimostrativo: il lotto sintetico del mockup approvato (sette file).
 * Nessun componente runtime importa questo file; nel prodotto i dati arrivano dal container.
 */
import type { CandidatePage, IntakeBatch, IntakeContextKey, IntakeItem, IntakeLimits } from '../model';

export const LIMITS: IntakeLimits = { maxFiles: 20, maxTotalBytes: 200 * 1024 * 1024, maxFileBytes: 20 * 1024 * 1024, acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] };
export const CONTEXT: IntakeContextKey = { accountId: 'acc-demo', homeId: 'home-demo', batchId: 'batch-demo' };

const base = (id: string, filename: string, over: Partial<IntakeItem>): IntakeItem => ({
  id, clientItemId: `c-${id}`, version: 1, filename, byteSize: 240_000, mimeType: 'application/pdf',
  uploadState: 'stored', analysisState: 'ready', reviewState: 'unreviewed',
  documentLink: { state: 'linked', document: { id: `doc-${id}`, name: filename } },
  pageCount: 1, proposal: null, selection: null, duplicate: null, error: null, permissions: { review: true },
  ...over,
});

export const corpus = {
  ape: () => base('ape', 'APE_Casa.pdf', { pageCount: 8, proposal: { title: 'Attestato di prestazione energetica', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }], sources: [{ page: 1, excerpt: 'ATTESTATO DI PRESTAZIONE ENERGETICA\nClasse energetica: C' }] } }),
  building: () => base('edilizia', 'Pratica_CILA_e_agibilita.pdf', { pageCount: 14, proposal: { title: 'Pratica edilizia con più contenuti', parts: [{ kind: 'cila', pageFrom: 1, pageTo: 10 }, { kind: 'agibility', pageFrom: 11, pageTo: 14 }], sources: [{ page: 1, excerpt: 'COMUNICAZIONE DI INIZIO LAVORI ASSEVERATA' }, { page: 11, excerpt: 'SEGNALAZIONE CERTIFICATA DI AGIBILITÀ' }] } }),
  diagram: () => base('schema', 'Schema_impianto.pdf', { pageCount: 3, analysisState: 'needs_choice', proposal: { title: 'Schema di impianto', parts: [{ kind: 'system_diagram', pageFrom: 1, pageTo: 3 }], sources: [{ page: 1, excerpt: 'SCHEMA IMPIANTO\nPiano primo — distribuzione' }] } }),
  rules: () => base('condominio', 'Regolamento_condominio.pdf', { pageCount: 18, proposal: { title: 'Regolamento del condominio', parts: [{ kind: 'condominium_rules', pageFrom: 1, pageTo: 18 }], sources: [{ page: 1, excerpt: 'CONDOMINIO ESEMPIO\nREGOLAMENTO' }] } }),
  receipt: () => base('ricevuta', 'Ricevuta_macchina_caffe.pdf', {
    proposal: { title: 'Ricevuta macchina del caffè', parts: [{ kind: 'receipt', pageFrom: 1, pageTo: 1 }], sources: [{ page: 1, excerpt: 'RICEVUTA DIMOSTRATIVA\nTotale documento: 179,90 EUR' }] },
    existingLinks: { objects: [{ name: 'Macchina del caffè', roomName: 'Cucina' }], expenses: [{ title: 'Acquisto macchina del caffè', amountCents: 17990, spentOn: '2026-09-15' }] },
  }),
  copy: () => base('copia', 'APE_Casa_copia.pdf', { pageCount: 8, uploadState: 'duplicate', analysisState: 'not_started', duplicate: { itemId: 'ape', document: { id: 'doc-ape', name: 'APE_Casa.pdf' } } }),
  scan: () => base('scan', 'Scansione_documento.pdf', { pageCount: 2, analysisState: 'unreadable' }),
};

export const batchOf = (items: IntakeItem[], over: Partial<IntakeBatch> = {}): IntakeBatch => ({
  id: 'batch-demo', version: 1, state: 'open', limits: LIMITS, items, permissions: { upload: true, review: true, confirm: true }, ...over,
});
export const mixedBatch = () => batchOf(Object.values(corpus).map(f => f()));

export const diagramCandidates: CandidatePage = {
  items: [
    { kind: 'object', id: 'obj-idraulico', version: 2, name: 'Impianto idraulico', roomName: null },
    { kind: 'boiler', id: 'boiler-1', version: 5, name: 'Caldaia', roomName: 'Locale tecnico' },
  ],
  hasMore: false, status: 'idle',
};

// ---------------------------------------------------------------------------------------------
// B4: scelte manuali multiple, fonti perse, manifest in attesa, copia di un documento già organizzato

/** Scansione già decisa a mano con tre contenuti e intervalli, senza proposta corrente. */
export const multiPartScan = (): IntakeItem => ({
  ...corpus.scan(), pageCount: 12, reviewState: 'saved',
  selection: { action: 'organize', title: 'Faldone pratiche casa', target: { kind: 'home' }, parts: [
    { kind: 'cila', pageFrom: 1, pageTo: 4 }, { kind: 'conformity_declaration', pageFrom: 5, pageTo: 9 }, { kind: 'warranty', pageFrom: 10, pageTo: 12 },
  ] },
});

/** DTO redatto dal server (B1b): fonte persa su una copia identica. */
export const lostCopyRedacted = (): IntakeItem => ({
  ...corpus.copy(), filename: null, byteSize: null, mimeType: null, pageCount: null,
  documentLink: { state: 'unavailable', document: null }, duplicate: null, permissions: { review: false },
});
/** Stesso caso ma con valori vecchi rimasti in cache nel container: il componente non deve mostrarli. */
export const lostCopyStaleCache = (): IntakeItem => ({ ...corpus.copy(), documentLink: { state: 'unavailable', document: null } });

/** Elemento ancora senza originale: il manifest dell'utente resta visibile. */
export const pendingManifest = (): IntakeItem => ({
  ...corpus.rules(), id: 'attesa', filename: 'Verbale_assemblea.pdf', uploadState: 'pending', analysisState: 'not_started', proposal: null,
  documentLink: { state: 'unavailable', document: null },
});

/** Copia identica di un APE già archiviato e organizzato dall'account. */
export const copyOfOrganized = (): IntakeItem => ({
  ...corpus.copy(), organizationVersion: 2,
  confirmedOrganization: { title: 'APE appartamento', parts: [{ kind: 'ape', pageFrom: 1, pageTo: 8 }] },
});
