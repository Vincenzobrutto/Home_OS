// BACKEND SIMULATO — SOLO TEST E HARNESS LOCALE. sharing-v1 (C1a) in memoria, secondo
// docs/v5/sharing-api-contract.md del master: non è il backend reale e non è importabile dall'app.
// Sintassi TypeScript "erasable": eseguito anche da Node (scripts/mock-api.ts) senza build.

import type { HomePermission } from '../api/types';

type Req = { method: string; path: string; headers: Record<string, string | undefined>; body: unknown };
type Res = { status: number; body?: unknown; binary?: { bytes: Uint8Array; contentType: string; filename: string } };

export type SharingDeps = {
  perms: (accountId: string, homeId: string) => HomePermission[] | null;
  members: (homeId: string) => string[];
  account: (id: string) => { id: string; name: string; email: string } | undefined;
  documents: (homeId: string) => Array<{ id: string; homeId: string; uploaderId: string; name: string; originalFilename: string; mimeType: string; bytes: Uint8Array; createdAt: string; visibility: 'private' | 'home' }>;
};

type Item = { documentId: string; documentVersion: number; name: string; byteSize: number; mimeType: string };
type StoredState = 'awaiting_pairing' | 'awaiting_confirmation' | 'pending' | 'accepted' | 'declined' | 'revoked';
type StoredShare = {
  id: string; homeId: string; senderId: string; kind: 'member' | 'external'; recipientId: string | null;
  items: Item[]; state: StoredState; version: number; createdAt: string; expiresAt: number;
  code: { hash: string; expiresAt: number } | null; codeAttempts: number[];
  claim: { id: string; accountId: string; comparisonCode: string; expiresAt: number } | null;
};
type StoredPreview = {
  id: string; homeId: string; senderId: string; documentIds: string[]; recipient: { kind: 'member'; accountId: string } | { kind: 'external' };
  items: Item[]; expiresAt: number; validUntil: number; fingerprint: string; consumed: boolean;
};

const KEY_RE = /^[A-Za-z0-9_-]{16,100}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // base32 senza ambigui (niente I, O, 0, 1)
const DAY = 86_400_000;
const MIN = 60_000;

function err(status: number, code: string, message: string): Res {
  return { status, body: { error: { code, message, requestId: `req_${Math.random().toString(36).slice(2, 10)}` } } };
}
const unavailable = () => err(403, 'share_unavailable', 'Condivisione non disponibile.');
function randomCode(n: number) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => ALPHABET[b % 32]).join('');
}
// Nel simulatore basta un'impronta non reversibile a colpo d'occhio: il segreto in chiaro non è conservato.
const hash = (code: string) => [...code].reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7).toString(16) + ':' + code.length;

export class FakeSharing {
  /** false = backend senza sharing-v1 (404 su tutti gli endpoint). */
  enabled = false;
  externalPairing = true;
  /** Spostamento dell'orologio per provare scadenze senza attese reali. */
  offsetMs = 0;
  shares = new Map<string, StoredShare>();
  previews = new Map<string, StoredPreview>();
  idem = new Map<string, { digest: string; status: number; replay: () => unknown }>();
  claimLog: Array<{ accountId: string; at: number }> = [];
  /** Codici in chiaro emessi, SOLO per i test (il server reale non li conserva). */
  issuedCodes: string[] = [];
  private deps: SharingDeps;

  constructor(deps: SharingDeps) {
    this.deps = deps;
  }

  now() {
    return Date.now() + this.offsetMs;
  }

