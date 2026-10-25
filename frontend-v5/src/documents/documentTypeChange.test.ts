import {expect,it} from 'vitest';
import type {DocumentDetail} from '../api/types';
import type {BatchWire} from '../intake-integration/client';
import {documentTypePayload,sameTypeSource,TYPE_CHANGED} from './documentTypeChange';
const doc=():DocumentDetail=>({id:'doc',homeId:'home',name:'Titolo scelto',originalFilename:'file.pdf',mimeType:'application/pdf',byteSize:100,createdAt:'2026-01-01',version:1,source:'manual_upload',status:'stored',visibility:'private',permissions:['read'],sha256:'a'.repeat(64),organization:null});
function batch(d:DocumentDetail):BatchWire{return {id:'batch',homeId:d.homeId,version:4,state:'open',permissions:['read','edit'],limits:{maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},items:[{id:'item',clientItemId:'client',version:2,filename:'file.pdf',byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'not_started',reviewState:'unreviewed',pageCount:null,proposal:null,selection:null,organization:d.organization??null,organizationVersion:d.organization?.version??0,duplicate:null,error:null,documentLink:{state:'linked',document:{id:d.id,name:d.name}},permissions:['read','edit']}]};}
it('new type binds observed versions and changes only organization, no expense/object/analysis',()=>{
 const d=doc();expect(documentTypePayload(d,['utility_bill'],batch(d))).toEqual({batchId:'batch',expectedVersion:4,mode:'single',items:[{itemId:'item',expectedVersion:2,expectedOrganizationVersion:0,replaceOrganization:false,selection:{action:'organize',title:'Titolo scelto',parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],target:{kind:'home'}}}]});
});
it('composite document keeps chosen title and every page range; explicit replacement only of observed organization',()=>{
 const d=doc();d.organization={version:3,title:'Titolo confermato',parts:[{kind:'invoice',pageFrom:1,pageTo:2},{kind:'manual',pageFrom:3,pageTo:7}],collections:['purchases'],origin:'user_declared',updatedAt:'2026-01-01'};
 const item=documentTypePayload(d,['utility_bill','warranty'],batch(d)).items[0]!;expect(item.replaceOrganization).toBe(true);expect(item.expectedOrganizationVersion).toBe(3);expect(item.selection).toEqual({action:'organize',title:'Titolo confermato',parts:[{kind:'utility_bill',pageFrom:1,pageTo:2},{kind:'warranty',pageFrom:3,pageTo:7}],target:{kind:'home'}});
 expect(d.organization.parts[0]?.kind).toBe('invoice');
});
it.each(['home','no-edit','missing','hidden','wrong-doc','item-no-edit','confirmed','running','uncertain','org-changed','selection','version-stale'])('refuses %s before organization write',change=>{
 const d=doc(),b=batch(d),item=b.items[0]!;
 if(change==='home')b.homeId='other';if(change==='no-edit')b.permissions=['read'];if(change==='missing')b.items=[];if(change==='hidden')item.documentLink={state:'unavailable',document:null};if(change==='wrong-doc')item.documentLink.document!.id='other';if(change==='item-no-edit')item.permissions=['read'];if(change==='confirmed')item.reviewState='confirmed';if(change==='running')item.analysisState='running';if(change==='uncertain')item.analysisState='uncertain';if(change==='org-changed')item.organizationVersion=2;if(change==='selection')item.selection={action:'defer'};if(change==='version-stale')item.selectionStale=true;
 expect(()=>documentTypePayload(d,['utility_bill'],b)).toThrow(TYPE_CHANGED);
});
it('invalid kind or mismatched part count cannot silently replace classification',()=>{for(const kinds of [[],['invented'],['utility_bill','invoice']])expect(()=>documentTypePayload(doc(),kinds,batch(doc()))).toThrow('Scegli un tipo');});
it('source check rejects changed SHA, home, permissions, source and organization',()=>{
 const d=doc();expect(sameTypeSource(d,structuredClone(d))).toBe(true);
 for(const patch of [{sha256:'b'.repeat(64)},{homeId:'other'},{id:'other'},{permissions:[]},{name:'Renamed'},{sha256:'bad'}])expect(sameTypeSource(d,{...d,...patch})).toBe(false);
 const organized={...d,organization:{version:1,title:d.name,parts:[{kind:'invoice',pageFrom:null,pageTo:null}],collections:['purchases'] as const,origin:'user_declared' as const,updatedAt:'2026-01-01'}} as DocumentDetail;
 expect(sameTypeSource(d,organized)).toBe(false);
});
