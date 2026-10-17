import { Injectable } from '@nestjs/common';
import { Prisma, type ObjectOnboardingDraft } from '../../generated/client';
import { randomUUID } from 'node:crypto';
import { digest } from '../security';
import { object, uuid, version, invalid, conflict } from '../review/domain';
import { ActivityClock, temporal } from '../activities/domain';
import { EconomyPolicy } from '../economy/policy';
import { ExpensesService } from '../expenses/expenses.service';
import { ReviewService } from '../review/review.service';
import { HomeObjectsService } from '../home-objects/home-objects.service';
import { manualLookup } from '../home-objects/manuals';
import { ObjectOnboardingAccess, objectProfileView, onboardingDenied, type OnboardingTx } from './access';
import { onboardingConfirmation, requestKey, type OnboardingChoice, type HouseExpenseChoice } from './bodies';
import { proposedProfile, resolveProfile, type ObjectProfile } from './profile';
import type { ProductExtraction, ProductItem } from './domain';

export const onboardingJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
type Decision = { state: 'confirmed' | 'skipped' | 'deferred'; objectIds: string[]; expenseId: string | null; newObjects: number; newExpenses: number; allocation?: 'manual_item' };
type Decisions = Record<string, Decision>;
type Enrichment = { brand:string; reference:string; name: string | null; profile: ObjectProfile; candidate: { manual: unknown; token: string } | null };
type Output = ProductExtraction & { enrichments?: Record<string, Enrichment> };
const eq = (a: string, b: string) => a.normalize('NFC').trim().toLocaleLowerCase('it') === b.normalize('NFC').trim().toLocaleLowerCase('it');

