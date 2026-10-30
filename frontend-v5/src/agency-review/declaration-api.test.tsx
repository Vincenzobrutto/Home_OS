import {describe,expect,it,vi} from 'vitest';
import {ApiTransport,type FetchLike} from '../api/transport';
import {agencyDeclarationApi} from './declaration-api';
const json=(v:unknown)=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
describe('declaration client',()=>{
 it('captures scope and reads review without a fallback',async()=>{const fetch=vi.fn<FetchLike>(async()=>json({revision:1,units:[],facts:[]})),scope={accountId:'a',agencyId:'g',practiceId:'p'},api=agencyDeclarationApi(new ApiTransport({fetch}),scope);scope.practiceId='other';await api.read();expect(fetch.mock.calls[0]![0]).toBe('/api/v5/agencies/g/practices/p/review');});
 it('uses existing session, CSRF and key without attaching origin or a forged evidence',async()=>{const fetch=vi.fn<FetchLike>(async p=>json(p.endsWith('/session')?{account:{id:'a'},csrfToken:'synthetic'}:{replay:false})),api=agencyDeclarationApi(new ApiTransport({fetch}),{accountId:'a',agencyId:'g',practiceId:'p'}),body={expectedRevision:2,command:{operation:'declare' as const,unitId:'u',subjectKey:'declared',field:'party.name',value:'Sara Rossi',visibility:'private' as const}};await api.write(body,'same-key');const opts=fetch.mock.calls[1]![1],h=new Headers(opts.headers);expect(h.get('x-csrf-token')).toBe('synthetic');expect(h.get('idempotency-key')).toBe('same-key');expect(JSON.parse(opts.body as string)).toEqual(body);expect(opts.credentials).toBe('include');});
});
