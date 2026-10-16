/**
 * Ricevuta assistita — modello UI a props (fase 1).
 *
 * Il container di Codex traduce il contratto R1 (docs/v5/receipt-assisted-spec-v1.md) in questi tipi.
 * Qui non c'è trasporto HTTP: ID e versioni sono opachi, i dati arrivano dalle props, le azioni escono
 * come payload UI stabili. Nessun dato dimostrativo: le fixture vivono solo in test e harness.
 */

// ---------------------------------------------------------------------------------------------
// Identità e contesto

export type OpaqueId = string;
export type OpaqueVersion = string | number;

/** Chiave del contesto: cambiare uno di questi valori azzera ogni stato locale del form. */
export type ReceiptContextKey = {
  accountId: OpaqueId;
  homeId: OpaqueId;
  documentId: OpaqueId;
  draftId: OpaqueId | null;
};

export function contextKeyString(key: ReceiptContextKey): string {
  return [key.accountId, key.homeId, key.documentId, key.draftId ?? ''].map(encodeURIComponent).join('|');
}

// ---------------------------------------------------------------------------------------------
// Bozza, proposte, fonti

/** Citazione già verificata dal server: pagina ed estratto letterale del documento. */
export type ReceiptCitation = { page: number; excerpt: string };
export type TextProposal = { value: string; sources: ReceiptCitation[] };
export type AmountProposal = { amountCents: number; sources: ReceiptCitation[] };

export type ProposalTextField = 'name' | 'brand' | 'model' | 'title' | 'supplier' | 'documentDate' | 'documentNumber';
export type ReceiptProposals = Partial<Record<ProposalTextField, TextProposal>> & { total?: AmountProposal | null };

/** Valore già confermato su una scheda esistente, con la sua origine (mai sostituito da questo flusso). */
export type ConfirmedValue = { value: string; origin: string };
export type CandidateReason = 'same_document' | 'same_brand_model' | (string & {});

/** Oggetto generico personale (mai una scheda caldaia). */
export type ObjectRef = {
  id: OpaqueId;
  version: OpaqueVersion;
  name: string;
  roomName: string | null;
  brand: ConfirmedValue | null;
  model: ConfirmedValue | null;
  linkedToDocument: boolean;
  reasons: CandidateReason[];
};

export type ExpenseRef = {
  id: OpaqueId;
  version: OpaqueVersion;
  title: string;
  amountCents: number;
  spentOn: string;
  linkedToDocument: boolean;
  reasons: CandidateReason[];
};

export type ComparableField = 'brand' | 'model';

/** Confronto rinviato e persistito dal server, riapribile dalla scheda o da Da rivedere. */
export type PersistedComparison = {
  id: OpaqueId;
  version: OpaqueVersion;
  objectId: OpaqueId;
  objectName: string;
  field: ComparableField;
  existing: string;
  proposed: TextProposal;
};

export type ReceiptDraft = {
  id: OpaqueId;
  version: OpaqueVersion;
  state: 'open' | 'parked' | 'confirmed' | 'partially_resolved';
  /** 'manual': bozza vuota senza analisi; i valori non ereditano citazioni né origine AI. */
  origin: 'extraction' | 'manual';
  proposals: ReceiptProposals;
  linkedObjects: ObjectRef[];
  linkedExpenses: ExpenseRef[];
  openComparisons: PersistedComparison[];
};

export type CandidatePage<T> = { items: T[]; hasMore: boolean; status: 'idle' | 'loading' | 'error' };

export type ReceiptOriginal = { status: 'available' | 'unavailable'; name: string; pageCount: number | null };

/** Stato di caricamento fornito dal container. 'unavailable' corrisponde a un 403: nessun dettaglio. */
export type ReceiptLoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'unavailable' };

/** Capacità reali lette dal server; nessun provider o consenso inventato dal componente. */
export type ReceiptCapabilities = {
  enabled: boolean;
  manualEnabled: boolean;
  providers: Array<{ id: OpaqueId; label: string; requiresConsent: boolean; consentText: string; costNote: string | null }>;
};

/** Stato del job di analisi, se il container ne segue uno. */
export type ReceiptJobState =
  | { status: 'none' }
  | { status: 'starting' | 'queued' | 'running' }
  | { status: 'failed'; reason: 'read_failed' | 'no_supported_data' | 'multiple_items' | 'service' | 'other'; message: string }
  | { status: 'uncertain'; message: string };

// ---------------------------------------------------------------------------------------------
// Esiti delle azioni (forniti dalle callback del container)

