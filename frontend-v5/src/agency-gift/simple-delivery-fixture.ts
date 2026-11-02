import {vi} from 'vitest';
import type {AgencyGiftPanelProps} from './AgencyGiftPanel';
import type {GiftDocuments,GiftInvitations,GiftInvitationCreated,GiftRelease} from './gift-wire';
import type {GiftReleaseInput} from './gift-api';
export const demoId=(n:number)=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
export const simpleScope={accountId:demoId(1),agencyId:demoId(2),practiceId:demoId(3)};
export function simpleDocuments():GiftDocuments{return {practiceId:simpleScope.practiceId,revision:7,certification:false,documents:[
 {sourceId:'final',sourceVersion:1,sha256:'a'.repeat(64),filename:'APE.pdf',state:'current',metadataVersion:5,descriptor:{agencyId:simpleScope.agencyId,practiceId:simpleScope.practiceId,sourceId:'final',sourceVersion:1,sha256:'a'.repeat(64),metadataVersion:5,origin:'agency_generated',lifecycle:'final',author:'Agenzia DEMO',title:'APE della casa'}},
 {sourceId:'plan',sourceVersion:1,sha256:'b'.repeat(64),filename:'Planimetria.pdf',state:'missing',digitalPlans:[{id:'plan-demo',version:3,geometryRevision:2,roomCount:3,pending:false}]},
 {sourceId:'stale',sourceVersion:2,sha256:'c'.repeat(64),filename:'Documento aggiornato.pdf',state:'stale'},
 {sourceId:'draft',sourceVersion:1,sha256:'d'.repeat(64),filename:'Bozza.pdf',state:'current',metadataVersion:1,descriptor:{agencyId:simpleScope.agencyId,practiceId:simpleScope.practiceId,sourceId:'draft',sourceVersion:1,sha256:'d'.repeat(64),metadataVersion:1,origin:'received',lifecycle:'draft',author:'Agenzia DEMO',title:'Bozza'}}
 ]};}
export function simpleApi(){
 let documents=simpleDocuments(),invitations:GiftInvitations={practiceId:simpleScope.practiceId,accepted:false,invitations:[]};
 const releases=new Map<string,GiftRelease>(),creates=new Map<string,GiftInvitationCreated>();
 const release=(sourceId:string,body:GiftReleaseInput,key:string)=>{
  if(releases.has(key))return structuredClone(releases.get(key)!);
  const row=documents.documents.find(r=>r.sourceId===sourceId)!;documents={...documents,revision:documents.revision+1,documents:documents.documents.map(r=>r===row?{...r,state:'current' as const,metadataVersion:1,descriptor:{agencyId:simpleScope.agencyId,practiceId:simpleScope.practiceId,sourceId:row.sourceId,sourceVersion:row.sourceVersion,sha256:row.sha256,metadataVersion:1,origin:body.origin,lifecycle:'final' as const,author:'Autore non verificato',title:body.title,...(body.digitalPlan?{digitalPlan:{planId:body.digitalPlan.planId,geometryRevision:2,page:1,roomCount:3,qualification:'reviewed' as const,caveats:[]}}:{})}}:r)};
  const out={replay:false,metadata:structuredClone(documents)};releases.set(key,out);return out;
 };
 const api={
  documents:vi.fn<AgencyGiftPanelProps['api']['documents']>().mockImplementation(async()=>structuredClone(documents)),
  listInvitations:vi.fn<AgencyGiftPanelProps['api']['listInvitations']>().mockImplementation(async()=>structuredClone(invitations)),
  releaseDocument:vi.fn<AgencyGiftPanelProps['api']['releaseDocument']>().mockImplementation(async(_s,id,body,key)=>release(id,body,key)),
  createInvitation:vi.fn<AgencyGiftPanelProps['api']['createInvitation']>().mockImplementation(async(_s,body,key)=>{if(creates.has(key))return {...creates.get(key)!,secret:null,replay:true,requiresReissue:true};const result:GiftInvitationCreated={id:demoId(5),version:1,state:'invited',secret:'S'.repeat(43),replay:false,requiresReissue:false};creates.set(key,result);invitations={...invitations,invitations:[{id:result.id,version:1,state:'invited',recipientEmail:body.recipientEmail,createdAt:'2026-11-03T00:00:00.000Z',expiresAt:'2026-11-10T00:00:00.000Z'}]};return result;}),
  reissueInvitation:vi.fn<AgencyGiftPanelProps['api']['reissueInvitation']>().mockResolvedValue({id:demoId(6),version:1,state:'invited',secret:'T'.repeat(43),replay:false,requiresReissue:false}),
  revokeInvitation:vi.fn<AgencyGiftPanelProps['api']['revokeInvitation']>().mockImplementation(async(_s,id)=>{invitations={...invitations,invitations:invitations.invitations.map(i=>i.id===id?{...i,state:'revoked' as const,version:i.version+1}:i)};return {id,version:2,state:'revoked',replay:false};})
 };
 return {api,replaceDocuments:(next:GiftDocuments)=>{documents=next;},replaceInvitations:(next:GiftInvitations)=>{invitations=next;},currentDocuments:()=>structuredClone(documents),currentInvitations:()=>structuredClone(invitations)};
}
