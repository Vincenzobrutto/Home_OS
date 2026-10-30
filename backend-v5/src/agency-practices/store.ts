import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type AgencyPractice, type AgencyMember, type AgencyPracticeGrant } from '../../generated/client';
import type { PrismaService } from '../prisma.service';
import { active, applyRequest, exportManifest, newPractice, practiceSummary, PracticeError, requirePractice, type Actor, type AgencyRole, type Practice } from './domain';
import { applyReview, reviewView } from './review';
import { editPlan, planViews, registerPlan } from '../agency-plans/records';
import { AgencyFileVault, inspectAgencyFile } from './files';
import { sourceReadable } from './domain';
import { enqueuePlanJob, claimPlanJob, reservePlanPhase, settlePlanPhase, markPlanUncertain, finishPlanJob, planJobViews, authorizedPlanJob, type Phase, type PlanJob } from '../agency-plans/jobs';

function iso(date: Date | null): string | null { return date?.toISOString() ?? null; }
function membership(row: AgencyMember) { return { agencyId: row.agencyId, accountId: row.accountId, role: row.role as AgencyRole, validFrom: row.validFrom.toISOString(), validUntil: iso(row.validUntil), revokedAt: iso(row.revokedAt) }; }
function grant(row: AgencyPracticeGrant, agencyId: string) { return { agencyId, practiceId: row.practiceId, accountId: row.accountId, access: row.access as 'read' | 'edit', canExport: row.canExport, validFrom: row.validFrom.toISOString(), validUntil: iso(row.validUntil), revokedAt: iso(row.revokedAt) }; }
function snapshot(row: AgencyPractice): Practice {
  const p = row.snapshot as unknown as Practice;
  if (row.snapshotVersion !== 1 || !p || p.id !== row.id || p.agencyId !== row.agencyId || p.label !== row.label || p.revision !== row.revision || !Array.isArray(p.sources) || !Array.isArray(p.receipts) || !Array.isArray(p.events) || !Array.isArray(p.dependents)) throw new Error('agency_snapshot_invalid');
  return p;
}
const json = (p: Practice): Prisma.InputJsonValue => JSON.parse(JSON.stringify(p));

