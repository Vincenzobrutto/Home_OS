import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type DocumentIntakeBatch, type DocumentIntakeItem } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { DocumentPolicy } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid } from '../review/domain';
import { DOCUMENT_COLLECTIONS, DOCUMENT_KINDS, INTAKE_LIMITS, intakeManifest } from './domain';

/** Foundation only. Not imported in AppModule; no upload, job or confirmation side effects. */
@Injectable()
export class IntakeBatchesService {
  constructor(private readonly db: PrismaService, private readonly policy: DocumentPolicy) {}
  private transaction<T>(a: string, h: string, write: boolean, action: (tx: Prisma.TransactionClient, edit: boolean) => Promise<T>) {
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
    return this.transaction(a, h, false, async () => ({ apiVersion: 'document-intake-v1', enabled: false, disabledReason: 'document_intake_in_development', limits: INTAKE_LIMITS, collections: DOCUMENT_COLLECTIONS, kinds: DOCUMENT_KINDS }));
  }
  private view(batch: DocumentIntakeBatch & { items: DocumentIntakeItem[] }, edit: boolean) {
    // Stored/duplicate sources will need source-aware projection before the uploader is added.
    if (batch.items.some(item => item.documentId !== null)) throw new ForbiddenException('Lotto non disponibile in questo incremento.');
    return { id: batch.id, version: batch.version, homeId: batch.homeId, state: batch.state, limits: INTAKE_LIMITS, permissions: edit ? ['read', 'edit'] : ['read'], createdAt: batch.createdAt.toISOString(), updatedAt: batch.updatedAt.toISOString(), items: batch.items.map(item => ({ id: item.id, clientItemId: item.clientItemId, version: item.version, filename: item.filename, byteSize: item.byteSize, mimeType: item.mimeType, uploadState: item.uploadState, analysisState: item.analysisState, reviewState: item.reviewState, documentLink: { state: 'unavailable', document: null }, pageCount: null, proposal: null, selection: null, duplicate: null, error: null, permissions: edit ? ['read', 'edit'] : ['read'] })) };
  }
  create(a: string, h: string, input: unknown, key?: string) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    const manifest = intakeManifest(input), fingerprint = digest(JSON.stringify(manifest));
    return this.transaction(a, h, true, async (tx, edit) => {
      const account = await tx.account.findUniqueOrThrow({ where: { id: a } });
      if (account.requiresEmailVerification && !account.emailVerifiedAt) throw new ForbiddenException({ code: 'email_verification_required', message: 'Conferma la tua email prima di preparare un caricamento.' });
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'intake-create:' + a + ':' + h + ':' + key},0))::text AS locked`;
      const existing = await tx.documentIntakeBatch.findUnique({ where: { accountId_homeId_key: { accountId: a, homeId: h, key } }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      if (existing) {
        if (existing.digest !== fingerprint) throw conflict('idempotency_conflict', 'Chiave già utilizzata per un lotto diverso.');
        return { batch: this.view(existing, edit) };
      }
      const batch = await tx.documentIntakeBatch.create({ data: { accountId: a, homeId: h, key, digest: fingerprint, totalBytes: manifest.items.reduce((sum, item) => sum + item.byteSize, 0), items: { create: manifest.items.map((item, ordinal) => ({ ...item, ordinal })) } }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      return { batch: this.view(batch, edit) };
    });
  }
  get(a: string, h: string, id: string, query: unknown) {
    uuid(id); object(query, []);
    return this.transaction(a, h, false, async (tx, edit) => {
      const batch = await tx.documentIntakeBatch.findFirst({ where: { id, accountId: a, homeId: h }, include: { items: { orderBy: { ordinal: 'asc' } } } });
      if (!batch) throw new ForbiddenException('Accesso non consentito.');
      return { batch: this.view(batch, edit) };
    });
  }
}
