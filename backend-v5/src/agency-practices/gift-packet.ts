import { createHash } from 'node:crypto';
import { exportManifest, PracticeError, requirePractice, type Actor, type Practice } from './domain';

/**
 * Internal preview preparation, NOT a delivery, public share or Home writer.
 * Descriptors must come from a trusted server producer/registry. There is no
 * HTTP DTO accepting them and this function does not establish their truth.
 */
export type GiftDocumentDescriptor = {
  agencyId: string; practiceId: string; sourceId: string; sourceVersion: number; sha256: string;
  metadataVersion: number; origin: 'received' | 'agency_generated';
  lifecycle: 'draft' | 'final' | 'signed'; author: string; title: string;
  surface?: {
    kind: 'net' | 'cadastral' | 'commercial';
    qualification: 'estimated' | 'reviewed' | 'unverified';
    method: string; geometryRevision: number; caveats: string[];
  };
};
function invalid(): never { throw new PracticeError('invalid_input'); }
function object(v: unknown, keys: string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype ||
      Object.keys(v).some(key => !keys.includes(key))) invalid();
  return v as Record<string, unknown>;
}
function text(v: unknown, max: number): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max ||
      Array.from(v).some(c => c.charCodeAt(0) < 32)) invalid();
  return v.trim();
}
function positive(v: unknown): number {
  if (!Number.isSafeInteger(v) || Number(v) < 1) invalid();
  return Number(v);
}
function sha(v: unknown): string {
  if (typeof v !== 'string' || !/^[a-f0-9]{64}$/u.test(v)) invalid();
  return v;
}
export function parseGiftDocumentDescriptor(input: unknown): GiftDocumentDescriptor {
  const d = object(input, ['agencyId','practiceId','sourceId','sourceVersion','sha256','metadataVersion','origin','lifecycle','author','title','surface']);
  if (!['received','agency_generated'].includes(String(d.origin)) ||
      !['draft','final','signed'].includes(String(d.lifecycle))) invalid();
  let surface: GiftDocumentDescriptor['surface'];
  if (d.surface !== undefined) {
    const s = object(d.surface, ['kind','qualification','method','geometryRevision','caveats']);
    if (!['net','cadastral','commercial'].includes(String(s.kind)) ||
        !['estimated','reviewed','unverified'].includes(String(s.qualification)) ||
        !Array.isArray(s.caveats) || s.caveats.length > 30) invalid();
    const caveats = s.caveats.map(value => text(value, 500));
    if (new Set(caveats).size !== caveats.length) invalid();
    // Estimated output must not lose its explanation when packaged.
    if (s.qualification === 'estimated' && caveats.length === 0) invalid();
    surface = { kind:s.kind as NonNullable<GiftDocumentDescriptor['surface']>['kind'],
      qualification:s.qualification as NonNullable<GiftDocumentDescriptor['surface']>['qualification'],
      method:text(s.method,200),geometryRevision:positive(s.geometryRevision),caveats };
  }
  return {
    agencyId:text(d.agencyId,100),practiceId:text(d.practiceId,100),sourceId:text(d.sourceId,100),
    sourceVersion:positive(d.sourceVersion),sha256:sha(d.sha256),metadataVersion:positive(d.metadataVersion),
    origin:d.origin as GiftDocumentDescriptor['origin'],lifecycle:d.lifecycle as GiftDocumentDescriptor['lifecycle'],
    author:text(d.author,200),title:text(d.title,300),...(surface ? {surface} : {})
  };
}
export function prepareAgencyGiftPacket(
  actor: Actor, practice: Practice, trustedDescriptors: unknown, input: unknown, now: string
) {
  requirePractice(actor, practice, 'export', now);
  const r = object(input, ['expectedRevision','requestedHomeId','recipients','documents']);
  const revision = positive(r.expectedRevision);
  if (revision !== practice.revision) throw new PracticeError('revision_conflict');
  const requestedHomeId = text(r.requestedHomeId,100);
  if (!Array.isArray(r.recipients) || r.recipients.length < 1 || r.recipients.length > 20) invalid();
  const recipients = r.recipients.map(value => {
    const p = object(value, ['subjectRef']);
    return { subjectRef:text(p.subjectRef,100) };
  }).sort((a,b) => a.subjectRef === b.subjectRef ? 0 : a.subjectRef < b.subjectRef ? -1 : 1);
  if (new Set(recipients.map(p => p.subjectRef)).size !== recipients.length) invalid();
  // Authorize every original before reading/describing any selected metadata.
  const originals = exportManifest(actor, practice, r.documents, now)
    .sort((a,b) => a.sourceId === b.sourceId ? 0 : a.sourceId < b.sourceId ? -1 : 1);
  if (!Array.isArray(trustedDescriptors) || trustedDescriptors.length > 50) invalid();
  const descriptors = trustedDescriptors.map(parseGiftDocumentDescriptor);
  if (new Set(descriptors.map(d => d.sourceId)).size !== descriptors.length ||
      descriptors.length !== originals.length) invalid();
  const documents = originals.map(original => {
    const meta = descriptors.find(d => d.sourceId === original.sourceId);
    if (!meta || meta.agencyId !== practice.agencyId || meta.practiceId !== practice.id) invalid();
    if (meta.sourceVersion !== original.version || meta.sha256 !== original.sha256)
      throw new PracticeError('source_changed');
    if (meta.lifecycle === 'draft') invalid();
    return { ...original,metadataVersion:meta.metadataVersion,origin:meta.origin,title:meta.title,
      author:meta.author,lifecycle:meta.lifecycle,signatureVerification:'not_assessed' as const,
      ...(meta.surface ? {surface:structuredClone(meta.surface)} : {}) };
  });
  const content = { schemaVersion:'agency-gift-preparation-v1' as const,
    agencyId:practice.agencyId,practiceId:practice.id,practiceRevision:revision,preparedBy:actor.accountId,
    requestedHomeId,recipients,documents };
  return { ...content,preparedAt:now,
    fingerprint:createHash('sha256').update(JSON.stringify(content)).digest('hex'),
    purpose:'internal_preview' as const,
    recipientIdentityVerified:false as const,homeDestinationAuthorized:false as const,
    canDeliver:false as const,createsHome:false as const,grantsAccess:false as const,
    confirmsFacts:false as const,certification:false as const,completenessAssessed:false as const,
    nextSteps:['verify_current_recipients','authorize_home_destination','persist_delivery_receipt','copy_accepted_documents_independently'] };
}
