import { ConflictException, ForbiddenException, Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { object, uuid } from '../review/domain';
import { DocumentPolicy } from './access';
import { LocalFileStorage } from './storage';
import { busyReason, expireLockedPreviews, lockDocumentPreviews, lockDocumentShares, moveToTrash, purgeDocument, rejectDeletedReplay, restoreFromTrash, revokeLockedShares, trashEntry, trashImpact } from './trash';

type Tx = Prisma.TransactionClient;
const KEY = /^[A-Za-z0-9_-]{16,100}$/;
const EXPIRY_BATCH = 20, FILE_BATCH = 50, TICK_MS = 60_000;
function version(input: unknown) { const body = object(input, ['expectedVersion']); if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) throw new UnprocessableEntityException(); return { expectedVersion: Number(body.expectedVersion) }; }

/**
 * Cestino della casa per i documenti: 30 giorni, poi eliminazione definitiva del contenuto.
 * Ogni membro vede e gestisce solo ciò che ha eliminato lui. A server spento la scadenza
 * viene applicata al primo giro dopo la riaccensione.
 */
@Injectable()
export class TrashService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(private readonly db: PrismaService, private readonly storage: LocalFileStorage, private readonly policy: DocumentPolicy, @Optional() @Inject('TRASH_CLOCK') private readonly clock?: { now(): Date }) {}
  private now() { return this.clock?.now() ?? new Date(); }
  onModuleInit() {
    this.timer = setInterval(() => { if (!this.running) this.running = this.tick().catch(() => console.warn('Cestino: eliminazione definitiva rinviata.')).finally(() => { this.running = undefined; }); }, TICK_MS);
    this.timer.unref();
  }
  async onModuleDestroy() { if (this.timer) clearInterval(this.timer); await this.running; }

  private async request<R>(a: string, h: string, operation: string, target: string, body: unknown, key: string | undefined, work: (tx: Tx, now: Date) => Promise<{ response: R; storageKeys: string[] }>) {
    if (!key || !KEY.test(key)) throw new UnprocessableEntityException({ code: 'validation_error', message: 'Chiave di richiesta non valida.' });
    const fingerprint = digest(JSON.stringify(body));
    const result = await this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, a, h); await this.policy.require(a, h, 'edit', tx);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
      const prior = await tx.trashRequest.findUnique({ where: { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation, target, key } } });
      if (prior) { if (prior.digest !== fingerprint) throw new ConflictException({ code: 'idempotency_conflict', message: 'La chiave è già usata per un’altra richiesta.' }); rejectDeletedReplay(prior.response); return { response: prior.response as R, storageKeys: [] }; }
      const done = await work(tx, this.now());
      await tx.trashRequest.create({ data: { accountId: a, homeId: h, operation, target, key, digest: fingerprint, response: done.response as Prisma.InputJsonValue } });
      return done;
    }, { timeout: 30000, maxWait: 15000 });
    await this.removeFiles(result.storageKeys);
    return result.response;
  }

  async preview(a: string, h: string, id: string) {
    return this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, a, h); await this.policy.require(a, h, 'edit', tx);
      const doc = await tx.document.findUnique({ where: { id }, include: { original: true } });
      if (!doc || doc.homeId !== h || doc.uploaderId !== a || doc.trashedAt || !doc.original) throw new ForbiddenException('Accesso non consentito.');
      const reason = await busyReason(tx, h, id);
      return { allowed: !reason, reason, document: { id, version: doc.original.version }, impact: await trashImpact(tx, a, h, id, this.now()) };
    });
  }
  async trash(a: string, h: string, id: string, input: unknown, key?: string) {
    const body = version(input);
    const response = await this.request(a, h, 'document-trash-v1', id, body, key, async (tx, now) => ({ response: await moveToTrash(tx, a, h, id, body.expectedVersion, now), storageKeys: [] }));
    // Separate transaction, share rows locked first like SharingService. Only the rows locked here can be revoked:
    // a restore must lock the same rows before the Document, so it cannot slip between the lifecycle check and the
    // revocation; a share created after a restore was not in this set and is never touched. A replay completes an
    // interrupted revocation only while the document is still in the same trash lifecycle.
    await this.db.$transaction(async tx => {
      const locked = await lockDocumentShares(tx, h, [id]);
      const previews = await lockDocumentPreviews(tx, h, [id]);
      // No Document lock here: if both captured sets are empty, there is no
      // side effect to apply to a later lifecycle. Otherwise restore must take
      // these same locks first. Never re-query new shares/previews after this read.
      const current = await tx.document.findUnique({ where: { id }, select: { trashedAt: true, purgedAt: true, lifecycleVersion: true } });
      if (current?.trashedAt && !current.purgedAt && current.lifecycleVersion === response.entry.version) {
        const now = this.now();
        await revokeLockedShares(tx, locked, a, now);
        await expireLockedPreviews(tx, previews, now);
      }
    }, { timeout: 30000, maxWait: 15000 });
    return response;
  }
  restore(a: string, h: string, id: string, input: unknown, key?: string) {
    const body = version(input);
    return this.request(a, h, 'document-restore-v1', id, body, key, async (tx, now) => ({ response: await restoreFromTrash(tx, a, h, id, body.expectedVersion, now), storageKeys: [] }));
  }
  purgeNow(a: string, h: string, id: string, input: unknown, key?: string) {
    const body = version(input);
    return this.request(a, h, 'document-purge-v1', id, body, key, async (tx, now) => {
      const doc = await tx.document.findUnique({ where: { id } });
      if (!doc || doc.homeId !== h || doc.uploaderId !== a) throw new ForbiddenException('Accesso non consentito.');
      if (!doc.trashedAt || doc.purgedAt) throw new ConflictException({ code: 'document_not_in_trash', message: 'Il documento non è nel cestino.' });
      if (doc.lifecycleVersion !== body.expectedVersion) throw new ConflictException({ code: 'trash_version_conflict', message: 'Il cestino è cambiato. Ricarica la pagina.' });
      const purged = await purgeDocument(tx, h, id, 'user_now', now);
      return { response: { purged: true, document: { id } }, storageKeys: purged?.storageKey ? [purged.storageKey] : [] };
    });
  }
  empty(a: string, h: string, input: unknown, key?: string) {
    const body = object(input, []);
    return this.request(a, h, 'trash-empty-v1', h, body, key, async (tx, now) => {
      const rows = await tx.document.findMany({ where: { homeId: h, uploaderId: a, trashedAt: { not: null }, purgedAt: null }, select: { id: true }, orderBy: { id: 'asc' } });
      const storageKeys: string[] = [];
      // Acquire every share/preview lock before the first Document lock, including
      // bundles spanning several documents in this empty operation.
      const shareIds = await lockDocumentShares(tx, h, rows.map(r => r.id));
      const previewIds = await lockDocumentPreviews(tx, h, rows.map(r => r.id));
      for (const row of rows) { const purged = await purgeDocument(tx, h, row.id, 'user_empty', now, { shareIds, previewIds }); if (purged?.storageKey) storageKeys.push(purged.storageKey); }
      return { response: { purged: rows.length }, storageKeys };
    });
  }
  async list(a: string, h: string, query: unknown) {
    const params = object(query, ['cursor']), binding = digest(JSON.stringify(['trash-list-v1', a, h]));
    let anchor: { id: string; at: Date } | undefined;
    if (params.cursor !== undefined) {
      try {
        if (typeof params.cursor !== 'string' || params.cursor.length > 1000) throw new Error();
        const cursor = object(JSON.parse(Buffer.from(params.cursor, 'base64url').toString('utf8')), ['b', 'id', 'at']);
        if (cursor.b !== binding || typeof cursor.at !== 'string' || !Number.isFinite(Date.parse(cursor.at))) throw new Error();
        anchor = { id: uuid(cursor.id), at: new Date(cursor.at) };
      } catch { throw new UnprocessableEntityException({ code: 'validation_error', message: 'Pagina del cestino non valida.' }); }
    }
    return this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, a, h);
      const own = { homeId: h, uploaderId: a, trashedAt: { not: null }, purgedAt: null };
      const rows = await tx.document.findMany({ where: { AND: [own, ...(anchor ? [{ OR: [{ trashedAt: { lt: anchor.at } }, { trashedAt: anchor.at, id: { lt: anchor.id } }] }] : [])] }, orderBy: [{ trashedAt: 'desc' }, { id: 'desc' }], take: 501 });
      const page = rows.slice(0, 500), last = page.at(-1);
      return { items: page.map(trashEntry), total: await tx.document.count({ where: own }), nextCursor: rows.length > 500 && last ? Buffer.from(JSON.stringify({ b: binding, id: last.id, at: last.trashedAt!.toISOString() })).toString('base64url') : null };
    });
  }

  /** Expired entries first, then pending physical removals. Repeatable and idempotent. */
  async tick() {
    const now = this.now();
    const expired = await this.db.document.findMany({ where: { purgedAt: null, purgeAfter: { lte: now } }, select: { id: true, homeId: true, uploaderId: true }, orderBy: [{ purgeAfter: 'asc' }, { id: 'asc' }], take: EXPIRY_BATCH });
    for (const doc of expired) await this.expire(doc.homeId, doc.id);
    const pending = await this.db.deletionRecord.findMany({ where: { fileRemovedAt: null, storageKey: { not: null } }, orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }], take: FILE_BATCH });
    await this.removeFiles(pending.map(r => r.storageKey!));
  }
  private async expire(h: string, id: string) {
    const purged = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
      const doc = await tx.document.findUnique({ where: { id }, select: { purgeAfter: true, purgedAt: true } });
      if (!doc?.purgeAfter || doc.purgedAt || doc.purgeAfter > this.now()) return null;
      return purgeDocument(tx, h, id, 'expired', this.now());
    }, { timeout: 30000, maxWait: 15000 });
    if (purged?.storageKey) await this.removeFiles([purged.storageKey]);
  }
  /** Physical removal after commit; a failure leaves fileRemovedAt null for the next tick. */
  private async removeFiles(keys: string[]) {
    for (const storageKey of keys) {
      const referenced = await this.db.storedFile.findUnique({ where: { storageKey } }).catch(() => undefined);
      if (referenced !== null) continue;
      try { await this.storage.remove(storageKey); } catch (error) { if ((error as { code?: string }).code !== 'ENOENT') continue; }
      await this.db.deletionRecord.updateMany({ where: { storageKey, fileRemovedAt: null }, data: { fileRemovedAt: this.now() } }).catch(() => undefined);
    }
  }
}
