// Regole economy-v1 (S1a/b) lato client. Il server resta l'autorità su famiglie, totali,
// confronti e permessi: qui solo validazione d'aiuto, rappresentazione e URL.
// Somme: stringhe di centesimi lette con BigInt, mai convertite a Number per i calcoli.
import { isApiError, userMessage } from '../api/errors';
import type {
  Category,
  CentsString,
  Comparison,
  EconomyCapabilities,
  Family,
  ObjectRef,
} from '../api/economyTypes';
import { isValidCalendarDate } from './activities';

export const CATEGORY_CODES: Category[] = [
  'electricity', 'gas', 'water', 'internet_services', 'condominium_ordinary', 'condominium_extraordinary',
  'insurance', 'taxes', 'maintenance', 'repairs_works', 'purchase_replacement', 'financing', 'other',
];
export const FAMILY_CODES: Family[] = [
  'utilities', 'condominium', 'taxes_insurance', 'maintenance_repairs', 'works_purchases', 'financing', 'unclassified',
];

/** Etichette di riserva; categoryLabel applica il nome visuale concordato per gli acquisti. */
export const FAMILY_LABEL: Record<Family, string> = {
  utilities: 'Bollette',
  condominium: 'Condominio',
  taxes_insurance: 'Tasse e assicurazioni',
  maintenance_repairs: 'Manutenzione, riparazioni e lavori',
  works_purchases: 'Acquisti',
  financing: 'Mutuo e finanziamenti',
  unclassified: 'Altro / Non classificata',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  electricity: 'Energia elettrica',
  gas: 'Gas',
  water: 'Acqua',
  internet_services: 'Internet e servizi',
  condominium_ordinary: 'Condominio ordinario',
  condominium_extraordinary: 'Condominio straordinario',
  insurance: 'Assicurazione',
  taxes: 'Tributi',
  maintenance: 'Manutenzione',
  repairs_works: 'Riparazioni e lavori',
  purchase_replacement: 'Acquisti',
  financing: 'Finanziamento',
  other: 'Altro',
};

/** null = «Non classificata»: distinta da «Altro» (other), pur nella stessa famiglia. */
export const UNCLASSIFIED_LABEL = 'Non classificata';

export function familyLabel(code: Family, caps?: EconomyCapabilities) {
  return caps?.families.find((f) => f.code === code)?.label ?? FAMILY_LABEL[code];
}

export function categoryLabel(code: Category | null, caps?: EconomyCapabilities) {
  if (code === null) return UNCLASSIFIED_LABEL;
  // Alias visuale concordato: il codice storico e le capabilities restano compatibili.
  if (code === 'purchase_replacement') return CATEGORY_LABEL.purchase_replacement;
  return caps?.categories.find((c) => c.code === code)?.label ?? CATEGORY_LABEL[code];
}

/**
 * Anteprima della famiglia nel modulo, con lo stesso mapping del contratto. Solo aiuto:
 * la famiglia salvata è sempre quella restituita dal server.
 */
export function previewFamily(category: Category | null, _hasWork: boolean): Family {
  void _hasWork; // Firma compatibile con i chiamanti esistenti.
  if (category === null || category === 'other') return 'unclassified';
  if (category === 'repairs_works' || category === 'condominium_extraordinary') return 'maintenance_repairs';
  if (['electricity', 'gas', 'water', 'internet_services'].includes(category)) return 'utilities';
  if (category === 'condominium_ordinary') return 'condominium';
  if (category === 'taxes' || category === 'insurance') return 'taxes_insurance';
  if (category === 'maintenance') return 'maintenance_repairs';
  if (category === 'financing') return 'financing';
  return 'works_purchases'; // purchase_replacement
}

// ---- importi: stringhe di centesimi ----

const CENTS_RE = /^-?\d+$/;

/** Stringa di centesimi del contratto → BigInt. Fuori formato: null (il chiamante lo tratta come errore di servizio). */
export function parseCentsString(value: CentsString | null | undefined): bigint | null {
  if (typeof value !== 'string' || !CENTS_RE.test(value)) return null;
  return BigInt(value);
}

export function isCentsString(value: unknown, signed = false): value is CentsString {
  return typeof value === 'string' && (signed ? CENTS_RE : /^\d+$/).test(value);
}

/** 123456n → «1.234,56 €», anche oltre Number.MAX_SAFE_INTEGER. */
export function formatBigCents(cents: bigint, opts: { signed?: boolean } = {}) {
  const negative = cents < 0n;
  const abs = (negative ? -cents : cents).toString().padStart(3, '0');
  const euros = abs.slice(0, -2).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative ? '−' : opts.signed && cents > 0n ? '+' : '';
  return `${sign}${euros},${abs.slice(-2)} €`;
}

