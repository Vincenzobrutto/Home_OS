// BACKEND SIMULATO — SOLO TEST E HARNESS LOCALE.
// Implementa in memoria i contratti identity-v1.1, documents-v1 e document-search-v1 per verificare client e UI.
// Non è importabile dal codice dell'app (regola ESLint) e non è il backend V5 reale.
// Deve restare autonomo e con sintassi TypeScript "erasable": viene eseguito
// anche da Node (scripts/mock-api.ts) senza build.

import type {
  Account,
  DocumentDetail,
  DocumentMimeType,
  DocumentSummary,
  DocumentVisibility,
  Home,
  HomePermission,
  HomeRole,
} from '../api/types';
import { FakeReview } from './fakeReview.ts';
import { FakeActivities } from './fakeActivities.ts';
import { FakeExpenses } from './fakeExpenses.ts';
import { FakeObjects } from './fakeObjects.ts';
import { FakeEconomy } from './fakeEconomy.ts';
import { FakeSharing } from './fakeSharing.ts';

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
  /** Risposta binaria (file originale o ZIP) al posto di body JSON. */
  binary?: { bytes: Uint8Array; contentType: string; filename: string };
  setCookie?: string | null; // null = cancella
};

/** Parte "file" di un multipart: File del browser o Blob di Node. */
type BlobLike = { size: number; name?: string; arrayBuffer?: () => Promise<ArrayBuffer> };
type FormLike = { get: (name: string) => unknown };

type StoredDocument = {
  workflowState?: DocumentSummary['workflowState'];
  id: string;
  homeId: string;
  uploaderId: string;
  name: string;
  originalFilename: string;
  mimeType: DocumentMimeType;
  bytes: Uint8Array;
  createdAt: string;
  sha256: string;
  visibility: DocumentVisibility;
};

