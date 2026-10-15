import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type ShareRecord, type SharePreview } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest, validMembership } from '../security';
import { LocalFileStorage, storageUnavailable } from '../documents/storage';
import { conflict, invalid, object, uuid } from '../review/domain';
import { acknowledgeManifest, manifestFingerprint, selectedOriginals, type Manifest, type DocumentFact } from './policy';
import * as d from './domain';
type Tx=Prisma.TransactionClient;
type Result={kind:'preview'|'share';id:string;code?:string};
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const manifest=(row:{manifest:Prisma.JsonValue})=>row.manifest as unknown as Manifest;
const publicItems=(m:Manifest)=>m.items.map(({documentId,documentVersion,name,byteSize,mimeType})=>({documentId,documentVersion,name,byteSize,mimeType}));
type Person={id:string;name:string;email:string;identityVerified:false};

@Injectable()
export class SharingService {
  constructor(private readonly db:PrismaService,private readonly storage:LocalFileStorage,@Optional() @Inject('SHARING_CLOCK') private readonly clock?:{now():Date}){}
  private now(){return this.clock?.now()??new Date();}
  private async membership(tx:Tx,a:string,h:string){
    await tx.$queryRaw`SELECT id FROM "HomeMembership" WHERE "accountId"=${a} AND "homeId"=${h} FOR SHARE`;
    const m=await tx.homeMembership.findUnique({where:{accountId_homeId:{accountId:a,homeId:h}}});
    return m&&validMembership(m,this.now())?m:null;
  }
  private async sender(tx:Tx,a:string,h:string,edit=true){uuid(h);const m=await this.membership(tx,a,h);if(!m||edit&&m.role==='viewer')throw d.unavailable();return m;}
  private async person(tx:Tx,a:string):Promise<Person>{const p=await tx.account.findUnique({where:{id:a},select:{id:true,name:true,email:true}});if(!p)throw d.unavailable();return {...p,identityVerified:false};}
  private async originals(tx:Tx,a:string,h:string,ids:string[]){
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Document" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "DocumentVersion" WHERE "documentId" IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`);
    const rows=await tx.document.findMany({where:{id:{in:ids}},include:{original:true}});
    const facts:DocumentFact[]=rows.map(r=>({...r,original:r.original?{...r.original,available:true}:null}));
    return selectedOriginals(ids,facts,a,h);
  }
  private async valid(tx:Tx,r:ShareRecord|SharePreview){
    const m=await this.membership(tx,r.senderId,r.homeId);
    if(!m||m.role==='viewer')return false;
    if(r.recipientKind==='member'&&(!r.recipientId||!await this.membership(tx,r.recipientId,r.homeId)))return false;
    const saved=manifest(r);
    try {
      const current=await this.originals(tx,r.senderId,r.homeId,saved.items.map(i=>i.documentId));
      return current.items.length===saved.items.length&&saved.items.every(i=>current.items.some(c=>c.documentId===i.documentId&&c.documentVersion===i.documentVersion&&c.sha256===i.sha256&&c.byteSize===i.byteSize&&c.mimeType===i.mimeType));
    }catch(e){if(e instanceof Error&&'getStatus' in e&&(e as {getStatus():number}).getStatus()===403)return false;throw e;}
  }
  private async locked(tx:Tx,id:string){uuid(id);await tx.$queryRaw`SELECT id FROM "ShareRecord" WHERE id=${id} FOR UPDATE`;const r=await tx.shareRecord.findUnique({where:{id}});if(!r)throw d.unavailable();return r;}
  private async owner(tx:Tx,a:string,h:string,r:ShareRecord){if(r.senderId!==a||r.homeId!==h)throw d.unavailable();await this.sender(tx,a,h);}
  private async previewView(tx:Tx,a:string,p:SharePreview){
    if(p.senderId!==a||!await this.valid(tx,p))throw d.unavailable();
    if(p.validUntil<=this.now())throw conflict('share_preview_expired','Anteprima scaduta. Prepara un nuovo controllo.');
    return {id:p.id,version:1,recipient:p.recipientKind==='member'?{kind:'member',accountId:p.recipientId}:{kind:'external'},recipientPerson:p.recipientId?await this.person(tx,p.recipientId):null,
      items:publicItems(manifest(p)),expiresAt:manifest(p).expiresAt,validUntil:p.validUntil.toISOString(),manifestFingerprint:p.fingerprint};
  }
  private async project(tx:Tx,a:string,r:ShareRecord,code:string|null=null){
    const owner=r.senderId===a,recipient=r.recipientId===a,claimant=r.claimAccountId===a;
    if(!owner&&!recipient&&!claimant)throw d.unavailable();
    if(owner)await this.sender(tx,a,r.homeId);
    const now=this.now(),isValid=await this.valid(tx,r),claimValid=!!r.claimExpiresAt&&r.claimExpiresAt>now;
    let state:string=r.state;
    if(!isValid)state='unavailable';
    else if(r.state!=='revoked'&&r.state!=='declined'&&r.expiresAt<=now)state='expired';
    else if(r.state==='awaiting_confirmation'&&!claimValid)state=owner?'awaiting_pairing':'unavailable';
    const gone=['unavailable','revoked','declined','expired'].includes(state);
    const permissions:string[]=[];
    if(owner&&!gone){permissions.push('revoke');if(r.recipientKind==='external'&&['awaiting_pairing','awaiting_confirmation'].includes(state))permissions.push('rotate_code');if(state==='awaiting_confirmation')permissions.push('confirm_pairing');}
    if(recipient&&state==='pending')permissions.push('accept','decline');
    if(recipient&&state==='accepted')permissions.push('read_files');
    return {id:r.id,version:r.version,state,createdAt:r.createdAt.toISOString(),expiresAt:state==='unavailable'?null:r.expiresAt.toISOString(),
      senderName:state==='unavailable'?null:(await this.person(tx,r.senderId)).name,
      recipient:owner&&state!=='unavailable'&&r.recipientId?await this.person(tx,r.recipientId):null,
      items:(!gone&&(owner||recipient&&state==='accepted'))?publicItems(manifest(r)):[],permissions,
      pairing:owner&&!gone&&r.recipientKind==='external'?{code,codeExpiresAt:r.codeExpiresAt?.toISOString()??null,claim:r.state==='awaiting_confirmation'&&claimValid&&r.claimAccountId&&r.claimId?{id:r.claimId,account:await this.person(tx,r.claimAccountId),comparisonCode:r.comparisonCode,expiresAt:r.claimExpiresAt!.toISOString()}:null}:null,
      comparison:claimant&&state==='awaiting_confirmation'&&claimValid?{claimId:r.claimId,code:r.comparisonCode,expiresAt:r.claimExpiresAt!.toISOString()}:null};
  }
  private async run(a:string,op:string,target:string,body:unknown,key:unknown,fn:(tx:Tx)=>Promise<Result>){
    const k=d.requestKey(key),hash=digest(JSON.stringify([op,target,body]));
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'c1-request:'+a},0))::text AS locked`;
      const prior=await tx.shareRequest.findUnique({where:{accountId_key:{accountId:a,key:k}}});
      let result:Result;
      if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata per una richiesta diversa.');result={kind:prior.resourceKind as Result['kind'],id:prior.resourceId};}
      else{result=await fn(tx);await tx.shareRequest.create({data:{accountId:a,key:k,digest:hash,resourceKind:result.kind,resourceId:result.id}});}
      if(result.kind==='preview'){const p=await tx.sharePreview.findUnique({where:{id:result.id}});if(!p)throw d.unavailable();return {preview:await this.previewView(tx,a,p)};}
      const r=await tx.shareRecord.findUnique({where:{id:result.id}});if(!r)throw d.unavailable();return {share:await this.project(tx,a,r,result.code??null)};
    },{timeout:15000,maxWait:15000});
  }
  async capabilities(a:string,h:string,q:unknown){object(q,[]);return this.db.$transaction(async tx=>{const m=await this.sender(tx,a,h,false);return {apiVersion:'sharing-v1',enabled:true,isSimulation:false,externalPairing:true,technicalData:false,economy:false,
    limits:{maxDocuments:20,maxBytes:104857600,durationDays:[1,7,30],previewMinutes:10,codeMinutes:15},permissions:m.role==='viewer'?[]:['prepare']};});}
  async recipients(a:string,h:string,q:unknown){object(q,[]);return this.db.$transaction(async tx=>{await this.sender(tx,a,h);const now=this.now();const people=await tx.homeMembership.findMany({where:{homeId:h,accountId:{not:a},revokedAt:null,validFrom:{lte:now},OR:[{validUntil:null},{validUntil:{gt:now}}]},include:{account:{select:{id:true,name:true,email:true}}},orderBy:{accountId:'asc'},take:101});if(people.length>100)throw invalid('Elenco destinatari oltre il limite supportato.');return {items:people.map(p=>({...p.account,identityVerified:false}))};});}
  async documents(a:string,h:string,q:unknown){const p=d.page(q),binding=digest(JSON.stringify(['documents',a,h]));let anchor:{id:string;at:Date}|null=null;
    if(p.cursor){try{const r=object(JSON.parse(Buffer.from(p.cursor,'base64url').toString('utf8')),['b','id','at']);if(r.b!==binding||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))throw invalid();anchor={id:uuid(r.id),at:new Date(r.at)};}catch{throw invalid('Pagina non valida.');}}
    return this.db.$transaction(async tx=>{await this.sender(tx,a,h);const rows=await tx.document.findMany({where:{AND:[{homeId:h,original:{isNot:null},OR:[{visibility:'home'},{uploaderId:a}]},...(anchor?[{OR:[{createdAt:{lt:anchor.at}},{createdAt:anchor.at,id:{lt:anchor.id}}]}]:[])]},include:{original:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:p.limit+1}),slice=rows.slice(0,p.limit),last=slice.at(-1);
      return {items:slice.map(r=>({documentId:r.id,documentVersion:r.original!.version,name:r.name,byteSize:r.original!.byteSize,mimeType:r.original!.mimeType,visibility:r.visibility,eligible:r.uploaderId===a,ineligibleReason:r.uploaderId===a?null:'not_uploader'})),nextCursor:rows.length>p.limit&&last?Buffer.from(JSON.stringify({b:binding,id:last.id,at:last.createdAt.toISOString()})).toString('base64url'):null};
    });
  }
  preview(a:string,h:string,input:unknown,key:unknown){const b=d.selection(input);return this.run(a,'preview',h,b,key,async tx=>{
    await this.sender(tx,a,h);if(b.recipient.kind==='member'&&(b.recipient.accountId===a||!await this.membership(tx,b.recipient.accountId,h)))throw d.unavailable();
    const selected=await this.originals(tx,a,h,b.documentIds),now=this.now();
    const m:Manifest={senderAccountId:a,homeId:h,recipientAccountId:b.recipient.kind==='member'?b.recipient.accountId:null,expiresAt:new Date(+now+b.durationDays*86400000).toISOString(),...selected};
    const p=await tx.sharePreview.create({data:{senderId:a,homeId:h,recipientKind:b.recipient.kind,recipientId:m.recipientAccountId,manifest:json(m),fingerprint:manifestFingerprint(m),validUntil:new Date(+now+600000)}});return {kind:'preview',id:p.id};
  });}
  create(a:string,h:string,input:unknown,key:unknown){const b=d.creation(input);return this.run(a,'create',h,b,key,async tx=>{
    await this.sender(tx,a,h);await tx.$queryRaw`SELECT id FROM "SharePreview" WHERE id=${b.previewId} FOR UPDATE`;
    const p=await tx.sharePreview.findUnique({where:{id:b.previewId}});if(!p||p.senderId!==a||p.homeId!==h)throw d.unavailable();await this.previewView(tx,a,p);
    if(p.consumedBy)throw d.changed();acknowledgeManifest(manifest(p),{documentIds:b.acknowledgedDocumentIds,manifestFingerprint:b.manifestFingerprint});
    const code=p.recipientKind==='external'?d.randomCode(10):undefined,now=this.now();
    const r=await tx.shareRecord.create({data:{senderId:a,homeId:h,recipientKind:p.recipientKind,recipientId:p.recipientId,state:code?'awaiting_pairing':'pending',manifest:p.manifest as Prisma.InputJsonValue,expiresAt:new Date(manifest(p).expiresAt),codeHash:code?digest(code):null,codeExpiresAt:code?new Date(Math.min(+now+900000,Date.parse(manifest(p).expiresAt))):null}});
    await tx.sharePreview.update({where:{id:p.id},data:{consumedBy:r.id}});await this.event(tx,r,a,'created');return {kind:'share',id:r.id,code};
  });}
  private async event(tx:Tx,r:ShareRecord,a:string,kind:string){await tx.shareEvent.create({data:{shareId:r.id,actorId:a,kind,version:r.version}});}
  private check(r:ShareRecord,expected:number){if(r.version!==expected)throw d.changed();}
  private async active(tx:Tx,r:ShareRecord){if(!await this.valid(tx,r))throw d.unavailable();if(r.expiresAt<=this.now()||['revoked','declined'].includes(r.state))throw d.changed();}
  ownerAction(a:string,h:string,id:string,op:'revoke'|'rotate-code'|'confirm-pairing',input:unknown,key:unknown){const b=op==='confirm-pairing'?d.confirmPairing(input):d.action(input);return this.run(a,op,h+':'+uuid(id),b,key,async tx=>{
    const r=await this.locked(tx,id);await this.owner(tx,a,h,r);this.check(r,b.expectedVersion);await this.active(tx,r);
    let code:string|undefined;let data:Prisma.ShareRecordUpdateInput;
    if(op==='revoke')data={state:'revoked',revokedAt:this.now(),codeHash:null,comparisonCode:null};
    else if(op==='rotate-code'){
      if(r.recipientKind!=='external'||!['awaiting_pairing','awaiting_confirmation'].includes(r.state))throw d.changed();code=d.randomCode(10);
      data={state:'awaiting_pairing',codeHash:digest(code),codeExpiresAt:new Date(Math.min(+this.now()+900000,+r.expiresAt)),claimId:null,claimant:{disconnect:true},comparisonCode:null,claimExpiresAt:null};
    }else{
      const pair=d.confirmPairing(input);
      if(r.state!=='awaiting_confirmation'||r.claimId!==pair.claimId||r.comparisonCode!==pair.comparisonCode||!r.claimExpiresAt||r.claimExpiresAt<=this.now()||!r.claimAccountId)throw d.changed();
      const m={...manifest(r),recipientAccountId:r.claimAccountId};data={state:'pending',recipient:{connect:{id:r.claimAccountId}},manifest:json(m),pairConfirmedAt:this.now(),comparisonCode:null};
    }
    const updated=await tx.shareRecord.update({where:{id},data:{...data,version:{increment:1}}});await this.event(tx,updated,a,op);return {kind:'share',id,code};
  });}
  private async throttle(a:string,ip:string,code:string){
    const now=this.now();const scopes=[['global',60000,100],['ip:'+digest(ip),60000,30],['account:'+a,60000,10],['code:'+digest(code),900000,5]] as const;
    const blocked=await this.db.$transaction(async tx=>{let bad=false;for(const [scope,window,max] of scopes){const start=new Date(Math.floor(+now/window)*window),key=digest(scope+':'+start.toISOString());const r=await tx.shareThrottle.upsert({where:{key},create:{key,windowStart:start,attempts:1},update:{attempts:{increment:1}}});if(r.attempts>max)bad=true;}await tx.shareThrottle.deleteMany({where:{windowStart:{lt:new Date(+now-86400000)}}});return bad;});
    if(blocked)throw d.rateLimited();
  }
  async claim(a:string,input:unknown,key:unknown,ip:string){const b=d.claimBody(input),k=d.requestKey(key);
    if(!await this.db.shareRequest.findUnique({where:{accountId_key:{accountId:a,key:k}}}))await this.throttle(a,ip,b.code);
    return this.run(a,'claim','',b,k,async tx=>{
      const found=await tx.shareRecord.findUnique({where:{codeHash:digest(b.code)}});if(!found)throw d.unavailable();const r=await this.locked(tx,found.id);
      const now=this.now();if(r.codeHash!==digest(b.code)||r.state!=='awaiting_pairing'||!r.codeExpiresAt||r.codeExpiresAt<=now||r.senderId===a)throw d.unavailable();await this.active(tx,r);
      const updated=await tx.shareRecord.update({where:{id:r.id},data:{state:'awaiting_confirmation',version:{increment:1},codeHash:null,claimId:randomUUID(),claimAccountId:a,comparisonCode:d.randomCode(8),claimExpiresAt:new Date(Math.min(+now+900000,+r.expiresAt))}});
      await this.event(tx,updated,a,'claim');return {kind:'share',id:r.id};
    });
  }
  recipientAction(a:string,id:string,op:'accept'|'decline',input:unknown,key:unknown){const b=d.action(input);return this.run(a,op,uuid(id),b,key,async tx=>{
    const r=await this.locked(tx,id);if(r.recipientId!==a)throw d.unavailable();await this.active(tx,r);this.check(r,b.expectedVersion);if(r.state!=='pending')throw d.changed();
    const updated=await tx.shareRecord.update({where:{id},data:{state:op==='accept'?'accepted':'declined',acceptedAt:op==='accept'?this.now():null,version:{increment:1}}});await this.event(tx,updated,a,op);return {kind:'share',id};
  });}
  async get(a:string,id:string,q:unknown,h?:string){object(q,[]);uuid(id);return this.db.$transaction(async tx=>{const r=await tx.shareRecord.findUnique({where:{id}});if(!r)throw d.unavailable();if(h)await this.owner(tx,a,h,r);else if(r.recipientId!==a&&r.claimAccountId!==a)throw d.unavailable();return {share:await this.project(tx,a,r)};});}
  async list(a:string,q:unknown,h?:string){const p=d.page(q),binding=digest(JSON.stringify([a,h??null]));let anchor:{id:string;at:Date}|null=null;
    if(p.cursor){try{const r=object(JSON.parse(Buffer.from(p.cursor,'base64url').toString('utf8')),['b','id','at']);if(r.b!==binding||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))throw invalid();anchor={id:uuid(r.id),at:new Date(r.at)};}catch{throw invalid('Pagina non valida.');}}
    return this.db.$transaction(async tx=>{if(h)await this.sender(tx,a,h);const where:Prisma.ShareRecordWhereInput={AND:[h?{senderId:a,homeId:h}:{OR:[{recipientId:a},{claimAccountId:a}]},...(anchor?[{OR:[{createdAt:{lt:anchor.at}},{createdAt:anchor.at,id:{lt:anchor.id}}]}]:[])]};
      const rows=await tx.shareRecord.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],take:p.limit+1}),slice=rows.slice(0,p.limit),last=slice.at(-1);
      return {items:await Promise.all(slice.map(r=>this.project(tx,a,r))),nextCursor:rows.length>p.limit&&last?Buffer.from(JSON.stringify({b:binding,id:last.id,at:last.createdAt.toISOString()})).toString('base64url'):null};
    },{timeout:15000});
  }
  async file(a:string,id:string,documentId:string,q:unknown={}){object(q,[]);uuid(id);uuid(documentId);return this.db.$transaction(async tx=>{
    const r=await this.locked(tx,id);if(r.recipientId!==a||r.state!=='accepted'||r.expiresAt<=this.now()||!await this.valid(tx,r))throw d.unavailable();
    const selected=manifest(r).items.find(i=>i.documentId===documentId);if(!selected)throw d.unavailable();
    const original=await tx.documentVersion.findUnique({where:{documentId},include:{file:true}});if(!original)throw d.unavailable();
    const bytes=await this.storage.read(original.file.storageKey);if(bytes.length!==selected.byteSize||digest(bytes)!==selected.sha256)throw storageUnavailable();
    if(r.expiresAt<=this.now()||!await this.valid(tx,r))throw d.unavailable();return {bytes,mimeType:selected.mimeType,filename:selected.name};
  },{timeout:15000});}
}