export type ConfirmationResult = {
  newObjects: 0 | 1;
  newExpenses: 0 | 1;
  object: { id: OpaqueId; name: string } | null;
  expense: { id: OpaqueId; title: string; amountCents: number } | null;
  openComparisons: number;
};

export type ConfirmOutcome =
  | { status: 'confirmed'; result: ConfirmationResult }
  /** Esito certo: nulla è stato salvato. */
  | { status: 'rejected'; code: 'validation' | 'conflict' | 'forbidden' | 'unavailable'; message: string }
  /** Esito non noto (rete): il form e il payload restano; nessun reinvio automatico. */
  | { status: 'unknown'; message?: string };

export type RecoverOutcome = ConfirmOutcome | { status: 'not_found' };
export type ParkOutcome = { status: 'parked' } | { status: 'rejected'; message: string };

// ---------------------------------------------------------------------------------------------
// Stato del form

export const OBJECT_FIELDS = ['name', 'brand', 'model'] as const;
export const EXPENSE_FIELDS = ['title', 'amount', 'date', 'supplier'] as const;
export type FormField = (typeof OBJECT_FIELDS)[number] | (typeof EXPENSE_FIELDS)[number];

export type ObjectChoice = { kind: 'unset' } | { kind: 'create' } | { kind: 'reuse'; id: OpaqueId } | { kind: 'skip' };
export type ExpenseChoice = { kind: 'unset' } | { kind: 'create' } | { kind: 'reuse'; id: OpaqueId } | { kind: 'skip' };
export type ComparisonDecision = 'keep_existing' | 'defer';

export type ReceiptFormState = {
  values: Record<FormField, string>;
  object: ObjectChoice;
  expense: ExpenseChoice;
  /** Su un oggetto esistente: completare i campi vuoti con i dati della ricevuta. */
  enrich: boolean;
  /** Decisioni per i confronti discordanti marca/modello, per oggetto e campo. Nessun default. */
  decisions: Partial<Record<string, ComparisonDecision>>;
};

export const LIMITS = { name: 120, title: 120, brand: 80, model: 120, supplier: 120, maxCents: 999_999_999 } as const;

/** NFC + spazi compressi + trim, come il backend. */
export const normalized = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
const codePoints = (value: string) => [...normalized(value)].length;

export const decisionKey = (objectId: OpaqueId, field: ComparableField) => `${encodeURIComponent(objectId)}:${field}`;

/** Valore iniziale di un campo del form a partire dalla proposta (vuoto per le bozze manuali). */
function proposalText(draft: ReceiptDraft, field: FormField): string {
  if (draft.origin === 'manual') return '';
  const p = draft.proposals;
  if (field === 'amount') return p.total ? centsToInput(p.total.amountCents) : '';
  if (field === 'date') return p.documentDate?.value ?? '';
  return p[field]?.value ?? '';
}