  handle(req: Req, accountId: string): Res | null {
    const [pathname, query = ''] = req.path.split('?');
    const params = new URLSearchParams(query);
    const isPost = req.method === 'POST';
    let m = /^\/homes\/([^/]+)\/(sharing-capabilities|sharing-recipients|sharing-documents|share-previews|shares)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(pathname!);
    if (m) {
      if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
      const homeId = decodeURIComponent(m[1]!);
      const perms = this.deps.perms(accountId, homeId);
      if (!perms) return err(403, 'forbidden', 'Accesso non consentito.');
      const [, , res, id, action] = m;
      if (res === 'sharing-capabilities' && !isPost && !id) return this.capabilities(perms);
      if (res === 'sharing-recipients' && !isPost && !id) return this.recipients(accountId, homeId, perms);
      if (res === 'sharing-documents' && !isPost && !id) return this.documents(accountId, homeId, perms, params);
      if (res === 'share-previews' && isPost && !id) return this.createPreview(req, accountId, homeId, perms);
      if (res === 'shares' && isPost && !id) return this.createShare(req, accountId, homeId, perms);
      if (res === 'shares' && !isPost && !id) return this.list(params, `s:${accountId}:${homeId}`, [...this.shares.values()].filter((s) => s.senderId === accountId && s.homeId === homeId), (s) => this.senderView(s));
      if (res === 'shares' && id) {
        const s = this.shares.get(decodeURIComponent(id));
        if (!s || s.senderId !== accountId || s.homeId !== homeId) return unavailable();
        if (!isPost && !action) return { status: 200, body: { share: this.senderView(s) } };
        if (isPost && (action === 'revoke' || action === 'rotate-code' || action === 'confirm-pairing')) return this.senderAction(req, s, action, accountId);
      }
      return err(404, 'not_found', 'Risorsa non trovata.');
    }
    if (pathname === '/sharing/code-claims' && isPost) {
      if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
      return this.claim(req, accountId);
    }
    m = /^\/received-shares(?:\/([^/]+))?(?:\/(accept|decline|documents))?(?:\/([^/]+)\/file)?$/.exec(pathname!);
    if (m) {
      if (!this.enabled) return err(404, 'not_found', 'Risorsa non trovata.');
      if (!m[1]) {
        if (isPost) return err(404, 'not_found', 'Risorsa non trovata.');
        return this.list(params, `r:${accountId}`, [...this.shares.values()].filter((s) => this.isRecipient(s, accountId)), (s) => this.recipientView(s));
      }
      const s = this.shares.get(decodeURIComponent(m[1]));
      if (!s || !this.isRecipient(s, accountId)) return unavailable();
      if (!m[2] && !isPost) return { status: 200, body: { share: this.recipientView(s) } };
      if ((m[2] === 'accept' || m[2] === 'decline') && isPost) return this.recipientAction(req, s, m[2], accountId);
      if (m[2] === 'documents' && m[3] && !isPost) return this.file(s, decodeURIComponent(m[3]));
      return err(404, 'not_found', 'Risorsa non trovata.');
    }
    return null;
  }

  // ---- regole comuni ----

  private person(id: string) {
    const a = this.deps.account(id);
    return a ? { id: a.id, name: a.name, email: a.email, identityVerified: false as const } : null;
  }

  /** Originale ancora del mittente, nella casa, con membership attuale. */
  private sourceOk(s: StoredShare) {
    if (!this.deps.perms(s.senderId, s.homeId)) return false;
    const docs = this.deps.documents(s.homeId);
    return s.items.every((it) => docs.some((d) => d.id === it.documentId && d.uploaderId === s.senderId));
  }

  /** Stato calcolato a ogni lettura: scadenza senza scheduler, fonti/diritti persi = unavailable. */
  private effective(s: StoredShare) {
    if (!this.sourceOk(s)) return 'unavailable' as const;
    if (s.kind === 'member' && s.recipientId && !this.deps.perms(s.recipientId, s.homeId)) return 'unavailable' as const;
    if (s.state !== 'declined' && s.state !== 'revoked' && this.now() >= s.expiresAt) return 'expired' as const;
    return s.state;
  }

  private isRecipient(s: StoredShare, accountId: string) {
    if (s.kind === 'member') return s.recipientId === accountId;
    return (s.claim?.accountId === accountId && s.state !== 'awaiting_pairing') || s.recipientId === accountId;
  }

  private base(s: StoredShare, state: string) {
    return { id: s.id, version: s.version, state, createdAt: s.createdAt };
  }

