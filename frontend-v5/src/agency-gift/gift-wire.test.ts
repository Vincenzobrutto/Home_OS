import {describe,it,expect} from 'vitest';
import * as W from './gift-wire';
const id=(n:number)=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),hash='a'.repeat(64),secret='A'.repeat(43),at='2024-02-29T12:00:00.000Z';
const surface=()=>({kind:'commercial',qualification:'estimated',method:'A4 presunto',geometryRevision:3,caveats:['Formato foglio da verificare']});
const descriptor=()=>({agencyId:id(2),practiceId:id(3),sourceId:'source/demo',sourceVersion:3,sha256:hash,metadataVersion:2,origin:'agency_generated',lifecycle:'final',author:'Autore dichiarato',title:'Prospetto DEMO',surface:surface()});
const docs=()=>({practiceId:id(3),revision:5,documents:[{sourceId:'source/demo',sourceVersion:3,sha256:hash,filename:'prospetto.pdf',state:'current',metadataVersion:2,descriptor:descriptor()}],certification:false});
const preview=()=>({id:id(4),version:1,state:'invited',agencyName:'Agenzia DEMO',documents:[{title:'Prospetto DEMO',author:'Autore dichiarato',origin:'agency_generated',lifecycle:'final',signatureVerification:'not_assessed',surface:surface()}],annualBenefit:{requested:false}});
const benefit=()=>({schemaVersion:1,id:id(8),receiptId:id(7),accountId:id(1),offerId:'dimora-full-access-v1',offerVersion:1,startsAt:at,endsAt:'2025-02-28T12:00:00.000Z'});
const accepted=()=>({jobId:id(5),state:'accepted',receiptId:id(7),receiptVersion:1,replay:true,homeId:id(6),acceptedAt:at,documents:[{documentId:id(9),sha256:hash}],benefit:benefit(),createsHome:true,activatesBenefit:true});
const pending=()=>({jobId:id(5),state:'queued',version:1,replay:false,createsHome:false,activatesBenefit:false,progress:{total:1,admitted:0}});
const list=()=>({practiceId:id(3),accepted:false,invitations:[{id:id(4),version:1,state:'invited',createdAt:'2026-10-31T00:00:00.000Z',expiresAt:'2026-11-07T00:00:00.000Z',recipientEmail:'recipient@example.test'}]});
const parsers:Array<{parse:(v:unknown)=>unknown;make:()=>Record<string,unknown>}>= [
 {parse:W.parseGiftCapabilities,make:()=>({enabled:true,requiresVerifiedEmail:true})},
 {parse:W.parseGiftBenefits,make:()=>({fullAccess:true,scope:'all_owner_features',validUntil:at})},
 {parse:W.parseGiftDocuments,make:docs},{parse:W.parseGiftRelease,make:()=>({replay:false,metadata:docs()})},
 {parse:W.parseGiftInvitationCreated,make:()=>({id:id(4),version:1,state:'invited',secret,replay:false,requiresReissue:false})},
 {parse:W.parseGiftInvitations,make:list},{parse:W.parseGiftLanding,make:()=>({id:id(4),version:1,requiresAccount:true})},
 {parse:W.parseGiftPreview,make:preview},{parse:W.parseGiftClaim,make:()=>({id:id(4),version:2,state:'claimed',replay:false})},
 {parse:W.parseGiftRevocation,make:()=>({id:id(4),version:3,state:'revoked',replay:false})},
 {parse:W.parseGiftAcceptance,make:accepted},{parse:W.parseGiftResume,make:()=>({state:'not_started'})},
 {parse:W.parseGiftCancellation,make:()=>({jobId:id(5),state:'cancelled',replay:false})},
];
const rejected=(parse:(v:unknown)=>unknown,value:unknown)=>expect(()=>parse(value)).toThrowError(expect.objectContaining({kind:'service',status:200}));