export function allObjects(draft: ReceiptDraft, candidates: ObjectRef[]): ObjectRef[] {
  const seen = new Set<OpaqueId>();
  return [...draft.linkedObjects, ...candidates].filter(o => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}
export function allExpenses(draft: ReceiptDraft, candidates: ExpenseRef[]): ExpenseRef[] {
  const seen = new Set<OpaqueId>();
  return [...draft.linkedExpenses, ...candidates].filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

/**
 * Stato iniziale: un solo collegamento esplicito viene riusato; più collegamenti o soli candidati
 * richiedono una scelta (nessuna preselezione); senza nulla si propone di creare.
 */
export function initialFormState(draft: ReceiptDraft, objectCandidates: ObjectRef[] = [], expenseCandidates: ExpenseRef[] = []): ReceiptFormState {
  const values = Object.fromEntries([...OBJECT_FIELDS, ...EXPENSE_FIELDS].map(f => [f, proposalText(draft, f)])) as Record<FormField, string>;
  const pick = <T extends { id: OpaqueId }>(linked: T[], candidates: T[]) =>
    linked.length === 1 && linked[0] ? { kind: 'reuse' as const, id: linked[0].id } : linked.length > 1 || candidates.length ? { kind: 'unset' as const } : { kind: 'create' as const };
  return {
    values,
    object: pick(draft.linkedObjects, objectCandidates.filter(c => !draft.linkedObjects.some(l => l.id === c.id))),
    expense: pick(draft.linkedExpenses, expenseCandidates.filter(c => !draft.linkedExpenses.some(l => l.id === c.id))),
    enrich: true,
    decisions: {},
  };
}

// ---------------------------------------------------------------------------------------------
// Importi e date

/** «179,90», «1.234,56», «85», «85.5» → centesimi interi sicuri; null se non valido. */
export function parseEuroToCents(input: string): number | null {
  const raw = input.trim();
  const s = raw.startsWith('€') ? raw.slice(1).trim() : raw.endsWith('€') ? raw.slice(0, -1).trim() : raw;
  const comma = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(s);
  const match = comma ?? /^(\d+)\.(\d{1,2})$/.exec(s);
  if (!match) return null;
  const whole = (match[1] ?? '').replace(/\./g, ''), fraction = match[2] ?? '';
  if (whole.length > 10) return null;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  return Number.isSafeInteger(cents) ? cents : null;
}

export function centsToInput(cents: number): string {
  return `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
export const formatCents = (cents: number) => euro.format(cents / 100);

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= (days[m - 1] ?? 0);
}

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatDate = (value: string) => (isCalendarDate(value) ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : value);

// ---------------------------------------------------------------------------------------------
// Confronti e origini

export type FieldComparison = { objectId: OpaqueId; field: ComparableField; existing: string; proposed: TextProposal; key: string };

/** Confronti da decidere sull'oggetto riusato: valore confermato diverso dalla proposta letta. */
export function pendingComparisons(state: ReceiptFormState, draft: ReceiptDraft, objects: ObjectRef[]): FieldComparison[] {
  if (state.object.kind !== 'reuse' || !state.enrich || draft.origin === 'manual') return [];
  const reuseId = state.object.id;
  const target = objects.find(o => o.id === reuseId);
  if (!target) return [];
  return (['brand', 'model'] as const).flatMap(field => {
    const existing = target[field], proposed = draft.proposals[field];
    if (!existing || !proposed || normalized(existing.value) === normalized(proposed.value)) return [];
    // Già rinviato e persistito: non si ripete il confronto.
    if (draft.openComparisons.some(c => c.objectId === target.id && c.field === field)) return [];
    return [{ objectId: target.id, field, existing: existing.value, proposed, key: decisionKey(target.id, field) }];
  });
}

/** Origine mostrata accanto a un campo: dal documento solo se non modificato e la bozza è estratta. */
export function fieldOrigin(state: ReceiptFormState, draft: ReceiptDraft, field: FormField): 'document' | 'edited' | 'manual' | 'empty' {
  const value = state.values[field];
  if (draft.origin === 'manual') return normalized(value) ? 'manual' : 'empty';
  const proposed = proposalText(draft, field);
  if (!proposed) return normalized(value) ? 'manual' : 'empty';
  if (field === 'amount') return parseEuroToCents(value) === draft.proposals.total?.amountCents ? 'document' : normalized(value) ? 'edited' : 'empty';
  return normalized(value) === normalized(proposed) ? 'document' : normalized(value) ? 'edited' : 'empty';
}

export function fieldSources(draft: ReceiptDraft, field: FormField): ReceiptCitation[] {
  if (draft.origin === 'manual') return [];
  if (field === 'amount') return draft.proposals.total?.sources ?? [];
  const key: ProposalTextField = field === 'date' ? 'documentDate' : field;
  return draft.proposals[key]?.sources ?? [];
}

// ---------------------------------------------------------------------------------------------
// Validazione

export type ValidationResult = { valid: boolean; errors: Partial<Record<FormField | 'object' | 'expense' | 'comparisons', string>> };

function textError(value: string, max: number, required: boolean, label: string): string | undefined {
  const n = codePoints(value);
  if (required && n === 0) return `Inserisci ${label}.`;
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

/** Valida solo ciò che verrà salvato: i campi delle scelte escluse non bloccano la conferma. */
export function validateForm(state: ReceiptFormState, draft: ReceiptDraft, objects: ObjectRef[], today: string, expenses?: ExpenseRef[]): ValidationResult {
  const errors: ValidationResult['errors'] = {};
  const set = (key: keyof ValidationResult['errors'], message: string | undefined) => { if (message) errors[key] = message; };
  if (state.object.kind === 'unset') errors.object = 'Scegli l’oggetto corretto, crea un nuovo oggetto oppure non associarlo.';
  if (state.object.kind === 'create') {
    set('name', textError(state.values.name, LIMITS.name, true, 'un nome per l’oggetto'));
    set('brand', textError(state.values.brand, LIMITS.brand, false, ''));
    set('model', textError(state.values.model, LIMITS.model, false, ''));
  }
  if (state.object.kind === 'reuse') {
    const reuseId = state.object.id;
    const target = objects.find(o => o.id === reuseId);
    if (!target) errors.object = 'L’oggetto scelto non è più disponibile: scegline un altro.';
    else if (state.enrich) for (const field of ['brand', 'model'] as const) if (!target[field]) set(field, textError(state.values[field], LIMITS[field], false, ''));
    if (state.enrich && pendingComparisons(state, draft, objects).some(c => !state.decisions[c.key])) errors.comparisons = 'Per ogni differenza scegli se mantenere il dato confermato o decidere più avanti.';
  }
  if (state.expense.kind === 'reuse' && expenses) {
    const id = state.expense.id;
    if (!expenses.some(e => e.id === id)) errors.expense = 'La spesa scelta non è più disponibile: scegline un’altra.';
  }
  if (state.expense.kind === 'unset') errors.expense = 'Scegli la spesa da mantenere, registrane una nuova oppure non intervenire.';
  if (state.expense.kind === 'create') {
    set('title', textError(state.values.title, LIMITS.title, true, 'una descrizione'));
    set('supplier', textError(state.values.supplier, LIMITS.supplier, false, ''));
    const cents = parseEuroToCents(state.values.amount);
    if (!normalized(state.values.amount)) errors.amount = 'Inserisci l’importo.';
    else if (cents === null) errors.amount = 'Importo non valido: usa per esempio 179,90.';
    else if (cents < 1 || cents > LIMITS.maxCents) errors.amount = 'L’importo deve essere maggiore di zero e al massimo 9.999.999,99 €.';
    const date = state.values.date.trim();
    if (!date) errors.date = 'Inserisci la data di riferimento.';
    else if (!isCalendarDate(date)) errors.date = 'Data non valida.';
    else if (date > today) errors.date = 'La data non può essere futura.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------------------------
// Riepilogo e payload di conferma

export type FieldPlan = { field: ComparableField; action: 'accept' | 'manual' | 'keep_existing' | 'defer' | 'skip'; value?: string };

export type ReceiptSummary = {
  object:
    | { kind: 'create'; name: string; brand: string | null; model: string | null }
    | { kind: 'reuse'; target: ObjectRef; newLink: boolean; filled: Array<{ field: ComparableField; value: string }>; kept: ComparableField[]; deferred: ComparableField[] }
    | { kind: 'skip' }
    | { kind: 'unset' };
  expense:
    | { kind: 'create'; title: string; amountCents: number | null; spentOn: string; supplier: string | null }
    | { kind: 'reuse'; target: ExpenseRef; newLink: boolean; differs: Array<'amount' | 'date' | 'title'> }
    | { kind: 'skip' }
    | { kind: 'unset' };
  counts: { newObjects: 0 | 1; newExpenses: 0 | 1 };
};

function reuseFieldPlans(state: ReceiptFormState, draft: ReceiptDraft, target: ObjectRef): FieldPlan[] {
  return (['brand', 'model'] as const).map((field): FieldPlan => {
    if (!state.enrich) return { field, action: 'skip' };
    const existing = target[field], proposed = draft.proposals[field], value = normalized(state.values[field]);
    if (existing) {
      if (!proposed || normalized(existing.value) === normalized(proposed.value)) return { field, action: 'skip' };
      if (draft.openComparisons.some(c => c.objectId === target.id && c.field === field)) return { field, action: 'skip' };
      return { field, action: state.decisions[decisionKey(target.id, field)] ?? 'skip' };
    }
    if (!value) return { field, action: 'skip' };
    return draft.origin === 'extraction' && proposed && normalized(proposed.value) === value ? { field, action: 'accept' } : { field, action: 'manual', value };
  });
}

export function buildSummary(state: ReceiptFormState, draft: ReceiptDraft, objects: ObjectRef[], expenses: ExpenseRef[]): ReceiptSummary {
  const v = state.values;
  let object: ReceiptSummary['object'];
  if (state.object.kind === 'create') object = { kind: 'create', name: normalized(v.name), brand: normalized(v.brand) || null, model: normalized(v.model) || null };
  else if (state.object.kind === 'reuse') {
    const reuseId = state.object.id;
    const target = objects.find(o => o.id === reuseId);
    if (!target) object = { kind: 'unset' };
    else {
      const plans = reuseFieldPlans(state, draft, target);
      object = {
        kind: 'reuse', target, newLink: !target.linkedToDocument,
        filled: plans.filter(p => p.action === 'accept' || p.action === 'manual').map(p => ({ field: p.field, value: p.value ?? normalized(v[p.field]) })),
        kept: plans.filter(p => p.action === 'keep_existing').map(p => p.field),
        deferred: plans.filter(p => p.action === 'defer').map(p => p.field),
      };
    }
  } else object = { kind: state.object.kind };

  let expense: ReceiptSummary['expense'];
  if (state.expense.kind === 'create') expense = { kind: 'create', title: normalized(v.title), amountCents: parseEuroToCents(v.amount), spentOn: v.date.trim(), supplier: normalized(v.supplier) || null };
  else if (state.expense.kind === 'reuse') {
    const reuseId = state.expense.id;
    const target = expenses.find(e => e.id === reuseId);
    const total = draft.origin === 'extraction' ? draft.proposals.total : null, date = draft.origin === 'extraction' ? draft.proposals.documentDate : null;
    expense = !target ? { kind: 'unset' } : {
      kind: 'reuse', target, newLink: !target.linkedToDocument,
      differs: [...(total && total.amountCents !== target.amountCents ? ['amount' as const] : []), ...(date && date.value !== target.spentOn ? ['date' as const] : [])],
    };
  } else expense = { kind: state.expense.kind };

  return { object, expense, counts: { newObjects: object.kind === 'create' ? 1 : 0, newExpenses: expense.kind === 'create' ? 1 : 0 } };
}

/**
 * Payload UI stabile per la conferma. Non è il body HTTP: il container lo traduce nel contratto vero,
 * gestisce Idempotency-Key e retry. Nessun accountId/homeId, citazione o conteggio fidato dal client.
 */
export type ConfirmationPayload = {
  draftId: OpaqueId;
  expectedVersion: OpaqueVersion;
  object:
    | { action: 'create'; values: { name: string; brand: string | null; model: string | null }; origins: Record<'name' | 'brand' | 'model', 'extraction' | 'manual' | null> }
    | { action: 'reuse'; targetId: OpaqueId; targetVersion: OpaqueVersion; fields: FieldPlan[] }
    | { action: 'skip' };
  expense:
    | { action: 'create'; values: { title: string; amountCents: number; spentOn: string; supplier: string | null }; origins: Record<'title' | 'amount' | 'date' | 'supplier', 'extraction' | 'manual' | null> }
    | { action: 'reuse'; targetId: OpaqueId; targetVersion: OpaqueVersion }
    | { action: 'skip' };
};

/** Restituisce il payload solo se il form è valido; altrimenti null (il container non deve inviare nulla). */
export function buildConfirmationPayload(state: ReceiptFormState, draft: ReceiptDraft, objects: ObjectRef[], expenses: ExpenseRef[], today: string): ConfirmationPayload | null {
  if (!validateForm(state, draft, objects, today, expenses).valid) return null;
  const v = state.values;
  const origin = (field: FormField) => { const o = fieldOrigin(state, draft, field); return o === 'document' ? 'extraction' as const : o === 'empty' ? null : 'manual' as const; };
  let object: ConfirmationPayload['object'];
  if (state.object.kind === 'create') object = { action: 'create', values: { name: normalized(v.name), brand: normalized(v.brand) || null, model: normalized(v.model) || null }, origins: { name: origin('name'), brand: origin('brand'), model: origin('model') } };
  else if (state.object.kind === 'reuse') {
    const reuseId = state.object.id;
    const target = objects.find(o => o.id === reuseId)!;
    object = { action: 'reuse', targetId: target.id, targetVersion: target.version, fields: reuseFieldPlans(state, draft, target) };
  } else object = { action: 'skip' };
  let expense: ConfirmationPayload['expense'];
  if (state.expense.kind === 'create') expense = { action: 'create', values: { title: normalized(v.title), amountCents: parseEuroToCents(v.amount)!, spentOn: v.date.trim(), supplier: normalized(v.supplier) || null }, origins: { title: origin('title'), amount: origin('amount'), date: origin('date'), supplier: origin('supplier') } };
  else if (state.expense.kind === 'reuse') {
    const reuseId = state.expense.id;
    const target = expenses.find(e => e.id === reuseId)!;
    expense = { action: 'reuse', targetId: target.id, targetVersion: target.version };
  } else expense = { action: 'skip' };
  return { draftId: draft.id, expectedVersion: draft.version, object, expense };
}

/** Serializzazione canonica (chiavi ordinate) per confrontare due payload senza dipendere dall'ordine. */
export function canonicalPayload(payload: ConfirmationPayload): string {
  const sort = (value: unknown): unknown => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value as object).sort().map(k => [k, sort((value as Record<string, unknown>)[k])])) : value;
  return JSON.stringify(sort(payload));
}