export const FAKE_MAX_UPLOAD = 20 * 1024 * 1024;
export const FAKE_MAX_EXPORT = 100 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  documents = new Map<string, StoredDocument>();
  uploads = new Map<string, { fingerprint: string; documentId: string }>();
  /** false = backend senza endpoint documentali (404, come un backend solo M1). */
  documentsEnabled = true;
  /** Simula storage non disponibile sulle operazioni documentali. */
  storageDown = false;
  /** document-search-v1 (H2): false = backend senza ricerca (capabilities 404, parametri nuovi rifiutati). */
  documentSearchEnabled = true;
  /** H2: capabilities 503 (ricerca momentaneamente non disponibile). */
  documentSearchDown = false;
  /** Prova di gare/annullamenti: se impostato, ogni lista documenti attende questa promessa. */
  listGate: ((query: URLSearchParams) => Promise<void>) | null = null;
  private clock = Date.parse('2026-10-13T08:00:00Z');
  /** review-v1 (M3): job, schede, proposte, conferme. Fonti lette con le regole M2. */
  review = new FakeReview({
    find: (homeId, accountId, documentId) => {
      const perms = this.homePerms(accountId, homeId);
      const d = this.documents.get(documentId);
      return perms && d && d.homeId === homeId && this.canSee(d, accountId, perms)
        ? { id: d.id, sha256: d.sha256, mimeType: d.mimeType }
        : null;
    },
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
  });
  /** activities-v1 (H1): attività personali; caldaie lette con le regole M3/M4. */
  activities = new FakeActivities({
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
    asset: (accountId, homeId, assetId) => {
      const a = this.review.assets.get(assetId);
      return a && a.accountId === accountId && a.homeId === homeId ? { id: a.id, name: a.name } : null;
    },
  });
  /** expenses-v1 (H3a): spese personali; documenti con le regole M2, caldaie con quelle M3/M4. */
  expenses = new FakeExpenses({
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
    document: (accountId, homeId, documentId) => {
      const perms = this.homePerms(accountId, homeId);
      const d = this.documents.get(documentId);
      return perms && d && d.homeId === homeId && this.canSee(d, accountId, perms) ? { id: d.id, name: d.name } : null;
    },
    asset: (accountId, homeId, assetId) => {
      const a = this.review.assets.get(assetId);
      return a && a.accountId === accountId && a.homeId === homeId ? { id: a.id, name: a.name } : null;
    },
  });
  /** home-objects-v1 (G1): ambienti condivisi, oggetti personali, caldaie M3 e collegamenti. */
  objects = new FakeObjects({
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
    boilers: (accountId, homeId) =>
      [...this.review.assets.values()]
        .filter((a) => a.accountId === accountId && a.homeId === homeId)
        .map((a) => ({ id: a.id, name: a.name, createdAt: a.createdAt })),
    boilerDocuments: (accountId, homeId, assetId) => {
      const a = this.review.assets.get(assetId);
      if (!a || a.accountId !== accountId || a.homeId !== homeId) return [];
      const json = JSON.stringify([a.proposals, a.confirmed]);
      return [...new Set([...json.matchAll(/"documentId":"([0-9a-f-]{36})"/g)].map((m) => m[1]!))];
    },
    document: (accountId, homeId, id) => {
      const perms = this.homePerms(accountId, homeId);
      const d = this.documents.get(id);
      return perms && d && d.homeId === homeId && this.canSee(d, accountId, perms) ? { id: d.id, title: d.name } : null;
    },
    expense: (accountId, homeId, id) => {
      const e = this.expenses.items.get(id);
      return e && e.accountId === accountId && e.homeId === homeId ? { id: e.id, title: e.title, assetId: e.assetId, amountCents: e.amountCents, currency: 'EUR', spentOn: e.spentOn } : null;
    },
    activity: (accountId, homeId, id) => {
      const a = this.activities.items.get(id);
      return a && a.accountId === accountId && a.homeId === homeId ? { id: a.id, title: a.title, assetId: a.assetId } : null;
    },
    native: (accountId, homeId, type, assetId) =>
      type === 'expense'
        ? [...this.expenses.items.values()]
            .filter((e) => e.accountId === accountId && e.homeId === homeId && e.assetId === assetId)
            .map((e) => ({ id: e.id, title: e.title, assetId, amountCents: e.amountCents, currency: 'EUR', spentOn: e.spentOn }))
        : [...this.activities.items.values()]
            .filter((a) => a.accountId === accountId && a.homeId === homeId && a.assetId === assetId)
            .map((a) => ({ id: a.id, title: a.title, assetId })),
  });
  /**
   * economy-v1 (S1a/b) simulato sugli stessi costi H3a e collegamenti G1.
   * Disattivo per default (404): le prove H3a restano quelle di un backend senza S1.
   */
  economy = new FakeEconomy(this.expenses, this.objects, {
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
    document: (accountId, homeId, documentId) => {
      const perms = this.homePerms(accountId, homeId);
      const d = this.documents.get(documentId);
      return perms && d && d.homeId === homeId && this.canSee(d, accountId, perms) ? { id: d.id, name: d.name } : null;
    },
  });
  /** sharing-v1 (C1a): disattivo per default (404), come un backend senza condivisione. */
  sharing = new FakeSharing({
    perms: (accountId, homeId) => this.homePerms(accountId, homeId),
    members: (homeId) => this.memberships.filter((m) => m.homeId === homeId).map((m) => m.accountId),
    account: (id) => {
      const a = this.accounts.get(id);
      return a ? { id: a.id, name: a.name, email: a.email } : undefined;
    },
    documents: (homeId) => [...this.documents.values()].filter((d) => d.homeId === homeId),
  });
  /** false = backend senza endpoint M3 (404, come un backend solo M1/M2). */
  reviewEnabled = true;

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

  async handle(req: FakeRequest): Promise<FakeResponse> {
    this.log.push(req);
    if (this.outage) return err(this.outage, 'service_unavailable', 'Servizio non disponibile.');

    let session = req.cookie ? this.sessions.get(req.cookie) : undefined;
    let setCookie: string | undefined;
    if (!session) {
      session = this.newSession(null);
      setCookie = session.id;
    }
    const res = await this.route(req, session);
    if (res.setCookie === undefined && setCookie) res.setCookie = setCookie;
    return res;
  }

  private async route(req: FakeRequest, session: Session): Promise<FakeResponse> {
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

    const shared = this.sharing.handle(req, account.id);
    if (shared) return shared;

    if (method === 'GET' && path === '/homes') {
      const items = this.memberships
        .filter((m) => m.accountId === account.id)
        .map((m) => this.view(this.homes.get(m.homeId)!, m.role));
      return { status: 200, body: { items } };
    }
    if (method === 'POST' && path === '/homes') return this.createHome(req, account.id);

    const contactRead = /^\/homes\/([^/]+)\/(contacts|contact-suggestion)(?:\?|$)/.exec(path);
    if (contactRead && method === 'GET') {
      if (!this.memberships.some(m => m.accountId === account.id && m.homeId === decodeURIComponent(contactRead[1]!))) return err(403, 'forbidden', 'Accesso non consentito.');
      return { status:200,body:contactRead[2] === 'contact-suggestion' ? {suggestion:null} : {items:[],nextCursor:null} };
    }

    const capsMatch = /^\/homes\/([^/]+)\/document-search-capabilities$/.exec(path);
    if (capsMatch && method === 'GET') return this.searchCapabilities(account.id, decodeURIComponent(capsMatch[1]!));

    const docMatch = /^\/homes\/([^/]+)\/documents(?:\/([^/]+))?(\/file)?$/.exec(path.split('?')[0]!);
    if (docMatch) {
      if (!this.documentsEnabled) return err(404, 'not_found', 'Risorsa non trovata.');
      return this.routeDocuments(req, account.id, decodeURIComponent(docMatch[1]!), docMatch[2], !!docMatch[3]);
    }

    const g1 = /^\/homes\/([^/]+)\/((?:object-capabilities|rooms|objects)(?:[/?].*)?)$/.exec(path);
    if (g1) return this.objects.handle(req, account.id, decodeURIComponent(g1[1]!), g1[2]!);

    const s1 = /^\/homes\/([^/]+)\/economy\/(.*)$/.exec(path);
    if (s1) return this.economy.handle(req, account.id, decodeURIComponent(s1[1]!), s1[2]!);

    const h3 = /^\/homes\/([^/]+)\/((?:expense-capabilities|expense-summary|expenses)(?:[/?].*)?)$/.exec(path);
    if (h3) return this.expenses.handle(req, account.id, decodeURIComponent(h3[1]!), h3[2]!);

    const h1 = /^\/homes\/([^/]+)\/((?:activity-capabilities|activity-summary|activities)(?:[/?].*)?)$/.exec(path);
    if (h1) return this.activities.handle(req, account.id, decodeURIComponent(h1[1]!), h1[2]!);

    const m3 = /^\/homes\/([^/]+)\/((?:analysis-capabilities|analysis-jobs|assets|review)(?:[/?].*)?)$/.exec(path);
    if (m3) {
      if (!this.reviewEnabled) return err(404, 'not_found', 'Risorsa non trovata.');
      return this.review.handle(req, account.id, decodeURIComponent(m3[1]!), m3[2]!);
    }

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

  // ---- documents-v1 ----

  /** Aggiunge un membro con ruolo (per i test di permessi/visibilità). */
  addMember(accountId: string, homeId: string, role: HomeRole) {
    this.memberships.push({ accountId, homeId, role });
  }

  /** Inserisce direttamente un documento (seed dei test). */
  async seedDocument(opts: {
    homeId: string;
    uploaderId: string;
    name: string;
    bytes?: Uint8Array;
    mimeType?: DocumentMimeType;
    originalFilename?: string;
    visibility?: DocumentVisibility;
    /** Solo test UI in jsdom: impronta dichiarata al posto di quella calcolata (le prove sui byte reali sono in tests/fixtures). */
    sha256?: string;
    workflowState?: DocumentSummary['workflowState'];
  }): Promise<DocumentDetail> {
    const mimeType = opts.mimeType ?? 'application/pdf';
    const bytes = opts.bytes ?? samplePdf(opts.name);
    const doc: StoredDocument = {
      id: globalThis.crypto.randomUUID(),
      homeId: opts.homeId,
      uploaderId: opts.uploaderId,
      name: opts.name,
      originalFilename: opts.originalFilename ?? `${opts.name}.${mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg'}`,
      mimeType,
      bytes,
      createdAt: new Date((this.clock += 60_000)).toISOString(),
      sha256: opts.sha256 ?? (await sha256Hex(bytes)),
      visibility: opts.visibility ?? 'private',
      workflowState: opts.workflowState ?? 'to_compile',
    };
    this.documents.set(doc.id, doc);
    return this.docDetail(doc, PERMS.owner);
  }

  private homePerms(accountId: string, homeId: string): HomePermission[] | null {
    const m = this.memberships.find((x) => x.accountId === accountId && x.homeId === homeId);
    return m ? PERMS[m.role] : null;
  }

  private canSee(doc: StoredDocument, accountId: string, perms: HomePermission[]) {
    if (!perms.includes('read')) return false;
    return doc.visibility === 'home' || doc.uploaderId === accountId;
  }

  private docSummary(doc: StoredDocument, perms: HomePermission[]): DocumentSummary {
    return {
      id: doc.id,
      homeId: doc.homeId,
      name: doc.name,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      byteSize: doc.bytes.byteLength,
      createdAt: doc.createdAt,
      version: 1,
      source: 'manual_upload',
      status: 'stored',
      workflowState: doc.workflowState ?? 'to_compile',
      visibility: doc.visibility,
      permissions: perms.includes('export') ? ['read', 'export'] : ['read'],
    };
  }

  private docDetail(doc: StoredDocument, perms: HomePermission[]): DocumentDetail {
    return { ...this.docSummary(doc, perms), sha256: doc.sha256 };
  }

  private async routeDocuments(
    req: FakeRequest,
    accountId: string,
    homeId: string,
    documentId: string | undefined,
    file: boolean,
  ): Promise<FakeResponse> {
    const perms = this.homePerms(accountId, homeId);
    if (!perms) return err(403, 'forbidden', 'Accesso non consentito.');
    if (this.storageDown) return err(503, 'storage_unavailable', 'Archivio non disponibile.');

    if(documentId==='workflow-summary'&&req.method==='GET'){
      const counts={to_compile:0,review:0,analyzing:0,attention:0,completed:0};
      for(const doc of this.documents.values())if(doc.homeId===homeId&&this.canSee(doc,accountId,perms))counts[doc.workflowState??'to_compile']++;
      return {status:200,body:{counts}};
    }
    if (documentId === 'export' && !file) {
      if (req.method !== 'POST') return err(404, 'not_found', 'Risorsa non trovata.');
      return this.exportZip(req, accountId, homeId, perms);
    }
    if (documentId === undefined) {
      if (req.method === 'GET') {
        if (this.listGate) await this.listGate(new URLSearchParams(req.path.split('?')[1] ?? ''));
        // Permessi riletti dopo l'attesa, come farebbe una nuova richiesta al server.
        const current = this.homePerms(accountId, homeId);
        if (!current) return err(403, 'forbidden', 'Accesso non consentito.');
        return this.listDocs(req, accountId, homeId, current);
      }
      if (req.method === 'POST') return this.upload(req, accountId, homeId, perms);
      return err(404, 'not_found', 'Risorsa non trovata.');
    }
    if (req.method !== 'GET') return err(404, 'not_found', 'Risorsa non trovata.');
    const id = decodeURIComponent(documentId);
    if (!UUID_RE.test(id)) return err(422, 'validation_error', 'Identificativo non valido.');
    const doc = this.documents.get(id);
    if (!doc || doc.homeId !== homeId || !this.canSee(doc, accountId, perms)) {
      return err(403, 'forbidden', 'Accesso non consentito.');
    }
    if (!file) return { status: 200, body: { document: this.docDetail(doc, perms) } };
    return { status: 200, binary: { bytes: doc.bytes, contentType: doc.mimeType, filename: doc.originalFilename } };
  }

  private searchCapabilities(accountId: string, homeId: string): FakeResponse {
    if (!UUID_RE.test(homeId) && !this.homes.has(homeId)) return err(422, 'validation_error', 'Identificativo non valido.');
    if (!this.homePerms(accountId, homeId)) return err(403, 'forbidden', 'Accesso non consentito.');
    if (!this.documentSearchEnabled) return err(404, 'not_found', 'Risorsa non trovata.');
    if (this.documentSearchDown) return err(503, 'service_unavailable', 'Servizio non disponibile.');
    return {
      status: 200,
      body: {
        apiVersion: 'document-search-v1',
        enabled: true,
        isSimulation: false,
        searchableFields: ['name', 'originalFilename'],
        formats: ['pdf', 'jpeg', 'png'],
        visibilities: ['private', 'home'],
        limits: { queryMaxCodePoints: 120, maxPageSize: 50 },
      },
    };
  }

  /**
   * Lista M2 estesa da H2. Selezione autorizzata e filtri applicati sull'intero
   * dataset prima dell'ordinamento e della paginazione (mai sulla sola pagina).
   * Cursor senza filtri: «cN» come M2. Con filtri: «s.<impronta>.N», legato ad
   * account/casa/filtri canonici ma non al limit; q mai in chiaro nel cursor.
   */
  private listDocs(req: FakeRequest, accountId: string, homeId: string, perms: HomePermission[]): FakeResponse {
    const query = new URLSearchParams(req.path.split('?')[1] ?? '');
    const allowed = this.documentSearchEnabled ? ['limit', 'cursor', 'q', 'format', 'visibility', 'workflow'] : ['limit', 'cursor', 'workflow'];
    const fieldErrors: Record<string, string> = {};
    for (const key of new Set(query.keys())) {
      if (!allowed.includes(key)) fieldErrors[key] = 'Parametro non ammesso.';
      else if (query.getAll(key).length > 1) fieldErrors[key] = 'Parametro ripetuto.';
    }
    const q = (query.get('q') ?? '').normalize('NFC').trim();
    // eslint-disable-next-line no-control-regex -- caratteri di controllo rifiutati dal contratto
    if (/[\u0000-\u001f\u007f]/.test(q)) fieldErrors.q = 'Caratteri di controllo non ammessi.';
    else if (len(q) > 120) fieldErrors.q = 'Massimo 120 caratteri.';
    const format = query.get('format') ?? 'all';
    if (!['all', 'pdf', 'jpeg', 'png'].includes(format)) fieldErrors.format = 'Formato non valido.';
    const visibility = query.get('visibility') ?? 'all';
    if (!['all', 'private', 'home'].includes(visibility)) fieldErrors.visibility = 'Visibilità non valida.';
    if (Object.keys(fieldErrors).length) return err(422, 'validation_error', 'Controlla la ricerca.', fieldErrors);

    const limit = query.has('limit') ? Number(query.get('limit')) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const workflow=query.get('workflow')??'all';
    if(!['all','pending','completed','to_compile','review'].includes(workflow))return err(422,'validation_error','Stato non valido.');
    const filtered = workflow!=='all'||q !== '' || format !== 'all' || visibility !== 'all';
    const scope = fingerprint(`${accountId}|${homeId}|${q}|${format}|${visibility}|${workflow}`);
    const cursor = query.get('cursor');
    let offset = 0;
    if (cursor) {
      const legacy = /^c(\d+)$/.exec(cursor);
      const search = /^s\.([0-9a-z]+)\.(\d+)$/.exec(cursor);
      if (legacy && !filtered) offset = Number(legacy[1]);
      else if (search && search[1] === scope) offset = Number(search[2]);
      else return err(422, 'validation_error', 'Cursore non valido per questa ricerca.');
    }
    const mime = { pdf: 'application/pdf', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>;
    const needle = q.toLowerCase();
    const visible = [...this.documents.values()]
      .filter((d) => d.homeId === homeId && this.canSee(d, accountId, perms))
      .filter(d=>workflow==='all'||(['pending','completed'].includes(workflow)?(d.workflowState==='completed')===(workflow==='completed'):d.workflowState===workflow))
      .filter((d) => format === 'all' || d.mimeType === mime[format])
      .filter((d) => (visibility === 'all' ? true : visibility === 'home' ? d.visibility === 'home' : d.visibility === 'private'))
      .filter(
        (d) =>
          !needle ||
          d.name.normalize('NFC').toLowerCase().includes(needle) ||
          d.originalFilename.normalize('NFC').toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const items = visible.slice(offset, offset + limit).map((d) => this.docSummary(d, perms));
    const next = offset + limit;
    const nextCursor = next < visible.length ? (filtered ? `s.${scope}.${next}` : `c${next}`) : null;
    return { status: 200, body: { items, nextCursor } };
  }

  private async upload(req: FakeRequest, accountId: string, homeId: string, perms: HomePermission[]): Promise<FakeResponse> {
    if (!perms.includes('edit')) return err(403, 'forbidden', 'Il tuo ruolo non consente di caricare documenti.');
    const key = req.headers['idempotency-key'];
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      return err(422, 'validation_error', 'Idempotency-Key non valida.');
    }
    if ((req.headers['content-type'] ?? '').includes('application/json')) {
      return err(422, 'validation_error', 'Serve un invio multipart.');
    }
    const form = req.body as FormLike | undefined;
    if (!form || typeof form.get !== 'function') return err(422, 'validation_error', 'Serve un invio multipart.');
    const part = form.get('file') as BlobLike | null;
    const name = String(form.get('name') ?? '').trim();
    const visibility = String(form.get('visibility') ?? '');
    const fieldErrors: Record<string, string> = {};
    if (!part || typeof part !== 'object' || part.size === 0) fieldErrors.file = 'Il file è vuoto o mancante.';
    if (len(name) < 1 || len(name) > 160) fieldErrors.name = 'Titolo da 1 a 160 caratteri.';
    if (visibility !== 'private' && visibility !== 'home') fieldErrors.visibility = 'Visibilità non valida.';
    if (Object.keys(fieldErrors).length) return err(422, 'validation_error', 'Controlla i campi.', fieldErrors);
    if (part!.size > FAKE_MAX_UPLOAD) return err(413, 'file_too_large', 'Il file supera il limite di 20 MB.');
    const bytes = await readBytes(part!);
    const mimeType = sniff(bytes);
    if (!mimeType) return err(415, 'unsupported_file_type', 'Formato non supportato: carica PDF, JPEG o PNG.');
    const originalFilename = safeName(part!.name ?? 'documento');
    const hash = await sha256Hex(bytes);
    const fingerprint = JSON.stringify({ name, visibility, originalFilename, hash });
    const scoped = `${accountId}:${homeId}:${key}`;
    const previous = this.uploads.get(scoped);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return err(409, 'idempotency_conflict', 'Chiave di idempotenza già usata con dati diversi.');
      }
      return { status: 201, body: { document: this.docDetail(this.documents.get(previous.documentId)!, perms) } };
    }
    const doc: StoredDocument = {
      id: globalThis.crypto.randomUUID(),
      homeId,
      uploaderId: accountId,
      name,
      originalFilename,
      mimeType,
      bytes,
      createdAt: new Date((this.clock += 60_000)).toISOString(),
      sha256: hash,
      visibility: visibility as DocumentVisibility,
    };
    this.documents.set(doc.id, doc);
    this.uploads.set(scoped, { fingerprint, documentId: doc.id });
    return { status: 201, body: { document: this.docDetail(doc, perms) } };
  }

  private exportZip(req: FakeRequest, accountId: string, homeId: string, perms: HomePermission[]): FakeResponse {
    if (!perms.includes('export')) return err(403, 'forbidden', 'Il tuo ruolo non consente l’esportazione.');
    const ids = (req.body as { documentIds?: unknown } | undefined)?.documentIds;
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 50 ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === 'string' && UUID_RE.test(id))
    ) {
      return err(422, 'validation_error', 'Selezione non valida.', { documentIds: 'Da 1 a 50 documenti distinti.' });
    }
    const docs = ids.map((id) => this.documents.get(id as string));
    // Un solo documento vietato o assente rifiuta l'intero ZIP: niente sottoinsiemi silenziosi.
    if (docs.some((d) => !d || d.homeId !== homeId || !this.canSee(d, accountId, perms))) {
      return err(403, 'forbidden', 'Accesso non consentito.');
    }
    const total = docs.reduce((sum, d) => sum + d!.bytes.byteLength, 0);
    if (total > FAKE_MAX_EXPORT) return err(413, 'export_too_large', 'La selezione supera 100 MB.');
    const used = new Set<string>();
    const entries = docs.map((d) => {
      let entryName = d!.originalFilename;
      for (let i = 2; used.has(entryName); i++) entryName = `${i}-${d!.originalFilename}`;
      used.add(entryName);
      return { name: entryName, bytes: d!.bytes };
    });
    const manifest = docs.map((d) => ({
      documentId: d!.id,
      version: 1,
      originalFilename: d!.originalFilename,
      byteSize: d!.bytes.byteLength,
      sha256: d!.sha256,
      visibility: d!.visibility,
    }));
    entries.push({ name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
    return { status: 200, binary: { bytes: zipStore(entries), contentType: 'application/zip', filename: 'documenti.zip' } };
  }
}

