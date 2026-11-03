import {ForbiddenException} from '@nestjs/common';
import {Prisma} from '../../generated/client';
import {ObjectOnboardingAccess} from '../object-onboarding/access';
import type {LocalFileStorage} from '../documents/storage';
import {roomTypes} from '../home-objects/domain';
import {conflict,invalid,uuid,version} from '../review/domain';
import {digest} from '../security';
import {mapDigest,parseDigitalPlan,type DigitalPlanSnapshot} from './snapshot';

export const OPERATOR_IMPORT_CAVEAT='Bozza importata da backoffice: contorni e ambienti da verificare.';
const OPERATION='home-map:operator-import';
const RESERVED_REGION_IDS=new Set(['__proto__','constructor','prototype']);
type Tx=Prisma.TransactionClient;
type ExistingBinding={regionId:string;kind:'existing';roomId:string};
type NewBinding={regionId:string;kind:'create';name:string;type:string};
export type OperatorPlanBinding=ExistingBinding|NewBinding;
export type OperatorPlanImportInput={
 expectedAccountEmail:string;documentId:string;expectedDocumentVersion:number;expectedDocumentSha256:string;
 snapshot:DigitalPlanSnapshot;bindings:OperatorPlanBinding[];reason:string;
 provenance:{kind:'backoffice_reconstruction';sourceDigest:string;note:string};
};
export type OperatorPlanImportPreview={
 fingerprint:string;accountId:string;homeId:string;documentId:string;documentVersion:number;documentSha256:string;
 snapshotDigest:string;regionCount:number;existingRoomCount:number;objectCount:number;positionCount:number;
 reuse:{regionId:string;roomId:string;name:string;type:string}[];create:{regionId:string;name:string;type:string}[];
};
export type OperatorPlanImportResult={mapId:string;version:number;roomBindings:Record<string,string>;createdRoomIds:string[];reusedRoomIds:string[];replay:boolean};
const json=(v:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(v));
const deny=()=>new ForbiddenException('Accesso non consentito.');
const stale=()=>conflict('operator_import_stale','La casa o il documento sono cambiati. Ripeti l’anteprima.');
function exact(input:unknown,keys:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw invalid();
 const own=Reflect.ownKeys(input);if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))throw invalid();
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(input,k);if(!d||!('value'in d)||!d.enumerable)throw invalid();}
 return input as Record<string,unknown>;
}
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v!==v.trim()||[...v].length>max||/[\p{Cc}\p{Cf}]/u.test(v))throw invalid();return v;}
function sha(v:unknown){const s=text(v,64);if(!/^[a-f0-9]{64}$/u.test(s))throw invalid();return s;}
function email(v:unknown){const s=text(v,254);if(s!==s.toLowerCase()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(s))throw invalid();return s;}
function dense(input:unknown,max:number):unknown[]{
 if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length>max||Reflect.ownKeys(input).length!==input.length+1)throw invalid();
 for(let i=0;i<input.length;i++){const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!('value'in d))throw invalid();}
 return input;
}
function jsonTree(input:unknown,depth=0,count={nodes:0}):void{
 if(++count.nodes>100000||depth>32)throw invalid();
 if(input===null||typeof input==='string'||typeof input==='boolean'||typeof input==='number'&&Number.isFinite(input))return;
 if(!input||typeof input!=='object')throw invalid();
 const array=Array.isArray(input),keys=Reflect.ownKeys(input);
 if(array){dense(input,50000);}else if(Object.getPrototypeOf(input)!==Object.prototype||keys.some(k=>typeof k!=='string'))throw invalid();
 for(const key of keys){if(array&&key==='length')continue;const descriptor=Object.getOwnPropertyDescriptor(input,key);if(!descriptor||!('value'in descriptor)||!descriptor.enumerable)throw invalid();jsonTree(descriptor.value,depth+1,count);}
}
/** Exact internal manifest: not exposed as an HTTP body or a privileged browser descriptor. */
export function parseOperatorPlanImport(input:unknown):OperatorPlanImportInput{
 jsonTree(input);
 const r=exact(input,['expectedAccountEmail','documentId','expectedDocumentVersion','expectedDocumentSha256','snapshot','bindings','reason','provenance']);
 let snapshot:DigitalPlanSnapshot;try{snapshot=parseDigitalPlan(r.snapshot);}catch{throw invalid('Planimetria digitale non valida.');}
 // Prisma JSON serialization cannot reliably preserve these dictionary keys. Reject before any DB work.
 if(snapshot.rooms.some(room=>RESERVED_REGION_IDS.has(room.id)))throw invalid('Identificativo del vano non consentito per l’importazione.');
 if(snapshot.calibration!==null||snapshot.qualification!=='unverified'||snapshot.mainPerimeter!==null||!snapshot.caveats.includes(OPERATOR_IMPORT_CAVEAT))throw invalid('L’importazione tecnica deve restare una bozza non verificata.');
 const documentId=uuid(r.documentId),documentVersion=version(r.expectedDocumentVersion),documentSha256=sha(r.expectedDocumentSha256);
 if(snapshot.source.sourceId!==documentId||snapshot.source.version!==documentVersion||snapshot.source.sha256!==documentSha256)throw invalid('La prova della planimetria non coincide con l’originale.');
 const bindings=dense(r.bindings,100).map(v=>{
  const kind=v&&typeof v==='object'?(v as {kind?:unknown}).kind:undefined;
  const row=exact(v,kind==='existing'?['regionId','kind','roomId']:['regionId','kind','name','type']);
  const regionId=text(row.regionId,100);
  if(kind==='existing')return {regionId,kind,roomId:uuid(row.roomId)} as ExistingBinding;
  if(kind!=='create'||typeof row.type!=='string'||!(roomTypes as readonly string[]).includes(row.type))throw invalid();
  return {regionId,kind,name:text(row.name,80),type:row.type} as NewBinding;
 }).sort((a,b)=>a.regionId.localeCompare(b.regionId,'en'));
 if(bindings.length!==snapshot.rooms.length||new Set(bindings.map(b=>b.regionId)).size!==bindings.length||bindings.some(b=>!snapshot.rooms.some(r=>r.id===b.regionId)))throw invalid('Associa ogni vano una sola volta.');
 const existing=bindings.filter((b):b is ExistingBinding=>b.kind==='existing');
 if(new Set(existing.map(b=>b.roomId)).size!==existing.length)throw invalid('Ogni ambiente esistente può rappresentare un solo vano.');
 const p=exact(r.provenance,['kind','sourceDigest','note']);if(p.kind!=='backoffice_reconstruction')throw invalid();
 return {expectedAccountEmail:email(r.expectedAccountEmail),documentId,expectedDocumentVersion:documentVersion,expectedDocumentSha256:documentSha256,snapshot,bindings,reason:text(r.reason,500),provenance:{kind:'backoffice_reconstruction',sourceDigest:sha(p.sourceDigest),note:text(p.note,500)}};
}