/** Internal persistence adapter: account comes from the session; no HTTP endpoint accepts file fingerprints. */
export class AgencyPracticesStore {
  constructor(private readonly db: Pick<PrismaService, '$transaction'>) {}
  /** Trusted worker-only state. Never expose Actor/Practice/tokenHash via HTTP. */
  async planWorkerContext(accountId:string,agencyId:string,practiceId:string,id:string,token:string){
    return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId),now=new Date().toISOString(),job=authorizedPlanJob(actor,practice,id,token,now);const {authorization}=await this.jobBudget(tx,practice,id,job.status!=='completed');if(authorization.runId!==id)throw new PracticeError('access_denied');return {actor,practice,now,job};},{maxWait:5000,timeout:15000});
  }
  /** Store validated result, complete job and release known unused budget atomically. */
  async completePlanJob(accountId:string,agencyId:string,practiceId:string,id:string,token:string,analysis:Parameters<typeof registerPlan>[2]){
    return this.db.$transaction(async tx=>{
      const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId),now=new Date().toISOString(),job=authorizedPlanJob(actor,practice,id,token,now),{authorization,budget}=await this.jobBudget(tx,practice,id,false);
      if(authorization.runId!==id||analysis.runId!==id||analysis.fingerprint!==job.reservations[0]?.fingerprint||analysis.proof.sourceId!==job.proof.sourceId||analysis.proof.version!==job.proof.version||analysis.proof.sha256!==job.proof.sha256||analysis.proof.page!==job.proof.page||analysis.calls.length!==2)throw new PracticeError('invalid_input');
      for(const r of job.reservations){const c=analysis.calls.find(c=>c.phase===r.phase);if(!r.usage||!c||c.requestId!==r.usage.requestId||c.input!==r.usage.input||c.output!==r.usage.output||!Number.isFinite(c.costUSD)||Math.abs(c.costUSD-r.costMicros!/1000000)>0.000001)throw new PracticeError('invalid_input');}
      const registered=registerPlan(actor,practice,analysis,practice.revision,now);
      if(job.status==='completed'){if(!registered.replay||authorization.state!=='closed')throw new PracticeError('idempotency_conflict');return {replay:true,plans:planViews(actor,practice,now)};}
      if(authorization.state!=='bound')throw new PracticeError('access_denied');
      const next=finishPlanJob(actor,registered.practice,id,token,now);
      await tx.agencyAiBudget.update({where:{id:budget.id},data:{committedMicros:{decrement:authorization.committedMicros-authorization.spentMicros}}});
      await tx.agencyPlanAuthorization.update({where:{id:authorization.id},data:{state:'closed',committedMicros:authorization.spentMicros}});
      await tx.agencyPractice.update({where:{id:practiceId},data:{revision:next.revision,snapshot:json(next)}});
      requirePractice(actor,next,'edit',new Date().toISOString());
      return {replay:false,plans:planViews(actor,next,new Date().toISOString())};
    },{maxWait:5000,timeout:15000});
  }
  private async jobBudget(tx:Prisma.TransactionClient,practice:Practice,id:string,active:boolean){
    const j=(practice as Practice&{planJobs?:PlanJob[]}).planJobs?.find(j=>j.id===id);if(!j)throw new PracticeError('access_denied');
    const found=await tx.agencyPlanAuthorization.findUnique({where:{id:j.authorizationId}});if(!found)throw new PracticeError('access_denied');
    // All operations lock practice -> budget -> authorization, including accounting.
    await tx.$queryRaw`SELECT id FROM "AgencyAiBudget" WHERE id=${found.budgetId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "AgencyPlanAuthorization" WHERE id=${found.id} FOR UPDATE`;
    const authorization=await tx.agencyPlanAuthorization.findUnique({where:{id:found.id}}),budget=await tx.agencyAiBudget.findUnique({where:{id:found.budgetId}});
    if(!authorization||!budget||authorization.budgetId!==found.budgetId||budget.agencyId!==practice.agencyId||authorization.practiceId!==practice.id||authorization.accountId!==j.creatorId||authorization.capMicros!==BigInt(j.capMicros)||authorization.model!==j.model||authorization.priceVersion!==j.priceVersion||authorization.inputMicrosPerMillion!==j.inputMicrosPerMillion||authorization.outputMicrosPerMillion!==j.outputMicrosPerMillion||!authorization.approvalReceipt.trim())throw new PracticeError('access_denied');
    const proof=authorization.proof as unknown as PlanJob['proof'];
    if(!proof||proof.sourceId!==j.proof.sourceId||proof.version!==j.proof.version||proof.sha256!==j.proof.sha256||proof.page!==j.proof.page||authorization.runId!==null&&authorization.runId!==j.id)throw new PracticeError('access_denied');
    if(active&&(authorization.revokedAt||budget.revokedAt||authorization.expiresAt.getTime()<=Date.now()||budget.expiresAt.getTime()<=Date.now()||budget.committedMicros>budget.capMicros))throw new PracticeError('access_denied');
    return {authorization,budget,j};
  }
  /** Server-only authorization/capability; never map this directly from a browser DTO. */
  async enqueuePlanJob(accountId: string, agencyId: string, practiceId: string, input: Parameters<typeof enqueuePlanJob>[2], token: string) {
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx,accountId,agencyId,practiceId), r = enqueuePlanJob(actor,practice,input,token,new Date().toISOString());
      const {authorization,budget}=await this.jobBudget(tx,r.practice,input.id,!r.replay);
      if (!r.replay) {
        if(authorization.state!=='issued'||authorization.runId!==null||budget.committedMicros+authorization.capMicros>budget.capMicros)throw new PracticeError('invalid_input');
        await tx.agencyAiBudget.update({where:{id:budget.id},data:{committedMicros:{increment:authorization.capMicros}}});
        await tx.agencyPlanAuthorization.update({where:{id:authorization.id},data:{state:'bound',runId:input.id,committedMicros:authorization.capMicros}});
        await tx.agencyPractice.update({ where:{id:practiceId},data:{revision:r.practice.revision,snapshot:json(r.practice)} });
      }else if(authorization.runId!==input.id)throw new PracticeError('idempotency_conflict');
      requirePractice(actor,r.practice,'edit',new Date().toISOString());
      return { replay:r.replay, jobs:planJobViews(actor,r.practice,new Date().toISOString()) };
    }, {maxWait:5000,timeout:15000});
  }
  async planJobCommand(accountId: string, agencyId: string, practiceId: string, id: string, token: string, command: {operation:'claim'} | {operation:'reserve';phase:Phase;fingerprint:string;maxMicros:number}) {
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx,accountId,agencyId,practiceId), now=new Date().toISOString();
      const {authorization}=await this.jobBudget(tx,practice,id,true);
      if(authorization.runId!==id||authorization.state!=='bound')throw new PracticeError('access_denied');
      let next:Practice, acquired:boolean|undefined;
      if(command.operation==='claim'){const r=claimPlanJob(actor,practice,id,token,now);next=r.practice;acquired=r.acquired;}
      else if(command.operation==='reserve')next=reservePlanPhase(actor,practice,id,token,command.phase,command.fingerprint,command.maxMicros,now);
      else throw new PracticeError('invalid_input');
      await tx.agencyPractice.update({where:{id:practiceId},data:{revision:next.revision,snapshot:json(next)}});
      requirePractice(actor,next,'edit',new Date().toISOString());
      return {acquired,jobs:planJobViews(actor,next,new Date().toISOString())};
    },{maxWait:5000,timeout:15000});
  }
  /** Worker capability only: account usage even if the user's grant was revoked.
   * This cannot authorize dispatch, disclose originals or return the aggregate. */
  async accountPlanPhase(agencyId:string,practiceId:string,id:string,token:string,phase:Phase,usage:Parameters<typeof settlePlanPhase>[4]|null){
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "AgencyPractice" WHERE id=${practiceId} AND "agencyId"=${agencyId} FOR UPDATE`;
      const row=await tx.agencyPractice.findUnique({where:{id:practiceId}});if(!row||row.agencyId!==agencyId)throw new PracticeError('access_denied');
      const original=snapshot(row),now=new Date().toISOString(),r=usage?settlePlanPhase(original,id,token,phase,usage,now):{practice:markPlanUncertain(original,id,token,phase,now),replay:false,costMicros:null};
      const {authorization,budget}=await this.jobBudget(tx,original,id,false);
      if(authorization.runId!==id||authorization.state==='issued')throw new PracticeError('access_denied');
      if(!r.replay){
        if(r.costMicros!==null){
          const delta=BigInt(r.costMicros),spent=authorization.spentMicros+delta,committed=spent>authorization.committedMicros?spent:authorization.committedMicros,extra=committed-authorization.committedMicros;
          await tx.agencyPlanAuthorization.update({where:{id:authorization.id},data:{spentMicros:spent,committedMicros:committed}});
          await tx.agencyAiBudget.update({where:{id:budget.id},data:{spentMicros:{increment:delta},committedMicros:{increment:extra}}});
        }
        await tx.agencyPractice.update({where:{id:practiceId},data:{revision:r.practice.revision,snapshot:json(r.practice)}});
      }
      return {replay:r.replay,costMicros:r.costMicros};
    },{maxWait:5000,timeout:15000});
  }
  /** Internal upload boundary: file identity is derived from bytes, never a browser assertion. */
  async upload(accountId: string, agencyId: string, practiceId: string, input: unknown, bytes: Buffer, vault: AgencyFileVault) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype || Object.keys(input).some(k => !['key', 'expectedRevision', 'command'].includes(k))) throw new PracticeError('invalid_input');
    const request = input as Record<string, unknown>, c = request.command;
    if (!c || typeof c !== 'object' || Array.isArray(c) || Object.getPrototypeOf(c) !== Object.prototype || Object.keys(c).some(k => !['operation', 'sourceId', 'visibility', 'originalFilename', 'expectedSourceVersion'].includes(k))) throw new PracticeError('invalid_input');
    const command = c as Record<string, unknown>;
    if (!['attach', 'replace'].includes(String(command.operation))) throw new PracticeError('invalid_input');
    const file = inspectAgencyFile(bytes);
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx, accountId, agencyId, practiceId);
      const { originalFilename, ...rest } = command;
      const r = applyRequest(actor, practice, { key: request.key, expectedRevision: request.expectedRevision, command: { ...rest, file: { sha256: file.sha256, byteSize: file.byteSize, mimeType: file.mimeType, originalFilename } } }, new Date().toISOString());
      // Bytes become immutable before metadata commits. A rollback can leave an
      // unreferenced object, never a committed source whose upload was unfinished.
      await vault.put(file.bytes);
      if (!r.replay) {
        const updated = await tx.agencyPractice.updateMany({ where: { id: practiceId, agencyId, revision: practice.revision }, data: { revision: r.practice.revision, snapshot: json(r.practice) } });
        if (updated.count !== 1) throw new PracticeError('revision_conflict');
      }
      requirePractice(actor, r.practice, 'edit', new Date().toISOString());
      return { receipt: r.receipt, replay: r.replay, practice: practiceSummary(actor, r.practice, new Date().toISOString()) };
    }, { maxWait: 5000, timeout: 15000 });
  }
  async readFile(accountId: string, agencyId: string, practiceId: string, selection: { sourceId: string; version: number; sha256: string }, vault: AgencyFileVault) {
    if (!selection || Object.getPrototypeOf(selection) !== Object.prototype || Object.keys(selection).some(k => !['sourceId', 'version', 'sha256'].includes(k)) || typeof selection.sourceId !== 'string' || !Number.isSafeInteger(selection.version) || selection.version < 1 || typeof selection.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(selection.sha256)) throw new PracticeError('invalid_input');
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx, accountId, agencyId, practiceId);
      const source = practice.sources.find(s => s.id === selection.sourceId);
      if (!source || !sourceReadable(actor, practice, source, new Date().toISOString())) throw new PracticeError('access_denied');
      const file = source.versions.at(-1)!;
      if (file.version !== selection.version || file.sha256 !== selection.sha256) throw new PracticeError('source_changed');
      const bytes = await vault.read(file.sha256, file.byteSize);
      if (!sourceReadable(actor, practice, source, new Date().toISOString())) throw new PracticeError('access_denied');
      return { bytes, mimeType: file.mimeType, originalFilename: file.originalFilename, sha256: file.sha256, version: file.version };
    }, { maxWait: 5000, timeout: 15000 });
  }
  private async context(tx: Prisma.TransactionClient, accountId: string, agencyId: string, practiceId: string) {
    // Row locking serializes state+ledger writes. Membership/grant locks make revocation race-safe.
    await tx.$queryRaw`SELECT id FROM "AgencyMember" WHERE "accountId"=${accountId} AND "agencyId"=${agencyId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "AgencyPracticeGrant" WHERE "accountId"=${accountId} AND "practiceId"=${practiceId} FOR SHARE`;
    const [member, assignment] = await Promise.all([
      tx.agencyMember.findUnique({ where: { agencyId_accountId: { agencyId, accountId } } }),
      tx.agencyPracticeGrant.findUnique({ where: { practiceId_accountId: { practiceId, accountId } } }),
    ]);
    const actor: Actor = { accountId, memberships: member ? [membership(member)] : [], grants: assignment ? [grant(assignment, agencyId)] : [] };
    requirePractice(actor, { id: practiceId, agencyId }, 'read', new Date().toISOString());
    await tx.$queryRaw`SELECT id FROM "AgencyPractice" WHERE id=${practiceId} AND "agencyId"=${agencyId} FOR UPDATE`;
    const row = await tx.agencyPractice.findUnique({ where: { id: practiceId } });
    if (!row || row.agencyId !== agencyId) throw new PracticeError('access_denied');
    return { actor, practice: snapshot(row) };
  }
  async create(accountId: string, agencyId: string, label: string, key: string) {
    const practice = newPractice(randomUUID(), agencyId, label);
    if (typeof key !== 'string' || !key.trim() || key.length > 120) throw new PracticeError('invalid_input');
    key = key.trim();
    const digest = createHash('sha256').update(JSON.stringify({ label: practice.label })).digest('hex');
    return this.db.$transaction(async tx => {
      // Creation keys are serialized on the creator's agency membership, not the unrelated Home.
      await tx.$queryRaw`SELECT id FROM "AgencyMember" WHERE "accountId"=${accountId} AND "agencyId"=${agencyId} FOR UPDATE`;
      const member = await tx.agencyMember.findUnique({ where: { agencyId_accountId: { agencyId, accountId } } });
      if (!member || !active(membership(member), new Date().toISOString()) || !['admin', 'agent'].includes(member.role)) throw new PracticeError('access_denied');
      const prior = await tx.agencyCreateRequest.findUnique({ where: { agencyId_accountId_key: { agencyId, accountId, key } } });
      if (prior) {
        if (prior.digest !== digest) throw new PracticeError('idempotency_conflict');
        const context = await this.context(tx, accountId, agencyId, prior.practiceId);
        return { practice: practiceSummary(context.actor, context.practice, new Date().toISOString()), replay: true };
      }
      await tx.agencyPractice.create({ data: { id: practice.id, agencyId, label: practice.label, revision: 1, snapshotVersion: 1, snapshot: json(practice) } });
      await tx.agencyPracticeGrant.create({ data: { practiceId: practice.id, accountId, access: 'edit', canExport: true, validFrom: new Date() } });
      await tx.agencyCreateRequest.create({ data: { agencyId, accountId, key, digest, practiceId: practice.id } });
      const context = await this.context(tx, accountId, agencyId, practice.id);
      return { practice: practiceSummary(context.actor, context.practice, new Date().toISOString()), replay: false };
    }, { maxWait: 5000, timeout: 15000 });
  }
  async read(accountId: string, agencyId: string, practiceId: string) {
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx, accountId, agencyId, practiceId);
      return practiceSummary(actor, practice, new Date().toISOString());
    }, { maxWait: 5000, timeout: 15000 });
  }
  async mutate(accountId: string, agencyId: string, practiceId: string, input: unknown) {
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx, accountId, agencyId, practiceId);
      const result = applyRequest(actor, practice, input, new Date().toISOString());
      if (!result.replay) {
        const updated = await tx.agencyPractice.updateMany({ where: { id: practiceId, agencyId, revision: practice.revision }, data: { revision: result.practice.revision, snapshot: json(result.practice) } });
        if (updated.count !== 1) throw new PracticeError('revision_conflict');
      }
      // Re-evaluate expiry after work; held membership/grant locks protect concurrent revocation.
      requirePractice(actor, result.practice, 'edit', new Date().toISOString());
      return { receipt: result.receipt, replay: result.replay, practice: practiceSummary(actor, result.practice, new Date().toISOString()) };
    }, { maxWait: 5000, timeout: 15000 });
  }
  async manifest(accountId: string, agencyId: string, practiceId: string, selection: unknown) {
    return this.db.$transaction(async tx => {
      const { actor, practice } = await this.context(tx, accountId, agencyId, practiceId);
      return exportManifest(actor, practice, selection, new Date().toISOString());
    }, { maxWait: 5000, timeout: 15000 });
  }
  async readReview(accountId:string,agencyId:string,practiceId:string){return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId);return reviewView(actor,practice,new Date().toISOString());},{maxWait:5000,timeout:15000});}
  async review(accountId:string,agencyId:string,practiceId:string,input:unknown){return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId);const r=applyReview(actor,practice,input,new Date().toISOString());if(!r.replay){const updated=await tx.agencyPractice.updateMany({where:{id:practiceId,agencyId,revision:practice.revision},data:{revision:r.practice.revision,snapshot:json(r.practice)}});if(updated.count!==1)throw new PracticeError('revision_conflict');}requirePractice(actor,r.practice,'edit',new Date().toISOString());return {receipt:r.receipt,replay:r.replay,review:reviewView(actor,r.practice,new Date().toISOString())};},{maxWait:5000,timeout:15000});}
  async readPlans(accountId:string,agencyId:string,practiceId:string){return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId);return planViews(actor,practice,new Date().toISOString());},{maxWait:5000,timeout:15000});}
  /** Internal worker completion, not an HTTP payload; provider result cannot be submitted by a browser. */
  async savePlan(accountId:string,agencyId:string,practiceId:string,analysis:Parameters<typeof registerPlan>[2],expectedRevision:number){return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId);const r=registerPlan(actor,practice,analysis,expectedRevision,new Date().toISOString());if(!r.replay){const updated=await tx.agencyPractice.updateMany({where:{id:practiceId,agencyId,revision:practice.revision},data:{revision:r.practice.revision,snapshot:json(r.practice)}});if(updated.count!==1)throw new PracticeError('revision_conflict');}requirePractice(actor,r.practice,'edit',new Date().toISOString());return {id:r.id,replay:r.replay,plans:planViews(actor,r.practice,new Date().toISOString())};},{maxWait:5000,timeout:15000});}
  async editPlan(accountId:string,agencyId:string,practiceId:string,input:Parameters<typeof editPlan>[2]){return this.db.$transaction(async tx=>{const {actor,practice}=await this.context(tx,accountId,agencyId,practiceId);const r=editPlan(actor,practice,input,new Date().toISOString());if(!r.replay){const updated=await tx.agencyPractice.updateMany({where:{id:practiceId,agencyId,revision:practice.revision},data:{revision:r.practice.revision,snapshot:json(r.practice)}});if(updated.count!==1)throw new PracticeError('revision_conflict');}requirePractice(actor,r.practice,'edit',new Date().toISOString());return {id:r.id,replay:r.replay,plans:planViews(actor,r.practice,new Date().toISOString())};},{maxWait:5000,timeout:15000});}
}
