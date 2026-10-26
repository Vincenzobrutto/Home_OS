import {screen,waitFor,within} from '@testing-library/react';
import {expect,it} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import type {DocumentsPage,DocumentSummary} from '../api/types';
it('archive uniforms generic service heading with confirmed legal issuer and preserves both saved title and original',async()=>{
 await import('../routes/DocumentsPages');
 const {backend,a,homeA1:home}=seededBackend(),control=createFakeFetch(backend);
 const completed=await backend.seedDocument({homeId:home.id,uploaderId:a.id,name:'random.pdf',originalFilename:'random.pdf',workflowState:'completed'});
 const pending=await backend.seedDocument({homeId:home.id,uploaderId:a.id,name:'pending.pdf',originalFilename:'pending.pdf',workflowState:'to_compile'});
 const custom=await backend.seedDocument({homeId:home.id,uploaderId:a.id,name:'Nome scelto da me',originalFilename:'custom.pdf',workflowState:'completed'});
 const projection=(d:DocumentSummary):DocumentSummary=>({...d,family:'utilities',organization:{title:d.id===completed.id?'SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO':d.name,version:1,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-01'},savedExpenses:[{id:'expense-'+d.id,title:'Bolletta',supplier:'Fornitore Mock S.p.A.',invoiceMonth:'2026-09',amountCents:100,documentNumber:null,documentDate:null}]});
 const session=await control.fetch('/api/v5/session',{credentials:'include'}),{csrfToken}=await session.json() as {csrfToken:string};await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:'a@example.test',password:PASSWORD_A})});
 const app=renderApp({path:`/home/${home.id}/documenti?workflow=all&view=archive&group=utilities`,backend,fetch:async(url,init)=>{
  const parsed=new URL(url,'http://mock.invalid'),list=parsed.pathname.endsWith('/documents');
  if(list){for(const key of ['view','group','related'])parsed.searchParams.delete(key);}
  const response=await control.fetch(list?parsed.pathname+parsed.search:url,init);
  if(parsed.pathname.endsWith('/document-search-capabilities')&&response.status===200)return Response.json({...await response.json() as object,documentViews:true,documentFamilies:true});
  if(list&&response.status===200&&(init.method??'GET')==='GET'){
   const page=await response.json() as DocumentsPage;return Response.json({...page,items:page.items.map(projection),summary:{views:{all:3,house:3,objects:0},groups:{utilities:3}}});
  }return response;
 }});
 const title=await screen.findByRole('link',{name:'Bolletta Fornitore Mock · settembre 2026'});expect(title).toHaveAttribute('href',`/home/${home.id}/documenti/${completed.id}`);
 expect(screen.getByRole('link',{name:pending.name})).toBeVisible();expect(screen.getByRole('link',{name:custom.name})).toBeVisible();
 const row=title.closest('li')!;await app.user.click(within(row).getByText('Dettagli del file'));expect(within(row).getByText('random.pdf',{selector:'dd'})).toBeVisible();expect(within(row).getByText('SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO',{selector:'dd'})).toBeVisible();expect(within(row).getByText('Titolo salvato')).toBeVisible();
 await waitFor(()=>expect(control.calls.filter(c=>!['GET','HEAD','OPTIONS'].includes(c.init.method??'GET')).length).toBe(1));
 expect(control.calls.filter(c=>!['GET','HEAD','OPTIONS'].includes(c.init.method??'GET'))[0]!.url).toContain('/auth/login');
 expect(control.calls.filter(c=>[completed.id,pending.id,custom.id].some(id=>c.url.includes('/documents/'+id)))).toHaveLength(0);
});
