// S1c lato client: etichette e messaggi per analisi da documento, bozze e conferma.
// Il server resta l'autorità su proposte, candidati, provenienza e permessi.
import { isApiError } from '../api/errors';
import type { AmountCandidate, CandidateExpense, EconomyCapabilities, EconomicAnalysisJob, ProviderDescriptor } from '../api/economyTypes';
import { economyErrorMessage } from './economy';

export const ROLE_LABEL: Record<AmountCandidate['role'], string> = {
  current_document_total: 'Totale del documento',
  amount_due: 'Importo da pagare',
  arrears_balance: 'Arretrati o saldo precedente',
  taxable: 'Imponibile',
  tax: 'Imposta',
  line_total: 'Totale di una riga',
  other: 'Altro importo',
};

/** Spiegazione breve del ruolo, per non confondere totale, dovuto, arretrati e imposte. */
export const ROLE_HINT: Partial<Record<AmountCandidate['role'], string>> = {
  current_document_total: 'Costo del periodo o del documento.',
  amount_due: 'Può comprendere arretrati di altri periodi: non è automaticamente il costo di questo documento.',
  arrears_balance: 'Riguarda periodi precedenti: potrebbe essere già registrato altrove.',
  taxable: 'Senza imposta.',
  tax: 'Solo l’imposta.',
};

export const REASON_LABEL: Record<CandidateExpense['reasons'][number], string> = {
  same_document: 'ha già questo documento collegato',
  same_number_supplier: 'stesso numero di documento e fornitore',
  same_amount_date: 'stesso importo e data',
};

export const DRAFT_STATE_LABEL = { open: 'Da confermare', parked: 'Accantonata', confirmed: 'Confermata' } as const;
export const DOCUMENT_KIND_LABEL = { utility_bill: 'Bolletta', simple_invoice: 'Fattura' } as const;

export const PROPOSED_FIELD_LABEL: Record<string, string> = {
  title: 'Descrizione',
  supplier: 'Fornitore',
  category: 'Categoria',
  documentNumber: 'Numero del documento',
  documentDate: 'Data del documento',
  competenceFrom: 'Competenza dal',
  competenceTo: 'Competenza al',
  dueOn: 'Scadenza indicata',
};

/** Codici del provider reale: messaggi che non confondono indisponibilità, pagamento o saldo. */
export const PROVIDER_MESSAGES: Record<string, string> = {
  ai_provider_disabled: 'L’analisi con questo provider non è abilitata: nessun testo è stato inviato e nessun costo è stato sostenuto.',
  ai_provider_unconfigured: 'Il provider non è configurato su questo servizio: nessun testo è stato inviato.',
  ai_budget_exhausted: 'Il budget previsto per le analisi è esaurito: nessun nuovo invio è possibile ora. Puoi inserire il costo a mano.',
  ai_evaluation_limit_reached: 'È stato raggiunto il numero massimo di analisi previste per questa fase: nessun nuovo invio è possibile ora.',
  ai_model_unavailable: 'Il modello previsto non è disponibile: nessun testo è stato inviato. Puoi inserire il costo a mano.',
  provider_auth_failed: 'Il servizio non è riuscito ad autenticarsi presso il provider: l’analisi non è avvenuta. Va risolto dal gestore del servizio, non riprovando.',
  provider_rate_limited: 'Il provider ha momentaneamente limitato le richieste. Puoi riprovare più tardi con una nuova scelta esplicita.',
  analysis_outcome_unknown: 'Non sappiamo se il provider abbia elaborato il documento: l’esito e l’eventuale costo dell’analisi non sono confermati. Non riprovare subito: il servizio deve prima chiarire l’esito.',
};

const JOB_ERROR_FALLBACK: Record<string, string> = {
  provider_fixture_unsupported: 'La prova riconosce solo i PDF sintetici previsti. Per questo documento inserisci il costo a mano.',
  ...PROVIDER_MESSAGES,
  economic_document_unsupported: 'Serve un PDF con testo.',
  no_supported_economic_data: 'Nel documento non ci sono dati economici utilizzabili.',
  evidence_unverified: 'Le proposte non erano sostenute dal documento originale: nessuna bozza creata.',
  analysis_invalid_output: 'Il risultato non era utilizzabile: nessuna bozza creata.',
  analysis_timeout: 'L’analisi si è interrotta. Puoi riprovare esplicitamente.',
  storage_unavailable: 'L’originale non è disponibile in questo momento.',
  access_revoked: 'Non hai più accesso al documento o alla casa.',
};

