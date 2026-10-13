// Regole expenses-v1 (H3a) lato client: aiuto immediato all'utente. Il server resta
// l'autorità su importi, date, permessi e totali. Nessun float sugli importi: i
// centesimi sono calcolati con BigInt sulle cifre scritte e mostrati con aritmetica intera.
import { isApiError, userMessage } from '../api/errors';
import type { ExpenseAssetLink, ExpenseDocumentLink, ExpenseOrigin, ExpenseState } from '../api/types';
import { isValidCalendarDate } from './activities';

/** Soglia tecnica del contratto (9.999.999,99 €), usata finché le capabilities non dicono altro. */
export const AMOUNT_MAX_CENTS = 999_999_999;

export const PERSONAL_EXPENSE = 'Spesa personale';

export const ORIGIN_LABEL: Record<ExpenseOrigin, string> = {
  manual: 'Inserita da te',
  document: 'Collegata a un documento',
};

export const STATE_LABEL: Record<ExpenseState, string> = {
  active: 'Attiva',
  archived: 'Archiviata',
};

export const HISTORY_KIND_LABEL = {
  created: 'Registrata',
  updated: 'Modificata',
  archived: 'Archiviata',
  restored: 'Ripristinata',
} as const;

const INTEGER = /^\d+$/;
const GROUPED = /^\d{1,3}(\.\d{3})+$/;

export type AmountResult = { cents: number; error?: undefined } | { cents?: undefined; error: string };

/**
 * Importo in euro scritto all'italiana → centesimi interi.
 * Ammessi: «1234», «1234,5», «1.234,56», «0,01». Rifiutati: segni, spazi interni,
 * punto come decimale, raggruppamenti irregolari, più di due decimali, zero, oltre soglia.
 */
export function parseAmount(raw: string, max = AMOUNT_MAX_CENTS): AmountResult {
  const value = raw.trim();
  if (!value) return { error: 'Scrivi l’importo in euro.' };
  if (/^[-−]/.test(value)) return { error: 'L’importo deve essere maggiore di zero.' };
  const parts = value.split(',');
  if (parts.length > 2) return { error: 'Usa una sola virgola per i centesimi, per esempio 1.234,56.' };
  const [euros = '', decimals] = parts;
  if (decimals !== undefined && !/^\d{1,2}$/.test(decimals)) {
    return { error: /^\d{3,}$/.test(decimals) ? 'Al massimo due cifre dopo la virgola.' : 'Scrivi i centesimi con una o due cifre.' };
  }
  if (!INTEGER.test(euros) && !GROUPED.test(euros)) {
    return {
      error: euros.includes('.')
        ? 'Usa la virgola per i centesimi e il punto solo per le migliaia (1.234,56).'
        : 'Scrivi solo cifre, per esempio 1234,50.',
    };
  }
  const cents = BigInt(euros.replaceAll('.', '')) * 100n + BigInt((decimals ?? '').padEnd(2, '0') || '0');
  if (cents <= 0n) return { error: 'L’importo deve essere maggiore di zero.' };
  if (cents > BigInt(max)) return { error: `L’importo supera il massimo di ${formatCents(max)}.` };
  return { cents: Number(cents) };
}

function groupThousands(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 123456 → «1.234,56 €» (aritmetica intera, nessuna divisione in virgola mobile). */
export function formatCents(cents: number) {
  const negative = cents < 0;
  const abs = String(Math.abs(Math.trunc(cents))).padStart(3, '0');
  const euros = abs.slice(0, -2).replace(/^0+(?=\d)/, '');
  return `${negative ? '−' : ''}${groupThousands(euros)},${abs.slice(-2)} €`;
}

/** Valore iniziale del campo in modifica: 123456 → «1234,56». */
export function centsToInput(cents: number) {
  const abs = String(Math.trunc(cents)).padStart(3, '0');
  return `${abs.slice(0, -2).replace(/^0+(?=\d)/, '')},${abs.slice(-2)}`;
}

const cp = (s: string) => [...s].length;
const clean = (s: string) => s.normalize('NFC').trim();

export function normalizeText(raw: string) {
  return clean(raw);
}

/** Nota persistente: vuota → null. */
export function normalizeNote(raw: string) {
  const v = clean(raw);
  return v ? v : null;
}

export function validateTitle(raw: string, max = 120) {
  const n = cp(clean(raw));
  if (n === 0) return 'Scrivi un titolo.';
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

export function validateNote(raw: string, max = 500) {
  return cp(clean(raw)) > max ? `Massimo ${max} caratteri.` : undefined;
}

/** Data della spesa: obbligatoria, reale, non successiva a oggi (giorno del server, Europe/Rome). */
export function validateSpentOn(value: string, today: string | undefined) {
  if (!value) return 'Indica la data della spesa.';
  if (!isValidCalendarDate(value)) return 'Inserisci una data valida (giorno, mese e anno).';
  if (today && value > today) return 'La data non può essere futura: per un costo da sostenere crea un promemoria in Attività.';
  return undefined;
}

export function documentLinkText(link: ExpenseDocumentLink) {
  if (link.state === 'linked') return link.document.name;
  if (link.state === 'unavailable') return 'Documento collegato non più disponibile per il tuo account';
  return 'Nessun documento collegato';
}

export function assetLinkText(link: ExpenseAssetLink) {
  if (link.state === 'linked') return link.asset.name;
  if (link.state === 'unavailable') return 'Caldaia collegata non più disponibile per il tuo account';
  return 'Nessuna caldaia collegata';
}

/** Messaggi per gli errori H3a; 404/503 riguardano solo le spese, non il resto della casa. */
export function expenseErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.kind === 'http') {
      if (error.status === 404) return 'Le spese non sono ancora attive su questo servizio.';
      if (error.status === 403) return 'Non hai accesso a questa spesa o al riferimento scelto.';
      switch (error.code) {
        case 'expense_version_conflict':
          return 'La spesa è stata modificata nel frattempo (per esempio in un’altra scheda). Rileggi i dati prima di continuare.';
        case 'expense_state_conflict':
          return 'Lo stato della spesa è cambiato nel frattempo: rileggi i dati prima di continuare.';
        case 'idempotency_conflict':
          return 'Una richiesta precedente con dati diversi risulta già registrata: rileggi i dati prima di continuare.';
      }
    }
    if (error.kind === 'service' && error.status === 503) {
      return 'Le spese non sono disponibili in questo momento. Riprova tra poco: nessuna modifica è stata salvata da questa schermata.';
    }
  }
  return userMessage(error);
}

export function isConflict(error: unknown) {
  return (
    isApiError(error) &&
    error.kind === 'http' &&
    error.status === 409 &&
    ['expense_version_conflict', 'expense_state_conflict', 'idempotency_conflict'].includes(error.code)
  );
}

export function isAmbiguous(error: unknown) {
  return isApiError(error) && error.kind === 'service';
}

export function isForbidden(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 403;
}
