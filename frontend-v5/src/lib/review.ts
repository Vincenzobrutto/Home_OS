import { isApiError, userMessage } from '../api/errors';
// Etichette e regole review-v1 lato client. Il server resta l'autorità su valori,
// fonti e origini: il client non invia mai sources/origin.
import type {
  AnalysisBilling,
  AnalysisCapabilities,
  AnalysisJob,
  BoilerSummary,
  FieldKey,
  FieldValue,
  HistoryEvent,
  Measurement,
  ProviderId,
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
export function historyKindLabel(event: HistoryEvent) {
  if (event.origin === 'ai_provider' && event.kind === 'analysis_published') return 'Analisi AI pubblicata';
  if (event.origin === 'ai_provider' && event.kind === 'analysis_no_changes') return 'Analisi AI senza novità';
  return HISTORY_KIND_LABEL[event.kind];
}

export const HISTORY_ORIGIN_LABEL: Record<HistoryEvent['origin'], string> = {
  test_provider: 'provider di test',
  ai_provider: 'analisi AI (Anthropic)',
  explicit_user: 'tua decisione',
};

export const HISTORY_ACTION_LABEL: Record<string, string> = {
  accept: 'Proposta confermata', correct: 'Valore corretto', resolve_power: 'Potenza interpretata',
  discard: 'Proposta non applicata', manual: 'Inserimento manuale', proposed: 'Dato proposto',
  already_matches: 'Evidenza già gestita',
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
  return job.error.message || JOB_ERROR_LABEL[job.error.code] || M4_ERROR_LABEL[job.error.code] || 'Analisi non riuscita.';
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

// ---- analysis-v2 (M4) ----

export const AI_LABEL = 'Analisi AI con Anthropic';
export const CONSENT_LABEL = 'Invia ad Anthropic il testo dei documenti selezionati per proporre i dati della caldaia';
export const SOURCE_CHECK_NOTE =
  'Verificato sulla fonte: pagina ed estratto controllati sul testo dell’originale. Non è una certificazione né una conferma.';

/** Etichetta del provider effettivo di un'analisi (mai dedotta dalla configurazione corrente). */
export function providerLabel(provider: ProviderId | undefined, model?: string | null) {
  if (provider === 'anthropic') return model ? `${AI_LABEL} · modello ${model}` : AI_LABEL;
  return SIMULATION_LABEL;
}

const usd = (v: string) => `${v} USD`;

/** Costi del collaudo: riservato, effettivo o incerto. Mai uno zero non comunicato dal server. */
export function billingText(billing: AnalysisBilling | null | undefined, provider: ProviderId | undefined) {
  if (provider !== 'anthropic') return 'Nessun costo: analisi di test.';
  if (!billing) return 'Costo non comunicato dal servizio.';
  switch (billing.state) {
    case 'reserved':
      return `Costo in corso di calcolo: riservati fino a ${usd(billing.maxReservedUsd)}.`;
    case 'settled':
      return billing.actualUsd !== null
        ? `Costo del tentativo: ${usd(billing.actualUsd)}.`
        : `Costo concluso ma importo non comunicato (riservati ${usd(billing.maxReservedUsd)}).`;
    case 'uncertain':
      return `Costo incerto: il servizio non sa se la richiesta ad Anthropic è stata addebitata (fino a ${usd(billing.maxReservedUsd)}).`;
  }
}

/** Errori all'avvio (HTTP) o nei job falliti dopo l'invio. Il messaggio del server ha la precedenza. */
export const M4_ERROR_LABEL: Record<string, string> = {
  ai_evaluation_limit_reached: 'È stato raggiunto il numero massimo di analisi disponibili. Puoi continuare a inserire i dati a mano.',
  ai_provider_unconfigured: 'Anthropic non è configurato su questo servizio: nessun dato è stato inviato.',
  ai_provider_disabled: 'Anthropic è disattivato su questo servizio: nessun dato è stato inviato.',
  ai_model_unavailable: 'Il modello previsto non è disponibile: l’analisi non è stata eseguita con un altro modello.',
  ai_budget_exhausted: 'Il limite di spesa per le analisi è stato raggiunto: nessuna nuova analisi AI può partire.',
  provider_rate_limited: 'Anthropic ha limitato temporaneamente le richieste. Potrai riprovare più tardi.',
  provider_auth_failed: 'Il servizio non è riuscito ad autenticarsi presso Anthropic.',
  provider_unavailable: 'Anthropic non era raggiungibile.',
  analysis_invalid_output: 'La risposta dell’AI non rispettava il formato atteso: nessun dato è stato pubblicato.',
  evidence_unverified:
    'Le citazioni proposte dall’AI non corrispondevano al testo della pagina indicata: nessun dato è stato pubblicato.',
  pdf_text_unavailable: 'Il PDF non contiene testo estraibile (per esempio una scansione): l’analisi AI non è possibile.',
  pdf_encrypted: 'Il PDF è protetto o cifrato: l’analisi non è possibile.',
  pdf_invalid: 'Il PDF non è leggibile o è danneggiato.',
  analysis_limits_exceeded: 'I documenti superano i limiti di questa versione (dimensione, pagine o testo).',
  multi_assets_unsupported: 'Il documento descrive più caldaie o modelli diversi: non vengono fusi in una sola scheda.',
  analysis_outcome_unknown: 'Non è noto se la richiesta ad Anthropic sia stata eseguita: il risultato non è stato pubblicato.',
};

/** Messaggio per un errore di avvio di analisi (HTTP), con i codici M4. */
export function startErrorMessage(error: unknown) {
  if (isApiError(error) && error.kind === 'http' && M4_ERROR_LABEL[error.code]) return M4_ERROR_LABEL[error.code]!;
  if (isApiError(error) && error.kind === 'service' && M4_ERROR_LABEL[error.code]) return M4_ERROR_LABEL[error.code]!;
  if (isApiError(error) && error.fieldErrors.consentToProviderTransfer) return error.fieldErrors.consentToProviderTransfer;
  return m3ErrorMessage(error);
}

export function formatLimit(limits: NonNullable<AnalysisCapabilities['limits']>) {
  const mib = Math.round((limits.maxFileBytes / (1024 * 1024)) * 10) / 10;
  const n = new Intl.NumberFormat('it-IT');
  return `PDF con testo estraibile, massimo ${n.format(mib)} MiB per file, ${n.format(limits.maxTotalPages)} pagine e ${n.format(limits.maxExtractedCodePoints)} caratteri di testo in totale, ${n.format(limits.maxInputTokens)} token di input.`;
}
