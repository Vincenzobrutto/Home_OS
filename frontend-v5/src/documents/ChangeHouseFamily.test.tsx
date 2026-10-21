import {screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import type {DocumentSummary} from '../api/types';
import {ChangeHouseFamily} from './ChangeHouseFamily';
async function setup(drop=false,archive=false){
 const {backend,homeA1:home}=seededBackend(),control=createFakeFetch(backend),changed=vi.fn(),posts:RequestInit[]=[];
 const session=await control.fetch('/api/v5/session',{credentials:'include'}),{csrfToken}=await session.json() as {csrfToken:string};await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:'a@example.test',password:PASSWORD_A})});
 const doc:DocumentSummary={id:crypto.randomUUID(),homeId:home.id,name:'Fattura test',originalFilename:'test.pdf',mimeType:'application/pdf',byteSize:10,createdAt:new Date().toISOString(),version:1,source:'manual_upload',status:'stored',visibility:'private',permissions:['read'],organization:{version:4,title:'Fattura test',parts:[{kind:'invoice',pageFrom:null,pageTo:null}],collections:['purchases'],origin:'user_declared',updatedAt:new Date().toISOString(),houseFamily:null,documentSha256:'a'.repeat(64)}};
 let lose=drop;const app=renderApp({path:`/home/${home.id}/family-test`,backend,fetch:async(url,init)=>{if(url.endsWith('/house-family')){posts.push(init);if(lose){lose=false;throw new TypeError('Failed to fetch');}return Response.json({effectiveFamily:JSON.parse(init.body as string).family??'other'});}return control.fetch(url,init);},homeTestRoutes:[{path:'family-test',element:<ChangeHouseFamily archive={archive} homeId={home.id} document={doc} onChanged={changed}/>}]});
 await app.user.click(await screen.findByRole('button',{name:'Cambia famiglia'}));return {app,posts,changed};
}
it('menu diretto e salvataggio della sola famiglia, senza aprire la compilazione',async()=>{
 const {app,posts,changed}=await setup();await app.user.selectOptions(screen.getByLabelText('Famiglia'),'contracts');expect(posts).toHaveLength(0);await app.user.click(screen.getByRole('button',{name:'Salva famiglia'}));await waitFor(()=>expect(changed).toHaveBeenCalledWith('contracts'));
 expect(JSON.parse(posts[0]!.body as string)).toEqual({expectedOrganizationVersion:4,documentVersion:1,sha256:'a'.repeat(64),family:'contracts'});
});
it('Annulla non scrive; risposta persa ritenta stessa scelta e chiave',async()=>{
 const {app,posts,changed}=await setup(true);await app.user.click(screen.getByRole('button',{name:'Annulla'}));expect(posts).toHaveLength(0);await app.user.click(screen.getByRole('button',{name:'Cambia famiglia'}));await app.user.selectOptions(screen.getByLabelText('Famiglia'),'energy');await app.user.click(screen.getByRole('button',{name:'Salva famiglia'}));await screen.findByRole('alert');expect(screen.getByLabelText('Famiglia')).toBeDisabled();await app.user.click(screen.getByRole('button',{name:'Riprova salvataggio'}));await waitFor(()=>expect(changed).toHaveBeenCalledWith('energy'));expect(posts[0]!.body).toBe(posts[1]!.body);expect(new Headers(posts[0]!.headers).get('idempotency-key')).toBe(new Headers(posts[1]!.headers).get('idempotency-key'));
});

it('archivio unico: nuove famiglie senza cambiare appartenenza alla casa',async()=>{
 const {app,posts}=await setup(false,true);expect(screen.getByRole('option',{name:'Sicurezza e vincoli'})).toBeInTheDocument();await app.user.selectOptions(screen.getByLabelText('Famiglia'),'works');await app.user.click(screen.getByRole('button',{name:'Salva famiglia'}));await waitFor(()=>expect(posts).toHaveLength(1));expect(JSON.parse(posts[0]!.body as string)).toMatchObject({family:'works',scope:'archive'});
});
