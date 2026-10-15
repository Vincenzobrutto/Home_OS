// sharing-v1 (C1a) lato client: etichette, messaggi e controlli locali. Il server resta l'autorità
// su idoneità dei file, destinatari, stati, scadenze e permessi.
import { isApiError, userMessage } from '../api/errors';
import type { Share, ShareState } from '../api/sharingTypes';

export const SHARE_STATE_LABEL: Record<ShareState, string> = {
  awaiting_pairing: 'In attesa del codice',
  awaiting_confirmation: 'Da confermare: confronto del codice',
  pending: 'Invito da accettare',
  accepted: 'Accettata',
  declined: 'Rifiutata',
  revoked: 'Revocata',
  expired: 'Scaduta',
  unavailable: 'Non più disponibile',
};

export const TERMINAL_STATES: ShareState[] = ['accepted', 'declined', 'revoked', 'expired', 'unavailable'];
/** Stati in cui il mittente aspetta un'azione altrui: rilettura periodica utile. */
export const SENDER_WAITING: ShareState[] = ['awaiting_pairing', 'awaiting_confirmation', 'pending'];

export const VISIBILITY_LABEL = { private: 'Solo io', home: 'Persone della casa' } as const;

export function shareTone(state: ShareState): 'neutral' | 'blue' | 'warn' {
  if (state === 'awaiting_confirmation') return 'warn';
  if (state === 'accepted' || state === 'pending') return 'blue';
  return 'neutral';
}

/** Codice iniziale: base32 senza ambigui, 10 caratteri; spazi e trattini ammessi per leggibilità. */
export function normalizePairingCode(raw: string) {
  return raw.normalize('NFKC').replace(/[\s-]+/g, '').toUpperCase();
}

export function validatePairingCode(raw: string): string | null {
  const code = normalizePairingCode(raw);
  if (!code) return 'Inserisci il codice che ti è stato comunicato.';
  if (!/^[A-Z0-9]{10}$/.test(code)) return 'Il codice ha 10 caratteri (lettere e numeri). Spazi e trattini sono ammessi.';
  return null;
}

/** Visualizzazione a gruppi, solo per leggibilità (il valore resta intatto). */
export function groupCode(code: string) {
  return code.replace(/(.{5})(?=.)/g, '$1 ');
}

export function isShareUnavailableError(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 403;
}

export function isShareConflict(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 409 && error.code !== 'share_preview_expired';
}

export function isPreviewExpired(error: unknown) {
  return isApiError(error) && error.kind === 'http' && error.status === 409 && error.code === 'share_preview_expired';
}

/** Esito ignoto: rete o servizio. Si ripete solo su richiesta, con la stessa chiave e lo stesso body. */
export function isAmbiguousShareError(error: unknown) {
  return isApiError(error) && error.kind === 'service';
}

export function sharingErrorMessage(error: unknown): string {
  if (isApiError(error) && error.kind === 'http') {
    switch (error.code) {
      case 'share_unavailable':
        return 'Non disponibile: la condivisione o il codice non sono validi per il tuo account, oppure non sono più attivi.';
      case 'share_conflict':
        return 'La condivisione è cambiata nel frattempo (per esempio in un’altra scheda): rileggi lo stato prima di continuare.';
      case 'share_preview_expired':
        return 'Il controllo è scaduto prima della conferma. Preparane uno nuovo: la conferma precedente non vale più.';
      case 'idempotency_conflict':
        return 'Questa richiesta risulta già usata con dati diversi. Rileggi lo stato prima di riprovare.';
      case 'share_acknowledgement_required':
        return 'Conferma ognuno dei file elencati prima di creare l’invito.';
      case 'share_try_later':
        return 'Troppi tentativi in poco tempo. Attendi qualche minuto prima di riprovare.';
      case 'validation_error':
        return 'Alcuni dati non sono validi: controlla la selezione e riprova.';
    }
    if (error.status === 403) return 'Non disponibile per il tuo account.';
  }
  return userMessage(error);
}

/** Il segreto iniziale non entra mai nella cache: si toglie prima di salvare la risposta. */
export function withoutSecret(share: Share): Share {
  return share.pairing && share.pairing.code !== null ? { ...share, pairing: { ...share.pairing, code: null } } : share;
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(d);
}
