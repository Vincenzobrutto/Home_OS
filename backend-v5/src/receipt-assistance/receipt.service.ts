import { ForbiddenException, Injectable } from '@nestjs/common';
import { type Prisma, type ReceiptDraft } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { canReadDocument } from '../documents/access';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { ActivityClock, temporal } from '../activities/domain';

type Tx = Prisma.TransactionClient;
const deny = () => new ForbiddenException('Accesso non consentito.');

@Injectable()
export class ReceiptAssistanceService {
  constructor(private readonly db: PrismaService, private readonly access: ReviewService, private readonly clock: ActivityClock) {}

  private async transaction<T>(a: string, h: string, write: boolean, action: (tx: Tx, edit: boolean) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      await this.access.lock(tx, a, h);
      const member = await this.access.require(tx, a, h, write);
      const result = await action(tx, member.role !== 'viewer');
      await this.access.require(tx, a, h, write);
      return result;
    }, { maxWait: 15000, timeout: 15000 });
  }

  private async source(tx: Tx, a: string, h: string, id: string, snapshot?: Pick<ReceiptDraft, 'documentVersion' | 'documentSha256'>) {
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${id} FOR SHARE`;
    const doc = await tx.document.findUnique({ where: { id }, include: { original: true } });
    if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || !doc.original) return null;
    if (snapshot && (doc.original.version !== snapshot.documentVersion || doc.original.sha256 !== snapshot.documentSha256)) return null;
    return doc;
  }

  private async record(tx: Tx, a: string, h: string, id: string) {
    const row = await tx.receiptDraft.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!row) throw deny();
    return row;
  }

  private async project(tx: Tx, a: string, h: string, row: ReceiptDraft, edit: boolean) {
    const doc = await this.source(tx, a, h, row.documentId, row);
    return {
      id: row.id, homeId: row.homeId, version: row.version, mode: row.mode, state: row.state,
      documentLink: { state: doc ? 'linked' : 'unavailable', document: doc ? { id: doc.id, name: doc.name } : null },
      snapshot: doc ? { documentId: doc.id, documentVersion: row.documentVersion, sha256: row.documentSha256 } : null,
      fields: doc ? row.fields : {}, total: doc ? row.total : null,
      permissions: edit && doc ? ['read', 'edit'] : ['read'],
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }

  capabilities(a: string, h: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async () => ({
      apiVersion: 'receipt-assistance-v1', enabled: false, manualEnabled: false, providers: [],
      disabledReason: 'receipt_assistance_in_development', ...temporal(this.clock.now()),
    }));
  }

  private async request(a: string, h: string, operation: string, target: string, body: unknown, key: string | undefined, action: (tx: Tx) => Promise<ReceiptDraft>) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    return this.transaction(a, h, true, async tx => {
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation, target, key } };
      const hash = digest(JSON.stringify(body)), prior = await tx.receiptRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata con dati diversi.');
        const row = await this.record(tx, a, h, prior.draftId);
        if (!await this.source(tx, a, h, row.documentId, row)) throw deny();
        return { draft: await this.project(tx, a, h, row, true) };
      }
      const row = await action(tx);
      await tx.receiptRequest.create({ data: { ...lookup.accountId_homeId_operation_target_key, digest: hash, draftId: row.id } });
      return { draft: await this.project(tx, a, h, row, true) };
    });
  }

  manual(a: string, h: string, input: unknown, key?: string) {
    const body = { documentId: uuid(object(input, ['documentId']).documentId) };
    return this.request(a, h, 'manual', '', body, key, async tx => {
      const doc = await this.source(tx, a, h, body.documentId);
      if (!doc) throw deny();
      const source = { documentId: doc.id, documentVersion: doc.original!.version, documentSha256: doc.original!.sha256 };
      const existing = await tx.receiptDraft.findFirst({ where: { accountId: a, homeId: h, ...source, mode: 'manual', state: { in: ['open', 'parked'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (existing) return existing;
      const now = this.clock.now();
      return tx.receiptDraft.create({ data: { accountId: a, homeId: h, ...source, mode: 'manual', createdAt: now, updatedAt: now } });
    });
  }

  get(a: string, h: string, id: string, query: unknown) {
    object(query, []);
    return this.transaction(a, h, false, async (tx, edit) => ({ draft: await this.project(tx, a, h, await this.record(tx, a, h, id), edit) }));
  }

  action(a: string, h: string, id: string, op: 'park' | 'reopen', input: unknown, key?: string) {
    uuid(id);
    const body = { expectedVersion: version(object(input, ['expectedVersion']).expectedVersion) };
    return this.request(a, h, op, id, body, key, async tx => {
      const old = await this.record(tx, a, h, id);
      if (!await this.source(tx, a, h, old.documentId, old)) throw deny();
      if (old.version !== body.expectedVersion) throw conflict('receipt_draft_version_conflict', 'La bozza è cambiata. Rileggila prima di continuare.');
      if (old.state !== (op === 'park' ? 'open' : 'parked')) throw conflict('receipt_draft_state_conflict', 'Azione non consentita nello stato attuale.');
      return tx.receiptDraft.update({ where: { id }, data: { state: op === 'park' ? 'parked' : 'open', version: { increment: 1 }, updatedAt: this.clock.now() } });
    });
  }
}
