import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp, createFakeFetch, seededBackend, PASSWORD_A } from '../test/harness';
import type { FetchLike } from '../api/client';

async function world(mode:'list'|'empty'|'error'='list'){
 const {backend,homeA1,a}=seededBackend(),control=createFakeFetch(backend),reads:string[]=[],writes:string[]=[];
 const limits={maxFiles:20,maxFileBytes:20971520,maxTotalBytes:209715200,acceptedMimeTypes:['application/pdf']};
 const fetch:FetchLike=async(url,init)=>{
  if(url.includes('/automatic-runs'))return Response.json({run:null});
  if(!url.includes('/document-intake'))return control.fetch(url,init);
  if(init.method==='POST')writes.push(url);reads.push(url);
  if(url.includes('/batches?'))return mode==='error'?Response.json({error:{code:'service_unavailable',message:'Unavailable'}},{status:503}):Response.json({items:mode==='empty'?[]:[{id:url.includes('cursor=')?'older':'resume',state:'open',createdAt:'2026-10-18T12:00:00Z',itemCount:2}],nextCursor:mode==='list'&&!url.includes('cursor=')?'next-page':null});
  if(url.endsWith('/capabilities'))return Response.json({apiVersion:'document-intake-v1',enabled:true,limits,analysis:{provider:'local_text_v1',enabled:false,externalTransmission:false}});
  if(url.endsWith('/batches/resume'))return Response.json({batch:{id:'resume',homeId:homeA1.id,version:1,state:'open',limits,permissions:['read','edit'],items:[{id:'item',clientItemId:'client',version:1,filename:'Fattura.pdf',byteSize:100,mimeType:'application/pdf',uploadState:'stored',analysisState:'ready',reviewState:'unreviewed',documentLink:{state:'linked',document:{id:'source',name:'Fattura.pdf'}},pageCount:1,proposal:null,selection:null,organization:null,organizationVersion:0,duplicate:null,error:null,permissions:['read','edit']} ]}});
  return Response.json({items:[],nextCursor:null});
 };
 const app=renderApp({path:'/accedi',backend,fetch});await screen.findByRole('heading',{name:'Accedi'});await app.user.type(screen.getByLabelText('Email'),a.email);await app.user.type(screen.getByLabelText('Password'),PASSWORD_A);await app.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(app.router.state.location.pathname).toBe('/case'));await app.router.navigate('/home/'+homeA1.id+'/documenti');return {...app,homeId:homeA1.id,reads,writes};
}
it('Da completare opens the pending uploads in Documents and resumes the existing review without writes',async()=>{
 const app=await world(),button=await screen.findByRole('button',{name:'Da completare'});expect(button).toHaveAttribute('aria-expanded','false');expect(app.reads).toEqual([]);await app.user.click(button);await screen.findByRole('heading',{name:'Caricamenti da completare'});const link=await screen.findByRole('link',{name:/Riprendi il caricamento/});expect(link).toHaveAttribute('href','/home/'+app.homeId+'/documenti/organizza?lotto=resume');expect(app.reads[0]).toContain('state=open');await app.user.click(screen.getByRole('button',{name:'Altri caricamenti da completare'}));await waitFor(()=>expect(screen.getAllByRole('link',{name:/Riprendi il caricamento/})).toHaveLength(2));expect(app.reads.some(u=>u.includes('cursor=next-page'))).toBe(true);await app.user.click(screen.getAllByRole('link',{name:/Riprendi il caricamento/})[0]!);await screen.findByRole('heading',{name:'Controlla e organizza.'});expect(app.router.state.location.search).toBe('?lotto=resume');expect(app.writes).toEqual([]);app.unmount();
});
it('no pending uploads is an explicit empty state',async()=>{const app=await world('empty');await app.user.click(await screen.findByRole('button',{name:'Da completare'}));expect(await screen.findByRole('status')).toHaveTextContent('Nessun caricamento da completare.');app.unmount();});
it('a failed pending list is not presented as no work remaining',async()=>{const app=await world('error');await app.user.click(await screen.findByRole('button',{name:'Da completare'}));await screen.findByRole('button',{name:'Riprova'});expect(screen.queryByText('Nessun caricamento da completare.')).not.toBeInTheDocument();app.unmount();});
