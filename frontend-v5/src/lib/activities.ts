// Regole activities-v1 lato client. Il server resta l'autorità su validazioni,
// stato temporale (today/dueState) e permessi: il client non calcola dueState con
// l'orologio del dispositivo.
import { isApiError, userMessage } from '../api/errors';
import type { ActivityState, AssetLink, DueState } from '../api/types';

export const PERSONAL_REMINDER = 'Promemoria personale';

export const STATE_LABEL: Record<ActivityState, string> = {
  open: 'Aperta',
  completed: 'Completata da te',
  cancelled: 'Annullata',
};

export const DUE_LABEL: Record<DueState, string> = {
  overdue: 'Scaduta',
  today: 'Oggi',
  upcoming: 'In programma',
  undated: 'Senza data',
  closed: 'Chiusa',
};

export const HISTORY_KIND_LABEL = {
  created: 'Creata',
  updated: 'Modificata',
  completed: 'Completata da te',
  cancelled: 'Annullata',
  reopened: 'Riaperta',
} as const;

const cp = (s: string) => [...s].length;
const clean = (s: string) => s.normalize('NFC').trim();

export function validateTitle(raw: string, max = 120) {
  const n = cp(clean(raw));
  if (n === 0) return 'Scrivi un titolo.';
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

export function validateDescription(raw: string, max = 2000) {
  return cp(clean(raw)) > max ? `Massimo ${max} caratteri.` : undefined;
}

export function validateNote(raw: string, max = 500) {
  return cp(clean(raw)) > max ? `Massimo ${max} caratteri.` : undefined;
}

/** YYYY-MM-DD di calendario reale, anno 0001–9999 (bisestili inclusi). */
export function isValidCalendarDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]!;
  return d <= days;
}

export function validateDueDate(value: string) {
  if (!value) return undefined;
  return isValidCalendarDate(value) ? undefined : 'Inserisci una data valida (giorno, mese e anno).';
}

/** Normalizza come il server: trim/NFC; descrizione vuota → null. */
export function normalizeText(raw: string) {
  return clean(raw);
}

export function normalizeDescription(raw: string) {
  const v = clean(raw);
  return v ? v : null;
}

const dateFormat = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formatta una data di calendario senza spostamenti di fuso: la data viene
 * costruita e letta entrambe in UTC, quindi «2028-02-29» resta il 29 febbraio.
 */
export function formatCalendarDate(value: string) {
  if (!isValidCalendarDate(value)) return value;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(2000, m - 1, d));
  date.setUTCFullYear(y);
  return dateFormat.format(date);
}

const timestampFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' });

export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : timestampFormat.format(d);
}

export function assetLinkText(link: AssetLink) {
  if (link.state === 'linked') return link.asset.name;
  if (link.state === 'unavailable') return 'Caldaia collegata non più disponibile per il tuo account';
  return 'Nessun collegamento alla scheda di un impianto';
}

/** Messaggi per gli errori H1; 404/503 riguardano solo le attività, non M3/M4. */
export function activityErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.kind === 'http') {
      if (error.status === 404) return 'Le attività personali non sono ancora attive su questo servizio.';
      if (error.status === 403) return 'Non hai accesso a questa attività.';
      switch (error.code) {
        case 'activity_version_conflict':
          return 'L’attività è stata modificata nel frattempo (per esempio in un’altra scheda). Rileggi i dati prima di continuare.';
        case 'invalid_activity_state':
          return 'Lo stato dell’attività è cambiato nel frattempo: rileggi i dati prima di continuare.';
        case 'idempotency_conflict':
          return 'Una richiesta precedente con dati diversi risulta già registrata: rileggi i dati prima di continuare.';
      }
    }
    if (error.kind === 'service' && (error.code === 'activity_unavailable' || error.status === 503)) {
      return 'Le attività personali non sono disponibili in questo momento. Riprova tra poco: nessuna modifica è stata salvata da questa schermata.';
    }
  }
  return userMessage(error);
}

export function isConflict(error: unknown) {
  return (
    isApiError(error) &&
    error.kind === 'http' &&
    error.status === 409 &&
    ['activity_version_conflict', 'invalid_activity_state', 'idempotency_conflict'].includes(error.code)
  );
}

export function isAmbiguous(error: unknown) {
  return isApiError(error) && error.kind === 'service';
}
