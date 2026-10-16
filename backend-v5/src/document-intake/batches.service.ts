import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type DocumentIntakeBatch, type DocumentIntakeItem } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { DocumentPolicy, canReadDocument } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid } from '../review/domain';
import { DOCUMENT_COLLECTIONS, DOCUMENT_KINDS, INTAKE_LIMITS, intakeManifest } from './domain';

/** Foundation only. Not imported in AppModule; no upload, job or confirmation side effects. */
@Injectable()
export class IntakeBatchesService {
  constructor(private readonly db: PrismaService, private readonly policy: DocumentPolicy) {}
  authorized<T>(a: string, h: string, write: boolean, action: (tx: Prisma.TransactionClient, edit: boolean) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      const member = await this.policy.requireLocked(tx, a, h);
      if (write) await this.policy.require(a, h, 'edit', tx);
      const result = await action(tx, member.role !== 'viewer');
      await this.policy.require(a, h, write ? 'edit' : 'read', tx);
      return result;
    }, { timeout: 15000, maxWait: 15000 });
  }
  capabilities(a: string, h: string, query: unknown) {
    object(query, []);
    return this.authorized(a, h, false, async () => ({ apiVersion: 'document-intake-v1', enabled: false, disabledReason: 'document_intake_in_development', limits: INTAKE_LIMITS, collections: DOCUMENT_COLLECTIONS, kinds: DOCUMENT_KINDS }));
  }
  private async view(tx: Prisma.TransactionClient, batch: DocumentIntakeBatch & { items: DocumentIntakeItem[] }, edit: boolean) {
    const items = [];
    for (const item of batch.items) {
      let source = null;
      if (item.documentId) {
        await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${item.documentId} FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${item.documentId} FOR SHARE`;
        const doc = await tx.document.findUnique({ where: { id: item.documentId }, include: { original: true } });
        if (doc && doc.homeId === batch.homeId && canReadDocument(doc, batch.accountId) && doc.original?.version === item.documentVersion && doc.original?.sha256 === item.documentSha256 && doc.original.byteSize === item.byteSize && doc.original.mimeType === item.mimeType) source = { id: doc.id, name: doc.name };
      }
      const hidden = !!item.documentId && !source;
      const expired = item.uploadState === 'uploading' && !!item.uploadLeaseUntil && item.uploadLeaseUntil.getTime() <= Date.now();
      items.push({ id: item.id, clientItemId: item.clientItemId, version: item.version, filename: hidden ? null : item.filename, byteSize: hidden ? null : item.byteSize, mimeType: hidden ? null : item.mimeType, uploadState: expired ? 'failed' : item.uploadState, analysisState: hidden ? 'not_started' : item.analysisState, reviewState: hidden ? 'unreviewed' : item.reviewState, documentLink: { state: source ? 'linked' : 'unavailable', document: source }, pageCount: hidden ? null : item.pageCount, proposal: null, selection: null, duplicate: !hidden && source && item.uploadState === 'duplicate' ? { itemId: batch.items.find(other => other.id !== item.id && other.documentId === item.documentId && other.uploadState === 'stored')?.id ?? null, document: source } : null, error: hidden ? null : item.uploadError || expired ? { code: item.uploadError ?? 'intake_upload_interrupted', message: 'Il caricamento di questo file non è completato. Puoi riprovare lo stesso elemento.' } : null, permissions: hidden ? [] : edit ? ['read', 'edit'] : ['read'] });
    }
    return { id: batch.id, version: batch.version, homeId: batch.homeId, state: batch.state, limits: INTAKE_LIMITS, permissions: edit ? ['read', 'edit'] : ['read'], createdAt: batch.createdAt.toISOString(), updatedAt: batch.updatedAt.toISOString(), items };
  }
  create(a: string, h: string, input: unknown, key?: string) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    const manifest = intakeManifest(input), fingerprint = digest(JSON.stringify(manifest));
    return this.authorized(a, h, true, async (tx, edit) => {
      const account = await tx.account.findUniqueOrThrow({ where: { id: a } });
      if (account.requiresEmailVerification && !account.emailVerifiedAt) throw new ForbiddenException({ code: 'email_verification_required', message: 'Conferma la tua email prima di preparare un caricamento.' });
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'intake-create:' + a + ':' + h + ':' + key},0))::text AS locked`;
      const existing = await tx.documentIntakeBatch.findUnique({ where: { accountId_homeId_key: { accountId: a, homeId: h, key } }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      if (existing) {
        if (existing.digest !== fingerprint) throw conflict('idempotency_conflict', 'Chiave già utilizzata per un lotto diverso.');
        return { batch: await this.view(tx, existing, edit) };
      }
      const batch = await tx.documentIntakeBatch.create({ data: { accountId: a, homeId: h, key, digest: fingerprint, totalBytes: manifest.items.reduce((sum, item) => sum + item.byteSize, 0), items: { create: manifest.items.map((item, ordinal) => ({ ...item, ordinal })) } }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      return { batch: await this.view(tx, batch, edit) };
    });
  }
  get(a: string, h: string, id: string, query: unknown) {
    uuid(id); object(query, []);
    return this.authorized(a, h, false, async (tx, edit) => {
      const batch = await tx.documentIntakeBatch.findFirst({ where: { id, accountId: a, homeId: h }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      if (!batch) throw new ForbiddenException('Accesso non consentito.');
      return { batch: await this.view(tx, batch, edit) };
    });
  }
}