export function formatCentsString(value: CentsString, opts: { signed?: boolean } = {}) {
  const v = parseCentsString(value);
  return v === null ? '—' : formatBigCents(v, opts);
}

/** Quota in decimi di punto percentuale (0..1000), arrotondata metà in su, con soli interi. */
export function shareTenths(part: bigint, total: bigint): number {
  if (total <= 0n || part <= 0n) return 0;
  return Number((part * 2000n + total) / (2n * total));
}

export function formatTenths(tenths: number) {
  const s = String(tenths).padStart(2, '0');
  return `${s.slice(0, -1)},${s.slice(-1)}%`;
}

/** Proporzione limitata per le coordinate SVG (dopo il calcolo intero): 0..1 con 6 decimali. */
export function svgFraction(part: bigint, total: bigint) {
  if (total <= 0n) return 0;
  return Number((part * 1_000_000n) / total) / 1_000_000;
}

/** «1234» centesimi di punto → «12,34%», con segno. */
export function formatPercentHundredths(value: CentsString) {
  const v = parseCentsString(value);
  if (v === null) return '—';
  const negative = v < 0n;
  const abs = (negative ? -v : v).toString().padStart(3, '0');
  return `${negative ? '−' : v > 0n ? '+' : ''}${abs.slice(0, -2).replace(/^0+(?=\d)/, '')},${abs.slice(-2)}%`;
}

// ---- filtri e URL ----

export type EconomyPeriod = { kind: 'default' } | { kind: 'year'; year: string } | { kind: 'range'; from: string; to: string };
export type ExpenseStateFilter = 'active' | 'archived' | 'all';
export type SourceFilter = 'all' | 'manual' | 'document';
export type CategoryFilter = Category | 'unclassified';

export type EconomyFilters = {
  period: EconomyPeriod;
  family: Family | null;
  category: CategoryFilter | null;
  source: SourceFilter;
  state: ExpenseStateFilter;
  object: ObjectRef | null;
  roomId: string | null;
  workId: string | null;
  documentId: string | null;
  /** Ricerca privata: mai nell'indirizzo, solo stato di navigazione e memoria. */
  q: string;
};

export const DEFAULT_FILTERS: EconomyFilters = {
  period: { kind: 'default' },
  family: null,
  category: null,
  source: 'all',
  state: 'active',
  object: null,
  roomId: null,
  workId: null,
  documentId: null,
  q: '',
};

