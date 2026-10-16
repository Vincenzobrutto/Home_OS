import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { Prisma, type DocumentIntakeBatch, type DocumentIntakeItem } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { DocumentPolicy, canReadDocument } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { DOCUMENT_COLLECTIONS, DOCUMENT_KINDS, INTAKE_LIMITS, intakeManifest, organizationSelection, collectionsFor } from './domain';
import { intakeTarget, organizationView, sameParts } from './organization';
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const canonical = (value: unknown): string => JSON.stringify(value, function (_key, row: unknown) { return row && typeof row === 'object' && !Array.isArray(row) ? Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))) : row; });
const requestKey = (key: string | undefined) => { if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.'); return key; };

/** Isolated upload/review orchestration. Not imported in AppModule; no AI jobs. */
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
      let selection = hidden || !item.selection ? null : organizationSelection(item.selection, item.pageCount), targetStale = false;
      if (selection) { try { await intakeTarget(tx, batch.accountId, batch.homeId, selection, false); } catch (e) { if (!(e instanceof ForbiddenException)) throw e; selection = null; } }
      if (selection) { try { await intakeTarget(tx, batch.accountId, batch.homeId, selection); } catch (e) { if (!(e instanceof HttpException) || e.getStatus() !== 409) throw e; targetStale = true; } }
      const organization = source ? await tx.documentOrganization.findUnique({ where: { accountId_homeId_documentId: { accountId: batch.accountId, homeId: batch.homeId, documentId: source.id } } }) : null;
      const current = organization?.documentVersion === item.documentVersion && organization?.documentSha256 === item.documentSha256 ? organization : null;
      const expired = item.uploadState === 'uploading' && !!item.uploadLeaseUntil && item.uploadLeaseUntil.getTime() <= Date.now();
      items.push({ id: item.id, clientItemId: item.clientItemId, version: item.version, filename: hidden ? null : item.filename, byteSize: hidden ? null : item.byteSize, mimeType: hidden ? null : item.mimeType, uploadState: expired ? 'failed' : item.uploadState, analysisState: hidden ? 'not_started' : item.analysisState, reviewState: hidden ? 'unreviewed' : item.reviewState, documentLink: { state: source ? 'linked' : 'unavailable', document: source }, pageCount: hidden ? null : item.pageCount, proposal: null, selection, selectionStale: !hidden && item.reviewState === 'saved' && (targetStale || !selection || (organization?.version ?? 0) !== item.organizationVersion), organization: current ? organizationView(current) : null, organizationVersion: hidden ? null : organization?.version ?? 0, duplicate: !hidden && source && item.uploadState === 'duplicate' ? { itemId: batch.items.find(other => other.id !== item.id && other.documentId === item.documentId && other.uploadState === 'stored')?.id ?? null, document: source } : null, error: hidden ? null : item.uploadError || expired ? { code: item.uploadError ?? 'intake_upload_interrupted', message: 'Il caricamento di questo file non è completato. Puoi riprovare lo stesso elemento.' } : null, permissions: hidden ? [] : edit ? ['read', 'edit'] : ['read'] });
    }
    return { id: batch.id, version: batch.version, homeId: batch.homeId, state: batch.state, limits: INTAKE_LIMITS, permissions: edit ? ['read', 'edit'] : ['read'], createdAt: batch.createdAt.toISOString(), updatedAt: batch.updatedAt.toISOString(), items };
  }
  private async locked(tx: Prisma.TransactionClient, a: string, h: string, id: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
    await tx.$queryRaw`SELECT id FROM "DocumentIntakeBatch" WHERE id=${id} FOR UPDATE`;
    const batch = await tx.documentIntakeBatch.findFirst({ where: { id, accountId: a, homeId: h }, include: { items: { orderBy: { ordinal: 'asc' } } } });
    if (!batch) throw new ForbiddenException(); return batch;
  }
  private async source(tx: Prisma.TransactionClient, a: string, h: string, item: DocumentIntakeItem) {
    if (!item.documentId || !['stored', 'duplicate'].includes(item.uploadState)) throw conflict('intake_file_not_ready', 'Carica prima questo file.');
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${item.documentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${item.documentId} FOR SHARE`;
    const doc = await tx.document.findUnique({ where: { id: item.documentId }, include: { original: true } });
    if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || doc.original?.version !== item.documentVersion || doc.original?.sha256 !== item.documentSha256 || doc.original?.byteSize !== item.byteSize || doc.original?.mimeType !== item.mimeType) throw new ForbiddenException(); return doc;
  }
  review(a: string, h: string, id: string, itemId: string, input: unknown, key?: string) {
    uuid(id); uuid(itemId); key = requestKey(key);
    const body = object(input, ['expectedVersion', 'expectedOrganizationVersion', 'replaceOrganization', 'selection']); version(body.expectedVersion);
    if (!Number.isSafeInteger(body.expectedOrganizationVersion) || (body.expectedOrganizationVersion as number) < 0 || typeof body.replaceOrganization !== 'boolean') throw invalid();
    const fingerprint = digest(canonical(body));
    return this.authorized(a, h, true, async (tx, edit) => {
      const batch = await this.locked(tx, a, h, id), item = batch.items.find(i => i.id === itemId);
      if (!item) throw new ForbiddenException();
      const prior = await tx.documentIntakeRequest.findUnique({ where: { batchId_operation_key: { batchId: id, operation: 'review:' + itemId, key: key! } } });
      if (prior) { if (prior.digest !== fingerprint) throw conflict('idempotency_conflict', 'Chiave già utilizzata.'); return { batch: await this.view(tx, batch, edit) }; }
      if (item.version !== body.expectedVersion) throw conflict('item_version_conflict', 'Il file è cambiato. Rileggi prima di continuare.');
      if (item.reviewState === 'confirmed') throw conflict('intake_already_confirmed', 'Questo elemento è già confermato.');
      const doc = await this.source(tx, a, h, item), selection = organizationSelection(body.selection, item.pageCount);
      await intakeTarget(tx, a, h, selection);
      const org = await tx.documentOrganization.findUnique({ where: { accountId_homeId_documentId: { accountId: a, homeId: h, documentId: doc.id } } });
      if ((org?.version ?? 0) !== body.expectedOrganizationVersion) throw conflict('organization_version_conflict', 'L’organizzazione è cambiata. Rileggi i dati confermati.');
      if (org && selection.action === 'organize' && (org.title !== selection.title || !sameParts(org.parts, selection.parts)) && !body.replaceOrganization) throw conflict('organization_replace_required', 'Conferma esplicitamente la modifica dei dati già organizzati.');
      await tx.documentIntakeItem.update({ where: { id: itemId }, data: { selection: json(selection), organizationVersion: org?.version ?? 0, reviewState: selection.action === 'defer' ? 'deferred' : 'saved', version: { increment: 1 }, updatedAt: new Date() } });
      await tx.documentIntakeBatch.update({ where: { id }, data: { version: { increment: 1 }, updatedAt: new Date() } });
      await tx.documentIntakeRequest.create({ data: { batchId: id, operation: 'review:' + itemId, key: key!, digest: fingerprint, body: json(body), results: {} } });
      return { batch: await this.view(tx, await this.locked(tx, a, h, id), edit) };
    });
  }
  async confirm(a: string, h: string, id: string, input: unknown, key?: string) {
    uuid(id); key = requestKey(key); const row = object(input, ['expectedVersion', 'items']);
    const expectedVersion = version(row.expectedVersion);
    if (!Array.isArray(row.items) || !row.items.length || row.items.length > INTAKE_LIMITS.maxFiles) throw invalid();
    const items = row.items.map(value => { const i = object(value, ['id', 'expectedVersion']); return { id: uuid(i.id), expectedVersion: version(i.expectedVersion) }; });
    if (new Set(items.map(i => i.id)).size !== items.length) throw invalid();
    const body = { expectedVersion, items }, fingerprint = digest(canonical(body));
    await this.authorized(a, h, true, async tx => {
      const batch = await this.locked(tx, a, h, id);
      const prior = await tx.documentIntakeRequest.findUnique({ where: { batchId_operation_key: { batchId: id, operation: 'confirm', key: key! } } });
      if (prior) { if (prior.digest !== fingerprint) throw conflict('idempotency_conflict', 'Chiave già utilizzata.'); return; }
      if (batch.version !== expectedVersion) throw conflict('batch_version_conflict', 'Il lotto è cambiato. Rileggi prima di confermare.');
      if (items.some(i => !batch.items.some(x => x.id === i.id))) throw new ForbiddenException();
      await tx.documentIntakeRequest.create({ data: { batchId: id, operation: 'confirm', key: key!, digest: fingerprint, body: json(body), results: {} } });
    });
    for (const selected of items) {
      try {
        await this.authorized(a, h, true, async tx => {
          const batch = await this.locked(tx, a, h, id);
          const request = await tx.documentIntakeRequest.findUniqueOrThrow({ where: { batchId_operation_key: { batchId: id, operation: 'confirm', key: key! } } });
          const results = request.results as Record<string, unknown>; if (results[selected.id]) return;
          const item = batch.items.find(i => i.id === selected.id)!;
          if (item.version !== selected.expectedVersion || item.reviewState !== 'saved' || !item.selection) throw conflict('item_version_conflict', 'Rivedi questo elemento prima di confermarlo.');
          const doc = await this.source(tx, a, h, item), selection = organizationSelection(item.selection, item.pageCount);
          if (selection.action !== 'organize') throw invalid();
          await intakeTarget(tx, a, h, selection);
          const where = { accountId_homeId_documentId: { accountId: a, homeId: h, documentId: doc.id } };
          const org = await tx.documentOrganization.findUnique({ where });
          if ((org?.version ?? 0) !== item.organizationVersion) throw conflict('organization_version_conflict', 'L’organizzazione è cambiata. Rivedi questo elemento.');
          const data = { title: selection.title, parts: json(selection.parts), collections: collectionsFor(selection.parts), documentVersion: item.documentVersion!, documentSha256: item.documentSha256!, updatedAt: new Date() };
          const same = org && org.title === data.title && sameParts(org.parts, selection.parts) && org.documentVersion === data.documentVersion && org.documentSha256 === data.documentSha256;
          if (!same) await tx.documentOrganization.upsert({ where, create: { ...data, accountId: a, homeId: h, documentId: doc.id }, update: { ...data, version: { increment: 1 } } });
          if (selection.target.kind !== 'home') {
            const target = selection.target.kind === 'object' ? { objectId: selection.target.id } : { boilerId: selection.target.id };
            const existing = await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, ...target, documentId: doc.id, resourceType: 'document', state: 'active' } });
            if (!existing) {
              const link = await tx.objectResourceLink.create({ data: { accountId: a, homeId: h, ...target, documentId: doc.id, resourceType: 'document', resourceId: doc.id } });
              await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: selection.target.kind, targetId: selection.target.id, kind: 'linked', after: json({ kind: 'link', row: link, subjectKind: selection.target.kind, subjectId: selection.target.id }) } });
            }
          }
          await tx.documentIntakeItem.update({ where: { id: item.id }, data: { reviewState: 'confirmed', version: { increment: 1 }, updatedAt: new Date() } });
          const remaining = await tx.documentIntakeItem.count({ where: { batchId: id, reviewState: { not: 'confirmed' } } });
          await tx.documentIntakeBatch.update({ where: { id }, data: { state: remaining ? 'open' : 'completed', version: { increment: 1 }, updatedAt: new Date() } });
          await tx.documentIntakeRequest.update({ where: { id: request.id }, data: { results: json({ ...results, [item.id]: { state: 'confirmed' } }) } });
        });
      } catch (error) {
        // Only known rejected decisions become terminal results. DB/commit uncertainty
        // propagates: GET/same-key replay recover the atomic per-item ledger.
        if (!(error instanceof HttpException) || ![403, 409, 422].includes(error.getStatus())) throw error;
        const response = error.getResponse(), code = typeof response === 'object' && 'code' in response ? String(response.code) : 'intake_item_unavailable';
        await this.authorized(a, h, true, async tx => {
          await this.locked(tx, a, h, id);
          const request = await tx.documentIntakeRequest.findUniqueOrThrow({ where: { batchId_operation_key: { batchId: id, operation: 'confirm', key: key! } } });
          const results = request.results as Record<string, unknown>;
          if (!results[selected.id]) await tx.documentIntakeRequest.update({ where: { id: request.id }, data: { results: json({ ...results, [selected.id]: { state: 'rejected', code } }) } });
        });
      }
    }
    return this.confirmation(a, h, id, key, {});
  }
  async confirmation(a: string, h: string, id: string, key: string, query: unknown) {
    uuid(id); requestKey(key); object(query, []);
    const result = await this.authorized(a, h, false, async tx => {
      const batch = await tx.documentIntakeBatch.findFirst({ where: { id, accountId: a, homeId: h } });
      if (!batch) throw new ForbiddenException();
      const request = await tx.documentIntakeRequest.findUnique({ where: { batchId_operation_key: { batchId: id, operation: 'confirm', key } } });
      if (!request) throw new ForbiddenException();
      return request.results;
    });
    return { ...await this.get(a, h, id, {}), results: result };
  }
  async reviewReceipt(a: string, h: string, id: string, itemId: string, key: string, query: unknown) {
    uuid(id); uuid(itemId); requestKey(key); object(query, []);
    const recorded = await this.authorized(a, h, false, async tx => {
      const item = await tx.documentIntakeItem.findFirst({ where: { id: itemId, batchId: id, batch: { accountId: a, homeId: h } } });
      if (!item) throw new ForbiddenException();
      return !!await tx.documentIntakeRequest.findUnique({ where: { batchId_operation_key: { batchId: id, operation: 'review:' + itemId, key } } });
    });
    return { ...await this.get(a, h, id, {}), recorded };
  }
  reuseDuplicate(a: string, h: string, id: string, itemId: string, input: unknown, key?: string) {
    uuid(id); uuid(itemId); key = requestKey(key); const row = object(input, ['expectedVersion', 'action']);
    const expectedVersion = version(row.expectedVersion); if (row.action !== 'reuse_reference') throw invalid();
    const body = { expectedVersion, action: row.action }, fingerprint = digest(canonical(body));
    return this.authorized(a, h, true, async (tx, edit) => {
      const batch = await this.locked(tx, a, h, id), item = batch.items.find(i => i.id === itemId);
      if (!item) throw new ForbiddenException();
      const prior = await tx.documentIntakeRequest.findUnique({ where: { batchId_operation_key: { batchId: id, operation: 'duplicate:' + itemId, key: key! } } });
      if (prior) { if (prior.digest !== fingerprint) throw conflict('idempotency_conflict', 'Chiave già utilizzata.'); return { batch: await this.view(tx, batch, edit) }; }
      if (item.version !== expectedVersion || item.reviewState === 'confirmed' || item.uploadState !== 'duplicate') throw conflict('item_version_conflict', 'Rileggi questo elemento prima di continuare.');
      await this.source(tx, a, h, item);
      await tx.documentIntakeItem.update({ where: { id: itemId }, data: { reviewState: 'confirmed', selection: Prisma.DbNull, version: { increment: 1 }, updatedAt: new Date() } });
      const remaining = await tx.documentIntakeItem.count({ where: { batchId: id, reviewState: { not: 'confirmed' } } });
      await tx.documentIntakeBatch.update({ where: { id }, data: { state: remaining ? 'open' : 'completed', version: { increment: 1 }, updatedAt: new Date() } });
      await tx.documentIntakeRequest.create({ data: { batchId: id, operation: 'duplicate:' + itemId, key: key!, digest: fingerprint, body: json(body), results: { state: 'confirmed' } } });
      return { batch: await this.view(tx, await this.locked(tx, a, h, id), edit) };
    });
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
