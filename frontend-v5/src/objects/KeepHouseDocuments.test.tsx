import {screen,waitFor,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createFakeFetch,PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import {KeepHouseDocuments,type HouseDocumentsPlan} from './KeepHouseDocuments';

async function setup(options:{blocked?:boolean;drop?:boolean;actualMenu?:boolean}={}){
 const {backend,a,homeA1:home}=seededBackend(),control=createFakeFetch(backend),close=vi.fn(),posts:RequestInit[]=[];
 const session=await control.fetch('/api/v5/session',{method:'GET',credentials:'include'});
 const {csrfToken}=await session.json() as {csrfToken:string};
 await control.fetch('/api/v5/auth/login',{method:'POST',credentials:'include',headers:{'x-csrf-token':csrfToken},body:JSON.stringify({email:'a@example.test',password:PASSWORD_A})});
 const seeded=await backend.objects.handle({method:'POST',path:'',headers:{'idempotency-key':crypto.randomUUID()},body:{name:'APE errato',type:'other'}},a.id,home.id,'objects');
 const id=(seeded.body as {object:{ref:{id:string}}}).object.ref.id,docId=crypto.randomUUID();
 const plan:HouseDocumentsPlan={token:'a'.repeat(64),objectName:'APE errato',archiveBlocked:false,unavailable:false,documents:[{id:docId,title:'APE sintetico.pdf',originalFilename:'originale-sintetico.pdf',reason:options.blocked?'Il documento ha altri collegamenti.':null,willOrganize:true,expenses:[{id:crypto.randomUUID(),title:'Certificazione sintetica',amountCents:12000}]}]};
 let drop=options.drop;
 const app=renderApp({path:`/home/${home.id}/${options.actualMenu?'oggetti/object/'+id:'keep-house-test'}`,backend,fetch:async(url,init)=>{
  if(url.endsWith('/house-documents')){
   if(init.method==='POST'){posts.push(init);if(drop){drop=false;throw new TypeError('Failed to fetch');}return Response.json({documentIds:[docId],archivedObject:JSON.parse(init.body as string).archiveObject});}
   return Response.json(plan);
  }
  return control.fetch(url,init);
 },homeTestRoutes:[{path:'keep-house-test',element:<KeepHouseDocuments homeId={home.id} objectId={id} onClose={close}/>} ]});
 if(options.actualMenu){await app.user.click(await screen.findByRole('button',{name:'Altre azioni'}));await app.user.click(screen.getByRole('button',{name:'Conserva come documento della casa'}));}
 await screen.findByText('APE sintetico.pdf');return {app,close,posts,home,plan};
}
it('menu oggetto: riepilogo prima di scrivere; conferma con archivio facoltativo e ritorno alla casa',async()=>{
 const {app,posts,home}=await setup({actualMenu:true});expect(posts).toHaveLength(0);
 const dialog=screen.getByRole('dialog');expect(within(dialog).getByText(/Certificazione sintetica/)).toHaveTextContent('120,00');expect(within(dialog).getByText('File: originale-sintetico.pdf')).toBeVisible();
 await app.user.click(within(dialog).getByLabelText('Archivia anche la scheda oggetto e toglila dalle stanze'));
 await app.user.click(within(dialog).getByRole('button',{name:'Conserva nella casa'}));
 await waitFor(()=>expect(app.router.state.location.pathname).toBe(`/home/${home.id}/documenti`));
 expect(posts).toHaveLength(1);expect(JSON.parse(posts[0]!.body as string).archiveObject).toBe(true);
 expect(app.router.state.location.search).toBe('?workflow=all&view=house');await screen.findByText('Documenti conservati nella casa');
});
it('Annulla non scrive e i documenti con altri riferimenti non sono selezionabili',async()=>{
 const {app,posts,close}=await setup({blocked:true});expect(screen.getByLabelText('APE sintetico.pdf')).toBeDisabled();expect(screen.getByRole('button',{name:'Conserva nella casa'})).toBeDisabled();
 await app.user.click(screen.getByRole('button',{name:'Annulla'}));expect(close).toHaveBeenCalledOnce();expect(posts).toHaveLength(0);
});
it('risposta persa: riprova la stessa conferma e chiave, senza archiviare per impostazione predefinita',async()=>{
 const {app,posts}=await setup({drop:true});await app.user.click(screen.getByRole('button',{name:'Conserva nella casa'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('APE sintetico.pdf')).toBeDisabled();await app.user.click(screen.getByRole('button',{name:'Riprova conferma'}));
 await waitFor(()=>expect(posts).toHaveLength(2));expect(posts[0]!.body).toBe(posts[1]!.body);expect(new Headers(posts[0]!.headers).get('idempotency-key')).toBe(new Headers(posts[1]!.headers).get('idempotency-key'));expect(JSON.parse(posts[1]!.body as string).archiveObject).toBe(false);
 await screen.findByText('Documenti conservati nella casa');
});