export type SpeseView = 'panoramica' | 'elenco' | 'oggetti' | 'lavori' | 'riepilogo';
export const VIEWS: Array<{ value: SpeseView; label: string }> = [
  { value: 'panoramica', label: 'Panoramica' },
  { value: 'elenco', label: 'Elenco' },
  { value: 'oggetti', label: 'Per oggetto' },
  { value: 'lavori', label: 'Per lavoro' },
  { value: 'riepilogo', label: 'Riepilogo' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string | null | undefined): v is string => typeof v === 'string' && UUID_RE.test(v);
const YEAR_RE = /^\d{4}$/;
const isYear = (v: string | null): v is string => !!v && YEAR_RE.test(v) && v !== '0000';

/**
 * Indirizzo → filtri. Solo codici, date e riferimenti; valori sconosciuti o malformati
 * vengono ignorati (il contesto viene poi verificato dal server con un 403 generico).
 */
export function filtersFromParams(params: URLSearchParams): EconomyFilters {
  const anno = params.get('anno');
  const dal = params.get('dal');
  const al = params.get('al');
  let period: EconomyPeriod = { kind: 'default' };
  if (dal && al && isValidCalendarDate(dal) && isValidCalendarDate(al) && dal <= al) period = { kind: 'range', from: dal, to: al };
  else if (isYear(anno)) period = { kind: 'year', year: anno };
  const famiglia = params.get('famiglia');
  const categoria = params.get('categoria');
  const origine = params.get('origine');
  const stato = params.get('stato');
  const oggetto = params.get('oggetto');
  let object: ObjectRef | null = null;
  if (oggetto) {
    const [kind, id] = oggetto.split(':');
    if ((kind === 'object' || kind === 'boiler') && isUuid(id)) object = { kind, id };
  }
  const opt = (k: string) => {
    const v = params.get(k);
    return isUuid(v) ? v : null;
  };
  return {
    period,
    family: FAMILY_CODES.includes(famiglia as Family) ? (famiglia as Family) : null,
    category: categoria === 'unclassified' || CATEGORY_CODES.includes(categoria as Category) ? (categoria as CategoryFilter) : null,
    source: origine === 'manual' || origine === 'document' ? origine : 'all',
    state: stato === 'archived' || stato === 'all' ? stato : 'active',
    object,
    roomId: opt('ambiente'),
    workId: opt('lavoro'),
    documentId: opt('documento'),
    q: '',
  };
}

export function filtersToParams(f: EconomyFilters, extra: { view?: SpeseView | null; split?: 'categorie' | null } = {}) {
  const p = new URLSearchParams();
  if (extra.view) p.set('vista', extra.view);
  if (f.period.kind === 'year') p.set('anno', f.period.year);
  if (f.period.kind === 'range') {
    p.set('dal', f.period.from);
    p.set('al', f.period.to);
  }
  if (f.family) p.set('famiglia', f.family);
  if (f.category) p.set('categoria', f.category);
  if (f.source !== 'all') p.set('origine', f.source);
  if (f.state !== 'active') p.set('stato', f.state);
  if (f.object) p.set('oggetto', `${f.object.kind}:${f.object.id}`);
  if (f.roomId) p.set('ambiente', f.roomId);
  if (f.workId) p.set('lavoro', f.workId);
  if (f.documentId) p.set('documento', f.documentId);
  if (extra.split) p.set('per', extra.split);
  return p;
}

/** Ci sono filtri che puntano a un elenco (non solo periodo/famiglia)? */
export function hasListFilters(f: EconomyFilters) {
  return !!(f.category || f.object || f.roomId || f.workId || f.documentId || f.source !== 'all' || f.state !== 'active');
}

export function countActiveFilters(f: EconomyFilters) {
  return [f.category, f.object, f.roomId, f.workId, f.documentId, f.source !== 'all' ? 1 : null, f.state !== 'active' ? 1 : null, f.q ? 1 : null].filter(Boolean).length;
}

/** Query del contratto. summary: senza state/limit/cursor. Solo filtri attivi diventano parametri. */
export function economyQuery(f: EconomyFilters, opts: { list: boolean }) {
  const p = new URLSearchParams();
  if (f.period.kind === 'year') p.set('year', f.period.year);
  if (f.period.kind === 'range') {
    p.set('from', f.period.from);
    p.set('to', f.period.to);
  }
  if (opts.list && f.state !== 'active') p.set('state', f.state);
  const q = f.q.normalize('NFC').trim();
  if (q) p.set('q', q);
  if (f.category) p.set('category', f.category);
  if (f.family) p.set('family', f.family);
  if (f.source !== 'all') p.set('source', f.source);
  if (f.object) {
    p.set('objectKind', f.object.kind);
    p.set('objectId', f.object.id);
  }
  if (f.roomId) p.set('roomId', f.roomId);
  if (f.workId) p.set('workId', f.workId);
  if (f.documentId) p.set('documentId', f.documentId);
  return p;
}

/** Chiave stabile dei filtri per la cache (in memoria, mai nell'URL o nei log). */
export function filtersKey(f: EconomyFilters) {
  return economyQuery(f, { list: true }).toString();
}

/** Categoria compatibile con la famiglia scelta (altrimenti il server risponde 422). */
export function categoryFitsFamily(category: CategoryFilter, family: Family, caps?: EconomyCapabilities) {
  if (category === 'unclassified') return family === 'unclassified';
  const possible = caps?.categories.find((c) => c.code === category)?.possibleFamilies;
  if (possible) return possible.includes(family);
  return previewFamily(category, false) === family;
}

export const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export function formatDay(date: string) {
  const [y, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Periodo del server in parole: «2026 · fino al 14 ottobre», «1 marzo 2026 – 31 maggio 2026». */
export function periodText(period: { from: string; to: string }, today?: string) {
  const [fy, fm, fd] = period.from.split('-');
  const [ty, tm, td] = period.to.split('-');
  if (fm === '01' && fd === '01' && fy === ty) {
    if (tm === '12' && td === '31') return fy!;
    if (today && period.to === today) return `${fy} · fino al ${Number(td)} ${MONTHS[Number(tm) - 1]}`;
  }
  return `${formatDay(period.from)} – ${formatDay(period.to)}`;
}

export function comparisonText(c: Comparison) {
  if (c.status === 'unavailable') return { title: 'Confronto non disponibile per questo periodo.', lines: [] as string[] };
  const period = periodText(c.period);
  const leap = c.calendarAdjustment === 'leap_day_clamped' ? ' Il 29 febbraio è confrontato con il 28.' : '';
  if (c.status === 'no_previous_records') {
    return { title: `Nessun costo registrato nello stesso periodo dell’anno precedente (${period}).${leap}`, lines: [] };
  }
  return {
    title: `Stesso periodo dell’anno precedente (${period})${leap ? ' ·' + leap : ''}`,
    lines: [
      `${formatCentsString(c.totalCents)} · ${c.count} ${c.count === 1 ? 'registrazione' : 'registrazioni'}`,
      `Differenza registrata: ${formatCentsString(c.deltaCents, { signed: true })} (${formatPercentHundredths(c.deltaPercentHundredths)})`,
    ],
  };
}

// ---- errori ----

const CONFLICT_CODES = [
  'expense_version_conflict', 'expense_state_conflict', 'idempotency_conflict', 'work_version_conflict',
  'work_state_conflict', 'resource_already_linked', 'resource_state_conflict',
];

export function economyErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.kind === 'http') {
      if (error.status === 404) return 'Lo storico economico non è ancora attivo su questo servizio.';
      if (error.status === 403) return 'Non hai accesso a questi costi o al riferimento scelto.';
      switch (error.code) {
        case 'expense_version_conflict':
          return 'Il costo è stato modificato nel frattempo. Rileggi i dati prima di continuare.';
        case 'expense_state_conflict':
          return 'Lo stato del costo è cambiato nel frattempo: rileggi i dati prima di continuare.';
        case 'work_version_conflict':
          return 'Il lavoro è stato modificato nel frattempo. Rileggi i dati prima di continuare.';
        case 'work_state_conflict':
          return 'Lo stato del lavoro è cambiato, oppure il lavoro è archiviato e non accetta nuovi costi. Rileggi i dati.';
        case 'resource_already_linked':
          return 'Il costo è già collegato a un altro oggetto: scollegalo e salva prima di collegarlo a un oggetto diverso.';
        case 'resource_state_conflict':
          return 'L’oggetto scelto non accetta nuovi collegamenti (per esempio è archiviato).';
        case 'idempotency_conflict':
          return 'Una richiesta precedente con dati diversi risulta già registrata: rileggi i dati prima di continuare.';
      }
    }
    if (error.kind === 'service' && error.status === 503) {
      return 'Lo storico economico non è disponibile in questo momento. Se stavi salvando, l’esito non è confermato: usa «Riprova invio».';
    }
  }
  return userMessage(error);
}