/** Messaggio del job fallito: per i codici del provider il testo verificato qui, altrimenti quello del server. */
export function jobErrorText(job: EconomicAnalysisJob) {
  if (!job.error) return 'Analisi non riuscita.';
  return PROVIDER_MESSAGES[job.error.code] || job.error.message || JOB_ERROR_FALLBACK[job.error.code] || 'Analisi non riuscita.';
}

/**
 * Ritentare ha senso solo per errori recuperabili. Mai per budget/limiti esauriti, autenticazione o
 * modello, fonte revocata, documento non supportato o esito d'invio incerto.
 */
const RETRYABLE = ['analysis_timeout', 'storage_unavailable', 'provider_rate_limited'];
export function jobRetryUseful(job: EconomicAnalysisJob) {
  return job.state === 'failed' && job.billing?.state !== 'uncertain' && !!job.error && RETRYABLE.includes(job.error.code);
}

/** Provider reale (non simulato): richiede consenso esplicito a ogni avvio o nuovo tentativo. */
export const isRealProvider = (job: { provider: string; isSimulation: boolean }) => !job.isSimulation && job.provider !== 'test_fixture_v1';

/** Importo in USD (stringa decimale del servizio) mostrato senza conversioni né arrotondamenti. */
export function formatUsd(value: string | null | undefined) {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return null;
  return `${value} USD`;
}

export const BILLING_STATE_LABEL = {
  reserved: 'Importo riservato, non ancora addebitato in via definitiva',
  settled: 'Costo dell’analisi confermato',
  uncertain: 'Costo non ancora confermato: non significa zero né rimborso',
} as const;

export type Availability =
  | { mode: 'off'; reason: string; disabled: ProviderDescriptor[] }
  | { mode: 'on'; fixture: ProviderDescriptor | null; real: ProviderDescriptor[]; disabled: ProviderDescriptor[] };

/** Capabilities e provider rappresentati distintamente: la fixture non è mai presentata come AI. */
export function analysisAvailability(caps: EconomyCapabilities): Availability {
  const providers = caps.analysis?.providers ?? [];
  const disabled = providers.filter((p) => !p.enabled);
  if (!caps.features.documentDrafts) return { mode: 'off', reason: 'Il servizio non propone ancora i dati dai documenti.', disabled };
  if (!caps.analysis?.enabled) return { mode: 'off', reason: caps.analysis?.disabledReason ?? 'L’analisi dei documenti non è disponibile ora.', disabled };
  // Solo ciò che il servizio dichiara abilitato: nessun flag locale abilita un provider.
  const real = providers.filter((p) => p.enabled && !p.isSimulation && p.id !== 'test_fixture_v1');
  const fixture = providers.find((p) => p.enabled && p.isSimulation && p.id === 'test_fixture_v1') ?? null;
  if (!real.length && !fixture) return { mode: 'off', reason: caps.analysis?.disabledReason ?? 'Nessun provider di analisi è disponibile ora.', disabled };
  return { mode: 'on', fixture, real, disabled };
}

export function draftErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (PROVIDER_MESSAGES[error.code]) return PROVIDER_MESSAGES[error.code]!;
    switch (error.code) {
      case 'draft_version_conflict':
        return 'La bozza è cambiata nel frattempo (per esempio in un’altra scheda). Rileggila prima di continuare.';
      case 'draft_state_conflict':
        return 'Lo stato della bozza è cambiato: potrebbe essere già confermata o accantonata. Rileggila.';
      case 'expense_document_conflict':
        return 'Quel costo ha già un documento diverso collegato: non viene sostituito. Scegli un altro costo o crea un costo nuovo.';
      case 'job_version_conflict':
      case 'job_state_conflict':
        return 'L’analisi è cambiata nel frattempo: aggiorna lo stato prima di riprovare.';
      case 'economic_document_unsupported':
        return 'Questa analisi richiede un PDF con testo. Puoi inserire il costo a mano.';
    }
    if (error.kind === 'http' && error.status === 403) return 'Non hai accesso a questa bozza, al documento originale o al costo scelto.';
    if (error.kind === 'http' && error.status === 422) return 'Alcuni valori non sono validi: controlla importo, data e campi indicati.';
  }
  return economyErrorMessage(error);
}

export const DRAFT_CONFLICTS = ['draft_version_conflict', 'draft_state_conflict', 'expense_version_conflict', 'expense_state_conflict', 'expense_document_conflict', 'idempotency_conflict', 'job_version_conflict', 'job_state_conflict'];