@Injectable()
export class ObjectOnboardingService {
  constructor(readonly access: ObjectOnboardingAccess, private readonly objects: HomeObjectsService, private readonly reviewAccess: ReviewService, private readonly clock: ActivityClock) {}
  async project(tx: OnboardingTx, a: string, h: string, draft: ObjectOnboardingDraft, edit: boolean) {
    const source = await this.access.source(tx, a, h, draft.documentId, draft);
    if (!source) return { id: draft.id, version: draft.version, state: 'unavailable', snapshot: null, document: null, items: [], review: null, permissions: ['read'], purchaseTotal: null };
    const output = draft.output as unknown as Output, decisions = draft.decisions as Decisions;
    const items = await Promise.all(output.items.map(async item => {
      const choice = decisions[item.id], targets = [];
      for (const id of choice?.objectIds ?? []) {
        try { const target = await this.access.target(tx, a, h, id); targets.push({ id: target.id, name: target.name, version: target.version, state: target.state }); }
        catch { targets.push({ id: null, name: null, state: 'unavailable', version: null }); }
      }
      return { ...item, profile: { ...output.enrichments?.[item.id]?.profile, ...proposedProfile(item) }, enrichment: output.enrichments?.[item.id] ?? null, decision: choice ? { ...choice, expenseId:undefined, objectIds: undefined, objects: targets } : null };
    }));
    const review=await this.safeReview(tx,a,h,draft);
    return { id: draft.id, version: draft.version, state: draft.state, mode: draft.mode, snapshot: { documentId: draft.documentId, documentVersion: draft.documentVersion, sha256: draft.documentSha256 }, document: { id: source.id, name: source.name, mimeType: source.original!.mimeType }, documentKind: output.documentKind, items, needsReview: output.needsReview, purchaseTotal: output.purchaseTotal, houseExpenses:(output.houseExpenses??[]).map(item=>({...item,amountSelectionRequired:item.amountCandidates.some(a=>a.role==='arrears_balance')||item.amountCandidates.filter(a=>a.role==='current_document_total').length!==1,decision:decisions[item.id]?{state:decisions[item.id].state,newExpenses:decisions[item.id].newExpenses}:null})), review, permissions: edit ? ['read', 'edit'] : ['read'] };
  }
  private async safeReview(tx:OnboardingTx,a:string,h:string,draft:ObjectOnboardingDraft){
    if(!draft.review)return null;
    const saved=draft.review as {forms?:Record<string,Record<string,unknown>>;pending?:{path:string;key:string;body:unknown}},forms:Record<string,unknown>={};
    for(const [id,form] of Object.entries(saved.forms??{})){
      if(!form||typeof form!=='object'||Array.isArray(form))continue;
      const targets=[];
      for(const raw of Array.isArray(form.targets)?form.targets.slice(0,20):[]){try{const prior=raw as {id:string;version:number},target=await this.access.target(tx,a,h,prior.id);if(target.version!==prior.version||target.state!=='active')continue;const profile=await objectProfileView(tx,a,h,target.id,target.profile);if(profile.unavailable)continue;targets.push({id:target.id,name:target.name,version:target.version,profile,rooms:[],reason:'saved_selection'});}catch{/* a previously selected resource may no longer be readable */}}
      forms[id]={...form,targets};
    }
    let pending=saved.pending;
    if(pending){try{
      if(pending.path!=='/drafts/'+draft.id+'/confirmations')throw invalid();requestKey(pending.key);
      const body=onboardingConfirmation(pending.body,temporal(this.clock.now()).today);
      for(const c of body.choices)if(c.action==='link')for(const target of c.targets)await this.access.target(tx,a,h,target.id);
      for(const c of body.houseExpenses??[])if(c.confirmation?.mode==='link_existing')await new ExpensesService(this.access.db,this.reviewAccess,this.clock).record(tx,a,h,c.confirmation.expenseId);
      pending={...pending,body:pending.body};
    }catch{pending=undefined;}}
    return {forms,...(pending?{pending}:{})};
  }
  comparisonsFor(a:string,h:string,objectId:string,query:unknown){
    object(query,[]);return this.access.run(a,h,false,async tx=>{
      const target=await this.access.target(tx,a,h,objectId),current=await objectProfileView(tx,a,h,objectId,target.profile);
      const rows=await tx.objectOnboardingComparison.findMany({where:{accountId:a,homeId:h,objectId,state:'open'},orderBy:[{createdAt:'asc'},{id:'asc'}],take:50});
      const items=[];for(const row of rows){if(!await this.access.source(tx,a,h,row.documentId,row))continue;items.push({id:row.id,version:row.version,fieldKey:row.fieldKey,current:current.fields[row.fieldKey as keyof ObjectProfile]??null,proposed:row.proposed});}
      return {items};
    });
  }
  keepComparison(a:string,h:string,id:string,input:unknown,keyInput?:string){
    const r=object(input,['expectedVersion']),expectedVersion=version(r.expectedVersion),key=requestKey(keyInput),hash=digest(JSON.stringify({expectedVersion}));
    return this.access.run(a,h,true,async tx=>{
      const row=await tx.objectOnboardingComparison.findFirst({where:{id:uuid(id),accountId:a,homeId:h}});if(!row)throw onboardingDenied();
      await this.access.target(tx,a,h,row.objectId);if(!await this.access.source(tx,a,h,row.documentId,row))throw onboardingDenied();
      const lookup={accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'comparison-keep',target:id,key}},prior=await tx.objectOnboardingRequest.findUnique({where:lookup});
      if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata.');return {state:'kept'};}
      if(row.version!==expectedVersion||row.state!=='open')throw conflict('onboarding_comparison_changed','Il confronto è cambiato.');
      await tx.objectOnboardingComparison.update({where:{id},data:{state:'kept',version:{increment:1}}});
      await tx.objectOnboardingRequest.create({data:{...lookup.accountId_homeId_operation_target_key,digest:hash,response:{comparisonId:id}}});return {state:'kept'};
    });
  }
  getDraft(a: string, h: string, id: string, query: unknown) {
    object(query, []);
    return this.access.run(a, h, false, async (tx, edit) => ({ draft: await this.project(tx, a, h, await this.access.draft(tx, a, h, id), edit) }));
  }
  private async request(a: string, h: string, operation: string, target: string, input: unknown, keyInput: string | undefined, action: (tx: OnboardingTx) => Promise<{ draft: ObjectOnboardingDraft; result?: unknown }>) {
    const key = requestKey(keyInput), hash = digest(JSON.stringify(input));
    return this.access.run(a, h, true, async (tx, edit) => {
      const lookup = { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation, target, key } };
      const old = await tx.objectOnboardingRequest.findUnique({ where: lookup });
      if (old) {
        if (old.digest !== hash) throw conflict('idempotency_conflict', 'Chiave già usata per un’altra richiesta.');
        const saved = old.response as { draftId: string; result?: unknown }, draft = await this.access.draft(tx, a, h, saved.draftId);
        const projected = await this.project(tx, a, h, draft, edit);
        if (!projected.snapshot) throw onboardingDenied();
        return { draft: projected, result: saved.result ?? null };
      }
      const { draft, result } = await action(tx);
      await tx.objectOnboardingRequest.create({ data: { accountId: a, homeId: h, operation, target, key, digest: hash, response: onboardingJson({ draftId: draft.id, ...(result ? { result } : {}) }) } });
      return { draft: await this.project(tx, a, h, draft, edit), result: result ?? null };
    });
  }
  manualDraft(a: string, h: string, input: unknown, key?: string) {
    const r = object(input, ['documentId']), documentId = uuid(r.documentId);
    return this.request(a, h, 'manual', documentId, { documentId }, key, async tx => {
      const source = await this.access.source(tx, a, h, documentId); if (!source) throw onboardingDenied();
      const prior = await tx.objectOnboardingDraft.findFirst({ where: { accountId: a, homeId: h, documentId, documentVersion: source.original!.version, documentSha256: source.original!.sha256, state: 'open' }, orderBy: { createdAt: 'desc' } });
      if (prior) return { draft: prior };
      const fingerprint = digest('manual:' + source.original!.sha256 + ':1'), item: ProductItem = { id: digest(documentId + fingerprint), fingerprint, fields: {}, quantity: null, nameTruncated: false, disposition: 'uncertain' };
      const output: ProductExtraction = { documentKind: 'unsupported', items: [item], needsReview: true, purchaseTotal: null };
      return { draft: await tx.objectOnboardingDraft.create({ data: { accountId: a, homeId: h, documentId, documentVersion: source.original!.version, documentSha256: source.original!.sha256, mode: 'manual', output: onboardingJson(output) } }) };
    });
  }
  private async open(tx: OnboardingTx, a: string, h: string, id: string, expected: number) {
    const draft = await this.access.draft(tx, a, h, id);
    if (!await this.access.source(tx, a, h, draft.documentId, draft)) throw onboardingDenied();
    if (draft.version !== expected) throw conflict('onboarding_version_conflict', 'Le proposte sono cambiate. Ricaricale prima di confermare.');
    if (draft.state !== 'open') throw conflict('onboarding_state_conflict', 'Questo percorso è già concluso.'); return draft;
  }
  addItem(a: string, h: string, id: string, input: unknown, key?: string) {
    const r = object(input, ['expectedVersion']), expectedVersion = version(r.expectedVersion);
    return this.request(a, h, 'append', uuid(id), { expectedVersion }, key, async tx => {
      const draft = await this.open(tx, a, h, id, expectedVersion), output = draft.output as unknown as Output;
      if (output.items.length >= 20) throw invalid('Puoi gestire al massimo20articoli per documento.');
      const fingerprint = digest('manual:' + draft.documentSha256 + ':' + (output.items.length + 1));
      const item: ProductItem = { id: randomUUID(), fingerprint, fields: {}, quantity: null, nameTruncated: false, disposition: 'uncertain' };
      return { draft: await tx.objectOnboardingDraft.update({ where: { id }, data: { output: onboardingJson({ ...output, items: [...output.items, item] }), version: { increment: 1 } } }) };
    });
  }
  saveReview(a: string, h: string, id: string, input: unknown, key?: string) {
    const row = object(input, ['expectedVersion', 'review']), expectedVersion = version(row.expectedVersion);
    if (!row.review || typeof row.review !== 'object' || Array.isArray(row.review) || JSON.stringify(row.review).length > 100000) throw invalid();
    return this.request(a, h, 'review', uuid(id), { expectedVersion, review: row.review }, key, async tx => {
      await this.open(tx, a, h, id, expectedVersion);
      return { draft: await tx.objectOnboardingDraft.update({ where: { id }, data: { review: onboardingJson(row.review), version: { increment: 1 } } }) };
    });
  }
  recover(a: string, h: string, id: string, keyInput: string, query: unknown) {
    object(query, []); const key = requestKey(keyInput);
    return this.access.run(a, h, false, async (tx, edit) => {
      const draft = await this.access.draft(tx, a, h, id);
      if (!await this.access.source(tx, a, h, draft.documentId, draft)) throw onboardingDenied();
      const receipt = await tx.objectOnboardingRequest.findUnique({ where: { accountId_homeId_operation_target_key: { accountId: a, homeId: h, operation: 'confirm', target: id, key } } });
      return receipt ? { status: 'confirmed', draft: await this.project(tx, a, h, draft, edit), result: (receipt.response as { result?: unknown }).result ?? null } : { status: 'not_found' };
    });
  }

  async enrich(a: string, h: string, id: string, itemId: string, input: unknown) {
    const lookup = manualLookup(input);
    const captured = await this.access.run(a, h, true, async tx => {
      const draft = await this.access.draft(tx, a, h, id), output = draft.output as unknown as Output;
      if (!await this.access.source(tx, a, h, draft.documentId, draft)) throw onboardingDenied();
      const item = output.items.find(i => i.id === itemId); if (!item || draft.state !== 'open') throw invalid();
      return { draft, item };
    });
    const binding = JSON.stringify([a, h, id, itemId, captured.draft.documentSha256]);
    const result = await this.objects.manuals.lookup(lookup, binding);
    return this.access.run(a, h, true, async (tx, edit) => {
      const draft = await this.open(tx, a, h, id, captured.draft.version), output = draft.output as unknown as Output;
      const enrichment: Enrichment = { brand:lookup.brand,reference:lookup.reference,name: result.product?.name ?? null, profile: {}, candidate: result.candidate };
      const source = captured.item.fields.reference?.source ?? captured.item.fields.model?.source ?? captured.item.fields.brand?.source;
      if (result.product && source && result.product.capacityLitres) enrichment.profile.capacityLitres = { value: result.product.capacityLitres, origin: 'manufacturer_page', sources: [source], externalSource: { url: result.product.sourceUrl, checkedAt: result.product.checkedAt } };
      const next = await tx.objectOnboardingDraft.update({ where: { id }, data: { output: onboardingJson({ ...output, enrichments: { ...output.enrichments, [itemId]: enrichment } }), version: { increment: 1 } } });
      return { draft: await this.project(tx, a, h, next, edit), reason: result.reason };
    });
  }

  private async linkDocument(tx: OnboardingTx, a: string, h: string, objectId: string, documentId: string) {
    if (await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, objectId, documentId, resourceType: 'document', state: 'active' } })) return;
    const link = await tx.objectResourceLink.create({ data: { accountId: a, homeId: h, objectId, documentId, resourceType: 'document', resourceId: documentId } });
    await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: 'object', targetId: objectId, kind: 'linked', after: onboardingJson({ kind: 'link', row: link, subjectKind: 'object', subjectId: objectId }) } });
  }
  private async storeBasicFields(tx: OnboardingTx, a: string, h: string, objectId: string, fields: ObjectProfile) {
    for (const fieldKey of ['brand', 'model'] as const) {
      const field = fields[fieldKey]; if (!field) continue;
      const existing = await tx.receiptObjectField.findUnique({ where: { objectId_fieldKey: { objectId, fieldKey } } }); if (existing&&existing.value===field.value) continue;
      const source = field.sources[0];
      await tx.receiptObjectField.upsert({where:{objectId_fieldKey:{objectId,fieldKey}},update:{value:field.value,origin:field.origin==='user_declared'?'user_declared':'extraction_confirmed',sources:onboardingJson(field.sources),documentId:source?.documentId??null,documentVersion:source?.documentVersion??null,documentSha256:source?.sha256??null},create: { accountId: a, homeId: h, objectId, fieldKey, value: field.value, origin: field.origin === 'user_declared' ? 'user_declared' : 'extraction_confirmed', sources: onboardingJson(field.sources), ...(source ? { documentId: source.documentId, documentVersion: source.documentVersion, documentSha256: source.sha256 } : {}) } });
    }
  }
  private async comparisons(tx: OnboardingTx, a: string, h: string, draft: ObjectOnboardingDraft, objectId: string, deferred: ObjectProfile) {
    for (const [fieldKey, proposed] of Object.entries(deferred)) {
      const fingerprint = digest(JSON.stringify([draft.documentSha256, fieldKey, proposed.value]));
      const lookup = { accountId_homeId_objectId_fieldKey_fingerprint: { accountId: a, homeId: h, objectId, fieldKey, fingerprint } };
      if (await tx.objectOnboardingComparison.findUnique({ where: lookup })) continue;
      await tx.objectOnboardingComparison.create({ data: { ...lookup.accountId_homeId_objectId_fieldKey_fingerprint, draftId: draft.id, documentId: draft.documentId, documentVersion: draft.documentVersion, documentSha256: draft.documentSha256, proposed: onboardingJson(proposed) } });
    }
  }
  private async cost(tx: OnboardingTx, a: string, h: string, draft: ObjectOnboardingDraft, output: Output, choice: Extract<OnboardingChoice, { action: 'create' | 'link' }>, targetId: string, currentDecisions: Decisions) {
    if (choice.expense.action === 'skip') return { expenseId: null, newExpenses: 0 };
    if (output.documentKind !== 'purchase_document') throw invalid('I costi di questo documento richiedono una scelta separata in Spese. Nessun importo viene distribuito automaticamente.');
    const expenses = new ExpensesService(this.access.db, this.reviewAccess, this.clock);
    if (choice.expense.action === 'link') {
      const value = await expenses.record(tx, a, h, choice.expense.id);
      if(value.assetId)throw conflict('expense_object_conflict','La spesa è già associata a un impianto.');
      if (value.version !== choice.expense.expectedVersion || value.state !== 'active') throw conflict('expense_version_conflict', 'La spesa è cambiata.');
      if (value.documentId && value.documentId !== draft.documentId) {
        const existing = await this.access.source(tx, a, h, value.documentId);
        if (!existing || existing.original!.sha256 !== draft.documentSha256) throw conflict('expense_document_conflict', 'La spesa ha un altro documento.');
      }
      const linked = await tx.objectResourceLink.findFirst({ where: { accountId: a, homeId: h, expenseId: value.id, state: 'active', objectId: { not: targetId } } });
      if (linked) throw conflict('expense_object_conflict', 'La spesa è già collegata a un altro oggetto.');
      await expenses.mutateInTransaction(tx, a, h, 'update', value.id, { expectedVersion: value.version, documentId: value.documentId ?? draft.documentId, objectRef: { kind: 'object', id: targetId } }, 'onboarding_' + digest(draft.id + ':' + choice.itemId + ':expense-link'), true);
      return { expenseId: value.id, newExpenses: 0 };
    }
    const split=output.items.length>1;
    if(split&&(!choice.expense.manualItemAmount||!output.purchaseTotal))throw invalid('Indica e conferma il prezzo del solo articolo. Il totale documento deve essere disponibile.');
    const existing = await tx.$queryRaw<Array<{ id: string }>>`SELECT e.id FROM "HomeExpense" e JOIN "DocumentVersion" v ON v."documentId"=e."documentId" JOIN "Document" d ON d.id=v."documentId" WHERE e."accountId"=${a} AND e."homeId"=${h} AND v.sha256=${draft.documentSha256} AND (d.visibility::text='home' OR d."uploaderId"=${a}) LIMIT 1`;
    if (existing.length&&!split) throw conflict('onboarding_expense_exists', 'Esiste già un costo per questa ricevuta: scegli quello esistente.');
    if(split){
      const costs=await tx.$queryRaw<Array<{id:string;amountCents:number;sameTarget:boolean}>>`SELECT DISTINCT e.id,e."amountCents",EXISTS(SELECT 1 FROM "ObjectResourceLink" l WHERE l."expenseId"=e.id AND l."objectId"=${targetId} AND l.state='active') AS "sameTarget" FROM "HomeExpense" e JOIN "DocumentVersion" v ON v."documentId"=e."documentId" JOIN "Document" d ON d.id=v."documentId" WHERE e."accountId"=${a} AND e."homeId"=${h} AND v.sha256=${draft.documentSha256} AND (d.visibility::text='home' OR d."uploaderId"=${a})`;
      const prior=await tx.objectOnboardingDraft.findMany({where:{accountId:a,homeId:h,documentSha256:draft.documentSha256},select:{decisions:true}});
      const allocated=new Set([...prior.flatMap(row=>Object.values(row.decisions as Decisions)),...Object.values(currentDecisions)].filter(d=>d.allocation==='manual_item').map(d=>d.expenseId));
      if(costs.some(c=>c.sameTarget||!allocated.has(c.id)))throw conflict('onboarding_expense_exists','Questo documento ha già un costo per l’oggetto oppure un totale non ripartito. Collega la spesa esistente.');
      if(costs.reduce((n,c)=>n+c.amountCents,0)+choice.expense.amountCents>output.purchaseTotal!.amountCents)throw invalid('La somma delle quote supera il totale del documento. Nessun importo viene attribuito automaticamente.');
    }
    const possible = await tx.$queryRaw<Array<{id:string}>>`SELECT e.id FROM "HomeExpense" e LEFT JOIN "Document" d ON d.id=e."documentId" WHERE e."accountId"=${a} AND e."homeId"=${h} AND e.state='active' AND e."amountCents"=${choice.expense.amountCents} AND e."spentOn"=${choice.expense.spentOn} AND (e."documentId" IS NULL OR (d."homeId"=${h} AND (d.visibility::text='home' OR d."uploaderId"=${a}))) LIMIT 1`;
    if (possible.length && !choice.expense.acknowledgePossibleDuplicate) throw conflict('onboarding_possible_expense_duplicate', 'Esiste una spesa con lo stesso importo e data: collegala oppure verifica che sia un acquisto distinto.');
    const values = {title:choice.expense.title,amountCents:choice.expense.amountCents,spentOn:choice.expense.spentOn,supplier:choice.expense.supplier};
    const result = await expenses.mutateInTransaction(tx, a, h, 'create', '', { ...values, category: 'purchase_replacement', documentId: draft.documentId, objectRef: { kind: 'object', id: targetId } }, 'onboarding_' + digest(draft.id + ':' + choice.itemId + ':expense-create'), true);
    return { expenseId: result.expense.id, newExpenses: 1, ...(split?{allocation:'manual_item' as const}:{}) };
  }

  private async houseCost(tx:OnboardingTx,a:string,h:string,draft:ObjectOnboardingDraft,item:NonNullable<ProductExtraction['houseExpenses']>[number],selected:HouseExpenseChoice){
    const c=selected.confirmation;if(!c)throw invalid();const expenses=new ExpensesService(this.access.db,this.reviewAccess,this.clock);
    if(c.mode==='link_existing'){
      const row=await expenses.record(tx,a,h,c.expenseId);if(row.version!==c.expectedExpenseVersion||row.state!=='active')throw conflict('expense_version_conflict','Rileggi la spesa.');
      if(row.assetId||row.workId||await tx.objectResourceLink.count({where:{expenseId:row.id,state:'active'}}))throw invalid('Questa spesa è già collegata a un oggetto.');
      if(row.documentId){await expenses.documentLink(tx,a,h,row.documentId,true);if(row.documentId!==draft.documentId){const original=await tx.documentVersion.findFirst({where:{documentId:row.documentId,sha256:draft.documentSha256}});if(!original)throw conflict('expense_document_conflict','La spesa ha già un altro documento.');}}
      else await expenses.mutateInTransaction(tx,a,h,'update',row.id,{expectedVersion:row.version,documentId:draft.documentId},'onboarding_'+digest(draft.id+':'+item.id+':home-link'),true);
      return {expenseId:row.id,newExpenses:0};
    }
    const candidate=c.amountSelection.mode==='candidate'?item.amountCandidates.find(x=>x.id===c.amountSelection.candidateId):null;
    if(c.amountSelection.mode==='candidate'&&(!candidate||candidate.amountCents!==c.values.amountCents||!['current_document_total','amount_due'].includes(candidate.role)))throw invalid('Controlla il totale di questa bolletta.');
    const sameSource=await tx.$queryRaw<Array<{id:string}>>`SELECT e.id FROM "HomeExpense" e JOIN "Document" d ON d.id=e."documentId" JOIN "DocumentVersion" v ON v."documentId"=d.id WHERE e."accountId"=${a} AND e."homeId"=${h} AND (d.visibility::text='home' OR d."uploaderId"=${a}) AND v.sha256=${draft.documentSha256} AND (e."documentNumber" IS NOT DISTINCT FROM ${c.values.documentNumber??null}::text OR e."amountCents"=${c.values.amountCents}) LIMIT 1`;
    if(sameSource.length)throw conflict('onboarding_expense_exists','Questo documento ha già una spesa: collega quella esistente.');
    const similar=await tx.homeExpense.findMany({where:{accountId:a,homeId:h,state:'active',OR:[{amountCents:Number(c.values.amountCents),spentOn:String(c.values.spentOn)},...(c.values.documentNumber&&c.values.supplier?[{documentNumber:c.values.documentNumber,supplier:c.values.supplier}]:[])]},select:{id:true,documentId:true}});
    let duplicate=false;for(const row of similar){if(!row.documentId||(await expenses.documentLink(tx,a,h,row.documentId)).state==='linked')duplicate=true;}
    if(duplicate&&!selected.acknowledgePossibleDuplicate)throw conflict('onboarding_possible_expense_duplicate','C’è una spesa simile: controlla prima di registrare un costo distinto.');
    const created=await expenses.mutateInTransaction(tx,a,h,'create','',{...c.values,objectRef:null,workId:null,documentId:draft.documentId},'onboarding_'+digest(draft.id+':'+item.id+':home-create'),true);
    const provenance=Object.fromEntries(Object.entries(c.values).filter(([key])=>!['objectRef','workId'].includes(key)).map(([key,value])=>[key,{origin:key==='amountCents'&&candidate||item.proposedFields[key]?.value===value?'extraction_confirmed':'user_declared',sources:key==='amountCents'&&candidate?candidate.sources:item.proposedFields[key]?.value===value?item.proposedFields[key].sources:[]} ]));
    const expense=await tx.homeExpense.update({where:{id:created.expense.id},data:{amountOrigin:candidate?'extraction_confirmed':'user_declared',economicProvenance:onboardingJson(provenance)}});
    const saved=await new EconomyPolicy(this.reviewAccess).saved(tx,expense);
    await tx.expenseHistory.updateMany({where:{expenseId:expense.id,kind:'created'},data:{after:onboardingJson(saved)}});
    await tx.expenseRequest.updateMany({where:{accountId:a,homeId:h,operation:'economy:create',key:'onboarding_'+digest(draft.id+':'+item.id+':home-create')},data:{response:onboardingJson(saved)}});
    return {expenseId:created.expense.id,newExpenses:1};
  }

  confirm(a: string, h: string, id: string, input: unknown, key?: string) {
    const body = onboardingConfirmation(input, temporal(this.clock.now()).today);
    return this.request(a, h, 'confirm', uuid(id), body, key, async tx => {
      const draft = await this.open(tx, a, h, id, body.expectedVersion), output = draft.output as unknown as Output, decisions = { ...draft.decisions as Decisions };
      if (body.source.documentId !== draft.documentId || body.source.documentVersion !== draft.documentVersion || body.source.sha256 !== draft.documentSha256) throw conflict('onboarding_source_changed', 'La fonte è cambiata.');
      const initialSourceLinks = await tx.$queryRaw<Array<{ id: string }>>`SELECT l.id FROM "ObjectResourceLink" l JOIN "Document" d ON d.id=l."documentId" JOIN "DocumentVersion" v ON v."documentId"=d.id WHERE l."accountId"=${a} AND l."homeId"=${h} AND l."resourceType"='document' AND l.state='active' AND v.sha256=${draft.documentSha256} AND (d.visibility::text='home' OR d."uploaderId"=${a}) LIMIT 1`;
      const used = new Set<string>(); let newObjects = 0, newExpenses = 0;
      for (const choice of body.choices) {
        const item = output.items.find(item => item.id === choice.itemId);
        if (!item || decisions[item.id]?.state === 'confirmed' || decisions[item.id]?.state === 'skipped') throw conflict('onboarding_item_resolved', 'Uno degli articoli è già stato gestito.');
        if (choice.action === 'skip' || choice.action === 'defer') { decisions[item.id] = { state: choice.action === 'skip' ? 'skipped' : 'deferred', objectIds: [], expenseId: null, newObjects: 0, newExpenses: 0 }; continue; }
        const quantity = item.quantity?.value ?? 1;
        if (choice.action === 'create' && item.disposition !== 'household_object' && !choice.confirmHouseholdObject) throw invalid('Conferma che vuoi creare una scheda anche per questo articolo da verificare.');
        if (choice.action === 'create' && choice.unitNames.length && choice.unitNames.length !== quantity || choice.action === 'link' && choice.targets.length !== quantity) throw invalid('Scegli esplicitamente una scheda per ogni esemplare.');
        if (quantity > 1 && choice.expense.action !== 'skip') throw invalid('Il costo di più esemplari va controllato separatamente in Spese.');
        const previous = await tx.objectOnboardingBinding.findMany({ where: { accountId: a, homeId: h, fingerprint: item.fingerprint } });
        if (choice.action === 'create' && previous.length) throw conflict('onboarding_object_exists', 'Questo articolo è già stato censito. Collega la scheda esistente.');
        if (choice.action === 'create' && initialSourceLinks.length && !choice.acknowledgeExistingSource) throw conflict('onboarding_source_already_linked', 'Il documento è già collegato a oggetti. Controlla le schede esistenti prima di crearne una nuova.');
        const proposals = { ...output.enrichments?.[item.id]?.profile, ...proposedProfile(item) }, objectIds: string[] = [];
        for (let unit = 0; unit < quantity; unit++) {
          let target;
          if (choice.action === 'create') {
            newObjects++; if (newObjects > 20) throw invalid('Conferma al massimo20esemplari alla volta.');
            for (const roomId of choice.roomIds) { const room = await tx.homeRoom.findFirst({ where: { id: roomId, homeId: h, state: 'active' } }); if (!room) throw onboardingDenied(); }
            const name = choice.unitNames[unit] ?? (quantity === 1 ? choice.name : [...choice.name].slice(0, 110).join('') + ` (${unit + 1}/${quantity})`);
            target = await tx.homeObject.create({ data: { accountId: a, homeId: h, name, type: choice.type } });
            if (choice.roomIds.length) await tx.objectPosition.create({ data: { accountId: a, homeId: h, objectId: target.id, roomIds: choice.roomIds } });
            const originalName = item.fields.name;
            await tx.receiptObjectField.create({ data: { accountId: a, homeId: h, objectId: target.id, fieldKey: 'name', value: name, origin: originalName?.value === name ? 'extraction_confirmed' : 'user_declared', sources: onboardingJson(originalName?.value === name ? [originalName.source] : []), ...(originalName?.value === name ? { documentId: draft.documentId, documentVersion: draft.documentVersion, documentSha256: draft.documentSha256 } : {}) } });
          } else {
            target = await this.access.target(tx, a, h, choice.targets[unit].id);
            if (target.state !== 'active' || target.version !== choice.targets[unit].expectedVersion) throw conflict('onboarding_target_changed', 'Una scheda è cambiata o è archiviata. Rileggila.');
          }
          if (used.has(target.id)) throw invalid('Controlla l’associazione di più articoli alla stessa scheda.'); used.add(target.id);
          const current = await objectProfileView(tx, a, h, target.id, target.profile);
          if (current.unavailable) throw onboardingDenied();
          const resolved = resolveProfile(current.fields, proposals, choice.fields), changed = JSON.stringify(resolved.fields) !== JSON.stringify(current.fields);
          const enriched=output.enrichments?.[item.id];
          if(enriched&&Object.entries(choice.fields).some(([key,decision])=>['accept','replace'].includes(decision.action)&&proposals[key as keyof ObjectProfile]?.origin==='manufacturer_page')&&(!eq(resolved.fields.brand?.value??'',enriched.brand)||!eq(resolved.fields.reference?.value??resolved.fields.model?.value??'',enriched.reference)))throw invalid('I dati ufficiali riguardano un altro riferimento. Controlla marca e riferimento prima di accettarli.');
          let manual = target.manual;
          if (choice.manual && choice.manual.mode !== 'remove') {
            const selected = choice.manual.mode === 'manual' ? choice.manual.manual : this.objects.manuals.accept(choice.manual.token, JSON.stringify([a, h, id, item.id, draft.documentSha256]));
            const brand = resolved.fields.brand?.value, reference = resolved.fields.reference?.value ?? resolved.fields.model?.value;
            if (brand && !eq(brand, selected.brand) || reference && !eq(reference, selected.reference)) throw invalid('Il manuale riguarda un altro riferimento. Controlla il modello.');
            if (target.manual && (target.manual as { url?: string }).url !== selected.url) throw conflict('onboarding_manual_exists', 'La scheda ha già un manuale: puoi modificarlo dalla scheda.');
            manual = onboardingJson({ ...selected, boundVersion: target.version + Number(choice.action === 'link') }) as Prisma.JsonValue;
          }
          for(const date of ['purchaseDate','deliveredDate'] as const)if(resolved.fields[date]&&resolved.fields[date]!.value>temporal(this.clock.now()).today)throw invalid('Acquisto e consegna effettiva non possono essere futuri.');
          const before = target;
          if (changed || choice.manual || choice.action === 'create') target = await tx.homeObject.update({ where: { id: target.id }, data: { profile: onboardingJson(resolved.fields), manual: manual ?? Prisma.DbNull, ...(choice.action === 'link' ? { version: { increment: 1 } } : {}) } });
          await this.storeBasicFields(tx, a, h, target.id, resolved.fields);
          await this.comparisons(tx, a, h, draft, target.id, resolved.deferred);
          await this.linkDocument(tx, a, h, target.id, draft.documentId);
          const bound = previous.find(row => row.unitIndex === unit);
          if (bound && bound.objectId !== target.id) throw conflict('onboarding_binding_conflict', 'L’articolo risulta già associato a un’altra scheda.');
          if (!bound) await tx.objectOnboardingBinding.create({ data: { accountId: a, homeId: h, documentId: draft.documentId, documentVersion: draft.documentVersion, documentSha256: draft.documentSha256, fingerprint: item.fingerprint, unitIndex: unit, objectId: target.id } });
          const position=await tx.objectPosition.findUnique({where:{objectId:target.id}});
          await tx.objectEvent.create({ data: { accountId: a, homeId: h, targetKind: 'object', targetId: target.id, kind: choice.action === 'create' ? 'created' : 'onboarding_confirmed', before: choice.action === 'create' ? Prisma.JsonNull : onboardingJson({ kind: 'object', row: before, position }), after: onboardingJson({ kind: 'object', row: target, position }) } });
          objectIds.push(target.id);
        }
        const cost = await this.cost(tx, a, h, draft, output, choice, objectIds[0], decisions); newExpenses += cost.newExpenses;
        decisions[item.id] = { state: 'confirmed', objectIds, ...cost, newObjects: choice.action === 'create' ? quantity : 0 };
      }
      for(const selected of body.houseExpenses??[]){
        const item=output.houseExpenses?.find(x=>x.id===selected.itemId);if(!item||['confirmed','skipped'].includes(decisions[selected.itemId]?.state))throw conflict('onboarding_item_resolved','Questa proposta è già stata gestita.');
        if(selected.action==='skip'||selected.action==='defer'){decisions[item.id]={state:selected.action==='skip'?'skipped':'deferred',objectIds:[],expenseId:null,newObjects:0,newExpenses:0};continue;}
        const result=await this.houseCost(tx,a,h,draft,item,selected);newExpenses+=result.newExpenses;decisions[item.id]={state:'confirmed',objectIds:[],newObjects:0,...result};
      }
      const complete = [...output.items,...(output.houseExpenses??[])].every(item => ['confirmed', 'skipped'].includes(decisions[item.id]?.state));
      return { draft: await tx.objectOnboardingDraft.update({ where: { id }, data: { decisions: onboardingJson(decisions), review: onboardingJson({forms:Object.fromEntries(Object.entries((draft.review as {forms?:Record<string,unknown>}|null)?.forms??{}).filter(([key])=>!body.choices.some(c=>c.itemId===key&&c.action!=='defer')))}), state: complete ? 'confirmed' : 'open', version: { increment: 1 } } }), result: { newObjects, newExpenses } };
    });
  }
}
