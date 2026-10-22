/**
 * BL-03 — storia della casa. Tipi e regole dell'interfaccia: la data dell'evento ha una precisione esplicita
 * (solo anno, mese e anno, giorno) e non viene mai completata con un giorno inventato.
 */
export type Precision = 'year' | 'month' | 'day';
export type EventDate = { year: number; month: number | null; day: number | null; precision: Precision };
export type HistoryKind = 'manual' | 'work' | 'activity_completed' | 'object_added';
export type HistoryEntry = {
  id: string; kind: HistoryKind; sourceId: string; title: string; description: string | null;
  date: EventDate; sortKey: string; source: 'declared' | 'dimora'; sourceLabel: string;
  link: { type: 'activity' | 'work' | 'object' | 'event'; id: string } | null;
  documents: Array<{ id: string; name: string }>; unavailableDocuments: number;
  version: number | null; period?: { from: string; to: string } | null;
};
export type HistoryLimits = { titleMaxCodePoints: number; descriptionMaxCodePoints: number; maxDocuments: number };
export type HistoryPage = { today: string; total: number; years: Array<{ year: number; count: number }>; items: HistoryEntry[]; nextCursor: string | null; permissions: string[]; limits: HistoryLimits };

export const KIND_LABEL: Record<HistoryKind, string> = { manual: 'Evento', work: 'Lavoro', activity_completed: 'Promemoria completato', object_added: 'Aggiunto a Dimora' };
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const monthName = (m: number) => MONTHS[m - 1] ?? '';

/** «2020», «marzo 2020» oppure «12 marzo 2020»: la precisione si vede, nulla viene inventato. */
export function formatEventDate(d: Pick<EventDate, 'year' | 'month' | 'day'>): string {
  if (d.month === null) return String(d.year);
  if (d.day === null) return `${monthName(d.month)} ${d.year}`;
  return `${d.day} ${monthName(d.month)} ${d.year}`;
}
const isoLabel = (iso: string) => { const [y, m, d] = iso.split('-').map(Number) as [number, number, number]; return formatEventDate({ year: y, month: m, day: d }); };
/** «dal 16 giugno 2026 all’8 luglio 2026»: articolo eliso davanti a 8 e 11. */
export const periodLabel = (p: { from: string; to: string }) => {
  if (p.from === p.to) return isoLabel(p.from);
  const day = Number(p.to.slice(8, 10));
  return `dal ${isoLabel(p.from)} ${day === 8 || day === 11 ? 'all’' : 'al '}${isoLabel(p.to)}`;
};

/** Destinazione della voce nell'app; gli eventi inseriti a mano si modificano qui. */
export function entryHref(homeId: string, entry: HistoryEntry): string | null {
  if (!entry.link) return null;
  const base = `/home/${encodeURIComponent(homeId)}`;
  if (entry.link.type === 'activity') return `${base}/attivita/${encodeURIComponent(entry.link.id)}`;
  if (entry.link.type === 'work') return `${base}/spese/lavori/${encodeURIComponent(entry.link.id)}`;
  if (entry.link.type === 'object') return `${base}/oggetti/object/${encodeURIComponent(entry.link.id)}`;
  return null;
}

export type EventDraft = { title: string; description: string; precision: Precision; year: string; month: string; day: string; documents: Array<{ id: string; name: string }> };
export const emptyDraft = (today: string, title = '', documents: EventDraft['documents'] = []): EventDraft =>
  ({ title, description: '', precision: 'year', year: today.slice(0, 4), month: '', day: '', documents });
export function draftFromEntry(entry: HistoryEntry): EventDraft {
  return { title: entry.title, description: entry.description ?? '', precision: entry.date.precision, year: String(entry.date.year),
    month: entry.date.month ? String(entry.date.month) : '', day: entry.date.day ? String(entry.date.day) : '', documents: entry.documents };
}

export type DraftErrors = Partial<Record<'title' | 'description' | 'date' | 'documents', string>>;
export function draftDate(d: EventDraft): { year: number; month?: number; day?: number } | null {
  if (!/^\d{4}$/.test(d.year)) return null;
  const year = Number(d.year);
  if (d.precision === 'year') return { year };
  if (!/^\d{1,2}$/.test(d.month)) return null;
  const month = Number(d.month);
  if (d.precision === 'month') return { year, month };
  if (!/^\d{1,2}$/.test(d.day)) return null;
  return { year, month, day: Number(d.day) };
}
export function validateDraft(d: EventDraft, today: string, limits: HistoryLimits): DraftErrors {
  const errors: DraftErrors = {};
  const title = d.title.normalize('NFC').trim();
  if (!title) errors.title = 'Indica cosa è successo.';
  else if ([...title].length > limits.titleMaxCodePoints) errors.title = `Massimo ${limits.titleMaxCodePoints} caratteri.`;
  if ([...d.description.trim()].length > limits.descriptionMaxCodePoints) errors.description = `Massimo ${limits.descriptionMaxCodePoints} caratteri.`;
  const date = draftDate(d);
  if (!date) errors.date = d.precision === 'year' ? 'Indica l’anno con quattro cifre.' : d.precision === 'month' ? 'Indica mese e anno.' : 'Indica giorno, mese e anno.';
  else {
    const { year, month, day } = date;
    const days = month ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 31;
    if (year < 1800 || (month !== undefined && (month < 1 || month > 12)) || (day !== undefined && (day < 1 || day > days))) errors.date = 'Data non valida.';
    else {
      const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
      if (year > ty || (month !== undefined && year === ty && month > tm) || (day !== undefined && year === ty && month === tm && day > td)) errors.date = 'La storia raccoglie eventi già avvenuti: la data non può essere futura.';
    }
  }
  if (d.documents.length > limits.maxDocuments) errors.documents = `Al massimo ${limits.maxDocuments} documenti.`;
  return errors;
}
export function draftBody(d: EventDraft) {
  const description = d.description.normalize('NFC').trim();
  return { title: d.title.normalize('NFC').trim().replace(/\s+/gu, ' '), description: description || null, date: draftDate(d)!, documentIds: d.documents.map(x => x.id) };
}
