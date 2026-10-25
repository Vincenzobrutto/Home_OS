import {expect,it,vi} from 'vitest';
import type {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {BatchWire} from '../intake-integration/client';
import {seededBackend} from '../test/harness';
import {createStandaloneBillPreparation} from './standaloneBillPreparation';

async function world(){
 const {backend,a,homeA1}=seededBackend(),source=await backend.seedDocument({homeId:homeA1.id,uploaderId:a.id,name:'Documento di prova',sha256:'a'.repeat(64)});
 const snapshot={documentId:source.id,documentVersion:1,sha256:source.sha256};
 const batch:BatchWire={id:'batch',homeId:homeA1.id,version:1,state:'open',limits:{maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']},permissions:['read','edit'],items:[{id:'item',clientItemId:source.id,version:1,filename:source.originalFilename,byteSize:source.byteSize,mimeType:source.mimeType,uploadState:'stored',analysisState:'not_started',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:source.id,name:source.name}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']}]};
 let active=true;
 const read=vi.fn(async()=>structuredClone(source));
 const call=vi.fn(async(path:string,options:{body?:unknown;idempotencyKey?:string;accountId?:string}):Promise<unknown>=>{
  expect(options.accountId).toBe(a.id);
  if(path.endsWith('/batches/from-documents')){expect(options.body).toEqual({documentIds:[source.id]});return {batch};}
  expect(path).toBe(`/homes/${homeA1.id}/document-intake/batches/batch/organizations`);
  const body=options.body as {items:Array<{selection:{title:string;parts:Array<{kind:string;pageFrom:null;pageTo:null}>}}>};
  source.organization={version:1,title:body.items[0]!.selection.title,parts:body.items[0]!.selection.parts,collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-17T00:00:00.000Z',documentVersion:1,documentSha256:source.sha256};
  return {batch,results:{item:{state:'confirmed'}}};
 });
 const api={getDocument:read,callJson:call} as unknown as ApiClient;
 const prepare=createStandaloneBillPreparation({api,accountId:a.id,homeId:homeA1.id,documentId:source.id,isCurrent:()=>active});
 return {prepare,source,snapshot,batch,read,call,setActive:(value:boolean)=>{active=value;}};
}
it('does nothing until an explicit confirmation and uses the canonical organization protocol',async()=>{
 const w=await world();expect(w.call).not.toHaveBeenCalled();expect(w.read).not.toHaveBeenCalled();
 await w.prepare(w.snapshot,'Bolletta da confermare');
 expect(w.call).toHaveBeenCalledTimes(2);expect(w.read).toHaveBeenCalledTimes(3);
 expect(w.call.mock.calls[1]![1].body).toEqual({expectedVersion:1,mode:'single',items:[{itemId:'item',expectedVersion:1,expectedOrganizationVersion:0,replaceOrganization:false,selection:{action:'organize',title:'Bolletta da confermare',parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],target:{kind:'home'}}}]});
 expect(w.source.organization?.parts[0]?.kind).toBe('utility_bill');
 await w.prepare(w.snapshot,'Un titolo diverso');expect(w.call).toHaveBeenCalledTimes(2);expect(w.source.organization?.title).toBe('Bolletta da confermare');
});
it.each(['id','version','sha'] as const)('rejects a mismatched %s without preparing or writing',async(field)=>{
 const w=await world();if(field==='id')w.snapshot.documentId='another-source';if(field==='version')w.snapshot.documentVersion=2;if(field==='sha')w.source.sha256='b'.repeat(64);
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).not.toHaveBeenCalled();
});
it('rejects a private or revoked source before any write',async()=>{
 const w=await world();w.read.mockRejectedValue(new ApiError({kind:'http',status:403,code:'forbidden',message:'Accesso non consentito.'}));
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({status:403});expect(w.call).not.toHaveBeenCalled();
});
it('keeps a changed source out of the organization after preparing a batch',async()=>{
 const w=await world();const original=w.call.getMockImplementation()!;w.call.mockImplementation(async(path,options)=>{const response=await original(path,options);if(path.endsWith('/from-documents'))w.source.sha256='b'.repeat(64);return response;});
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).toHaveBeenCalledTimes(1);expect(w.source.organization).toBeUndefined();
});
it('does not replace a different confirmed document type',async()=>{
 const w=await world();w.source.organization={version:2,title:'Titolo confermato',parts:[{kind:'invoice',pageFrom:null,pageTo:null}],collections:['purchases'],origin:'user_declared',updatedAt:'2026-01-17T00:00:00.000Z'};
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).not.toHaveBeenCalled();expect(w.source.organization.title).toBe('Titolo confermato');
});
it.each(['unavailable','other-document','readonly','uncertain','proposal','deferred'] as const)('refuses an unusable batch source: %s',async(reason)=>{
 const w=await world(),item=w.batch.items[0]!;
 if(reason==='unavailable'){item.documentLink={state:'unavailable',document:null};item.filename=null;item.byteSize=null;item.mimeType=null;item.permissions=[];}
 if(reason==='other-document')item.documentLink.document!.id='another-document';
 if(reason==='readonly')item.permissions=['read'];
 if(reason==='uncertain')item.analysisState='uncertain';
 if(reason==='proposal')item.proposal={title:'Proposta locale da rivedere',parts:[{kind:'invoice',pageFrom:1,pageTo:1}],sources:[]};
 if(reason==='deferred')item.reviewState='deferred';
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).toHaveBeenCalledTimes(1);
});
it.each(['rejected','missing'] as const)('does not treat a %s organization result as confirmed',async(state)=>{
 const w=await world(),original=w.call.getMockImplementation()!;
 w.call.mockImplementation(async(path,options)=>path.endsWith('/organizations')?{batch:w.batch,results:state==='missing'?{}:{item:{state:'rejected'}}}:original(path,options));
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).toHaveBeenCalledTimes(2);expect(w.source.organization).toBeUndefined();
});
it('retains the exact organization body and key after an uncertain response; never retries itself',async()=>{
 const w=await world(),original=w.call.getMockImplementation()!;let lost=true;
 w.call.mockImplementation(async(path,options)=>{if(path.endsWith('/organizations')&&lost){lost=false;throw new TypeError('response lost');}return original(path,options);});
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toThrow('response lost');expect(w.call).toHaveBeenCalledTimes(2);
 const request=structuredClone(w.call.mock.calls[1]);
 await w.prepare(w.snapshot,'Bolletta');expect(w.call).toHaveBeenCalledTimes(3);expect(w.call.mock.calls[2]).toEqual(request);
});
it('does not send a changed title with a pending organization key',async()=>{
 const w=await world(),original=w.call.getMockImplementation()!;w.call.mockImplementation(async(path,options)=>{if(path.endsWith('/organizations'))throw new TypeError('response lost');return original(path,options);});
 await expect(w.prepare(w.snapshot,'Prima scelta')).rejects.toThrow();await expect(w.prepare(w.snapshot,'Scelta diversa')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).toHaveBeenCalledTimes(2);
});
it('stops if the account or page changes while preparing the context',async()=>{
 const w=await world(),original=w.call.getMockImplementation()!;w.call.mockImplementation(async(path,options)=>{const response=await original(path,options);w.setActive(false);return response;});
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).toHaveBeenCalledTimes(1);
});
it('checks read access again after the organization before allowing expense confirmation',async()=>{
 const w=await world(),original=w.read.getMockImplementation()!;w.read.mockImplementation(async()=>{if(w.call.mock.calls.length===2)throw new ApiError({kind:'http',status:403,code:'forbidden',message:'Accesso non consentito.'});return original();});
 await expect(w.prepare(w.snapshot,'Bolletta')).rejects.toMatchObject({status:403});expect(w.call).toHaveBeenCalledTimes(2);
});
it.each(['','x'.repeat(121)])('does not truncate or save an invalid document title',async(title)=>{
 const w=await world();await expect(w.prepare(w.snapshot,title)).rejects.toMatchObject({code:'intake_preparation_required'});expect(w.call).not.toHaveBeenCalled();
});