  private senderView(s: StoredShare, code: string | null = null) {
    const state = this.effective(s);
    if (state === 'unavailable') return { ...this.base(s, state), expiresAt: null, senderName: null, recipient: null, items: [], permissions: [], pairing: null, comparison: null };
    const live = state === 'awaiting_pairing' || state === 'awaiting_confirmation' || state === 'pending' || state === 'accepted';
    const permissions: string[] = [];
    if (live) permissions.push('revoke');
    if (s.kind === 'external' && (state === 'awaiting_pairing' || state === 'awaiting_confirmation')) permissions.push('rotate_code');
    if (state === 'awaiting_confirmation') permissions.push('confirm_pairing');
    const claim = state === 'awaiting_confirmation' && s.claim ? { id: s.claim.id, account: this.person(s.claim.accountId), comparisonCode: s.claim.comparisonCode, expiresAt: new Date(s.claim.expiresAt).toISOString() } : null;
    return {
      ...this.base(s, state),
      expiresAt: new Date(s.expiresAt).toISOString(),
      senderName: this.deps.account(s.senderId)?.name ?? null,
      recipient: s.recipientId ? this.person(s.recipientId) : null,
      items: s.items,
      permissions,
      pairing: s.kind === 'external' ? { code, codeExpiresAt: s.code ? new Date(s.code.expiresAt).toISOString() : null, claim } : null,
      comparison: null,
    };
  }

  private recipientView(s: StoredShare) {
    const state = this.effective(s);
    if (state === 'unavailable') return { ...this.base(s, state), expiresAt: null, senderName: null, recipient: null, items: [], permissions: [], pairing: null, comparison: null };
    const permissions = state === 'pending' ? ['accept', 'decline'] : state === 'accepted' ? ['read_files'] : [];
    return {
      ...this.base(s, state),
      expiresAt: new Date(s.expiresAt).toISOString(),
      senderName: this.deps.account(s.senderId)?.name ?? null,
      recipient: null,
      items: state === 'accepted' ? s.items : [],
      permissions,
      pairing: null,
      comparison: state === 'awaiting_confirmation' && s.claim ? { claimId: s.claim.id, code: s.claim.comparisonCode, expiresAt: new Date(s.claim.expiresAt).toISOString() } : null,
    };
  }

  private withIdem(req: Req, scope: string, run: () => Res & { replay?: () => unknown }): Res {
    const key = req.headers['idempotency-key'];
    if (!key || !KEY_RE.test(key)) return err(422, 'validation_error', 'Idempotency-Key non valida.');
    const scoped = `${scope}:${key}`;
    const digest = JSON.stringify(req.body ?? {});
    const prev = this.idem.get(scoped);
    if (prev) {
      if (prev.digest !== digest) return err(409, 'idempotency_conflict', 'Chiave già usata con dati diversi.');
      return { status: prev.status, body: prev.replay() };
    }
    const res = run();
    if (res.replay) this.idem.set(scoped, { digest, status: res.status, replay: res.replay });
    return { status: res.status, body: res.body };
  }