export function isEconomyConflict(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 409 && CONFLICT_CODES.includes(error.code);
}

/** Esito ignoto (rete, 5xx): stessa chiave e stesso body alla riprova. */
/** Rifiuti espliciti del servizio anche se arrivano come 503: esito noto, non da ripetere con la stessa chiave. */
// Rifiuti decisi dal servizio prima di qualunque invio al provider: esito noto, nessuna riprova identica.
const DEFINITE_SERVICE_CODES = [
  'ai_provider_disabled', 'ai_provider_unconfigured', 'ai_budget_exhausted', 'ai_evaluation_limit_reached',
  'ai_model_unavailable', 'provider_auth_failed', 'provider_rate_limited',
];

export function isAmbiguousError(error: unknown) {
  return isApiError(error) && error.kind === 'service' && !DEFINITE_SERVICE_CODES.includes(error.code ?? '');
}

export function isForbiddenError(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 403;
}

export function isNotActiveError(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 404;
}

// ---- validazione modulo ----

const cp = (s: string) => [...s.normalize('NFC').trim()].length;

export function validateOptionalText(raw: string, max: number) {
  return cp(raw) > max ? `Massimo ${max} caratteri.` : undefined;
}

export function validateOptionalDate(value: string) {
  if (!value) return undefined;
  return isValidCalendarDate(value) ? undefined : 'Inserisci una data valida.';
}

/** Competenza: entrambi gli estremi o nessuno, inizio non successivo alla fine. */
export function validateCompetence(from: string, to: string) {
  if (!from && !to) return undefined;
  if (!from || !to) return 'Indica sia l’inizio sia la fine del periodo di competenza, oppure lasciali vuoti entrambi.';
  if (!isValidCalendarDate(from) || !isValidCalendarDate(to)) return 'Inserisci date valide.';
  if (from > to) return 'L’inizio del periodo non può essere successivo alla fine.';
  return undefined;
}

export function optionalText(raw: string): string | null {
  const v = raw.normalize('NFC').trim();
  return v ? v : null;
}

export { userMessage };
