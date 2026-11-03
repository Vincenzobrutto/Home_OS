import {act,render,screen,waitFor} from '@testing-library/react';
import {createMemoryRouter,RouterProvider,Outlet,Link} from 'react-router';
import {QueryClient} from '@tanstack/react-query';
import {describe,it,expect,vi} from 'vitest';
import {GiftLinkProvider,useGiftLinks} from './GiftLinkProvider';
import {AppProviders} from '../session/session';
import {ApiClient} from '../api/client';
import {queryKeys} from '../api/queryKeys';
import type {Account,SessionResponse} from '../api/types';
const id='11111111-1111-4111-8111-111111111111',token='a'.repeat(43);
const a:Account={id:'22222222-2222-4222-8222-222222222222',name:'A',email:'a@example.test'},b:Account={...a,id:'33333333-3333-4333-8333-333333333333',name:'B'};
function Probe(){const links=useGiftLinks();return <><span data-testid="credential">{links.get(id)?'in-memory':'empty'}</span><span data-testid="gift-next">{links.next??"empty"}</span><Link to="/accedi">Login</Link><button onClick={()=>links.forget(id)}>Forget</button></>;}
function setup(account:Account|null=null,path='/gift/'+id+'#token='+token){
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
 query.setQueryData(queryKeys.session,{account,csrfToken:'csrf'});
 const fetch=vi.fn().mockRejectedValue(new Error('Unexpected network'));
 const api=new ApiClient({fetch});
 const router=createMemoryRouter([{element:<GiftLinkProvider><Outlet/></GiftLinkProvider>,children:[{path:'*',element:<Probe/>}]}],{initialEntries:[path]});
 const view=render(<AppProviders api={api} queryClient={query}><RouterProvider router={router}/></AppProviders>);
 const identity=(next:Account|null)=>act(()=>query.setQueryData<SessionResponse>(queryKeys.session,{account:next,csrfToken:'csrf-new'}));
 return {...view,query,fetch,router,identity};
}
describe('Gift credentials above authentication routes',()=>{
 it('scrubs fragment with replace, never uses browser storage or network for credentials',async()=>{
  const writes=vi.spyOn(Storage.prototype,'setItem'),reads=vi.spyOn(Storage.prototype,'getItem');
  const x=setup();await waitFor(()=>expect(x.router.state.location.hash).toBe(''));expect(screen.getByTestId('credential')).toHaveTextContent('in-memory');
  expect(x.fetch).not.toHaveBeenCalled();expect(writes).not.toHaveBeenCalled();expect(reads.mock.calls.filter(([key])=>key!=='remix-router-transitions')).toEqual([]);
  expect(JSON.stringify(x.query.getQueryCache().getAll().map(q=>q.state.data))).not.toContain(token);
 });
 it('keeps only in-memory credential through login routes and guest→first account',async()=>{
  const x=setup();await waitFor(()=>expect(x.router.state.location.hash).toBe(''));
  await act(()=>x.router.navigate('/accedi?next='+encodeURIComponent('/gift/'+id)));
  expect(screen.getByTestId('credential')).toHaveTextContent('in-memory');await x.identity(a);
  await act(()=>x.router.navigate('/gift/'+id));expect(screen.getByTestId('credential')).toHaveTextContent('in-memory');
 });
 it.each([null,b])('clears credential on bound account change to %s without clearing observations or unrelated storage',async next=>{
  localStorage.setItem('observations','keep');const x=setup(a);await waitFor(()=>expect(x.router.state.location.hash).toBe(''));
  await x.identity(next);await waitFor(()=>expect(screen.getByTestId('credential')).toHaveTextContent('empty'));expect(screen.getByTestId('gift-next')).toHaveTextContent('empty');expect(localStorage.getItem('observations')).toBe('keep');localStorage.removeItem('observations');
 });
 it('forgets on consume and a fresh mount cannot recover the secret from token-free URL',async()=>{
  const x=setup();await waitFor(()=>expect(x.router.state.location.hash).toBe(''));await act(()=>screen.getByRole('button',{name:'Forget'}).click());expect(screen.getByTestId('credential')).toHaveTextContent('empty');
  x.unmount();setup(null,'/gift/'+id);expect(screen.getByTestId('credential')).toHaveTextContent('empty');
 });
 it.each(['/gift/invalid#token='+token,'/gift/'+id+'#token=bad','/GIFT/'+id+'#token='+token])('scrubs malformed Gift fragments without adopting a credential: %s',async path=>{
  const x=setup(null,path);await waitFor(()=>expect(x.router.state.location.hash).toBe(''));expect(screen.getByTestId('credential')).toHaveTextContent('empty');expect(x.fetch).not.toHaveBeenCalled();
 });
 it.each(['/%67ift/'+id,'/g%69ft/'+id,'/g%69%66t/'+id,'/gift/'+id.replaceAll('1','%31'),'/GIFT/'+id])('scrubs router-matched noncanonical Gift path without credential adoption or pending next: %s',async path=>{
  const x=setup(null,path+'#token='+token);await waitFor(()=>expect(x.router.state.location.hash).toBe(''));expect(screen.getByTestId('credential')).toHaveTextContent('empty');expect(screen.getByTestId('gift-next')).toHaveTextContent('empty');expect(x.fetch).not.toHaveBeenCalled();
 });
 it('remembers only a canonical token-free Gift next through auth/verification routes and guest first login',async()=>{
  const x=setup(null,'/gift/'+id);await waitFor(()=>expect(screen.getByTestId('gift-next')).toHaveTextContent('/gift/'+id));expect(screen.getByTestId('credential')).toHaveTextContent('empty');await act(()=>x.router.navigate('/registrati'));await x.identity(a);expect(screen.getByTestId('gift-next')).toHaveTextContent('/gift/'+id);await act(()=>x.router.navigate('/verifica-email'));expect(screen.getByTestId('gift-next')).toHaveTextContent('/gift/'+id);
  expect(JSON.stringify(x.query.getQueryCache().getAll().map(q=>q.state.data))).not.toContain('/gift/'+id);await x.identity(b);await waitFor(()=>expect(screen.getByTestId('gift-next')).toHaveTextContent('empty'));
 });
 it('keeps the canonical next when the personal credential is consumed, without retaining the credential',async()=>{
  const x=setup();await waitFor(()=>expect(x.router.state.location.hash).toBe(''));await act(()=>screen.getByRole('button',{name:'Forget'}).click());expect(screen.getByTestId('credential')).toHaveTextContent('empty');expect(screen.getByTestId('gift-next')).toHaveTextContent('/gift/'+id);
 });
 it('does not scrub ordinary non-Gift fragments or invent a pending Gift route from them',async()=>{
  const x=setup(null,'/case#section');expect(x.router.state.location.hash).toBe('#section');expect(screen.getByTestId('gift-next')).toHaveTextContent('empty');expect(x.fetch).not.toHaveBeenCalled();
 });
});
