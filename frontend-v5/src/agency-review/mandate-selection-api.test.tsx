import {describe,expect,it,vi} from 'vitest';
import {ApiTransport,type FetchLike} from '../api/transport';
import {agencyMandateSelectionApi} from './mandate-selection-api';
const json=(v:unknown)=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
describe('mandate selection read-only client',()=>{
 it('reads authorized views from the captured scope without write or generation requests',async()=>{const fetch=vi.fn<FetchLike>(async p=>json(p.endsWith('/review')?{revision:4,units:[],facts:[]}:{revision:4,comparisons:[],observations:[]})),scope={accountId:'a',agencyId:'g',practiceId:'p'},api=agencyMandateSelectionApi(new ApiTransport({fetch}),scope);scope.practiceId='other';await api.read();expect(fetch.mock.calls.map(c=>c[0])).toEqual(['/api/v5/agencies/g/practices/p/review','/api/v5/agencies/g/practices/p/findings']);expect(fetch.mock.calls.every(c=>c[1].method!=='POST')).toBe(true);});
 it('rejects mixed revisions instead of combining a new fact with old findings',async()=>{const fetch=vi.fn<FetchLike>(async p=>json({revision:p.endsWith('/review')?5:4}));await expect(agencyMandateSelectionApi(new ApiTransport({fetch}),{accountId:'a',agencyId:'g',practiceId:'p'}).read()).rejects.toMatchObject({status:409,code:'revision_conflict'});});
});
