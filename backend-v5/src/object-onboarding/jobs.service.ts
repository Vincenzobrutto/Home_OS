import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type ObjectOnboardingJob } from '../../generated/client';
import { HomeObjectsService } from '../home-objects/home-objects.service';
import { PrismaService } from '../prisma.service';
import { digest } from '../security';
import { conflict, invalid, object, uuid } from '../review/domain';
import { ANALYSIS_LIMITS } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { LocalFileStorage } from '../documents/storage';

import { ObjectOnboardingAccess } from './access';

import { OnboardingAiAnalysis } from './ai-analysis';
import { onboardingBilling } from './ai-budget';

export const ONBOARDING_JOB_LIMITS = { globalActive: 8, accountActive: 2, workerConcurrency: 2, leaseMs: 30000, maxRunMs: 30000, paidLeaseMs: 150000, maxPaidRunMs: 120000 } as const;
const deny = () => new ForbiddenException('Accesso non consentito.');
const busy = () => new ServiceUnavailableException({ code: 'onboarding_analysis_busy', message: 'Sono già in corso altre analisi. Riprova più tardi.' });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
type Tx = Prisma.TransactionClient;

@Injectable()
export class OnboardingJobService {
  constructor(private readonly db: PrismaService, private readonly receipts: ObjectOnboardingAccess, private readonly storage: LocalFileStorage, private readonly ai: OnboardingAiAnalysis, private readonly objects: HomeObjectsService) {}

