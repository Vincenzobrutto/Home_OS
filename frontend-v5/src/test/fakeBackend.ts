// BACKEND SIMULATO — SOLO TEST E HARNESS LOCALE.
// Implementa in memoria il contratto identity-v1 per verificare client e UI.
// Non è importabile dal codice dell'app (regola ESLint) e non è il backend V5 reale.
// Deve restare autonomo e con sintassi TypeScript "erasable": viene eseguito
// anche da Node (scripts/mock-api.ts) senza build.

import type { Account, Home, HomePermission, HomeRole } from '../api/types';

export type FakeRequest = {
  method: string;
  path: string; // senza /api/v5, es. '/homes/abc'
  headers: Record<string, string | undefined>; // chiavi minuscole
  body: unknown;
  cookie: string | undefined; // valore del cookie di sessione
};

export type FakeResponse = {
  status: number;
  body?: unknown;
  setCookie?: string | null; // null = cancella
};

type Session = { id: string; csrf: string; accountId: string | null };
type StoredAccount = Account & { password: string };
type Membership = { accountId: string; homeId: string; role: HomeRole };
type StoredHome = { id: string; name: string; address: string; version: number };

const PERMS: Record<HomeRole, HomePermission[]> = {
  owner: ['read', 'edit', 'manage_members', 'export', 'sell'],
  member: ['read', 'edit'],
  viewer: ['read'],
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${(++seq).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const len = (s: string) => [...s].length;

function err(status: number, code: string, message: string, fieldErrors?: Record<string, string>): FakeResponse {
  return { status, body: { error: { code, message, fieldErrors, requestId: nextId('req') } } };
}

export class FakeBackend {
  accounts = new Map<string, StoredAccount>();
  sessions = new Map<string, Session>();
  homes = new Map<string, StoredHome>();
  memberships: Membership[] = [];
  idempotency = new Map<string, { bodyHash: string; homeId: string }>();
  /** Registro richieste ricevute, per le asserzioni dei test. */
  log: FakeRequest[] = [];
  /** Se impostato, ogni richiesta risponde con questo stato (simula guasti). */
  outage: number | null = null;

  seedAccount(name: string, email: string, password: string): Account {
    const account: StoredAccount = { id: nextId('acc'), name, email: email.toLowerCase(), password };
    this.accounts.set(account.id, account);
    return { id: account.id, name: account.name, email: account.email };
  }

  seedHome(accountId: string, name: string, address: string, role: HomeRole = 'owner'): Home {
    const home: StoredHome = { id: nextId('home'), name, address, version: 1 };
    this.homes.set(home.id, home);
    this.memberships.push({ accountId, homeId: home.id, role });
    return this.view(home, role);
  }

  private view(home: StoredHome, role: HomeRole): Home {
    return { ...home, role, permissions: PERMS[role] };
  }

  private newSession(accountId: string | null): Session {
    const s: Session = { id: nextId('sess'), csrf: nextId('csrf'), accountId };
    this.sessions.set(s.id, s);
    return s;
  }

  handle(req: FakeRequest): FakeResponse {
    this.log.push(req);
    if (this.outage) return err(this.outage, 'service_unavailable', 'Servizio non disponibile.');

    let session = req.cookie ? this.sessions.get(req.cookie) : undefined;
    let setCookie: string | undefined;
    if (!session) {
      session = this.newSession(null);
      setCookie = session.id;
    }
    const res = this.route(req, session);
    if (res.setCookie === undefined && setCookie) res.setCookie = setCookie;
    return res;
  }

  private route(req: FakeRequest, session: Session): FakeResponse {
    const { method, path } = req;
    const isMutation = method !== 'GET';
    if (isMutation && req.headers['x-csrf-token'] !== session.csrf) {
      return err(403, 'csrf_invalid', 'Richiesta non valida. Ricarica la pagina e riprova.');
    }

    if (method === 'GET' && path === '/session') {
      const account = session.accountId ? this.accounts.get(session.accountId) : undefined;
      return {
        status: 200,
        body: {
          account: account ? { id: account.id, name: account.name, email: account.email } : null,
          csrfToken: session.csrf,
        },
      };
    }

    if (method === 'POST' && path === '/auth/register') return this.register(req, session);
    if (method === 'POST' && path === '/auth/login') return this.login(req, session);
    if (method === 'POST' && path === '/auth/logout') {
      this.sessions.delete(session.id);
      const anon = this.newSession(null);
      return { status: 204, setCookie: anon.id };
    }

    const account = session.accountId ? this.accounts.get(session.accountId) : undefined;
    if (!account) return err(401, 'unauthenticated', 'Sessione assente o scaduta.');
    const context = req.headers['x-account-context'];
    if (context !== undefined && context !== account.id) {
      return err(401, 'account_context_changed', 'Account cambiato in un’altra scheda.');
    }

    if (method === 'GET' && path === '/homes') {
      const items = this.memberships
        .filter((m) => m.accountId === account.id)
        .map((m) => this.view(this.homes.get(m.homeId)!, m.role));
      return { status: 200, body: { items } };
    }
    if (method === 'POST' && path === '/homes') return this.createHome(req, account.id);

    const match = /^\/homes\/([^/]+)$/.exec(path);
    if (method === 'GET' && match) {
      const homeId = decodeURIComponent(match[1]!);
      const m = this.memberships.find((x) => x.accountId === account.id && x.homeId === homeId);
      if (!m) return err(403, 'forbidden', 'Accesso non consentito.');
      return { status: 200, body: { home: this.view(this.homes.get(homeId)!, m.role) } };
    }

    return err(404, 'not_found', 'Risorsa non trovata.');
  }

  private register(req: FakeRequest, session: Session): FakeResponse {
    const b = (req.body ?? {}) as { name?: string; email?: string; password?: string };
    const name = (b.name ?? '').trim();
    const email = (b.email ?? '').trim().toLowerCase();
    const password = b.password ?? '';
    const fieldErrors: Record<string, string> = {};
    if (len(name) < 1 || len(name) > 80) fieldErrors.name = 'Nome da 1 a 80 caratteri.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || len(email) > 254) fieldErrors.email = 'Email non valida.';
    if (len(password) < 12 || len(password) > 128) fieldErrors.password = 'Password da 12 a 128 caratteri.';
    if (Object.keys(fieldErrors).length) return err(422, 'validation_failed', 'Controlla i campi.', fieldErrors);
    if ([...this.accounts.values()].some((a) => a.email === email)) {
      return err(409, 'registration_unavailable', 'Registrazione non completabile con questi dati.');
    }
    const account = this.seedAccount(name, email, password);
    return this.rotate(session, account.id, 201, { account });
  }

  private login(req: FakeRequest, session: Session): FakeResponse {
    const b = (req.body ?? {}) as { email?: string; password?: string };
    const email = (b.email ?? '').trim().toLowerCase();
    const found = [...this.accounts.values()].find((a) => a.email === email);
    if (!found || found.password !== b.password) {
      return err(401, 'invalid_credentials', 'Email o password non corretti.');
    }
    return this.rotate(session, found.id, 200, {
      account: { id: found.id, name: found.name, email: found.email },
    });
  }

  /** Login/registrazione ruotano la sessione: nuovo cookie e nuovo CSRF. */
  private rotate(old: Session, accountId: string, status: number, body: unknown): FakeResponse {
    this.sessions.delete(old.id);
    const s = this.newSession(accountId);
    return { status, body, setCookie: s.id };
  }

  private createHome(req: FakeRequest, accountId: string): FakeResponse {
    const key = req.headers['idempotency-key'];
    if (!key) return err(422, 'idempotency_key_required', 'Manca Idempotency-Key.');
    const b = (req.body ?? {}) as { name?: string; address?: string };
    const name = (b.name ?? '').trim();
    const address = (b.address ?? '').trim();
    const fieldErrors: Record<string, string> = {};
    if (len(name) < 1 || len(name) > 80) fieldErrors.name = 'Nome da 1 a 80 caratteri.';
    if (len(address) < 1 || len(address) > 200) fieldErrors.address = 'Indirizzo da 1 a 200 caratteri.';
    if (Object.keys(fieldErrors).length) return err(422, 'validation_failed', 'Controlla i campi.', fieldErrors);

    const scoped = `${accountId}:${key}`;
    const bodyHash = JSON.stringify({ name, address });
    const previous = this.idempotency.get(scoped);
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        return err(409, 'idempotency_conflict', 'Chiave di idempotenza già usata con dati diversi.');
      }
      const home = this.homes.get(previous.homeId)!;
      return { status: 201, body: { home: this.view(home, 'owner') } };
    }
    const home = this.seedHome(accountId, name, address, 'owner');
    this.idempotency.set(scoped, { bodyHash, homeId: home.id });
    return { status: 201, body: { home } };
  }
}
