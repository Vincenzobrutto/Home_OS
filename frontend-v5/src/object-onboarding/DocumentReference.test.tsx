import {render,screen,waitFor} from '@testing-library/react';
import {useState} from 'react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {expect,it,vi} from 'vitest';
import {ApiClient} from '../api/client';
import {DocumentReference,type DocumentTarget} from './DocumentReference';
it('selects a reference without writes and permits keeping only the house',async()=>{
 const calls:string[]=[],changed=vi.fn(),validity=vi.fn(),object={ref:{kind:'object',id:'installation'},name:'Impianto sintetico',version:2,state:'active',position:{version:0,rooms:[]}};
 const api=new ApiClient({fetch:async(input,init)=>{calls.push(init?.method??'GET');return Response.json(String(input).includes('/objects?')?{items:[object],nextCursor:null}:{object});}});
 function Example(){const [target,setTarget]=useState<DocumentTarget|null>(null);return <DocumentReference api={api} accountId="account" homeId="home" target={target} disabled={false} onChange={value=>{changed(value);setTarget(value);}} onValidity={validity}/>;}
 render(<QueryClientProvider client={new QueryClient()}><Example/></QueryClientProvider>);const user=userEvent.setup();await screen.findByRole('option',{name:'Impianto sintetico'});
 await user.selectOptions(screen.getByLabelText('A cosa si riferisce?'),'object:installation');await waitFor(()=>expect(validity).toHaveBeenLastCalledWith(true));expect(changed).toHaveBeenLastCalledWith({kind:'object',id:'installation',name:'Impianto sintetico',expectedVersion:2});
 await user.selectOptions(screen.getByLabelText('A cosa si riferisce?'),'');expect(changed).toHaveBeenLastCalledWith(null);expect(calls.every(method=>method==='GET')).toBe(true);
});
it('a restored unavailable or changed reference stays invalid until explicitly removed or selected again',async()=>{
 const validity=vi.fn(),api=new ApiClient({fetch:async input=>Response.json(String(input).includes('/objects?')?{items:[],nextCursor:null}:{object:{ref:{kind:'object',id:'installation'},name:'Nome attuale',version:3,state:'active'}})});
 render(<QueryClientProvider client={new QueryClient()}><DocumentReference api={api} accountId="account" homeId="home" disabled={false} target={{kind:'object',id:'installation',name:'Nome precedente',expectedVersion:2}} onChange={vi.fn()} onValidity={validity}/></QueryClientProvider>);
 await screen.findByText(/Il collegamento è cambiato/);expect(validity).toHaveBeenLastCalledWith(false);
});
