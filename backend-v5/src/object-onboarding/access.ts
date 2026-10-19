import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma, ObjectOnboardingDraft } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { canReadDocument } from '../documents/access';
import { readableReceiptObjectIds, readableReceiptProofKeys, receiptProofKey } from '../receipt-assistance/access';
import { uuid } from '../review/domain';
import type { Snapshot } from '../review/provider';
import { profileFields, type ObjectProfile, type ProfileField, type ProfileKey } from './profile';

export const onboardingDenied = () => new ForbiddenException('Accesso non consentito.');
export type OnboardingTx = Prisma.TransactionClient;

export async function objectProfileView(tx: OnboardingTx, accountId: string, homeId: string, objectId: string, stored: unknown) {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as ObjectProfile;
  const merged: ObjectProfile = { ...raw };
  const receipt = await tx.receiptObjectField.findMany({ where: { accountId, homeId, objectId, fieldKey: { in: ['brand', 'model'] } } });
  for (const row of receipt) if (!merged[row.fieldKey as ProfileKey]) merged[row.fieldKey as ProfileKey] = { value: row.value, origin: row.origin === 'user_declared' ? 'user_declared' : 'extraction_confirmed', sources: row.sources as unknown as ProfileField['sources'] };
  const proofs = Object.values(merged).flatMap(field => field?.sources ?? []).map(source => ({ documentId: source.documentId, documentVersion: source.documentVersion, documentSha256: source.sha256 }));
  const readable = await readableReceiptProofKeys(tx, accountId, homeId, proofs);
  const fields: ObjectProfile = {}; let unavailable = false;
  for (const key of profileFields) {
    const field = merged[key]; if (!field) continue;
    if (field.origin === 'user_declared' || field.sources.length > 0 && field.sources.every(source => readable.has(receiptProofKey({ documentId: source.documentId, documentVersion: source.documentVersion, documentSha256: source.sha256 })))) fields[key] = field;
    else unavailable = true;
  }
  return { fields, unavailable };
}

@Injectable()
export class ObjectOnboardingAccess {
  constructor(readonly db: PrismaService, private readonly access: ReviewService) {}
  run<T>(a: string, h: string, write: boolean, action: (tx: OnboardingTx, edit: boolean) => Promise<T>) {
    uuid(h);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:' + h},0))::text AS locked`;
      await this.access.lock(tx, a, h);
      const member = await this.access.require(tx, a, h, write);
      const result = await action(tx, member.role !== 'viewer');
      await this.access.require(tx, a, h, write); return result;
    }, { maxWait: 15000, timeout: 15000 });
  }
  async source(tx: OnboardingTx, a: string, h: string, id: string, snapshot?: Pick<ObjectOnboardingDraft, 'documentVersion' | 'documentSha256'>) {
    uuid(id);
    await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${id} FOR SHARE`;
    const doc = await tx.document.findUnique({ where: { id }, include: { original: { include: { file: true } } } });
    if (!doc || doc.homeId !== h || !canReadDocument(doc, a) || !doc.original || snapshot && (snapshot.documentVersion !== doc.original.version || snapshot.documentSha256 !== doc.original.sha256)) return null;
    return doc;
  }
  async draft(tx: OnboardingTx, a: string, h: string, id: string) {
    const draft = await tx.objectOnboardingDraft.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!draft || draft.mode==='floor_plan') throw onboardingDenied(); return draft;
  }
  async target(tx: OnboardingTx, a: string, h: string, id: string) {
    const target = await tx.homeObject.findFirst({ where: { id: uuid(id), accountId: a, homeId: h } });
    if (!target || !(await readableReceiptObjectIds(tx, a, h, [id])).has(id)) throw onboardingDenied();
    return target;
  }
  snapshot(doc: NonNullable<Awaited<ReturnType<ObjectOnboardingAccess['source']>>>): Snapshot {
    return { documentId: doc.id, documentVersion: doc.original!.version as 1, documentSha256: doc.original!.sha256 };
  }
}
