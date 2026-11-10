import {screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it} from 'vitest';
import {PASSWORD_A,renderApp,seededBackend} from '../test/harness';
import {loadPendingAnalysis,savePendingAnalysis} from '../agency-document-analysis/pending';

afterEach(()=>sessionStorage.clear());
const pending={key:'00000000-0000-4000-a000-000000000001',body:{expectedRevision:4,sourceId:'source',expectedSourceVersion:1,pages:[1],offerId:'offer',approved:true as const}};
describe('authentication lifecycle and technical document recovery, mock transport',()=>{
 it('preserves same-account navigation/reload recovery and purges it on actual logout without clearing unrelated Gift storage',async()=>{
  const {backend,a,homeA1}=seededBackend(),first=renderApp({path:'/accedi',backend});
  await first.user.type(await screen.findByLabelText('Email'),'a@example.test');await first.user.type(screen.getByLabelText('Password'),PASSWORD_A);await first.user.click(screen.getByRole('button',{name:'Accedi'}));await screen.findByRole('heading',{name:'Appartamento Roma'});
  const scope={accountId:a.id,agencyId:'synthetic-agency',practiceId:'synthetic-practice'};savePendingAnalysis(scope,pending);savePendingAnalysis({...scope,practiceId:'other-practice'},pending);sessionStorage.setItem('dimora.gift.fixture','unrelated');
  await first.router.navigate(`/home/${homeA1.id}/casa`);await screen.findByRole('heading',{level:1,name:'Appartamento Roma'});expect(loadPendingAnalysis(scope)).toEqual(pending);const cookie=first.control.cookie();first.unmount();
  const reloaded=renderApp({path:`/home/${homeA1.id}/casa`,backend,cookie});await screen.findByRole('heading',{level:1,name:'Appartamento Roma'});expect(loadPendingAnalysis(scope)).toEqual(pending);
  await reloaded.user.click(screen.getByRole('button',{name:/Esci/}));await screen.findByRole('heading',{name:'Accedi'});await waitFor(()=>expect(loadPendingAnalysis(scope)).toBeNull());expect(loadPendingAnalysis({...scope,practiceId:'other-practice'})).toBeNull();expect(sessionStorage.getItem('dimora.gift.fixture')).toBe('unrelated');expect(reloaded.router.state.location.search).toBe('');
 });
});
