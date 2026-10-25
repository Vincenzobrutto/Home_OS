import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma, ObjectOnboardingDraft } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ReviewService } from '../review/review.service';
import { canReadDocument } from '../documents/access';
import { readableReceiptObjectIds, receiptProofAccess, receiptProofKey } from '../receipt-assistance/access';
import { uuid } from '../review/domain';
import type { Snapshot } from '../review/provider';
import { profileFields, type ObjectProfile, type ProfileField, type ProfileKey } from './profile';

export const onboardingDenied = () => new ForbiddenException('Accesso non consentito.');
export type OnboardingTx = Prisma.TransactionClient;

/** Request-local batch: each stored field still needs every captured source proof. */
async function authorizedObjectProfiles(tx: OnboardingTx, accountId: string, homeId: string, targets: ReadonlyArray<{id:string;profile:unknown}>, presentation: boolean) {
  if (!targets.length) return new Map<string, {fields:ObjectProfile;unavailable:boolean}>();
  const receipt = await tx.receiptObjectField.findMany({ where: { accountId, homeId, objectId: {in:targets.map(target=>target.id)}, fieldKey: { in: ['brand', 'model'] } } });
  const merged = targets.map(target => {
    const raw = (target.profile && typeof target.profile === 'object' ? target.profile : {}) as ObjectProfile;
    const fields: ObjectProfile = { ...raw };
    for (const row of receipt) if (row.objectId===target.id && !fields[row.fieldKey as ProfileKey]) fields[row.fieldKey as ProfileKey] = { value: row.value, origin: row.origin === 'user_declared' ? 'user_declared' : 'extraction_confirmed', sources: row.sources as unknown as ProfileField['sources'] };
    return {id:target.id,fields};
  });
  const proofs = merged.flatMap(target=>Object.values(target.fields).flatMap(field => field?.sources ?? []).map(source => ({ documentId: source.documentId, documentVersion: source.documentVersion, documentSha256: source.sha256 })));
  const readable = await receiptProofAccess(tx, accountId, homeId, proofs);
  return new Map(merged.map(target=>{
    const fields: ObjectProfile = {}; let unavailable = false;
    for (const key of profileFields) {
      const field = target.fields[key]; if (!field) continue;
      const proofKey = (source: ProfileField['sources'][number]) => receiptProofKey({ documentId: source.documentId, documentVersion: source.documentVersion, documentSha256: source.sha256 });
      if (field.origin === 'user_declared' || field.sources.length > 0 && field.sources.every(source => readable.confirmed.has(proofKey(source)))) {
        if (!presentation) { fields[key] = field; continue; }
        const sources = field.sources.filter(source => readable.proposal.has(proofKey(source)));
        const view = { ...field, sources, sourceAvailable: sources.length === field.sources.length };
        fields[key] = view;
      } else unavailable = true;
    }
    return [target.id,{fields,unavailable}] as const;
  }));
}

export async function objectProfileViews(tx: OnboardingTx, accountId: string, homeId: string, targets: ReadonlyArray<{id:string;profile:unknown}>) {
  return authorizedObjectProfiles(tx, accountId, homeId, targets, true);
}

export async function objectProfileView(tx: OnboardingTx, accountId: string, homeId: string, objectId: string, stored: unknown) {
  return (await objectProfileViews(tx,accountId,homeId,[{id:objectId,profile:stored}])).get(objectId)!;
}

/** Mutation-only canonical state. Never serialize this result: presentation must
 * filter unavailable citations, but an unrelated edit must not erase provenance. */
export async function objectProfileForUpdate(tx: OnboardingTx, accountId: string, homeId: string, objectId: string, stored: unknown) {
  return (await authorizedObjectProfiles(tx, accountId, homeId, [{ id: objectId, profile: stored }], false)).get(objectId)!;
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
