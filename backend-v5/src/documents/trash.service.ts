import { ConflictException, ForbiddenException, Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { object } from '../review/domain';
import { DocumentPolicy } from './access';
import { LocalFileStorage } from './storage';
import { busyReason, lockDocumentShares, moveToTrash, purgeDocument, rejectDeletedReplay, restoreFromTrash, revokeDocumentShares, trashEntry, trashImpact } from './trash';

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
    // Separate transaction, share rows locked first like SharingService; also completes an interrupted earlier attempt.
    await this.db.$transaction(tx => revokeDocumentShares(tx, h, id, a, this.now()), { timeout: 30000, maxWait: 15000 });
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
      await lockDocumentShares(tx, h, rows.map(r => r.id));
      for (const row of rows) { const purged = await purgeDocument(tx, h, row.id, 'user_empty', now); if (purged?.storageKey) storageKeys.push(purged.storageKey); }
      return { response: { purged: rows.length }, storageKeys };
    });
  }
  async list(a: string, h: string, query: unknown) {
    object(query, []);
    return this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, a, h);
      const rows = await tx.document.findMany({ where: { homeId: h, uploaderId: a, trashedAt: { not: null }, purgedAt: null }, orderBy: [{ trashedAt: 'desc' }, { id: 'desc' }], take: 500 });
      return { items: rows.map(trashEntry) };
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
