import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, BoilerAsset, FieldProposal, AnalysisJob } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest, validMembership } from '../security';
import { DocumentsService } from '../documents/documents.service';
import { canReadDocument } from '../documents/access';
import { Candidate, FieldKey, FieldValue, Fields, boolean, confirmation, conflict, decisions, fingerprint, ids, invalid, matchesConfirmed, measurements, object, proposalKind, resolveDecision, sourceList, text, uuid, version } from './domain';
import { Snapshot } from './provider';
import { ListDocumentsDto } from '../documents/dto';
type Tx = Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const fieldsOf = (asset: BoilerAsset) => asset.confirmed as unknown as Fields;
export const publicJob = (job: AnalysisJob) => ({ id: job.id, homeId: job.homeId, assetId: job.assetId, parentJobId: job.parentJobId, state: job.state, provider: 'test_fixture_v1', isSimulation: true, documentIds: (job.documents as unknown as Snapshot[]).map(s => s.documentId), createdAt: job.createdAt.toISOString(), finishedAt: job.finishedAt?.toISOString() ?? null, outcome: job.outcome, openReviewCount: job.openReviewCount, error: job.error });

@Injectable()
export class ReviewService {
  constructor(private readonly db: PrismaService, private readonly documents: DocumentsService) {}
  async require(tx: Tx, accountId: string, homeId: string, edit = false) {
    // Membership changes take an exclusive row lock and cannot race publication.
    await tx.$queryRaw`SELECT id FROM "HomeMembership" WHERE "accountId"=${accountId} AND "homeId"=${homeId} FOR SHARE`;
    const member = await tx.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } } });
    if (!member || !validMembership(member) || (edit && member.role === 'viewer')) throw new ForbiddenException('Accesso non consentito.');
    return member;
  }
  async lock(tx: Tx, accountId: string, homeId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${accountId + ':' + homeId}, 0))::text AS locked`;
  }
  async asset(tx: Tx, accountId: string, homeId: string, assetId: string) {
    const asset = await tx.boilerAsset.findFirst({ where: { id: uuid(assetId), homeId, accountId } });
    if (!asset) throw new ForbiddenException('Accesso non consentito.'); return asset;
  }
  async sources(tx: Tx, accountId: string, homeId: string, snapshots: Snapshot[]) {
    for (const snapshot of snapshots) {
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${snapshot.documentId} FOR SHARE`;
      const doc = await tx.document.findUnique({ where: { id: snapshot.documentId }, include: { original: true } });
      if (!doc || doc.homeId !== homeId || !canReadDocument(doc, accountId) || !doc.original || doc.original.version !== snapshot.documentVersion || doc.original.sha256 !== snapshot.documentSha256) throw new ForbiddenException('Accesso non consentito.');
    }
  }
  async assetSources(tx: Tx, accountId: string, homeId: string, assetId: string) {
    const jobs = await tx.analysisJob.findMany({ where: { assetId, state: 'succeeded' } });
    for (const job of jobs) await this.sources(tx, accountId, homeId, job.documents as unknown as Snapshot[]);
  }
  async detail(tx: Tx, asset: BoilerAsset, editing: boolean) {
    const proposals = await tx.fieldProposal.findMany({ where: { assetId: asset.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    const fields = fieldsOf(asset), confirmedFields = Object.values(fields);
    const openReviewCount = proposals.filter(p => p.state === 'open').length;
    return { id: asset.id, homeId: asset.homeId, name: asset.name, type: 'boiler', visibility: 'private', state: !confirmedFields.length ? 'provisional' : fields.brand && fields.model && fields.power && !openReviewCount ? 'confirmed' : 'partially_confirmed', version: asset.version, provider: 'test_fixture_v1', isSimulation: true, openReviewCount, confirmedFields, permissions: editing ? ['read', 'edit'] : ['read'], proposals: proposals.map(p => this.proposal(p, fields)) };
  }
  proposal(proposal: FieldProposal, fields: Fields) {
    return { id: proposal.id, assetId: proposal.assetId, jobId: proposal.jobId, fieldKey: proposal.fieldKey, kind: proposal.kind, state: proposal.state, candidates: proposal.candidates, currentConfirmed: fields[proposal.fieldKey as FieldKey] ?? null, provider: 'test_fixture_v1', isSimulation: true };
  }
  async mutate(accountId: string, homeId: string, operation: string, target: string, key: string | undefined, input: unknown, action: (tx: Tx) => Promise<unknown>) {
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    const hash = digest(JSON.stringify(input));
    return this.db.$transaction(async tx => {
      await this.lock(tx, accountId, homeId); await this.require(tx, accountId, homeId, true);
      if (operation === 'confirm' || operation === 'manual') { await this.asset(tx, accountId, homeId, target); await this.assetSources(tx, accountId, homeId, target); }
      if (operation === 'retry') {
        const job = await this.job(tx, accountId, homeId, target); await this.sources(tx, accountId, homeId, job.documents as unknown as Snapshot[]);
      }
      if (operation === 'analysis') {
        const body = input as { documentIds: string[]; targetAssetId?: string };
        for (const id of body.documentIds) {
          const doc = await tx.document.findUnique({ where: { id }, include: { original: true } });
          if (!doc?.original) throw new ForbiddenException('Accesso non consentito.');
          await this.sources(tx, accountId, homeId, [{ documentId: id, documentVersion: 1, documentSha256: doc.original.sha256 }]);
        }
        if (body.targetAssetId) { await this.asset(tx, accountId, homeId, body.targetAssetId); await this.assetSources(tx, accountId, homeId, body.targetAssetId); }
      }
      const lookup = { accountId_homeId_operation_target_key: { accountId, homeId, operation, target, key } };
      const prior = await tx.reviewRequest.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per una richiesta diversa.');
        return prior.response;
      }
      const response = await action(tx);
      await tx.reviewRequest.create({ data: { accountId, homeId, operation, target, key, digest: hash, response: json(response) } });
      return response;
    }, { timeout: 15000, maxWait: 15000 });
  }
  async start(accountId: string, homeId: string, input: unknown, key?: string) {
    const row = object(input, ['documentIds', 'targetAssetId']);
    const body = { documentIds: ids(row.documentIds, 2), ...(row.targetAssetId !== undefined ? { targetAssetId: uuid(row.targetAssetId) } : {}) };
    return this.mutate(accountId, homeId, 'analysis', body.targetAssetId ?? '', key, body, async tx => {
      const snapshots: Snapshot[] = [];
      for (const id of body.documentIds) {
        const doc = await tx.document.findUnique({ where: { id }, include: { original: true } });
        snapshots.push({ documentId: id, documentVersion: 1, documentSha256: doc!.original!.sha256 });
      }
      const job = await tx.analysisJob.create({ data: { accountId, homeId, assetId: body.targetAssetId, documents: json(snapshots), createdAt: new Date() } });
      return { job: publicJob(job) };
    });
  }
  async job(tx: Tx, accountId: string, homeId: string, id: string) {
    const job = await tx.analysisJob.findFirst({ where: { id: uuid(id), accountId, homeId } });
    if (!job) throw new ForbiddenException('Accesso non consentito.'); return job;
  }
  retry(accountId: string, homeId: string, jobId: string, input: unknown, key?: string) {
    object(input, []); uuid(jobId);
    return this.mutate(accountId, homeId, 'retry', jobId, key, {}, async tx => {
      const parent = await this.job(tx, accountId, homeId, jobId);
      if (parent.state !== 'failed') throw conflict('invalid_job_state', 'Puoi riprovare soltanto un’analisi fallita.');
      if (parent.assetId) await this.asset(tx, accountId, homeId, parent.assetId);
      return { job: publicJob(await tx.analysisJob.create({ data: { accountId, homeId, documents: json(parent.documents), assetId: parent.assetId, parentJobId: parent.id, createdAt: new Date() } })) };
    });
  }
  create(accountId: string, homeId: string, input: unknown, key?: string) {
    const row = object(input, ['type', 'name']); if (row.type !== 'boiler') throw invalid();
    const body = { type: 'boiler', name: text(row.name, 80) };
    return this.mutate(accountId, homeId, 'create', '', key, body, async tx => ({ asset: await this.detail(tx, await tx.boilerAsset.create({ data: { accountId, homeId, name: body.name, createdAt: new Date() } }), true) }));
  }
  async getAsset(accountId: string, homeId: string, assetId: string) {
    return this.db.$transaction(async tx => { await this.lock(tx, accountId, homeId); const member = await this.require(tx, accountId, homeId); const asset = await this.asset(tx, accountId, homeId, assetId); await this.assetSources(tx, accountId, homeId, assetId); return { asset: await this.detail(tx, asset, member.role !== 'viewer') }; });
  }
  async getJob(accountId: string, homeId: string, jobId: string) {
    return this.db.$transaction(async tx => { await this.lock(tx, accountId, homeId); await this.require(tx, accountId, homeId); const job = await this.job(tx, accountId, homeId, jobId); await this.sources(tx, accountId, homeId, job.documents as unknown as Snapshot[]); return { job: publicJob(job) }; });
  }
  anchor(query: ListDocumentsDto, accountId: string, homeId: string, resource: string) {
    if (!query.cursor) return {};
    try {
      const value = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as { a: string; h: string; r: string; id: string; t: string };
      if (value.a !== accountId || value.h !== homeId || value.r !== resource || !Number.isFinite(Date.parse(value.t))) throw invalid();
      uuid(value.id); const date = new Date(value.t);
      return { OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: value.id } }] };
    } catch { throw invalid('Pagina non valida.'); }
  }
  cursor(rows: Array<{ id: string; createdAt: Date }>, query: ListDocumentsDto, accountId: string, homeId: string, resource: string) {
    const last = rows[Math.min(rows.length, query.limit) - 1];
    return rows.length > query.limit && last ? Buffer.from(JSON.stringify({ a: accountId, h: homeId, r: resource, id: last.id, t: last.createdAt.toISOString() })).toString('base64url') : null;
  }
  async list(accountId: string, homeId: string, resource: 'jobs' | 'assets' | 'review' | 'history', query: ListDocumentsDto, assetId?: string) {
    const scope = resource + (assetId ? ':' + uuid(assetId) : ''); const anchor = this.anchor(query, accountId, homeId, scope);
    return this.db.$transaction(async tx => {
      await this.lock(tx, accountId, homeId);
      const member = await this.require(tx, accountId, homeId); const sort = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
      if (resource === 'jobs') {
        const rows = await tx.analysisJob.findMany({ where: { accountId, homeId, ...anchor }, orderBy: sort, take: query.limit + 1 });
        for (const job of rows) await this.sources(tx, accountId, homeId, job.documents as unknown as Snapshot[]);
        return { items: rows.slice(0, query.limit).map(publicJob), nextCursor: this.cursor(rows, query, accountId, homeId, scope) };
      }
      if (resource === 'assets') {
        const rows = await tx.boilerAsset.findMany({ where: { accountId, homeId, ...anchor }, orderBy: sort, take: query.limit + 1 });
        const items = []; for (const asset of rows.slice(0, query.limit)) { await this.assetSources(tx, accountId, homeId, asset.id); const summary = await this.detail(tx, asset, member.role !== 'viewer'); const { proposals, ...rest } = summary; void proposals; items.push(rest); }
        return { items, nextCursor: this.cursor(rows, query, accountId, homeId, scope) };
      }
      if (resource === 'history') {
        await this.asset(tx, accountId, homeId, assetId!); await this.assetSources(tx, accountId, homeId, assetId!);
        const rows = await tx.assetHistory.findMany({ where: { assetId, ...anchor }, orderBy: sort, take: query.limit + 1 });
        return { items: rows.slice(0, query.limit).map(h => ({ id: h.id, assetId: h.assetId, at: h.createdAt.toISOString(), kind: h.kind, origin: h.kind.startsWith('analysis') ? 'test_provider' : 'explicit_user', confirmationId: h.confirmationId, note: h.note, changes: h.changes })), nextCursor: this.cursor(rows, query, accountId, homeId, scope) };
      }
      const where = { state: 'open', asset: { accountId, homeId } };
      const rows = await tx.fieldProposal.findMany({ where: { ...where, ...anchor }, include: { asset: true }, orderBy: sort, take: query.limit + 1 });
      const items = []; for (const p of rows.slice(0, query.limit)) { await this.assetSources(tx, accountId, homeId, p.assetId); items.push({ id: p.id, assetId: p.assetId, assetName: p.asset.name, assetVersion: p.asset.version, proposal: this.proposal(p, fieldsOf(p.asset)) }); }
      return { items, openCount: await tx.fieldProposal.count({ where }), nextCursor: this.cursor(rows, query, accountId, homeId, scope) };
    }, { timeout: 15000 });
  }
  confirm(accountId: string, homeId: string, assetId: string, input: unknown, key?: string) {
    const row = object(input, ['expectedVersion', 'decisions']); const body = { expectedVersion: version(row.expectedVersion), decisions: decisions(row.decisions) }; uuid(assetId);
    return this.mutate(accountId, homeId, 'confirm', assetId, key, body, async tx => {
      const asset = await this.asset(tx, accountId, homeId, assetId); if (asset.version !== body.expectedVersion) throw conflict('asset_version_conflict', 'La scheda è cambiata. Rileggi i dati.');
      const fields = fieldsOf(asset), confirmationId = randomUUID(), changes = [], resolvedProposalIds = [];
      const changedFields = new Set<string>();
      for (const decision of body.decisions) {
        const proposal = await tx.fieldProposal.findUnique({ where: { id: decision.proposalId } });
        if (!proposal || proposal.assetId !== assetId) throw new ForbiddenException('Accesso non consentito.');
        if (proposal.state !== 'open') throw conflict('proposal_already_resolved', 'La proposta è già stata risolta.');
        const field = proposal.fieldKey as FieldKey;
        if (field === 'power' && body.decisions.length !== 1) throw invalid('Conferma la potenza separatamente.');
        if (changedFields.has(field)) throw invalid('Una sola decisione per campo nella richiesta.'); changedFields.add(field);
        const prior = fields[field], candidates = proposal.candidates as unknown as Candidate[];
        if (decision.action !== 'discard' && prior && (!decision.replaceConfirmed || !decision.note)) throw conflict('confirmed_value_exists', 'Conferma esplicitamente la sostituzione con una nota.');
        const result = resolveDecision(field, candidates, decision);
        if (result.value) fields[field] = confirmation(field, result.value, prior, result.origin, result.sources, decision.note, confirmationId);
        await tx.fieldProposal.update({ where: { id: proposal.id }, data: { state: decision.action === 'discard' ? 'discarded' : result.origin === 'user_correction' ? 'corrected' : 'accepted', resolvedRevision: fields[field]?.revision ?? 0 } });
        resolvedProposalIds.push(proposal.id); changes.push({ fieldKey: field, before: prior?.value ?? null, after: fields[field]?.value ?? null, proposalId: proposal.id, action: decision.action, sources: sourceList(candidates) });
      }
      return this.saveConfirmation(tx, asset, fields, confirmationId, resolvedProposalIds, changes, 'confirmation', body.decisions.map(d => d.note).filter(Boolean).join('\n') || null);
    });
  }
  manual(accountId: string, homeId: string, assetId: string, input: unknown, key?: string) {
    const row = object(input, ['expectedVersion', 'fields']);
    if (!Array.isArray(row.fields) || row.fields.length < 1 || row.fields.length > 3) throw invalid();
    const fieldsInput = row.fields.map(v => {
      const item = object(v, ['fieldKey', 'value', 'note', 'replaceConfirmed', 'proposalIdsToClose']);
      if (!['brand', 'model', 'power'].includes(String(item.fieldKey))) throw invalid();
      const fieldKey = item.fieldKey as FieldKey; const raw = object(item.value, fieldKey === 'power' ? ['kind', 'measurements'] : ['kind', 'text']);
      if (raw.kind !== (fieldKey === 'power' ? 'power' : 'text')) throw invalid();
      const value: FieldValue = fieldKey === 'power' ? { kind: 'power', measurements: measurements(raw.measurements).map(m => ({ ...m, sources: [], origin: 'manual' })) } : { kind: 'text', text: text(raw.text, fieldKey === 'brand' ? 80 : 120) };
      return { fieldKey, value, note: text(item.note, 500), replaceConfirmed: boolean(item.replaceConfirmed), proposalIdsToClose: ids(item.proposalIdsToClose, 50, 0) };
    }).sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
    if (new Set(fieldsInput.map(f => f.fieldKey)).size !== fieldsInput.length || (fieldsInput.some(f => f.fieldKey === 'power') && fieldsInput.length !== 1)) throw invalid('Conferma la potenza separatamente.');
    const body = { expectedVersion: version(row.expectedVersion), fields: fieldsInput }; uuid(assetId);
    return this.mutate(accountId, homeId, 'manual', assetId, key, body, async tx => {
      const asset = await this.asset(tx, accountId, homeId, assetId); if (asset.version !== body.expectedVersion) throw conflict('asset_version_conflict', 'La scheda è cambiata. Rileggi i dati.');
      const fields = fieldsOf(asset), confirmationId = randomUUID(), resolvedProposalIds: string[] = [], changes = [];
      for (const item of body.fields) {
        const prior = fields[item.fieldKey]; if (prior && !item.replaceConfirmed) throw conflict('confirmed_value_exists', 'Conferma esplicitamente la sostituzione.');
        fields[item.fieldKey] = confirmation(item.fieldKey, item.value, prior, 'manual', [], item.note, confirmationId);
        for (const id of item.proposalIdsToClose) {
          const p = await tx.fieldProposal.findUnique({ where: { id } });
          if (!p || p.assetId !== assetId || p.fieldKey !== item.fieldKey) throw new ForbiddenException('Accesso non consentito.');
          if (p.state !== 'open') throw conflict('proposal_already_resolved', 'La proposta è già stata risolta.');
          await tx.fieldProposal.update({ where: { id }, data: { state: 'corrected', resolvedRevision: fields[item.fieldKey]!.revision } }); resolvedProposalIds.push(id);
        }
        changes.push({ fieldKey: item.fieldKey, before: prior?.value ?? null, after: item.value, proposalId: null, action: 'manual', sources: [] });
      }
      return this.saveConfirmation(tx, asset, fields, confirmationId, resolvedProposalIds, changes, 'manual_confirmation', body.fields.map(f => f.note).join('\n'));
    });
  }
  async saveConfirmation(tx: Tx, asset: BoilerAsset, fields: Fields, confirmationId: string, resolvedProposalIds: string[], changes: unknown, kind: string, note: string | null) {
    const updated = await tx.boilerAsset.update({ where: { id: asset.id }, data: { confirmed: json(fields), version: { increment: 1 } } });
    await tx.assetHistory.create({ data: { assetId: asset.id, kind, confirmationId, note, changes: json(changes), createdAt: new Date() } });
    const detail = await this.detail(tx, updated, true);
    return { confirmationId, asset: detail, resolvedProposalIds, remainingOpenCount: detail.openReviewCount };
  }
  async inputs(job: AnalysisJob) {
    const rows = []; for (const snapshot of job.documents as unknown as Snapshot[]) {
      const { doc } = await this.documents.accessible(job.accountId, job.homeId, snapshot.documentId);
      if (doc.original?.sha256 !== snapshot.documentSha256) throw new ForbiddenException();
      rows.push({ snapshot, bytes: await this.documents.originalBytes(doc) });
    } return rows;
  }
  async publish(tx: Tx, job: AnalysisJob, proposed: Record<FieldKey, Candidate[]>) {
    await this.lock(tx, job.accountId, job.homeId); await this.require(tx, job.accountId, job.homeId, true); await this.sources(tx, job.accountId, job.homeId, job.documents as unknown as Snapshot[]);
    let asset = job.assetId ? await this.asset(tx, job.accountId, job.homeId, job.assetId) : await tx.boilerAsset.create({ data: { homeId: job.homeId, accountId: job.accountId, name: 'Caldaia', createdAt: new Date() } });
    await this.assetSources(tx, job.accountId, job.homeId, asset.id);
    const fields = fieldsOf(asset); let added = 0;
    const changes = [];
    for (const field of ['brand', 'model', 'power'] as const) {
      const candidates = proposed[field], print = fingerprint(candidates), revision = fields[field]?.revision ?? 0;
      const resolved = await tx.fieldProposal.findFirst({ where: { assetId: asset.id, fieldKey: field, fingerprint: print, state: { not: 'open' }, resolvedRevision: revision } });
      const existing = await tx.fieldProposal.findFirst({ where: { assetId: asset.id, fieldKey: field, fingerprint: print, state: 'open' } });
      const skipped = !!resolved || !!existing || matchesConfirmed(field, candidates, fields[field]);
      const p = await tx.fieldProposal.create({ data: { assetId: asset.id, jobId: job.id, fieldKey: field, kind: proposalKind(field, candidates), state: skipped ? 'already_matches' : 'open', candidates: json(candidates), fingerprint: print, resolvedRevision: skipped ? revision : null, createdAt: new Date() } });
      if (!skipped) added++;
      changes.push({ fieldKey: field, before: fields[field]?.value ?? null, after: fields[field]?.value ?? null, proposalId: p.id, action: skipped ? 'already_matches' : 'proposed', sources: sourceList(candidates) });
    }
    if (added && job.assetId) asset = await tx.boilerAsset.update({ where: { id: asset.id }, data: { version: { increment: 1 } } });
    await tx.assetHistory.create({ data: { assetId: asset.id, kind: added ? 'analysis_published' : 'analysis_no_changes', changes: json(changes), createdAt: new Date() } });
    return { assetId: asset.id, outcome: added ? 'proposals_created' : 'no_changes', openReviewCount: await tx.fieldProposal.count({ where: { assetId: asset.id, state: 'open' } }) };
  }
}
