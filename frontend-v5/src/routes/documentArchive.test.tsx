import {screen,waitFor} from '@testing-library/react';
import {it,expect} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import type {DocumentSummary} from '../api/types';
it('capability archivio unico: ingresso sulle famiglie e ricerca globale senza macroviste',async()=>{
 const {backend,homeA1:home}=seededBackend(),control=createFakeFetch(backend),calls:URL[]=[];
 const s=await control.fetch('/api/v5/session',{credentials:'include'}),{csrfToken}=await s.json() as {csrfToken:string};await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:'a@example.test',password:PASSWORD_A})});
 const doc:DocumentSummary={id:crypto.randomUUID(),homeId:home.id,name:'Fattura sintetica',family:'works',version:1,originalFilename:'invoice.pdf',mimeType:'application/pdf',byteSize:12,createdAt:new Date().toISOString(),source:'manual_upload',status:'stored',visibility:'private',permissions:['read'],workflowState:'completed'};
 const app=renderApp({path:`/home/${home.id}/documenti`,backend,fetch:async(url,init)=>{
  if(url.endsWith('/document-search-capabilities')){const response=await control.fetch(url,init);return Response.json({...await response.json(),documentViews:true,documentFamilies:true});}
  if(/\/documents(?:\?|$)/.test(url)){const parsed=new URL(url,'http://test');calls.push(parsed);return Response.json({items:[doc],nextCursor:null,summary:{views:{all:1,house:0,objects:1},groups:{works:1}}});}
  return control.fetch(url,init);
 }});
 await screen.findByRole('button',{name:'Informazioni su Proprietà e affitto'}, {timeout:10000});expect(screen.queryByRole('group',{name:'Vista dei documenti'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Fattura sintetica'})).not.toBeInTheDocument();
 await app.user.click(screen.getByRole('button',{name:'Lavori, ristrutturazioni e bonus, 1 documento'}));await screen.findByRole('link',{name:'Fattura sintetica'});
 await app.user.type(screen.getByRole('searchbox',{name:'Cerca nei documenti'}),'fattura');await waitFor(()=>{expect(calls.at(-1)?.searchParams.get('q')).toBe('fattura');expect(calls.at(-1)?.searchParams.get('view')).toBe('archive');expect(calls.at(-1)?.searchParams.has('group')).toBe(false);});
},20000);
