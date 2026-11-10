import {serviceError} from './errors';
import type {DocumentSummary,GiftDocumentProvenance} from './types';
function invalid():never{throw serviceError(200);}
function object(v:unknown,keys:string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))invalid();
 return v as Record<string,unknown>;
}
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32))invalid();return v.trim();}
function positive(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<1)invalid();return Number(v);}
function classification(input:unknown):NonNullable<GiftDocumentProvenance['classification']>{
 const r=object(input,['policyVersion','sourceKind','documentKind','family']);
 const mappings={floor_plan:['floor_plan','building'],ape:['ape','energy'],deed:[null,'property'],succession:[null,'property'],cadastral:[null,'building'],unclassified:[null,'unclassified'],other:[null,'unclassified']} as const;
 if(r.policyVersion!==1||typeof r.sourceKind!=='string'||!Object.hasOwn(mappings,r.sourceKind))invalid();
 const sourceKind=r.sourceKind as NonNullable<GiftDocumentProvenance['classification']>['sourceKind'],[documentKind,family]=mappings[sourceKind];
 if(r.documentKind!==documentKind||r.family!==family)invalid();
 return {policyVersion:1,sourceKind,documentKind,family};
}
/** Narrow validation for the new origin; existing manual response contract is unchanged. */
export function parseGiftDocumentProvenance(input:unknown):GiftDocumentProvenance{
 const p=object(input,['schemaVersion','kind','invitationId','agencyId','practiceId','sourceId','sourceVersion','sourceSha256','metadataVersion','origin','author','title','surface','classification']);
 if(p.schemaVersion!==1||p.kind!=='agency_gift'||typeof p.origin!=='string'||!['received','agency_generated'].includes(p.origin)||typeof p.sourceSha256!=='string'||!/^[a-f0-9]{64}$/u.test(p.sourceSha256))invalid();
 let surface:GiftDocumentProvenance['surface'];
 if(p.surface!==undefined){
  const s=object(p.surface,['kind','qualification','method','geometryRevision','caveats']);
  if(typeof s.kind!=='string'||!['net','cadastral','commercial'].includes(s.kind)||typeof s.qualification!=='string'||!['estimated','reviewed','unverified'].includes(s.qualification)||!Array.isArray(s.caveats)||s.caveats.length>30)invalid();
  const caveats=Array.from(s.caveats).map(c=>text(c,500));if(new Set(caveats).size!==caveats.length||s.qualification==='estimated'&&!caveats.length)invalid();
  surface={kind:s.kind as NonNullable<GiftDocumentProvenance['surface']>['kind'],qualification:s.qualification as NonNullable<GiftDocumentProvenance['surface']>['qualification'],method:text(s.method,200),geometryRevision:positive(s.geometryRevision),caveats};
 }
 return {schemaVersion:1,kind:'agency_gift',invitationId:text(p.invitationId,100),agencyId:text(p.agencyId,100),practiceId:text(p.practiceId,100),sourceId:text(p.sourceId,100),sourceVersion:positive(p.sourceVersion),sourceSha256:p.sourceSha256,metadataVersion:positive(p.metadataVersion),origin:p.origin as GiftDocumentProvenance['origin'],author:text(p.author,200),title:text(p.title,300),...(p.classification!==undefined?{classification:classification(p.classification)}:{}),...(surface?{surface}:{})};
}
export function validateGiftDocumentWire<T extends DocumentSummary>(doc:T,detail:boolean):T{
 if(!doc||typeof doc!=='object'||Array.isArray(doc))invalid();
 if(doc.source!==undefined&&doc.source!=='manual_upload'&&doc.source!=='agency_gift')invalid();
 const wire=doc as T&{giftProvenance?:unknown;sha256?:unknown};
 if(doc.source!=='agency_gift'){
  if(wire.giftProvenance!==undefined&&wire.giftProvenance!==null)invalid();
  return doc;
 }
 if(wire.giftProvenance===undefined||wire.giftProvenance===null){if(detail)invalid();return doc;}
 const giftProvenance=parseGiftDocumentProvenance(wire.giftProvenance);
 if(detail&&wire.sha256!==giftProvenance.sourceSha256)invalid();
 return {...doc,giftProvenance};
}
