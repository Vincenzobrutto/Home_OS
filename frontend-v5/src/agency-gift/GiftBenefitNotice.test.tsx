import {render,screen} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {describe,it,expect,vi} from 'vitest';
import {GiftBenefitNotice} from './GiftBenefitNotice';
import {ApiClient,type FetchLike} from '../api/client';
import {AccountProvider,AppProviders} from '../session/session';
import {queryKeys} from '../api/queryKeys';
const a={id:'22222222-2222-4222-8222-222222222222',name:'Owner',email:'owner@example.test'};
function setup(body:unknown,status=200){
 const fetch=vi.fn<FetchLike>(async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});query.setQueryData(queryKeys.session,{account:a,csrfToken:'csrf'});
 const view=render(<AppProviders api={new ApiClient({fetch})} queryClient={query}><AccountProvider account={a}><GiftBenefitNotice/></AccountProvider></AppProviders>);return {...view,query,fetch};
}
describe('normal owner account Gift capability',()=>{
 it('shows only server active year date without imposing free limits or renewal',async()=>{
  const x=setup({fullAccess:true,scope:'all_owner_features',validUntil:'2027-11-01T12:00:00.000Z'});
  expect(await screen.findByText('Un anno di Dimora incluso')).toBeVisible();expect(screen.getByText(/Tutte le funzioni proprietario/)).toHaveTextContent('2027');expect(screen.getByText(/Nessun rinnovo automatico/)).toBeVisible();
  expect(x.fetch.mock.calls[0]![0]).toBe('/api/v5/gift-benefits');expect(new Headers(x.fetch.mock.calls[0]![1].headers).get('X-Account-Context')).toBe(a.id);
 });
 it.each([{fullAccess:false,scope:'all_owner_features',validUntil:null},{fullAccess:true,scope:'wrong',validUntil:'2027-11-01T12:00:00.000Z'}])('does not invent a benefit or free restriction from %s',async body=>{
  const x=setup(body);await vi.waitFor(()=>expect(x.query.isFetching()).toBe(0));expect(x.container).toBeEmptyDOMElement();
 });
 it('does not expose stale private account data if capability read fails',async()=>{
  const x=setup({error:{code:'unavailable',message:'Private info'}},404);await vi.waitFor(()=>expect(x.query.isFetching()).toBe(0));expect(x.container).toBeEmptyDOMElement();expect(screen.queryByText('Private info')).not.toBeInTheDocument();
 });
});
