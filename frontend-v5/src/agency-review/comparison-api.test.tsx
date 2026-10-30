import {describe,expect,it,vi} from 'vitest';
import {ApiTransport,type FetchLike} from '../api/transport';
import {agencyComparisonApi} from './comparison-api';
const json=(v:unknown)=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
describe('comparison client',()=>{
 it('captures practice scope and reads accessible review facts',async()=>{const fetch=vi.fn<FetchLike>(async()=>json({revision:1,units:[],facts:[]})),scope={accountId:'a',agencyId:'g',practiceId:'p'},api=agencyComparisonApi(new ApiTransport({fetch}),scope);scope.practiceId='other';await api.read();expect(fetch.mock.calls[0]![0]).toBe('/api/v5/agencies/g/practices/p/review');});
 it('posts only scoped question to findings with session, CSRF and key',async()=>{const fetch=vi.fn<FetchLike>(async p=>json(p.endsWith('/session')?{account:{id:'a'},csrfToken:'synthetic'}:{replay:false})),api=agencyComparisonApi(new ApiTransport({fetch}),{accountId:'a',agencyId:'g',practiceId:'p'}),body={expectedRevision:4,command:{operation:'comparison' as const,visibility:'private' as const,question:{unitId:'u',subjectKey:'property',epoch:'oggi',field:'cadastral.parcel',factIds:['f1','f2']}}};await api.write(body,'same-key');const call=fetch.mock.calls[1]!,h=new Headers(call[1].headers);expect(call[0]).toBe('/api/v5/agencies/g/practices/p/findings');expect(h.get('x-csrf-token')).toBe('synthetic');expect(h.get('idempotency-key')).toBe('same-key');expect(JSON.parse(call[1].body as string)).toEqual(body);});
});
