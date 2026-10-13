import { isApiError, userMessage } from '../api/errors';
// Etichette e regole review-v1 lato client. Il server resta l'autorità su valori,
// fonti e origini: il client non invia mai sources/origin.
import type {
  AnalysisJob,
  BoilerSummary,
  FieldKey,
  FieldValue,
  HistoryEvent,
  Measurement,
  QuantityCode,
  ValueOrigin,
} from '../api/types';

export const SIMULATION_LABEL = 'Analisi di test — nessuna AI reale';
export const PERSONAL_LABEL = 'Scheda personale in questa casa';

export const FIELD_LABEL: Record<FieldKey, string> = {
  brand: 'Marca',
  model: 'Modello',
  power: 'Potenza',
};

/** Stato dei DATI della scheda, mai della regolarità tecnica dell'impianto. */
export const BOILER_STATE_LABEL: Record<BoilerSummary['state'], string> = {
  provisional: 'Dati provvisori',
  partially_confirmed: 'Dati parzialmente confermati',
  confirmed: 'Dati confermati',
};

export const JOB_STATE_LABEL: Record<AnalysisJob['state'], string> = {
  queued: 'In coda',
  running: 'In corso',
  succeeded: 'Completata',
  failed: 'Non riuscita',
};

export const ORIGIN_LABEL: Record<ValueOrigin, string> = {
  proposal_accepted: 'proposta accettata',
  user_correction: 'correzione tua',
  manual: 'inserito a mano',
};

export const HISTORY_KIND_LABEL: Record<HistoryEvent['kind'], string> = {
  analysis_published: 'Analisi di test pubblicata',
  analysis_no_changes: 'Analisi di test senza novità',
  confirmation: 'Conferma',
  manual_confirmation: 'Inserimento manuale',
};

export const QUANTITY_OPTIONS: Array<{ code: QuantityCode; label: string }> = [
  { code: 'useful_heating', label: 'Potenza utile al riscaldamento' },
  { code: 'reported_nominal', label: 'Potenza nominale riportata' },
  { code: 'other', label: 'Altra grandezza (specifica)' },
];

/** Messaggi per i codici di errore dei job, se il server non ne fornisce uno. */
export const JOB_ERROR_LABEL: Record<string, string> = {
  provider_fixture_unsupported:
    'Il provider di test riconosce solo i tre PDF di esempio: questo documento non è stato analizzato. L’originale resta disponibile e puoi inserire i dati a mano.',
  analysis_unavailable: 'Il servizio di analisi di test non era disponibile.',
  analysis_timeout: 'L’analisi ha superato il tempo massimo ed è stata interrotta.',
  access_revoked: 'L’accesso alla casa o ai documenti non è più valido.',
};

export function jobErrorMessage(job: AnalysisJob) {
  if (!job.error) return null;
  return job.error.message || JOB_ERROR_LABEL[job.error.code] || 'Analisi non riuscita.';
}

export function measurementText(m: Measurement) {
  return `${m.value} ${m.unit} — ${m.quantityLabel}`;
}

export function fieldValueText(value: FieldValue | null | undefined): string {
  if (!value) return '—';
  if (value.kind === 'text') return value.text;
  return value.measurements.map(measurementText).join(' · ');
}

const cp = (s: string) => [...s].length;

export function validateNote(note: string, required = true) {
  const n = cp(note.trim());
  if (n === 0) return required ? 'Scrivi una nota che spieghi la scelta.' : undefined;
  if (n > 500) return 'Massimo 500 caratteri.';
  return undefined;
}

export function validateText(fieldKey: 'brand' | 'model', text: string) {
  const max = fieldKey === 'brand' ? 80 : 120;
  const n = cp(text.trim());
  if (n === 0) return `Inserisci ${fieldKey === 'brand' ? 'la marca' : 'il modello'}.`;
  if (n > max) return `Massimo ${max} caratteri.`;
  return undefined;
}

export function validateBoilerName(name: string) {
  const n = cp(name.trim());
  if (n === 0) return 'Inserisci un nome per la scheda.';
  if (n > 80) return 'Massimo 80 caratteri.';
  return undefined;
}

/** Decimale positivo senza esponente: massimo 12 cifre intere e 6 decimali. */
const POWER_RE = /^(?:0|[1-9]\d{0,11})(?:[.,]\d{1,6})?$/;

export function normalizePower(raw: string) {
  return raw.trim().replace(',', '.');
}

export function validatePower(raw: string) {
  const v = raw.trim();
  if (!v) return 'Inserisci il valore in kW.';
  if (!POWER_RE.test(v) || Number(normalizePower(v)) <= 0) {
    return 'Usa un numero positivo, per esempio 24 o 24,5 (massimo 6 decimali).';
  }
  return undefined;
}

export function validateQuantityLabel(label: string) {
  const n = cp(label.trim());
  if (n === 0) return 'Indica la denominazione della grandezza.';
  if (n > 160) return 'Massimo 160 caratteri.';
  return undefined;
}

export function confirmedFieldOf(asset: Pick<BoilerSummary, 'confirmedFields'>, key: FieldKey) {
  return asset.confirmedFields.find((f) => f.fieldKey === key) ?? null;
}

/** Messaggio per errori di lettura delle risorse M3 (endpoint assenti inclusi). */
export function m3ErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http') {
    if (error.status === 404) return 'Le analisi e le schede impianto non sono ancora attive su questo servizio.';
    if (error.status === 403) return 'Non hai accesso a questi dati.';
  }
  return userMessage(error);
}
