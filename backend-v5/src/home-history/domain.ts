import { ids, invalid, object, text, uuid, version } from '../review/domain';

/**
 * BL-03 — storia essenziale della casa. Gli eventi inseriti a mano hanno una data con precisione esplicita
 * (anno, mese/anno, giorno): nessun giorno viene inventato. La data dell'evento è distinta da quella di inserimento.
 */
export const historyLimits = { titleMaxCodePoints: 120, descriptionMaxCodePoints: 1000, maxDocuments: 5, pageSize: 20, maxPageSize: 50, minYear: 1800 } as const;
export type EventDate = { year: number; month: number | null; day: number | null };
export type Precision = 'year' | 'month' | 'day';

const integer = (input: unknown) => { if (!Number.isSafeInteger(input)) throw invalid('Data non valida.'); return input as number; };
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Data con precisione dichiarata, mai nel futuro rispetto a `today` (YYYY-MM-DD, Europe/Rome). */
export function eventDate(input: unknown, today: string): EventDate {
  const row = object(input, ['year', 'month', 'day']);
  const year = integer(row.year);
  const month = row.month === undefined || row.month === null ? null : integer(row.month);
  const day = row.day === undefined || row.day === null ? null : integer(row.day);
  if (year < historyLimits.minYear) throw invalid('Anno non valido.');
  if (month !== null && (month < 1 || month > 12)) throw invalid('Mese non valido.');
  if (day !== null && (month === null || day < 1 || day > daysInMonth(year, month))) throw invalid('Giorno non valido per il mese indicato.');
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  const future = year > ty || (month !== null && year === ty && month > tm) || (day !== null && year === ty && month === tm && day > td);
  if (future) throw invalid('La storia raccoglie eventi già avvenuti: la data non può essere futura.');
  return { year, month, day };
}
export const precisionOf = (d: EventDate): Precision => (d.day !== null ? 'day' : d.month !== null ? 'month' : 'year');
/** Chiave di ordinamento: "2020-00-00" per il solo anno, così precede le date dello stesso anno senza inventarne una. */
export const sortKeyOf = (d: EventDate) => `${String(d.year).padStart(4, '0')}-${String(d.month ?? 0).padStart(2, '0')}-${String(d.day ?? 0).padStart(2, '0')}`;

const normalizedText = (input: unknown, max: number) => text(input, max).normalize('NFC').replace(/\s+/gu, ' ');
function description(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') throw invalid();
  const value = input.normalize('NFC').trim();
  if (!value) return null;
  if ([...value].length > historyLimits.descriptionMaxCodePoints) throw invalid('Descrizione troppo lunga.');
  return value;
}
const documentIds = (input: unknown) => (input === undefined ? [] : ids(input, historyLimits.maxDocuments, 0));

export function createEventBody(input: unknown, today: string) {
  const row = object(input, ['title', 'description', 'date', 'documentIds']);
  const date = eventDate(row.date, today);
  return { title: normalizedText(row.title, historyLimits.titleMaxCodePoints), description: description(row.description), ...date, sortKey: sortKeyOf(date), documentIds: documentIds(row.documentIds) };
}
export function updateEventBody(input: unknown, today: string) {
  const row = object(input, ['expectedVersion', 'title', 'description', 'date', 'documentIds']);
  const body: { expectedVersion: number; title?: string; description?: string | null; year?: number; month?: number | null; day?: number | null; sortKey?: string; documentIds?: string[] } = { expectedVersion: version(row.expectedVersion) };
  if (row.title !== undefined) body.title = normalizedText(row.title, historyLimits.titleMaxCodePoints);
  if (row.description !== undefined) body.description = description(row.description);
  if (row.date !== undefined) { const date = eventDate(row.date, today); Object.assign(body, date, { sortKey: sortKeyOf(date) }); }
  if (row.documentIds !== undefined) body.documentIds = documentIds(row.documentIds);
  if (Object.keys(body).length === 1) throw invalid('Nessuna modifica da salvare.');
  return body;
}
export function removalBody(input: unknown) { const row = object(input, ['expectedVersion']); return { expectedVersion: version(row.expectedVersion) }; }

export function historyQuery(input: unknown) {
  const row = object(input ?? {}, ['year', 'cursor', 'limit']);
  let year: number | null = null;
  if (row.year !== undefined) { if (typeof row.year !== 'string' || !/^\d{4}$/.test(row.year)) throw invalid('Anno non valido.'); year = Number(row.year); }
  let limit: number = historyLimits.pageSize;
  if (row.limit !== undefined) { if (typeof row.limit !== 'string' || !/^\d{1,2}$/.test(row.limit) || Number(row.limit) < 1 || Number(row.limit) > historyLimits.maxPageSize) throw invalid(); limit = Number(row.limit); }
  if (row.cursor !== undefined && (typeof row.cursor !== 'string' || row.cursor.length > 600)) throw invalid('Pagina non valida.');
  return { year, limit, cursor: (row.cursor as string | undefined) ?? null };
}

/** Tipi iniziali (piano BL-03): solo eventi significativi, nessun registro tecnico delle modifiche. */
export type HistoryKind = 'manual' | 'work' | 'activity_completed' | 'object_added';
/** A parità di data: evento dichiarato, lavoro, promemoria completato, oggetto aggiunto a Dimora. */
export const kindRank: Record<HistoryKind, number> = { manual: 0, work: 1, activity_completed: 2, object_added: 3 };
export type HistoryEntry = {
  id: string; kind: HistoryKind; sourceId: string; title: string; description: string | null;
  date: EventDate & { precision: Precision }; sortKey: string;
  source: 'declared' | 'dimora'; sourceLabel: string;
  link: { type: 'activity' | 'work' | 'object' | 'event'; id: string } | null;
  documents: Array<{ id: string; name: string }>; unavailableDocuments: number;
  version: number | null; period?: { from: string; to: string } | null;
};

/** Ordine stabile: data decrescente, poi tipo, poi id (anche con eventi retrodatati e date uguali). */
export function compareEntries(a: Pick<HistoryEntry, 'sortKey' | 'kind' | 'id'>, b: Pick<HistoryEntry, 'sortKey' | 'kind' | 'id'>) {
  return b.sortKey.localeCompare(a.sortKey) || kindRank[a.kind] - kindRank[b.kind] || a.id.localeCompare(b.id);
}
export function dayOf(value: string): EventDate {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return { year: y, month: m, day: d };
}
export function eventIdParam(input: unknown) { return uuid(input); }
