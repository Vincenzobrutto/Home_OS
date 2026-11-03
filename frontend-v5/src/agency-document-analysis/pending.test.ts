import {afterEach,describe,expect,it} from 'vitest';
import {clearPendingAnalysis,loadPendingAnalysis,purgePendingAnalyses,savePendingAnalysis} from './pending';
import {scope} from './fixtures.test-data';
const request={key:'00000000-0000-4000-a000-000000000001',body:{expectedRevision:4,sourceId:'source',expectedSourceVersion:1,pages:[1,2],offerId:'offer',approved:true as const}};
afterEach(()=>sessionStorage.clear());
describe('scoped technical enqueue recovery',()=>{
 it('stores only the key and exact technical body, never provider output or text',()=>{savePendingAnalysis(scope,request);expect(loadPendingAnalysis(scope)).toEqual(request);const value=JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!);expect(Object.keys(value).sort()).toEqual(['body','key']);expect(Object.keys(value.body).sort()).toEqual(['approved','expectedRevision','expectedSourceVersion','offerId','pages','sourceId']);});
 it('logout purges every pending envelope while preserving unrelated storage',()=>{sessionStorage.setItem('unrelated','keep');savePendingAnalysis(scope,request);savePendingAnalysis({...scope,practiceId:'other'},request);purgePendingAnalyses(null);expect(loadPendingAnalysis(scope)).toBeNull();expect(sessionStorage.getItem('unrelated')).toBe('keep');});
 it('account switch purges the previous account but navigation within the account keeps recovery',()=>{savePendingAnalysis(scope,request);savePendingAnalysis({...scope,practiceId:'other'},request);purgePendingAnalyses(scope.accountId);expect(loadPendingAnalysis(scope)).toEqual(request);expect(loadPendingAnalysis({...scope,practiceId:'other'})).toEqual(request);purgePendingAnalyses('next-account');expect(loadPendingAnalysis({...scope,accountId:'next-account'})).toBeNull();expect(sessionStorage.length).toBe(0);});
 it('rejects tampered envelopes without promoting content to a request',()=>{savePendingAnalysis(scope,request);const key=sessionStorage.key(0)!;sessionStorage.setItem(key,JSON.stringify({...request,text:'injected'}));expect(loadPendingAnalysis(scope)).toBeNull();expect(sessionStorage.getItem(key)).toBeNull();clearPendingAnalysis(scope);});
});
