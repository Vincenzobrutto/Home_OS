import { randomBytes } from 'crypto';

// Protezione CSRF sul flusso OAuth Gmail/Drive: senza un nonce legato alla
// sessione che lo ha avviato, un sito malevolo potrebbe far atterrare un
// utente autenticato su .../callback con un "code" altrui, agganciando
// l'account Google di un estraneo alla sessione della vittima. Mappa in
// memoria di processo (non in DB): sufficiente per un solo processo Node
// come in questo MVP — da rivedere se il backend girerà mai multi-istanza.
const STATE_TTL_MS = 5 * 60 * 1000;

interface StateEntry {
  userId: string;
  expiresAt: number;
}

const pendingStates = new Map<string, StateEntry>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expiresAt < now) pendingStates.delete(state);
  }
}

export function createOAuthState(userId: string): string {
  cleanupExpired();
  const state = randomBytes(16).toString('hex');
  pendingStates.set(state, { userId, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

// Uso singolo: lo stato viene rimosso alla prima verifica, valida o meno.
export function consumeOAuthState(state: string, userId: string): boolean {
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.expiresAt < Date.now()) return false;
  return entry.userId === userId;
}
