import {storageUnavailable} from './storage';

/** Immutable origin of the selected source copied into this Home, not a grant or certification. */
export type GiftDocumentProvenance={
 schemaVersion:1;kind:'agency_gift';invitationId:string;agencyId:string;practiceId:string;
 sourceId:string;sourceVersion:number;sourceSha256:string;metadataVersion:number;
 origin:'received'|'agency_generated';author:string;title:string;
 surface?:{kind:'net'|'cadastral'|'commercial';qualification:'estimated'|'reviewed'|'unverified';method:string;geometryRevision:number;caveats:string[]};
};
function invalid():never{throw storageUnavailable();}
function object(v:unknown,keys:string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))invalid();
 return v as Record<string,unknown>;
}
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32))invalid();return v.trim();}
function positive(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<1)invalid();return Number(v);}
export function parseGiftDocumentProvenance(input:unknown):GiftDocumentProvenance|null{
 if(input===null||input===undefined)return null;
 const p=object(input,['schemaVersion','kind','invitationId','agencyId','practiceId','sourceId','sourceVersion','sourceSha256','metadataVersion','origin','author','title','surface']);
 if(p.schemaVersion!==1||p.kind!=='agency_gift'||(typeof p.origin!=='string'||!['received','agency_generated'].includes(p.origin))||typeof p.sourceSha256!=='string'||!/^[a-f0-9]{64}$/u.test(p.sourceSha256))invalid();
 let surface:GiftDocumentProvenance['surface'];
 if(p.surface!==undefined){
  const s=object(p.surface,['kind','qualification','method','geometryRevision','caveats']);
  if((typeof s.kind!=='string'||!['net','cadastral','commercial'].includes(s.kind))||(typeof s.qualification!=='string'||!['estimated','reviewed','unverified'].includes(s.qualification))||!Array.isArray(s.caveats)||s.caveats.length>30)invalid();
  const caveats=Array.from(s.caveats).map(c=>text(c,500));
  if(new Set(caveats).size!==caveats.length||s.qualification==='estimated'&&!caveats.length)invalid();
  surface={kind:s.kind as NonNullable<GiftDocumentProvenance['surface']>['kind'],qualification:s.qualification as NonNullable<GiftDocumentProvenance['surface']>['qualification'],method:text(s.method,200),geometryRevision:positive(s.geometryRevision),caveats};
 }
 return {schemaVersion:1,kind:'agency_gift',invitationId:text(p.invitationId,100),agencyId:text(p.agencyId,100),practiceId:text(p.practiceId,100),sourceId:text(p.sourceId,100),sourceVersion:positive(p.sourceVersion),sourceSha256:p.sourceSha256,metadataVersion:positive(p.metadataVersion),origin:p.origin as GiftDocumentProvenance['origin'],author:text(p.author,200),title:text(p.title,300),...(surface?{surface}:{})};
}
