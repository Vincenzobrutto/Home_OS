import {screen,within} from '@testing-library/react';
import {expect,it} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import type {DocumentsPage,DocumentSummary} from '../api/types';

it('archive names completed bills with partial facts while preserving originals and performing no writes or per-document reads',async()=>{
 await import('../routes/DocumentsPages');
 const {backend,a,homeA1:home}=seededBackend(),control=createFakeFetch(backend);
 const filenames=['supplier.pdf','month.pdf','a'.repeat(32)+'.pdf','multiple.pdf'];
 const documents=[];
 for(const name of filenames)documents.push(await backend.seedDocument({homeId:home.id,uploaderId:a.id,name,originalFilename:name,workflowState:'completed'}));
 const expense={id:'e1',title:'Testo da non dedurre',supplier:'Fornitore qualsiasi',invoiceMonth:'2026-09',amountCents:100,documentNumber:null,documentDate:'2026-10-03'};
 const projection=(d:DocumentSummary):DocumentSummary=>{
  const index=filenames.indexOf(d.name);
  return {...d,family:'utilities',organization:{title:d.name,version:1,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-01'},savedExpenses:index===0?[{...expense,invoiceMonth:undefined}]:index===1?[{...expense,supplier:null}]:index===2?[]:[expense,{...expense,id:'e2',supplier:'Altro fornitore',invoiceMonth:'2026-10'}]};
 };
 const session=await control.fetch('/api/v5/session',{credentials:'include'}),{csrfToken}=await session.json() as {csrfToken:string};
 await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:'a@example.test',password:PASSWORD_A})});
 const app=renderApp({path:`/home/${home.id}/documenti?workflow=all&view=archive&group=utilities`,backend,fetch:async(url,init)=>{
  const parsed=new URL(url,'http://mock.invalid'),list=parsed.pathname.endsWith('/documents');
  if(list)for(const key of ['view','group','related'])parsed.searchParams.delete(key);
  const response=await control.fetch(list?parsed.pathname+parsed.search:url,init);
  if(parsed.pathname.endsWith('/document-search-capabilities')&&response.status===200)return Response.json({...await response.json() as object,documentViews:true,documentFamilies:true});
  if(list&&response.status===200&&(init.method??'GET')==='GET'){
   const page=await response.json() as DocumentsPage;return Response.json({...page,items:page.items.map(projection),summary:{views:{all:4,house:4,objects:0},groups:{utilities:4}}});
  }return response;
 }});
 const supplier=await screen.findByRole('link',{name:'Bolletta Fornitore qualsiasi'});
 expect(supplier).toHaveAttribute('href',`/home/${home.id}/documenti/${documents[0]!.id}`);
 expect(screen.getByRole('link',{name:'Bolletta · settembre 2026'})).toHaveAttribute('href',`/home/${home.id}/documenti/${documents[1]!.id}`);
 expect(screen.getByRole('link',{name:'Bolletta · '+filenames[2]})).toHaveAttribute('href',`/home/${home.id}/documenti/${documents[2]!.id}`);
 expect(screen.getByRole('link',{name:'Bolletta · multiple.pdf'})).toHaveAttribute('href',`/home/${home.id}/documenti/${documents[3]!.id}`);
 expect(screen.queryByRole('link',{name:'Documento senza titolo'})).not.toBeInTheDocument();
 const row=supplier.closest('li')!;await app.user.click(within(row).getByText('Dettagli del file'));
 expect(within(row).getAllByText('supplier.pdf',{selector:'dd'})).toHaveLength(2);
 expect(control.calls.filter(c=>!['GET','HEAD','OPTIONS'].includes(c.init.method??'GET')).map(c=>new URL(c.url,'http://mock.invalid').pathname)).toEqual(['/api/v5/auth/login']);
 expect(control.calls.filter(c=>documents.some(d=>c.url.includes('/documents/'+d.id)))).toHaveLength(0);
});
