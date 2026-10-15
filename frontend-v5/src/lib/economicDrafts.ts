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

const JOB_ERROR_FALLBACK: Record<string, string> = {
  provider_fixture_unsupported: 'La prova riconosce solo i PDF sintetici previsti. Per questo documento inserisci il costo a mano.',
  economic_document_unsupported: 'Serve un PDF con testo.',
  no_supported_economic_data: 'Nel documento non ci sono dati economici utilizzabili.',
  evidence_unverified: 'Le proposte non erano sostenute dal documento originale: nessuna bozza creata.',
  analysis_invalid_output: 'Il risultato non era utilizzabile: nessuna bozza creata.',
  analysis_timeout: 'L’analisi si è interrotta. Puoi riprovare esplicitamente.',
  storage_unavailable: 'L’originale non è disponibile in questo momento.',
  access_revoked: 'Non hai più accesso al documento o alla casa.',
};

/** Messaggio del job fallito: quello del server, con un'aggiunta solo se manca. */
export function jobErrorText(job: EconomicAnalysisJob) {
  if (!job.error) return 'Analisi non riuscita. Nessun costo è stato registrato.';
  return job.error.message || JOB_ERROR_FALLBACK[job.error.code] || 'Analisi non riuscita. Nessun costo è stato registrato.';
}

/** Ritentare ha senso solo per errori transitori; per un documento non supportato serve il manuale. */
export function jobRetryUseful(job: EconomicAnalysisJob) {
  return job.state === 'failed' && !!job.error && ['analysis_timeout', 'storage_unavailable'].includes(job.error.code);
}

export type Availability =
  | { mode: 'off'; reason: string }
  | { mode: 'fixture'; provider: ProviderDescriptor; disabled: ProviderDescriptor[] }
  | { mode: 'real'; provider: ProviderDescriptor; disabled: ProviderDescriptor[] };

/** Capabilities e provider rappresentati distintamente: la fixture non è mai presentata come AI. */
export function analysisAvailability(caps: EconomyCapabilities): Availability {
  if (!caps.features.documentDrafts) return { mode: 'off', reason: 'Il servizio non propone ancora i dati dai documenti.' };
  const providers = caps.analysis?.providers ?? [];
  const disabled = providers.filter((p) => !p.enabled);
  const real = providers.find((p) => p.enabled && !p.isSimulation);
  if (real) return { mode: 'real', provider: real, disabled };
  const fixture = providers.find((p) => p.enabled && p.isSimulation && p.id === 'test_fixture_v1');
  if (fixture) return { mode: 'fixture', provider: fixture, disabled };
  return { mode: 'off', reason: caps.analysis?.disabledReason ?? 'Nessun provider di analisi è disponibile ora.' };
}

export function draftErrorMessage(error: unknown) {
  if (isApiError(error)) {
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
      case 'ai_provider_disabled':
        return 'Il provider scelto non è abilitato: nessun testo è stato inviato. Puoi inserire il costo a mano.';
      case 'economic_document_unsupported':
        return 'Questa analisi richiede un PDF con testo. Puoi inserire il costo a mano.';
    }
    if (error.kind === 'http' && error.status === 403) return 'Non hai accesso a questa bozza, al documento originale o al costo scelto.';
    if (error.kind === 'http' && error.status === 422) return 'Alcuni valori non sono validi: controlla importo, data e campi indicati.';
  }
  return economyErrorMessage(error);
}

export const DRAFT_CONFLICTS = ['draft_version_conflict', 'draft_state_conflict', 'expense_version_conflict', 'expense_state_conflict', 'expense_document_conflict', 'idempotency_conflict', 'job_version_conflict', 'job_state_conflict'];
