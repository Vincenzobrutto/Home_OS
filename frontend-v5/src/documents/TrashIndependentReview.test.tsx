import {screen,waitFor,within} from '@testing-library/react';
import {beforeAll,it,expect} from 'vitest';
import {FakeBackend} from '../test/fakeBackend';
import {createFakeFetch,renderApp} from '../test/harness';
import type {FetchLike} from '../api/client';
beforeAll(async()=>{await import('../routes/DocumentsPages');});

async function setup(failTrash:boolean|'pending'=false){
 const backend=new FakeBackend(),password='password-synthetic-review',account=backend.seedAccount('Synthetic reviewer','review@example.test',password),home=backend.seedHome(account.id,'Synthetic review home','Synthetic');
 const doc=await backend.seedDocument({homeId:home.id,uploaderId:account.id,name:'Synthetic source',aiAnalysisSucceeded:false}),control=createFakeFetch(backend);
 let dropRestore=false;
 const fetch:FetchLike=async(url,init)=>{
  if(failTrash&&init.method!=='POST'&&url.endsWith('/trash'))return failTrash==='pending'?new Promise<Response>((_resolve,reject)=>{init.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});}):Response.json({error:{code:'unavailable',message:'Synthetic unavailable'}},{status:503});
  const result=await control.fetch(url,init);if(dropRestore&&init.method==='POST'&&url.endsWith('/restore')){dropRestore=false;throw new TypeError('Synthetic interrupted response');}return result;
 };
 const app=renderApp({path:'/accedi',backend,fetch});
 await app.user.type(await screen.findByLabelText('Email'),account.email);await app.user.type(screen.getByLabelText('Password'),password);await app.user.click(screen.getByRole('button',{name:'Accedi'}));
 await waitFor(()=>expect(app.router.state.location.pathname).toBe('/home/'+home.id+'/casa'));
 await app.router.navigate(`/home/${home.id}/documenti?workflow=all`);await screen.findByRole('link',{name:doc.name});
 return {app,backend,home,doc,account,interruptRestore:()=>{dropRestore=true;}};
}
async function dialogForMove(state:Awaited<ReturnType<typeof setup>>){
 const row=(await screen.findByRole('link',{name:state.doc.name})).closest('li')??document.body;
 await state.app.user.click(within(row).getByText('Altre azioni',{exact:true}));await state.app.user.click(within(row).getByRole('button',{name:'Elimina'}));
 const dialog=await screen.findByRole('dialog',{name:'Spostare nel cestino?'});await waitFor(()=>expect(within(dialog).getByRole('button',{name:'Sposta nel cestino'})).toBeEnabled());return dialog;
}

it('the undo notice must stay dismissed after leaving the page and navigating back',async()=>{
 const state=await setup(),dialog=await dialogForMove(state);
 await state.app.user.click(within(dialog).getByRole('button',{name:'Sposta nel cestino'}));
 const notice=(await screen.findByText('«Synthetic source» spostato nel cestino.')).closest('[role="status"]') as HTMLElement;
 await state.app.user.click(within(notice).getByRole('button',{name:'Annulla'}));
 await screen.findByText('«Synthetic source» è stato ripristinato.');await screen.findByRole('link',{name:state.doc.name});
 await state.app.router.navigate(`/home/${state.home.id}/casa`);
 await screen.findByRole('heading',{level:1,name:state.home.name});expect(screen.queryByText('«Synthetic source» spostato nel cestino.')).not.toBeInTheDocument();
 expect(screen.queryByText('«Synthetic source» è stato ripristinato.')).not.toBeInTheDocument();
 await state.app.router.navigate(`/home/${state.home.id}/documenti?workflow=all`);await screen.findByRole('heading',{level:1,name:'Documenti'});
 await screen.findByRole('link',{name:state.doc.name});
 expect(screen.queryByText('«Synthetic source» spostato nel cestino.')).not.toBeInTheDocument();
 expect(screen.queryByText('«Synthetic source» è stato ripristinato.')).not.toBeInTheDocument();state.app.unmount();
});

it.each([true,'pending'] as const)('a failing or pending trash endpoint must leave AppShell usable (%s)',async mode=>{
 const {app,home,doc,account}=await setup(mode);
 await waitFor(()=>expect(app.queryClient.getQueryState(['account',account.id,'home',home.id,'trash'])?.status).toBe(mode==='pending'?'pending':'error'));
 expect(screen.getByRole('link',{name:doc.name})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:/^Cestino/})).not.toBeInTheDocument();
 expect(screen.getAllByRole('link',{name:'Documenti'}).length).toBeGreaterThan(0);app.unmount();
});

it('trash confirmation focuses Cancel, traps keyboard focus and closes without a write',async()=>{
 const state=await setup(),dialog=await dialogForMove(state),cancel=within(dialog).getByRole('button',{name:'Annulla'}),move=within(dialog).getByRole('button',{name:'Sposta nel cestino'});
 expect(cancel).toHaveFocus();await state.app.user.tab({shift:true});expect(move).toHaveFocus();await state.app.user.tab();expect(cancel).toHaveFocus();
 await state.app.user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(state.backend.log.filter(row=>row.method==='POST'&&row.path.endsWith('/trash'))).toEqual([]);state.app.unmount();
});

it('retrying an interrupted undo reuses its version and idempotency key',async()=>{
 const state=await setup(),dialog=await dialogForMove(state);
 await state.app.user.click(within(dialog).getByRole('button',{name:'Sposta nel cestino'}));
 const notice=(await screen.findByText('«Synthetic source» spostato nel cestino.')).closest('[role="status"]') as HTMLElement;
 state.interruptRestore();await state.app.user.click(within(notice).getByRole('button',{name:'Annulla'}));await within(notice).findByRole('alert');
 await state.app.user.click(within(notice).getByRole('button',{name:'Annulla'}));await screen.findByText('«Synthetic source» è stato ripristinato.');
 const writes=state.backend.log.filter(row=>row.method==='POST'&&row.path.endsWith('/restore'));
 expect(writes).toHaveLength(2);expect(writes[0]!.body).toEqual({expectedVersion:2});expect(writes[1]!.body).toEqual(writes[0]!.body);
 expect(writes[1]!.headers['idempotency-key']).toBe(writes[0]!.headers['idempotency-key']);
 expect(state.backend.documents.get(state.doc.id)?.lifecycleVersion).toBe(3);expect(state.backend.documents.get(state.doc.id)?.trashedAt).toBeUndefined();state.app.unmount();
});