  private async view(tx: Tx, a: string, h: string, row: ObjectOnboardingJob) {
    const source = await this.receipts.source(tx, a, h, row.documentId, row);
    const attempt = row.provider === 'anthropic' ? await tx.objectOnboardingAttempt.findUnique({ where: { jobId: row.id } }) : null;
    return {
      id: row.id, version: row.version, provider: row.provider, isSimulation: false,
      model: source ? attempt?.model ?? null : null, billing: source ? onboardingBilling(attempt) : null,
      state: source ? row.state : 'unavailable', draftId: source && row.state === 'succeeded' ? row.draftId : null,
      errorCode: source ? row.errorCode : null,
      documentLink: { state: source ? 'linked' : 'unavailable', document: source ? { id: source.id, name: source.name } : null },
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }

  capabilities(a: string, h: string, query: unknown) {
    const q = object(query, ['documentId']), documentId = uuid(q.documentId);
    return this.receipts.run(a, h, false, async (tx, edit) => {
      const source = await this.receipts.source(tx,a,h,documentId); if (!source) throw deny();
      const drafts = await tx.objectOnboardingDraft.findMany({where:{accountId:a,homeId:h,documentId,documentVersion:source.original!.version,documentSha256:source.original!.sha256},orderBy:[{updatedAt:'desc'},{id:'desc'}],take:10,select:{id:true,state:true,updatedAt:true}});
      const job = await tx.objectOnboardingJob.findFirst({where:{accountId:a,homeId:h,documentId,documentVersion:source.original!.version,documentSha256:source.original!.sha256},orderBy:{createdAt:'desc'}});
      const budget=edit?await this.ai.budget.snapshot(tx,source.original!.sha256,a,h):null;
      const aiAvailable=edit&&!!budget?.available;
      const uncertain=aiAvailable ? await tx.objectOnboardingJob.findFirst({where:{accountId:a,homeId:h,documentId,documentVersion:source.original!.version,documentSha256:source.original!.sha256,state:'uncertain',attempt:{is:{campaignId:this.ai.budget.config.campaign}}}}) : null;
      return {manualAvailable:edit,aiAvailable,canStartAnalysis:aiAvailable&&!uncertain&&!['queued','running'].includes(job?.state??''),canStartWithUncertainAcknowledgement:aiAvailable&&!!uncertain&&!['queued','running'].includes(job?.state??''),provider:'anthropic',requiresConsent:true,budget,drafts,job:job ? await this.view(tx,a,h,job) : null};
    });
  }
  recover(a:string,h:string,key:string,query:unknown) {
    object(query,[]); if(!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();
    return this.receipts.run(a,h,false,async tx=>{const row=await tx.objectOnboardingJob.findUnique({where:{accountId_homeId_key:{accountId:a,homeId:h,key}}});return {job:row?await this.view(tx,a,h,row):null};});
  }
  start(a: string, h: string, input: unknown, key?: string) {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave della richiesta non valida.');
    const row = object(input, ['documentId', 'provider', 'consentToProviderTransfer','acknowledgePreviousUncertainAnalysis']);
    if(row.acknowledgePreviousUncertainAnalysis!==undefined&&typeof row.acknowledgePreviousUncertainAnalysis!=='boolean')throw invalid();
    const body = {...(row.acknowledgePreviousUncertainAnalysis===true?{acknowledgePreviousUncertainAnalysis:true}:{}), documentId: uuid(row.documentId), provider: row.provider, consentToProviderTransfer: row.consentToProviderTransfer };
    if (typeof body.provider !== 'string' || typeof body.consentToProviderTransfer !== 'boolean') throw invalid();
    return this.receipts.run(a, h, true, async tx => {
      const source = await this.receipts.source(tx, a, h, body.documentId);
      if (!source) throw deny();
      const lookup = { accountId_homeId_key: { accountId: a, homeId: h, key } }, hash = digest(JSON.stringify(body));
      const prior = await tx.objectOnboardingJob.findUnique({ where: lookup });
      if (prior) {
        if (prior.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata con dati diversi.');
        if (!await this.receipts.source(tx, a, h, prior.documentId, prior)) throw deny();
        return { job: await this.view(tx, a, h, prior) };
      }
      if (body.provider !== 'anthropic') throw new ServiceUnavailableException({ code: 'ai_provider_disabled', message: 'Questo servizio di analisi non è abilitato.' });
      if (body.provider === 'anthropic') {
        if (!this.ai) throw new ServiceUnavailableException({ code: 'ai_provider_disabled', message: 'Analisi ricevuta non abilitata.' });
        this.ai.budget.requireSource(source.original!.sha256,a,h);
        if (!body.consentToProviderTransfer) throw invalid('Autorizza esplicitamente l’invio del testo di questo documento ad Anthropic.');
      }
      if (!['application/pdf','image/jpeg','image/png'].includes(source.original!.mimeType)) throw invalid('Serve un PDF o una foto JPEG/PNG.');
      if (source.original!.byteSize > ANALYSIS_LIMITS.maxFileBytes) throw invalid('Il PDF supera il limite di analisi.', 'analysis_limits_exceeded');
      const snapshot = { documentId: source.id, documentVersion: source.original!.version, documentSha256: source.original!.sha256 };
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('onboarding:queue',0))::text AS locked`;
      if (body.provider === 'anthropic' && !body.acknowledgePreviousUncertainAnalysis && await tx.objectOnboardingJob.findFirst({ where: { accountId: a, homeId: h, ...snapshot, provider: 'anthropic', state: 'uncertain', attempt: { is: { campaignId: this.ai.budget.config.campaign } } } })) throw conflict('analysis_outcome_unknown', 'L’esito di una precedente analisi è incerto. Non avviare un altro invio a pagamento. Puoi compilare a mano.');
      if (await tx.objectOnboardingJob.findFirst({ where: { accountId: a, homeId: h, ...snapshot, state: { in: ['queued', 'running'] } } })) throw conflict('onboarding_analysis_already_running', 'È già in corso un’analisi di questo documento.');
      const active = { state: { in: ['queued', 'running'] } };
      if (await tx.objectOnboardingJob.count({ where: active }) >= ONBOARDING_JOB_LIMITS.globalActive || await tx.objectOnboardingJob.count({ where: { ...active, accountId: a } }) >= ONBOARDING_JOB_LIMITS.accountActive) throw busy();
      const job = await tx.objectOnboardingJob.create({ data: { accountId: a, homeId: h, ...snapshot, mimeType: source.original!.mimeType, provider: body.provider as string, consentToProviderTransfer: body.provider === 'anthropic', key, digest: hash } });
      if (body.provider === 'anthropic') await this.ai.budget.reserve(tx, job.id, snapshot.documentSha256,a,h);
      return { job: await this.view(tx, a, h, job) };
    });
  }
  get(a: string, h: string, id: string, query: unknown) {
    uuid(id); object(query, []);
    return this.receipts.run(a, h, false, async tx => {
      const row = await tx.objectOnboardingJob.findFirst({ where: { id, accountId: a, homeId: h } });
      if (!row) throw deny();
      return { job: await this.view(tx, a, h, row) };
    });
  }

  /** Optional ID is used by isolated synthetic tests; the runtime drains the queue. */
  async claim(id?: string) {
    if (id) uuid(id);
    let settings;try{settings=this.ai.budget.config.settings();}catch(error){if(error instanceof ServiceUnavailableException)return null;throw error;}
    const eligible={provider:'anthropic',consentToProviderTransfer:true,...(settings.scope?{accountId:settings.scope.accountId,homeId:settings.scope.homeId}:{documentSha256:{in:settings.allowedDocumentHashes}}),attempt:{is:{campaignId:settings.campaign,model:settings.model}}};
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('onboarding:queue',0))::text AS locked`;
      const now = new Date();
      const expired = await tx.objectOnboardingJob.findFirst({ where: { ...eligible, ...(id ? { id } : {}), state: 'running', leaseUntil: { lte: now } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      if (expired) {
        const attempt = expired.provider === 'anthropic' ? await tx.objectOnboardingAttempt.findUnique({ where: { jobId: expired.id } }) : null;
        const unknown = attempt?.state === 'sending' || attempt?.state === 'uncertain';
        if (attempt?.state === 'reserved') await tx.objectOnboardingAttempt.update({ where: { id: attempt.id }, data: { state: 'released', actualMicroUsd: 0 } });
        if (attempt?.state === 'sending') await tx.objectOnboardingAttempt.update({ where: { id: attempt.id }, data: { state: 'uncertain' } });
        await tx.objectOnboardingJob.updateMany({ where: { id: expired.id, state: 'running', leaseToken: expired.leaseToken, leaseUntil: { lte: now } }, data: { state: unknown ? 'uncertain' : 'failed', errorCode: unknown ? 'analysis_outcome_unknown' : 'analysis_timeout', leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: now } });
      }
      if (await tx.objectOnboardingJob.count({ where: { state: 'running', leaseUntil: { gt: now } } }) >= ONBOARDING_JOB_LIMITS.workerConcurrency) return null;
      const queued = await tx.objectOnboardingJob.findFirst({ where: { ...eligible, ...(id ? { id } : {}), state: 'queued' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      if (!queued) return null;
      return tx.objectOnboardingJob.update({ where: { id: queued.id }, data: { state: 'running', leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + (queued.provider === 'anthropic' ? ONBOARDING_JOB_LIMITS.paidLeaseMs : ONBOARDING_JOB_LIMITS.leaseMs)), firstStartedAt: now, version: { increment: 1 }, updatedAt: now } });
    }, { timeout: 15000, maxWait: 15000 });
  }
  private async input(job: ObjectOnboardingJob) {
    if (job.provider === 'anthropic') this.ai.budget.requireSource(job.documentSha256,job.accountId,job.homeId);
    const key = await this.receipts.run(job.accountId, job.homeId, true, async tx => {
      const source = await this.receipts.source(tx, job.accountId, job.homeId, job.documentId, job);
      if (!source) throw deny();
      if (!['application/pdf','image/jpeg','image/png'].includes(source.original!.mimeType) || source.original!.byteSize > ANALYSIS_LIMITS.maxFileBytes) throw new ProviderFailure('analysis_limits_exceeded');
      const file = await tx.storedFile.findUnique({ where: { id: source.original!.fileId } });
      if (!file) throw new ProviderFailure('storage_unavailable');
      return file.storageKey;
    });
    return { snapshot: { documentId: job.documentId, documentVersion: job.documentVersion as 1, documentSha256: job.documentSha256 }, bytes: await this.storage.read(key), mimeType: job.mimeType };
  }
  async run(job: ObjectOnboardingJob) {
    let timer: NodeJS.Timeout | undefined;
    const abort = new AbortController();
    try {
      const owned = await this.db.objectOnboardingJob.findFirst({ where: { id: job.id, accountId: job.accountId, homeId: job.homeId, state: 'running', leaseToken: job.leaseToken, leaseUntil: { gt: new Date() } } });
      if (!owned) return;
      const stopAt = Math.min((job.firstStartedAt?.getTime() ?? 0) + (job.provider === 'anthropic' ? ONBOARDING_JOB_LIMITS.maxPaidRunMs : ONBOARDING_JOB_LIMITS.maxRunMs), job.leaseUntil?.getTime() ?? 0);
      const deadline = stopAt - Date.now();
      if (deadline <= 0 || job.state !== 'running' || !job.leaseToken) throw new ProviderFailure('analysis_timeout');
      const analyze = async () => {
        const input = await this.input(job);
        if (Date.now() >= stopAt) throw new ProviderFailure('analysis_timeout');
        if (job.provider === 'anthropic') return this.ai.analyze(job, input, abort.signal, action => this.receipts.run(job.accountId, job.homeId, true, async tx => {
          if (!await this.receipts.source(tx, job.accountId, job.homeId, job.documentId, job)) throw deny();
          return action(tx);
        }));
        throw new ProviderFailure('ai_provider_disabled');
      };
      const output = await Promise.race([
        analyze(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new ProviderFailure('analysis_timeout')); }, deadline); timer.unref(); }),
      ]);
      const draftId=randomUUID(),enrichments:Record<string,unknown>={};
      for(const item of output.items){
        const brand=item.fields.brand?.value,reference=item.fields.reference?.value;
        if(brand?.toLowerCase()!=='moulinex'||!reference||abort.signal.aborted||Date.now()+10000>=stopAt)continue;
        try {
          await this.receipts.run(job.accountId,job.homeId,true,async tx=>{if(!await this.receipts.source(tx,job.accountId,job.homeId,job.documentId,job))throw deny();});
          const found=await this.objects.manuals.lookup({brand,reference,productUrl:null},JSON.stringify([job.accountId,job.homeId,draftId,item.id,job.documentSha256]));
          const anchor=item.fields.reference!.source,profile=found.product?.capacityLitres?{capacityLitres:{value:found.product.capacityLitres,origin:'manufacturer_page',sources:[anchor],externalSource:{url:found.product.sourceUrl,checkedAt:found.product.checkedAt}}}:{};
          if(found.product||found.candidate)enrichments[item.id]={brand,reference,name:found.product?.name??null,profile,candidate:found.candidate};
        }catch{/* optional official lookup must not discard a valid document extraction */}
      }
      if(abort.signal.aborted||Date.now()>=stopAt)throw new ProviderFailure('analysis_timeout');
      await this.receipts.run(job.accountId, job.homeId, true, async tx => {
        await tx.$queryRaw`SELECT id FROM "ObjectOnboardingJob" WHERE id=${job.id} FOR UPDATE`;
        const current = await tx.objectOnboardingJob.findUnique({ where: { id: job.id } });
        if (!current || current.state !== 'running' || current.leaseToken !== job.leaseToken) return;
        if (!current.leaseUntil || current.leaseUntil.getTime() <= Date.now()) throw new ProviderFailure('analysis_timeout');
        if (!await this.receipts.source(tx, job.accountId, job.homeId, job.documentId, job)) throw deny();
        const draft = await tx.objectOnboardingDraft.create({ data: { id:draftId, accountId: job.accountId, homeId: job.homeId, documentId: job.documentId, documentVersion: job.documentVersion, documentSha256: job.documentSha256, mode: 'extraction', output: json({...output,enrichments}) } });
        await tx.objectOnboardingJob.update({ where: { id: job.id }, data: { state: 'succeeded', draftId: draft.id, errorCode: null, leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: new Date() } });
      });
    } catch (error) {
      const response = error instanceof HttpException ? error.getResponse() : null;
      const configuredCode = response && typeof response === 'object' && 'code' in response && ['ai_provider_disabled', 'ai_provider_unconfigured', 'ai_model_unavailable', 'onboarding_document_not_authorized'].includes(String(response.code)) ? String(response.code) : null;
      const code = error instanceof ForbiddenException ? 'access_revoked' : error instanceof ProviderFailure ? error.code : configuredCode ?? (error instanceof ServiceUnavailableException ? 'storage_unavailable' : 'analysis_unavailable');
      if (job.provider === 'anthropic') await this.ai.budget.fail(job.id);
      const attempt = job.provider === 'anthropic' ? await this.db.objectOnboardingAttempt.findUnique({ where: { jobId: job.id } }) : null;
      const unknown = attempt?.state === 'uncertain';
      await this.db.objectOnboardingJob.updateMany({ where: { id: job.id, state: 'running', leaseToken: job.leaseToken }, data: { state: unknown ? 'uncertain' : 'failed', errorCode: unknown ? (code==='provider_request_rejected'?code:'analysis_outcome_unknown') : code, leaseToken: null, leaseUntil: null, version: { increment: 1 }, updatedAt: new Date() } });
    } finally { abort.abort(); if (timer) clearTimeout(timer); }
  }
}