describe('strict Gift HTTP wire projections',()=>{
 it('accepts every current HTTP DTO and keeps field projections exact',()=>{for(const row of parsers)expect(row.parse(row.make())).toEqual(row.make());});
 it('rejects private, unexpected and transport-authority fields at every top-level boundary',()=>{
  for(const row of parsers)for(const key of ['tokenHash','sourceFingerprint','packet','ledger','storageKey','accountProof','certified'])rejected(row.parse,{...row.make(),[key]:'injected'});
 });
 it('rejects missing fields, nonplain objects, accessors and hidden/symbol fields without evaluating getters',()=>{
  for(const row of parsers){const value=row.make(),key=Object.keys(value)[0]!;for(const bad of [null,[],new Date(),Object.assign(Object.create(null),value)])rejected(row.parse,bad);
   const absent={...value};delete absent[key];rejected(row.parse,absent);const hidden={...value};Object.defineProperty(hidden,key,{enumerable:false,value:0});rejected(row.parse,hidden);
   let touched=false;const getter={...value};Object.defineProperty(getter,key,{enumerable:true,get(){touched=true;return value[key];}});rejected(row.parse,getter);expect(touched).toBe(false);
   const symbol={...value,[Symbol('private')]:'injected'};rejected(row.parse,symbol);
  }
 });
 it('keeps stale/missing metadata thin and enforces current source, metadata version, SHA and practice coherence',()=>{
  const thin={practiceId:id(3),revision:1,documents:[{sourceId:'missing',sourceVersion:1,sha256:hash,filename:'file.pdf',state:'missing'},{sourceId:'stale',sourceVersion:2,sha256:hash,filename:'new.pdf',state:'stale'}],certification:false};expect(W.parseGiftDocuments(thin)).toEqual(thin);
  for(const change of [{sourceVersion:4},{sha256:'b'.repeat(64)},{metadataVersion:9},{practiceId:id(99)}]){const d=docs();Object.assign(d.documents[0]!.descriptor,change);rejected(W.parseGiftDocuments,d);}
  const d={...thin,documents:[{...thin.documents[0],descriptor:descriptor()}]};rejected(W.parseGiftDocuments,d);rejected(W.parseGiftDocuments,{...docs(),certification:true});
 });
 it('release exposes only replay and metadata, never registry receipts, keys or audit identities',()=>{
  expect(W.parseGiftRelease({replay:true,metadata:docs()}).replay).toBe(true);rejected(W.parseGiftRelease,{replay:false,metadata:docs(),receipt:{key:'private',accountId:id(1),digest:hash}});
 });
 it('preserves estimated caveats and declared author without promoting signature or surface qualifications',()=>{
  const out=W.parseGiftPreview(preview());expect(out.documents[0]!.surface).toEqual(surface());expect(out.documents[0]!.signatureVerification).toBe('not_assessed');expect(out.documents[0]!.author).toBe('Autore dichiarato');
  for(const change of [{caveats:[]},{caveats:['same','same']},{qualification:'certified'},{method:''},{geometryRevision:0},{verified:true}]){const p=preview();Object.assign(p.documents[0]!.surface,change);rejected(W.parseGiftPreview,p);}
  const p=preview();p.documents[0]!.signatureVerification='verified';rejected(W.parseGiftPreview,p);p.documents[0]!.signatureVerification='not_assessed';p.documents[0]!.lifecycle='draft';rejected(W.parseGiftPreview,p);
 });
 it('rejects sparse/accessor/extra-key arrays and duplicate document or invitation proofs',()=>{
  const p=preview();p.documents=Array(1);rejected(W.parseGiftPreview,p);const d=docs();d.documents.push(structuredClone(d.documents[0]!));rejected(W.parseGiftDocuments,d);const l=list();l.invitations.push({...l.invitations[0]!});rejected(W.parseGiftInvitations,l);
  let touched=false;const a=accepted();Object.defineProperty(a.documents,'0',{enumerable:true,get(){touched=true;return {documentId:id(9),sha256:hash};}});rejected(W.parseGiftAcceptance,a);expect(touched).toBe(false);
  const extra=preview();Object.assign(extra.documents,{other:'hidden'});rejected(W.parseGiftPreview,extra);const many=preview();many.documents=Array.from({length:51},()=>preview().documents[0]!);rejected(W.parseGiftPreview,many);
 });
 it('clones nested metadata and arrays instead of returning mutable response aliases',()=>{
  const input=docs(),out=W.parseGiftDocuments(input),row=out.documents[0]!;expect(row.state).toBe('current');if(row.state==='current')row.descriptor.surface!.caveats.push('changed');expect(input.documents[0]!.descriptor.surface.caveats).toEqual(surface().caveats);
  const p=preview(),copy=W.parseGiftPreview(p);copy.documents[0]!.surface!.caveats.push('changed');expect(p.documents[0]!.surface.caveats).toEqual(surface().caveats);
 });
 it('models annual false as only requested:false and freezes the true full-access offer before activation',()=>{
  expect(W.parseGiftPreview(preview()).annualBenefit).toEqual({requested:false});for(const bad of [{requested:false,activated:false},{requested:false,offerId:'dimora-full-access-v1'},{requested:true,offerId:'other',offerVersion:1,activated:false},{requested:true,offerId:'dimora-full-access-v1',offerVersion:1,activated:true}])rejected(W.parseGiftPreview,{...preview(),annualBenefit:bad});
  const annual={requested:true,offerId:'dimora-full-access-v1',offerVersion:1,activated:false};expect(W.parseGiftPreview({...preview(),annualBenefit:annual}).annualBenefit).toEqual(annual);
 });
 it('accepts a new personal secret only once and requires reissue for a null-secret replay',()=>{
  expect(W.parseGiftInvitationCreated({id:id(4),version:2,state:'claimed',secret:null,replay:true,requiresReissue:true}).secret).toBeNull();
  for(const change of [{replay:true},{secret:null},{requiresReissue:true},{version:2},{state:'claimed'},{secret:secret+'\n'}])rejected(W.parseGiftInvitationCreated,{id:id(4),version:1,state:'invited',secret,replay:false,requiresReissue:false,...change});
 });
 it('validates canonical IDs, date order, normalized emails, hashes and bounded labels',()=>{
  for(const change of [{createdAt:'2026-10-31T00:00:00Z'},{expiresAt:'2026-10-30T00:00:00.000Z'},{recipientEmail:'UPPER@example.test'},{id:'bad'},{version:0}]){const l=list();Object.assign(l.invitations[0]!,change);rejected(W.parseGiftInvitations,l);}
  const d=docs();d.documents[0]!.sha256='A'.repeat(64);rejected(W.parseGiftDocuments,d);for(const agencyName of ['', 'a'.repeat(201),'Bad\nname'])rejected(W.parseGiftPreview,{...preview(),agencyName});
 });
 it('binds the accepted benefit to the receipt and acceptance instant and preserves the leap-year anniversary',()=>{
  const a=W.parseGiftAcceptance(accepted());expect(a.state).toBe('accepted');if(a.state==='accepted')expect(a.benefit?.endsAt).toBe('2025-02-28T12:00:00.000Z');
  for(const change of [{receiptId:id(99)},{startsAt:'2024-02-28T12:00:00.000Z'},{endsAt:'2025-03-01T12:00:00.000Z'},{offerVersion:2},{offerId:'other'}]){const bad=accepted();Object.assign(bad.benefit,change);rejected(W.parseGiftAcceptance,bad);}
 });
 it('rejects contradictory accepted flags, duplicate targets, private source paths and malformed owner references',()=>{
  for(const change of [{createsHome:false},{activatesBenefit:false},{receiptVersion:2},{homeId:'bad'},{version:9}])rejected(W.parseGiftAcceptance,{...accepted(),...change});
  const a=accepted();a.documents.push({...a.documents[0]!});rejected(W.parseGiftAcceptance,a);rejected(W.parseGiftAcceptance,{...accepted(),documents:[{documentId:id(9),sha256:hash,storageKey:'private'}]});
  expect(W.parseGiftAcceptance({...accepted(),benefit:null,activatesBenefit:false}).state).toBe('accepted');
 });
 it('keeps pending progress bounded and separate from the minimal cancel action DTO',()=>{
  expect(W.parseGiftAcceptance(pending()).state).toBe('queued');for(const change of [{createsHome:true},{activatesBenefit:true},{homeId:id(6)},{state:'unknown'},{progress:{total:1,admitted:2}},{progress:{total:0,admitted:0}}])rejected(W.parseGiftAcceptance,{...pending(),...change});
  expect(W.parseGiftAcceptance({...pending(),state:'cancelled',progress:{total:0,admitted:0}}).state).toBe('cancelled');rejected(W.parseGiftCancellation,{...pending(),state:'cancelled'});rejected(W.parseGiftAcceptance,{jobId:id(5),state:'cancelled',replay:false});
 });
 it('does not infer current active entitlement from the client clock or accept contradictory free flags',()=>{
  expect(W.parseGiftBenefits({fullAccess:true,scope:'all_owner_features',validUntil:at}).fullAccess).toBe(true);expect(W.parseGiftBenefits({fullAccess:false,scope:'all_owner_features',validUntil:null}).fullAccess).toBe(false);
  for(const bad of [{fullAccess:false,scope:'all_owner_features',validUntil:at},{fullAccess:true,scope:'all_owner_features',validUntil:null},{fullAccess:true,scope:'admin',validUntil:at}])rejected(W.parseGiftBenefits,bad);
 });
 it('accepts only the exact token-free not_started resolver, not arbitrary empty fallbacks',()=>{
  expect(W.parseGiftResume({state:'not_started'})).toEqual({state:'not_started'});rejected(W.parseGiftResume,{});rejected(W.parseGiftResume,{state:'not_started',homeId:id(6)});rejected(W.parseGiftLanding,{id:id(4),version:1,requiresAccount:false});
 });
 it('accepts a dense catalogue with more than 500 missing sources without inventing a server pagination limit',()=>{
  const catalogue={practiceId:id(3),revision:900,documents:Array.from({length:501},(_,i)=>({sourceId:'catalogue-source-'+i,sourceVersion:1,sha256:hash,filename:'file-'+i+'.pdf',state:'missing'})),certification:false};
  const parsed=W.parseGiftDocuments(catalogue);expect(parsed.documents).toHaveLength(501);expect(parsed.documents[500]!.sourceId).toBe('catalogue-source-500');
 });
});
