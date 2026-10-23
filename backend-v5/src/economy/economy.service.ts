import {referenceDate,referenceDateSql} from './reference-period';
import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { Prisma, type HomeExpense, type EconomicWork } from '../../generated/client';
import { ExpensesService } from '../expenses/expenses.service';
import { ReviewService } from '../review/review.service';
import { calendar } from '../activities/domain';
import { digest } from '../security';
import { invalid, object, uuid, version, conflict } from '../review/domain';
import { categories, categoryLabels, comparisonPeriod, economyQuery, families, family, familyLabels, pageQuery, percent, text, workBody, type Category } from './domain';
import { EconomyPolicy } from './policy';
import { EconomicAiBudget } from './ai-budget';
import { readableReceiptName } from '../receipt-assistance/access';
type Tx=Prisma.TransactionClient;
type Query=ReturnType<typeof economyQuery>;
type Anchor={b:string;i:string;t:string;d?:string};
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const literal=(value:string)=>'%'+value.replace(/[\\%_]/g,c=>'\\'+c)+'%';

@Injectable()
export class EconomyService {
  private readonly policy:EconomyPolicy;
  constructor(private readonly expenses:ExpensesService,access:ReviewService,@Optional() private readonly ai?:EconomicAiBudget){this.policy=new EconomyPolicy(access);}
  private cursor(input:string|undefined,b:string,dates=false):Anchor|null {
    if(!input)return null;
    try {
      const row=object(JSON.parse(Buffer.from(input,'base64url').toString('utf8')),dates?['b','i','t','d']:['b','i','t']);
      if(row.b!==b||typeof row.t!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.t)||new Date(row.t).toISOString()!==row.t||dates&&(typeof row.d!=='string'||!/^\d{4}-\d\d-\d\d$/.test(row.d)))throw invalid();
      if(dates&&!calendar(row.d))throw invalid();
      return {b,i:uuid(row.i),t:row.t,...(dates?{d:String(row.d)}:{})};
    }catch{throw invalid('Pagina non valida.');}
  }
  private encode(b:string,row:{id:string;createdAt?:Date;at?:Date;spentOn?:string}){return Buffer.from(JSON.stringify({b,i:row.id,t:(row.createdAt??row.at)!.toISOString(),...(row.spentOn?{d:row.spentOn}:{})})).toString('base64url');}
  async capabilities(a:string,h:string,input:unknown){object(input,[]);return this.expenses.read(a,h,async(_tx,_edit,context)=>({...context,apiVersion:'economy-v1',enabled:true,isSimulation:false,currency:'EUR',features:{history:true,works:true,documentDrafts:true},limits:{titleMaxCodePoints:120,noteMaxCodePoints:500,amountMaxCents:999999999,maxPageSize:50},
    categories:categories.map((code,i)=>({code,label:categoryLabels[i],possibleFamilies:code==='repairs_works'?['maintenance_repairs','works_purchases']:[family(code,null)]})),families:families.map((code,i)=>({code,label:familyLabels[i]})),analysis:{enabled:true,disabledReason:null,providers:[{id:'test_fixture_v1',label:'Analisi di test · solo PDF sintetici S1',enabled:true,disabledReason:null,isSimulation:true,model:null},this.ai?await this.ai.descriptor(_tx):{id:'anthropic',label:'Anthropic',enabled:false,disabledReason:'ai_provider_disabled',isSimulation:false,model:null}]}}));}
  async get(a:string,h:string,id:string,q:unknown){object(q,[]);uuid(id);return this.expenses.read(a,h,async(tx,edit)=>({expense:await this.expenses.project(tx,await this.expenses.record(tx,a,h,id),edit,true)}));}
  create(a:string,h:string,b:unknown,k?:string){return this.expenses.mutate(a,h,'create','',b,k,true);}
  update(a:string,h:string,id:string,b:unknown,k?:string){return this.expenses.mutate(a,h,'update',id,b,k,true);}
  action(a:string,h:string,id:string,op:'archive'|'restore',b:unknown,k?:string){return this.expenses.mutate(a,h,op,id,b,k,true);}
  history(a:string,h:string,id:string,q:unknown){return this.expenses.history(a,h,id,q,true);}
  private async references(tx:Tx,a:string,h:string,q:Query){
    if(q.objectRef&&!await this.policy.subject(tx,a,h,q.objectRef))throw new ForbiddenException('Accesso non consentito.');
    if(q.workId&&!await this.policy.work(tx,a,h,q.workId))throw new ForbiddenException('Accesso non consentito.');
    if(q.documentId)await this.expenses.documentLink(tx,a,h,q.documentId,true);
    if(q.roomId&&!await tx.homeRoom.findFirst({where:{id:q.roomId,homeId:h}}))throw new ForbiddenException('Accesso non consentito.');
  }
  private readableBoiler(a:string,h:string,id:Prisma.Sql){return Prisma.sql`EXISTS (SELECT 1 FROM "BoilerAsset" b WHERE b.id=${id} AND b."accountId"=${a} AND b."homeId"=${h} AND NOT EXISTS (
    SELECT 1 FROM "AnalysisJob" j CROSS JOIN LATERAL jsonb_array_elements(j.documents) s
    LEFT JOIN "Document" d ON d.id=s->>'documentId' LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
    WHERE j."assetId"=b.id AND j.state='succeeded' AND (d.id IS NULL OR d."homeId"<>${h} OR NOT(d."trashedAt" IS NULL AND (d."trashedAt" IS NULL AND (d.visibility::text='home' OR d."uploaderId"=${a}))) OR v.id IS NULL OR v.version::text<>s->>'documentVersion' OR v.sha256<>s->>'documentSha256')
  ))`;}
  private where(a:string,h:string,q:Query){
    const parts:Prisma.Sql[]=[Prisma.sql`e."accountId"=${a}`,Prisma.sql`e."homeId"=${h}`,Prisma.sql`${referenceDateSql}>=${q.from} AND ${referenceDateSql}<=${q.to}`];
    if(q.state!=='all')parts.push(Prisma.sql`e.state::text=${q.state}`);
    if(q.source==='manual')parts.push(Prisma.sql`e."documentId" IS NULL`);else if(q.source==='document')parts.push(Prisma.sql`e."documentId" IS NOT NULL`);
    if(q.category)parts.push(q.category==='unclassified'?Prisma.sql`e.category IS NULL`:Prisma.sql`e.category=${q.category}`);
    if(q.family){const codes=categories.filter(c=>family(c,null)===q.family||c==='repairs_works'&&q.family==='works_purchases');const conditions=codes.map(c=>c==='repairs_works'?Prisma.sql`(e.category=${c} AND e."workId" IS ${q.family==='works_purchases'?Prisma.sql`NOT NULL`:Prisma.sql`NULL`})`:Prisma.sql`e.category=${c}`);if(q.family==='unclassified')conditions.push(Prisma.sql`e.category IS NULL`);parts.push(Prisma.sql`(${Prisma.join(conditions,' OR ')})`);}
    if(q.q)parts.push(Prisma.sql`(e.title ILIKE ${literal(q.q)} OR e.supplier ILIKE ${literal(q.q)})`);
    if(q.workId)parts.push(Prisma.sql`e."workId"=${q.workId}`);
    if(q.documentId)parts.push(Prisma.sql`e."documentId"=${q.documentId}`);
    if(q.objectRef){const r=q.objectRef;parts.push(Prisma.sql`(${r.kind==='boiler'?Prisma.sql`e."assetId"=${r.id}`:Prisma.sql`FALSE`} OR EXISTS(SELECT 1 FROM "ObjectResourceLink" l WHERE l."expenseId"=e.id AND l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND ${r.kind==='object'?Prisma.sql`l."objectId"=${r.id}`:Prisma.sql`l."boilerId"=${r.id}`}))`);}
    if(q.roomId)parts.push(Prisma.sql`EXISTS(SELECT 1 FROM "ObjectPosition" p WHERE p."accountId"=${a} AND p."homeId"=${h} AND p."roomIds" ? ${q.roomId} AND (
      (p."boilerId"=e."assetId" AND ${this.readableBoiler(a,h,Prisma.sql`p."boilerId"`)}) OR EXISTS(SELECT 1 FROM "ObjectResourceLink" l WHERE l."expenseId"=e.id AND l."accountId"=${a} AND l."homeId"=${h} AND l.state='active' AND ((l."objectId"=p."objectId" AND EXISTS(SELECT 1 FROM "HomeObject" o WHERE o.id=p."objectId" AND o."accountId"=${a} AND o."homeId"=${h} AND ${readableReceiptName(a,h)})) OR (l."boilerId"=p."boilerId" AND ${this.readableBoiler(a,h,Prisma.sql`p."boilerId"`)})))
    ))`);
    return Prisma.join(parts,' AND ');
  }
  async list(a:string,h:string,input:unknown){return this.expenses.read(a,h,async(tx,edit,context)=>{const q=economyQuery(input,context.today),b=digest(JSON.stringify([a,h,'economy-expenses-reference-v2',{...q,limit:undefined,cursor:undefined}])),anchor=this.cursor(q.cursor,b,true);await this.references(tx,a,h,q);
    const rows=await tx.$queryRaw<HomeExpense[]>(Prisma.sql`SELECT e.* FROM "HomeExpense" e WHERE ${this.where(a,h,q)} ${anchor?Prisma.sql`AND (${referenceDateSql},e."createdAt",e.id)<(${anchor.d},${anchor.t}::timestamp,${anchor.i})`:Prisma.sql``} ORDER BY ${referenceDateSql} DESC,e."createdAt" DESC,e.id DESC LIMIT ${q.limit+1}`);
    const page=rows.slice(0,q.limit);return {items:await Promise.all(page.map(row=>this.expenses.project(tx,row,edit,true))),nextCursor:rows.length>q.limit?this.encode(b,{...page.at(-1)!,spentOn:referenceDate(page.at(-1)!)}):null};});}
  private async totals(tx:Tx,a:string,h:string,q:Query){
    const rows=await tx.$queryRaw<{category:Category|null;hasWork:boolean;count:string;total:string}[]>(Prisma.sql`SELECT e.category,(e."workId" IS NOT NULL) AS "hasWork",COUNT(*)::text AS count,COALESCE(SUM(e."amountCents"::bigint),0)::text AS total FROM "HomeExpense" e WHERE ${this.where(a,h,q)} GROUP BY e.category,(e."workId" IS NOT NULL)`);
    const byCategory=[...categories,null].map(category=>({category,count:0,totalCents:'0'})),byFamily=families.map(family=>({family,count:0,totalCents:'0'}));let total=0n,count=0;
    for(const row of rows){const amount=BigInt(row.total),rowCount=Number(row.count),c=byCategory.find(x=>x.category===row.category)!,f=byFamily.find(x=>x.family===family(row.category,row.hasWork?'linked':null))!;if(!Number.isSafeInteger(rowCount))throw Error('Conteggio fuori limite.');c.count+=rowCount;c.totalCents=(BigInt(c.totalCents)+amount).toString();f.count+=rowCount;f.totalCents=(BigInt(f.totalCents)+amount).toString();count+=rowCount;total+=amount;}
    if(!Number.isSafeInteger(count))throw Error('Conteggio fuori limite.');return {count,totalCents:total.toString(),totalWithoutFinancingCents:(total-BigInt(byFamily.find(f=>f.family==='financing')!.totalCents)).toString(),byCategory,byFamily};
  }
  async summary(a:string,h:string,input:unknown){return this.expenses.read(a,h,async(tx,_edit,context)=>{const q=economyQuery(input,context.today,true);await this.references(tx,a,h,q);const totals=await this.totals(tx,a,h,q),prior=comparisonPeriod(q.from,q.to);let comparison;
    if(!prior)comparison={status:'unavailable',period:null,count:null,totalCents:null,deltaCents:null,deltaPercentHundredths:null,calendarAdjustment:'none'};
    else {const old=await this.totals(tx,a,h,{...q,from:prior.from,to:prior.to}),delta=BigInt(totals.totalCents)-BigInt(old.totalCents);comparison={status:old.count?'comparable':'no_previous_records',period:{from:prior.from,to:prior.to},count:old.count,totalCents:old.totalCents,deltaCents:delta.toString(),deltaPercentHundredths:percent(delta,BigInt(old.totalCents)),calendarAdjustment:prior.calendarAdjustment};}
    return {...context,period:{from:q.from,to:q.to,basis:'reference_date'},...totals,comparison};});}
  private async workRecord(tx:Tx,a:string,h:string,id:string){const row=await tx.economicWork.findFirst({where:{id:uuid(id),accountId:a,homeId:h}});if(!row)throw new ForbiddenException('Accesso non consentito.');return row;}
  async getWork(a:string,h:string,id:string,input:unknown){object(input,[]);return this.expenses.read(a,h,async(tx,edit)=>({work:await this.policy.workView(tx,await this.workRecord(tx,a,h,id),edit)}));}
  async works(a:string,h:string,input:unknown){const row=object(input,['state','q','limit','cursor']),q=pageQuery(row),state=row.state??'active',search=row.q===undefined?'':text(row.q,120,true)??'';if(typeof state!=='string'||!['active','archived','all'].includes(state))throw invalid();const b=digest(JSON.stringify([a,h,'works',state,search])),cur=this.cursor(q.cursor,b);
    return this.expenses.read(a,h,async(tx,edit)=>{const rows=await tx.$queryRaw<EconomicWork[]>(Prisma.sql`SELECT w.* FROM "EconomicWork" w WHERE w."accountId"=${a} AND w."homeId"=${h} AND ${state==='all'?Prisma.sql`TRUE`:Prisma.sql`w.state=${state}`} AND ${search?Prisma.sql`w.name ILIKE ${literal(search)}`:Prisma.sql`TRUE`} ${cur?Prisma.sql`AND (w."createdAt",w.id)<(${cur.t}::timestamp,${cur.i})`:Prisma.sql``} ORDER BY w."createdAt" DESC,w.id DESC LIMIT ${q.limit+1}`);const page=rows.slice(0,q.limit);return {items:await Promise.all(page.map(r=>this.policy.workView(tx,r,edit))),nextCursor:rows.length>q.limit?this.encode(b,page.at(-1)!):null};});}
  async mutateWork(a:string,h:string,op:'create'|'update'|'archive'|'restore',id:string,input:unknown,key?:string){if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();if(id)uuid(id);const body:Record<string,unknown>=op==='create'||op==='update'?workBody(input,op==='update'):{expectedVersion:version(object(input,['expectedVersion']).expectedVersion)};
    return this.expenses.read(a,h,async(tx,edit,context)=>{if(!edit)throw new ForbiddenException('Accesso non consentito.');const lookup={accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:'work:'+op,target:id,key}},hash=digest(JSON.stringify(body)),prior=await tx.economicRequest.findUnique({where:lookup});
      if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata.');const saved=prior.response as unknown as EconomicWork;await this.workRecord(tx,a,h,saved.id);return {work:await this.policy.workView(tx,saved,true)};}
      const old=id?await this.workRecord(tx,a,h,id):null;if(old&&old.version!==body.expectedVersion)throw conflict('work_version_conflict','Rileggi il lavoro.');if(old&&old.state!==(op==='restore'?'archived':'active'))throw conflict('work_state_conflict','Azione non consentita.');if(body.activityId)await this.policy.activity(tx,a,h,String(body.activityId),true);
      const data=op==='create'||op==='update'?Object.fromEntries(Object.entries(body).filter(([k])=>k!=='expectedVersion')):{state:op==='archive'?'archived':'active',archivedAt:op==='archive'?new Date(context.asOf):null};
      const changed=!old||Object.entries(data).some(([k,v])=>old[k as keyof EconomicWork]!==v),now=new Date(context.asOf);const next=!old?await tx.economicWork.create({data:{accountId:a,homeId:h,...data as ReturnType<typeof workBody>,name:String(data.name),createdAt:now,updatedAt:now}}):changed?await tx.economicWork.update({where:{id},data:{...data,version:{increment:1},updatedAt:now}}):old;
      if(changed)await tx.economicWorkHistory.create({data:{workId:next.id,accountId:a,kind:op==='create'?'created':op==='update'?'updated':op==='archive'?'archived':'restored',at:now,before:old?json(old):Prisma.JsonNull,after:json(next)}});await tx.economicRequest.create({data:{...lookup.accountId_homeId_operation_target_key,digest:hash,response:json(next),createdAt:now}});return {work:await this.policy.workView(tx,next,true)};
    });}
  async workHistory(a:string,h:string,id:string,input:unknown){const q=pageQuery(object(input,['limit','cursor'])),b=digest(JSON.stringify([a,h,'work-history',uuid(id)])),cur=this.cursor(q.cursor,b);
    return this.expenses.read(a,h,async tx=>{await this.workRecord(tx,a,h,id);const rows=await tx.economicWorkHistory.findMany({where:{workId:id,...(cur?{OR:[{at:{lt:new Date(cur.t)}},{at:new Date(cur.t),id:{lt:cur.i}}]}:{})},orderBy:[{at:'desc'},{id:'desc'}],take:q.limit+1}),page=rows.slice(0,q.limit);const snapshot=async(raw:unknown)=>{const row=raw as EconomicWork;return {name:row.name,note:row.note,state:row.state,activityLink:await this.policy.activity(tx,a,h,row.activityId)};};return {items:await Promise.all(page.map(async r=>({id:r.id,kind:r.kind,at:r.at.toISOString(),before:r.before?await snapshot(r.before):null,after:await snapshot(r.after)}))),nextCursor:rows.length>q.limit?this.encode(b,page.at(-1)!):null};});}
}