  private exactKeys(body: unknown, keys: string[]) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    const k = Object.keys(body);
    return k.every((x) => keys.includes(x)) && keys.every((x) => k.includes(x));
  }

  private list<T>(params: URLSearchParams, scope: string, rows: StoredShare[], view: (s: StoredShare) => T): Res {
    for (const k of params.keys()) if (k !== 'limit' && k !== 'cursor') return err(422, 'validation_error', 'Parametro non ammesso.');
    const limit = Number(params.get('limit') ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    let start = 0;
    const cursor = params.get('cursor');
    if (cursor) {
      const [s, n] = cursor.split('|');
      if (s !== scope || !Number.isInteger(Number(n))) return err(422, 'validation_error', 'Cursore non valido.');
      start = Number(n);
    }
    const page = rows.slice(start, start + limit);
    return { status: 200, body: { items: page.map(view), nextCursor: start + limit < rows.length ? `${scope}|${start + limit}` : null } };
  }

  // ---- mittente ----

  private capabilities(perms: HomePermission[]): Res {
    return {
      status: 200,
      body: {
        apiVersion: 'sharing-v1', enabled: true, isSimulation: false, externalPairing: this.externalPairing, technicalData: false, economy: false,
        limits: { maxDocuments: 20, maxBytes: 104857600, durationDays: [1, 7, 30], previewMinutes: 10, codeMinutes: 15 },
        permissions: perms.includes('edit') ? ['prepare'] : [],
      },
    };
  }

  private recipients(accountId: string, homeId: string, perms: HomePermission[]): Res {
    if (!perms.includes('edit')) return err(403, 'forbidden', 'Accesso non consentito.');
    const ids = this.deps.members(homeId).filter((id) => id !== accountId);
    if (ids.length > 100) return err(422, 'validation_error', 'Troppe persone per l’elenco.');
    return { status: 200, body: { items: ids.map((id) => this.person(id)).filter(Boolean) } };
  }

  private documents(accountId: string, homeId: string, perms: HomePermission[], params: URLSearchParams): Res {
    for (const k of params.keys()) if (k !== 'limit' && k !== 'cursor') return err(422, 'validation_error', 'Parametro non ammesso.');
    if (!perms.includes('read')) return err(403, 'forbidden', 'Accesso non consentito.');
    const rows = this.deps.documents(homeId)
      .filter((d) => d.visibility === 'home' || d.uploaderId === accountId) // privati altrui mai elencati
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const limit = Number(params.get('limit') ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return err(422, 'validation_error', 'Limite non valido.');
    const scope = `d:${accountId}:${homeId}`;
    let start = 0;
    const cursor = params.get('cursor');
    if (cursor) {
      const [s, n] = cursor.split('|');
      if (s !== scope) return err(422, 'validation_error', 'Cursore non valido.');
      start = Number(n);
    }
    const items = rows.slice(start, start + limit).map((d) => ({
      documentId: d.id, documentVersion: 1, name: d.name, byteSize: d.bytes.length, mimeType: d.mimeType, visibility: d.visibility,
      eligible: d.uploaderId === accountId, ineligibleReason: d.uploaderId === accountId ? null : 'not_uploader',
    }));
    return { status: 200, body: { items, nextCursor: start + limit < rows.length ? `${scope}|${start + limit}` : null } };
  }

  private createPreview(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    if (!perms.includes('edit')) return unavailable();
    const b = req.body as { documentIds?: unknown; recipient?: unknown; durationDays?: unknown };
    if (!this.exactKeys(b, ['documentIds', 'recipient', 'durationDays'])) return err(422, 'validation_error', 'Campi non validi.');
    const ids = b.documentIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 20 || new Set(ids).size !== ids.length || !ids.every((x) => typeof x === 'string' && UUID_RE.test(x))) return err(422, 'validation_error', 'Selezione non valida.');
    if (![1, 7, 30].includes(b.durationDays as number)) return err(422, 'validation_error', 'Durata non valida.');
    const r = b.recipient as { kind?: string; accountId?: unknown };
    if (!r || (r.kind !== 'member' && r.kind !== 'external')) return err(422, 'validation_error', 'Destinatario non valido.');
    if (r.kind === 'member' && !this.exactKeys(r, ['kind', 'accountId'])) return err(422, 'validation_error', 'Destinatario non valido.');
    if (r.kind === 'external' && (!this.exactKeys(r, ['kind']) || !this.externalPairing)) return err(422, 'validation_error', 'Destinatario non valido.');
    return this.withIdem(req, `${accountId}:${homeId}:preview`, () => {
      if (r.kind === 'member' && (r.accountId === accountId || !this.deps.members(homeId).includes(r.accountId as string))) return err(422, 'validation_error', 'Destinatario non valido.');
      const docs = this.deps.documents(homeId);
      const chosen = (ids as string[]).map((id) => docs.find((d) => d.id === id));
      if (chosen.some((d) => !d || d.uploaderId !== accountId)) return unavailable();
      const items = chosen.map((d) => ({ documentId: d!.id, documentVersion: 1, name: d!.name, byteSize: d!.bytes.length, mimeType: d!.mimeType }));
      if (items.reduce((n, i) => n + i.byteSize, 0) > 104857600) return err(422, 'validation_error', 'Dimensione totale oltre il limite.');
      const now = this.now();
      const p: StoredPreview = {
        id: globalThis.crypto.randomUUID(), homeId, senderId: accountId, documentIds: ids as string[],
        recipient: r.kind === 'member' ? { kind: 'member', accountId: r.accountId as string } : { kind: 'external' },
        items, expiresAt: now + (b.durationDays as number) * DAY, validUntil: now + 10 * MIN, fingerprint: randomCode(24).toLowerCase(), consumed: false,
      };
      this.previews.set(p.id, p);
      const view = () => ({
        preview: {
          id: p.id, version: 1, recipient: p.recipient, recipientPerson: p.recipient.kind === 'member' ? this.person(p.recipient.accountId) : null,
          items: p.items, expiresAt: new Date(p.expiresAt).toISOString(), validUntil: new Date(p.validUntil).toISOString(), manifestFingerprint: p.fingerprint,
        },
      });
      return { status: 201, body: view(), replay: view };
    });
  }

  private createShare(req: Req, accountId: string, homeId: string, perms: HomePermission[]): Res {
    if (!perms.includes('edit')) return unavailable();
    const b = req.body as { previewId?: string; expectedPreviewVersion?: number; manifestFingerprint?: string; acknowledgedDocumentIds?: unknown };
    if (!this.exactKeys(b, ['previewId', 'expectedPreviewVersion', 'manifestFingerprint', 'acknowledgedDocumentIds']) || b.expectedPreviewVersion !== 1) return err(422, 'validation_error', 'Campi non validi.');
    return this.withIdem(req, `${accountId}:${homeId}:share`, () => {
      const p = this.previews.get(b.previewId ?? '');
      if (!p || p.senderId !== accountId || p.homeId !== homeId) return unavailable();
      if (p.consumed) return err(409, 'share_conflict', 'Anteprima già usata.');
      if (this.now() >= p.validUntil) return err(409, 'share_preview_expired', 'Anteprima scaduta.');
      if (b.manifestFingerprint !== p.fingerprint) return err(409, 'share_conflict', 'Manifesto cambiato.');
      const ack = b.acknowledgedDocumentIds;
      if (!Array.isArray(ack) || ack.length !== p.documentIds.length || !p.documentIds.every((id) => ack.includes(id))) return err(422, 'share_acknowledgement_required', 'Conferma tutti i file.');
      const docs = this.deps.documents(homeId);
      if (!p.documentIds.every((id) => docs.some((d) => d.id === id && d.uploaderId === accountId))) return unavailable();
      if (p.recipient.kind === 'member' && !this.deps.members(homeId).includes(p.recipient.accountId)) return unavailable();
      p.consumed = true;
      const now = this.now();
      const code = p.recipient.kind === 'external' ? randomCode(10) : null;
      const s: StoredShare = {
        id: globalThis.crypto.randomUUID(), homeId, senderId: accountId, kind: p.recipient.kind,
        recipientId: p.recipient.kind === 'member' ? p.recipient.accountId : null, items: p.items,
        state: p.recipient.kind === 'member' ? 'pending' : 'awaiting_pairing', version: 1,
        createdAt: new Date(now).toISOString(), expiresAt: p.expiresAt,
        code: code ? { hash: hash(code), expiresAt: now + 15 * MIN } : null, codeAttempts: [], claim: null,
      };
      if (code) this.issuedCodes.push(code);
      this.shares.set(s.id, s);
      // Solo questa risposta contiene il codice: il replay della stessa chiave lo restituisce null.
      return { status: 201, body: { share: this.senderView(s, code) }, replay: () => ({ share: this.senderView(s) }) };
    });
  }

  private senderAction(req: Req, s: StoredShare, action: 'revoke' | 'rotate-code' | 'confirm-pairing', accountId: string): Res {
    const b = req.body as { expectedVersion?: unknown; claimId?: unknown; comparisonCode?: unknown; confirmRecipient?: unknown };
    const keys = action === 'confirm-pairing' ? ['expectedVersion', 'claimId', 'comparisonCode', 'confirmRecipient'] : ['expectedVersion'];
    if (!this.exactKeys(b, keys) || typeof b.expectedVersion !== 'number') return err(422, 'validation_error', 'Campi non validi.');
    if (action === 'confirm-pairing' && b.confirmRecipient !== true) return err(422, 'validation_error', 'Conferma esplicita richiesta.');
    return this.withIdem(req, `${accountId}:${s.id}:${action}`, () => {
      const state = this.effective(s);
      if (state === 'unavailable') return unavailable();
      if (b.expectedVersion !== s.version) return err(409, 'share_conflict', 'Versione cambiata.');
      if (action === 'revoke') {
        if (!['awaiting_pairing', 'awaiting_confirmation', 'pending', 'accepted'].includes(state)) return err(409, 'share_conflict', 'Stato non revocabile.');
        Object.assign(s, { state: 'revoked', version: s.version + 1, code: null, claim: null });
        return { status: 200, body: { share: this.senderView(s) }, replay: () => ({ share: this.senderView(s) }) };
      }
      if (action === 'rotate-code') {
        if (s.kind !== 'external' || (state !== 'awaiting_pairing' && state !== 'awaiting_confirmation')) return err(409, 'share_conflict', 'Stato non valido.');
        const code = randomCode(10);
        this.issuedCodes.push(code);
        Object.assign(s, { state: 'awaiting_pairing', version: s.version + 1, code: { hash: hash(code), expiresAt: this.now() + 15 * MIN }, claim: null, codeAttempts: [] });
        return { status: 200, body: { share: this.senderView(s, code) }, replay: () => ({ share: this.senderView(s) }) };
      }
      if (state !== 'awaiting_confirmation' || !s.claim || s.claim.id !== b.claimId || s.claim.comparisonCode !== b.comparisonCode || this.now() >= s.claim.expiresAt) return err(409, 'share_conflict', 'Abbinamento cambiato.');
      Object.assign(s, { state: 'pending', version: s.version + 1, recipientId: s.claim.accountId });
      return { status: 200, body: { share: this.senderView(s) }, replay: () => ({ share: this.senderView(s) }) };
    });
  }

  // ---- destinatario ----

  private claim(req: Req, accountId: string): Res {
    const b = req.body as { code?: unknown; discloseAccount?: unknown };
    if (!this.exactKeys(b, ['code', 'discloseAccount']) || b.discloseAccount !== true || typeof b.code !== 'string') return err(422, 'validation_error', 'Campi non validi.');
    const key = req.headers['idempotency-key'];
    // Una richiesta già riuscita con la stessa chiave si recupera senza contare un nuovo tentativo.
    if (key && this.idem.has(`${accountId}:claim:${key}`)) return this.withIdem(req, `${accountId}:claim`, () => unavailable());
    const now = this.now();
    this.claimLog = this.claimLog.filter((c) => now - c.at < MIN);
    if (this.claimLog.filter((c) => c.accountId === accountId).length >= 10) return err(429, 'share_try_later', 'Riprova più tardi.');
    this.claimLog.push({ accountId, at: now });
    return this.withIdem(req, `${accountId}:claim`, () => {
      const code = (b.code as string).replace(/[\s-]+/g, '').toUpperCase();
      const s = [...this.shares.values()].find((x) => x.code && x.code.hash === hash(code));
      if (!s || !s.code) return unavailable();
      s.codeAttempts = s.codeAttempts.filter((t) => now - t < 15 * MIN);
      if (s.codeAttempts.length >= 5) return err(429, 'share_try_later', 'Riprova più tardi.');
      s.codeAttempts.push(now);
      if (this.effective(s) !== 'awaiting_pairing' || now >= s.code.expiresAt || s.senderId === accountId) return unavailable();
      Object.assign(s, {
        state: 'awaiting_confirmation', version: s.version + 1, code: null,
        claim: { id: globalThis.crypto.randomUUID(), accountId, comparisonCode: randomCode(8), expiresAt: now + 15 * MIN },
      });
      return { status: 201, body: { share: this.recipientView(s) }, replay: () => ({ share: this.recipientView(s) }) };
    });
  }

  private recipientAction(req: Req, s: StoredShare, action: 'accept' | 'decline', accountId: string): Res {
    const b = req.body as { expectedVersion?: unknown };
    if (!this.exactKeys(b, ['expectedVersion']) || typeof b.expectedVersion !== 'number') return err(422, 'validation_error', 'Campi non validi.');
    return this.withIdem(req, `${accountId}:${s.id}:${action}`, () => {
      const state = this.effective(s);
      if (state === 'unavailable') return unavailable();
      if (b.expectedVersion !== s.version || state !== 'pending') return err(409, 'share_conflict', 'Stato cambiato.');
      Object.assign(s, { state: action === 'accept' ? 'accepted' : 'declined', version: s.version + 1 });
      return { status: 200, body: { share: this.recipientView(s) }, replay: () => ({ share: this.recipientView(s) }) };
    });
  }

  private file(s: StoredShare, documentId: string): Res {
    if (this.effective(s) !== 'accepted') return unavailable();
    const it = s.items.find((i) => i.documentId === documentId);
    const d = this.deps.documents(s.homeId).find((x) => x.id === documentId);
    if (!it || !d) return unavailable();
    return { status: 200, binary: { bytes: d.bytes, contentType: d.mimeType, filename: d.originalFilename } };
  }
}