// ---- utilità del backend simulato ----

/** PDF sintetico di una pagina, strutturalmente valido (xref corretta), per i seed. */
/** Impronta breve (FNV-1a) dei filtri per i cursor simulati: niente testo della ricerca in chiaro. */
function fingerprint(text: string) {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function samplePdf(label: string): Uint8Array {
  const text = `Documento di prova: ${label}`.replace(/[^\x20-\x7e]/g, '?').replace(/[()\\]/g, '');
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const JPEG_SIGNATURE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

/** Formato dai byte, non dal nome o dal MIME dichiarato. */
function sniff(bytes: Uint8Array): DocumentMimeType | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts([...PNG_SIGNATURE])) return 'image/png';
  return null;
}

function safeName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? '';
  return base.replace(/[^\p{L}\p{N} ._()-]/gu, '_').replace(/^\.+/, '').slice(0, 180) || 'documento';
}

async function readBytes(part: BlobLike): Promise<Uint8Array> {
  if (typeof part.arrayBuffer === 'function') return new Uint8Array(await part.arrayBuffer());
  // jsdom: File senza arrayBuffer → FileReader.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(part as unknown as Blob);
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP minimo senza compressione (metodo store), sufficiente per verificare l'export. */
export function zipStore(entries: Array<{ name: string; bytes: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomi UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, e.bytes.byteLength, true);
    local.setUint32(22, e.bytes.byteLength, true);
    local.setUint16(26, name.byteLength, true);
    chunks.push(new Uint8Array(local.buffer), name, e.bytes);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, e.bytes.byteLength, true);
    cd.setUint32(24, e.bytes.byteLength, true);
    cd.setUint16(28, name.byteLength, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.byteLength + e.bytes.byteLength;
  }
  const centralSize = central.reduce((s, c) => s + c.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, c) => s + c.byteLength, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}