/** Operator-only data operation. It creates no routes, access grants, Gift or AI jobs. */
export class HomePlanOperatorImporter{
 constructor(private readonly access:ObjectOnboardingAccess,private readonly storage:Pick<LocalFileStorage,'read'>){}
 private async authorized(tx:Tx,a:string,h:string,input:OperatorPlanImportInput){
  const [account,home,member]=await Promise.all([
   tx.account.findUnique({where:{id:a},select:{id:true,email:true}}),
   tx.home.findUnique({where:{id:h}}),
   tx.homeMembership.findUnique({where:{accountId_homeId:{accountId:a,homeId:h}}})
  ]);
  if(!account||account.email.toLowerCase()!==input.expectedAccountEmail||!home||member?.role!=='owner'||input.snapshot.reviewedBy!==a)throw deny();
  const doc=await this.access.source(tx,a,h,input.documentId,{documentVersion:input.expectedDocumentVersion,documentSha256:input.expectedDocumentSha256});
  if(!doc||doc.original?.mimeType!=='application/pdf'||!doc.original.file||doc.original.byteSize<1||doc.original.byteSize>20*1024*1024)throw deny();
  const bytes=await this.storage.read(doc.original.file.storageKey);
  if(bytes.length!==doc.original.byteSize||digest(bytes)!==doc.original.sha256||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw conflict('operator_source_unavailable','L’originale non coincide con la prova dell’importazione.');
  return {account,home,doc};
 }
 private async state(tx:Tx,a:string,h:string,input:OperatorPlanImportInput){
  const context=await this.authorized(tx,a,h,input);
  const [rooms,objects,positions,maps]=await Promise.all([
   tx.homeRoom.findMany({where:{homeId:h},orderBy:{id:'asc'}}),
   tx.homeObject.findMany({where:{accountId:a,homeId:h},orderBy:{id:'asc'}}),
   tx.objectPosition.findMany({where:{accountId:a,homeId:h},orderBy:{id:'asc'}}),
   tx.homeDigitalPlan.findMany({where:{accountId:a,homeId:h},orderBy:{id:'asc'}})
  ]);
  const reuse:OperatorPlanImportPreview['reuse']=[],create:OperatorPlanImportPreview['create']=[];
  const names=new Set(rooms.map(r=>r.name.normalize('NFKC').toLocaleLowerCase('it')));
  for(const binding of input.bindings){
   if(binding.kind==='existing'){
    const room=rooms.find(r=>r.id===binding.roomId);if(!room||room.state!=='active')throw invalid('L’ambiente scelto non è attivo in questa casa.');
    reuse.push({regionId:binding.regionId,roomId:room.id,name:room.name,type:room.type});
   }else{
    const normalized=binding.name.normalize('NFKC').toLocaleLowerCase('it');if(names.has(normalized))throw invalid('Esiste già un ambiente con questo nome: collegalo esplicitamente.');
    names.add(normalized);create.push({regionId:binding.regionId,name:binding.name,type:binding.type});
   }
  }
  const fingerprint=mapDigest(JSON.parse(JSON.stringify({accountId:a,homeId:h,...context,rooms,objects,positions,maps,input})));
  const preview:OperatorPlanImportPreview={fingerprint,accountId:a,homeId:h,documentId:input.documentId,documentVersion:input.expectedDocumentVersion,documentSha256:input.expectedDocumentSha256,snapshotDigest:input.snapshot.digest,regionCount:input.snapshot.rooms.length,existingRoomCount:rooms.length,objectCount:objects.length,positionCount:positions.length,reuse,create};
  return {preview,rooms,maps};
 }
 preview(accountId:string,homeId:string,input:unknown){
  const a=uuid(accountId),h=uuid(homeId),body=parseOperatorPlanImport(input);
  return this.access.run(a,h,false,async tx=>{
   const {preview}=await this.state(tx,a,h,body);
   if(await tx.homeDigitalPlan.findUnique({where:{documentId:body.documentId},select:{id:true}}))throw conflict('operator_map_exists','Una mappa per questo documento è già presente. Nessuna sostituzione eseguita.');
   return preview;
  });
 }
 apply(accountId:string,homeId:string,input:unknown,expectedFingerprint:string,key:string):Promise<OperatorPlanImportResult>{
  const a=uuid(accountId),h=uuid(homeId),body=parseOperatorPlanImport(input),expected=sha(expectedFingerprint);
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/u.test(key))throw invalid();
  const requestDigest=mapDigest({accountId:a,homeId:h,input:body,expectedFingerprint:expected});
  return this.access.run(a,h,true,async tx=>{
   // Reauthorize current account, membership and physical original before looking up a receipt.
   await this.authorized(tx,a,h,body);
   const prior=await tx.objectRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation:OPERATION,target:body.documentId,key}}});
   if(prior){
    if(prior.digest!==requestDigest)throw conflict('idempotency_conflict','Chiave già usata con dati diversi.');
    const saved=prior.response as unknown as OperatorPlanImportResult;
    const map=await tx.homeDigitalPlan.findFirst({where:{id:saved.mapId,accountId:a,homeId:h,documentId:body.documentId,documentVersion:body.expectedDocumentVersion,documentSha256:body.expectedDocumentSha256}});
    const ids=Object.values(saved.roomBindings),rooms=await tx.homeRoom.findMany({where:{homeId:h,id:{in:ids},state:'active'},select:{id:true}});
    if(!map||rooms.length!==ids.length)throw stale();
    await this.authorized(tx,a,h,body);
    return {...saved,replay:true};
   }
   const {preview}=await this.state(tx,a,h,body);if(preview.fingerprint!==expected)throw stale();
   if(await tx.homeDigitalPlan.findUnique({where:{documentId:body.documentId},select:{id:true}}))throw conflict('operator_map_exists','Una mappa per questo documento è già presente. Nessuna sostituzione eseguita.');
   const bindingRows=new Map<string,string>(),createdRoomIds:string[]=[],reusedRoomIds:string[]=[];
   for(const binding of body.bindings){
    if(binding.kind==='existing'){bindingRows.set(binding.regionId,binding.roomId);reusedRoomIds.push(binding.roomId);continue;}
    const room=await tx.homeRoom.create({data:{homeId:h,name:binding.name,type:binding.type}});bindingRows.set(binding.regionId,room.id);createdRoomIds.push(room.id);
    await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'room',targetId:room.id,kind:'created',before:Prisma.JsonNull,after:json({kind:'room',row:room,origin:'backoffice_plan_import'})}});
   }
   const bindings=Object.fromEntries(bindingRows);
   const map=await tx.homeDigitalPlan.create({data:{accountId:a,homeId:h,documentId:body.documentId,documentVersion:body.expectedDocumentVersion,documentSha256:body.expectedDocumentSha256,geometryRevision:body.snapshot.geometryRevision,received:json(body.snapshot),layout:json(body.snapshot),roomBindings:json(bindings),pins:[]}});
   const response:OperatorPlanImportResult={mapId:map.id,version:map.version,roomBindings:bindings,createdRoomIds,reusedRoomIds,replay:false};
   await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'home_map',targetId:map.id,kind:'operator_imported',before:Prisma.JsonNull,after:json({kind:'home_map',origin:'backoffice_reconstruction',draft:true,source:{documentId:body.documentId,version:body.expectedDocumentVersion,sha256:body.expectedDocumentSha256},snapshotDigest:body.snapshot.digest,previewFingerprint:expected,roomBindings:bindings,createdRoomIds,reusedRoomIds,reason:body.reason,provenance:body.provenance})}});
   await this.authorized(tx,a,h,body);
   await tx.objectRequest.create({data:{accountId:a,homeId:h,operation:OPERATION,target:body.documentId,key,digest:requestDigest,response:json(response)}});
   return response;
  });
 }
}
