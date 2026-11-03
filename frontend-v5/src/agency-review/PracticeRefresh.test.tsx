import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ApiTransport,type FetchLike} from '../api/transport';
import {ApiError} from '../api/errors';
import {PracticeReviewSection} from './PracticeReviewSection';
import {ReviewWorkspace} from './ReviewWorkspace';
import {deferredRefreshMessage} from './refresh';
import type {AgencyReviewPort,ReviewSnapshot} from './api';
import type {DeedRecord} from './deed-api';
import type {FindingsSnapshot} from './findings-api';

afterEach(cleanup);
const scope={accountId:'a',agencyId:'g',practiceId:'p'},root='/api/v5/agencies/g/practices/p';
const proof={sourceId:'source',version:1,sha256:'a'.repeat(64),page:3,excerpt:'Documento sintetico: subalterno 12.'};
const snapshot=():ReviewSnapshot=>({revision:4,units:[{id:'u',label:'Appartamento sintetico'}],facts:[{id:'f',unitId:'u',subjectKey:'property',field:'cadastral.subaltern',version:1,status:'proposed',proposedValue:'12',confirmedValue:null,origin:'extracted',confirmedOrigin:null,confirmedBy:null,confirmedAt:null,evidence:[proof]}]});
const confirmed=()=>{const s=snapshot();s.revision=5;s.facts[0]={...s.facts[0]!,version:2,status:'confirmed',confirmedValue:'12',confirmedOrigin:'extracted',confirmedBy:'a',confirmedAt:'2026-11-03T10:00:00Z'};return s;};

function linkedFixture(){
 let revision=4;const facts:ReviewSnapshot['facts']=[],comparisons:FindingsSnapshot['comparisons']=[];
 const units=[{id:'u',label:'Appartamento sintetico'}];
 const records:DeedRecord[]=['12','13'].map((value,i)=>({id:'record-'+i,visibility:'private',sourceId:'source-'+i,version:1,sha256:'a'.repeat(64),status:'current',bindings:[],result:{fingerprint:'b'.repeat(64),issues:[],proposals:[{candidateId:'sub-'+i,field:'cadastral.subaltern',proposedValue:value,documentSubjectRef:'property',documentUnitRef:'unit-document',proposedDocumentRole:'unresolved',status:'unbound_proposal',evidence:{...proof,sourceId:'source-'+i,excerpt:'Documento sintetico: subalterno '+value+'.'},lexicalEvidenceVerified:true,semanticEvidenceVerified:false,requiresHumanBinding:true}]}}));
 const review=()=>({revision,units,facts}),findings=()=>({revision,comparisons,observations:[],certification:false}),proposals=()=>({revision,records,certification:false,canGenerateDraft:false});
 const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
 const fetch=vi.fn<FetchLike>(async(path,init)=>{
  if(path.endsWith('/session'))return json({account:{id:'a'},csrfToken:'synthetic'});
  if(init.method==='POST'){
   const body=JSON.parse(init.body as string);if(body.expectedRevision!==revision)return json({error:{code:'revision_conflict',message:'Synthetic conflict'}},409);
   if(path.endsWith('/bindings')){const record=records.find(r=>path.includes('/'+r.id+'/'))!,candidate=record.result!.proposals[0]!,id='fact-'+record.id;revision++;facts.push({id,unitId:body.unitId,subjectKey:body.subjectKey,field:candidate.field,version:1,status:'proposed',proposedValue:candidate.proposedValue,confirmedValue:null,origin:'extracted',confirmedOrigin:null,confirmedBy:null,confirmedAt:null,evidence:[candidate.evidence]});record.bindings!.push({candidateId:candidate.candidateId,unitId:body.unitId,subjectKey:body.subjectKey,factId:id,actorId:'a',at:'2026-11-03T10:00:00Z',acknowledgedDocumentRole:'unresolved',reason:null});return json({replay:false,recordId:record.id,factId:id,proposals:proposals(),review:review()});}
   if(path===root+'/review'){const f=facts.find(f=>f.id===body.command.factId)!;revision++;Object.assign(f,{version:f.version+1,status:'confirmed',confirmedValue:f.proposedValue,confirmedOrigin:'extracted',confirmedBy:'a',confirmedAt:'2026-11-03T10:00:00Z'});return json({replay:false,review:review()});}
   if(path===root+'/findings'){revision++;comparisons.push({id:'comparison',unitId:'u',subjectKey:'property',epoch:body.command.question.epoch,field:'cadastral.subaltern',fingerprint:'c'.repeat(64),state:'open',resolutions:[],status:'difference_to_review',allConfirmed:true,values:facts.map(f=>({factId:f.id,version:f.version,status:f.status,value:f.confirmedValue!,evidence:f.evidence}))});return json({replay:false,findings:findings()});}
  }
  if(path===root+'/review')return json(review());
  if(path===root+'/deed-proposals')return json(proposals());
  if(path===root+'/findings')return json(findings());
  throw Error('Unexpected route '+path);
 });return {fetch,transport:new ApiTransport({fetch})};
}

describe('cross-panel refresh without remounting drafts',()=>{
 it('binds, confirms, compares and prepares confirmed facts without manual reloads',async()=>{
  const f=linkedFixture(),changed=vi.fn();render(<PracticeReviewSection transport={f.transport} scope={scope} readOnly={false} onChanged={changed}/>);
  fireEvent.click(screen.getByRole('button',{name:'Apri dati e verifiche'}));await screen.findByText('Proposte dal documento',{selector:'summary'});
  fireEvent.click(screen.getByText('Proposte dal documento',{selector:'summary'}));fireEvent.click(screen.getByText('Dati e fonti',{selector:'summary'}));
  for(const value of ['12','13']){
   const card=(await screen.findAllByRole('article',{name:'Subalterno'})).find(c=>within(c).queryByText(value)&&within(c).queryByRole('button',{name:'Associa come dato proposto'}))!;
   fireEvent.change(within(card).getByLabelText('Unità della pratica'),{target:{value:'u'}});fireEvent.change(within(card).getByLabelText('Riferimento soggetto nella pratica'),{target:{value:'property'}});fireEvent.click(within(card).getByRole('checkbox'));fireEvent.click(within(card).getByRole('button',{name:'Associa come dato proposto'}));
   const review=screen.getByRole('region',{name:'Revisione dati e fonti'});
   const target=await waitFor(()=>{const c=within(review).getAllByRole('article',{name:'Subalterno'}).find(c=>within(c).queryByText(value))!;expect(c).toBeTruthy();return c;});
   fireEvent.change(within(target).getByLabelText('Decisione'),{target:{value:'confirm'}});fireEvent.click(within(target).getByRole('button',{name:'Registra decisione'}));
   await waitFor(()=>expect(within(review).getAllByText('Confermato dall’agente')).toHaveLength(value==='12'?1:2));
   await waitFor(()=>expect(f.fetch.mock.calls.filter(([path,init])=>path===root+'/deed-proposals'&&init.method!=='POST')).toHaveLength(value==='12'?2:3));
  }
  fireEvent.click(screen.getByText('Crea un confronto',{selector:'summary'}));
  fireEvent.change(screen.getByLabelText('Unità del confronto'),{target:{value:'u'}});fireEvent.change(screen.getByLabelText('Riferimento soggetto del confronto'),{target:{value:'property'}});fireEvent.change(screen.getByLabelText('Tipo di dato'),{target:{value:'cadastral.subaltern'}});fireEvent.change(screen.getByLabelText('Ambito temporale del confronto'),{target:{value:'Identificativo attuale da verificare'}});
  const compare=screen.getByRole('region',{name:'Nuovo confronto circoscritto'});for(const box of within(compare).getAllByRole('checkbox'))fireEvent.click(box);fireEvent.click(within(compare).getByRole('button',{name:'Registra confronto da verificare'}));
  fireEvent.click(screen.getByText('Punti da verificare',{selector:'summary'}));await screen.findByRole('article',{name:'Confronto · Subalterno'});
  fireEvent.click(screen.getByText('Prepara dati incarico',{selector:'summary'}));fireEvent.change(screen.getByLabelText('Unità da preparare'),{target:{value:'u'}});fireEvent.change(screen.getByLabelText('Riferimento soggetto da preparare'),{target:{value:'property'}});
  await screen.findByRole('checkbox',{name:'Subalterno: 12'});expect(screen.getByRole('checkbox',{name:'Subalterno: 13'})).toBeInTheDocument();expect(screen.getByText('1 questione leggibile ancora aperta o da rivedere.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Genera bozza · manca il modello'})).toBeDisabled();
  expect(f.fetch.mock.calls.filter(([,init])=>init.method==='POST')).toHaveLength(5);expect(changed).toHaveBeenCalledTimes(5);
 });
 it('keeps an unsaved correction and defers a new snapshot until its draft is cleared',async()=>{
  const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>()};const v=render(<ReviewWorkspace scopeKey="draft" api={api} refreshToken={0}/>);await screen.findByLabelText('Decisione');
  fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:'correct'}});fireEvent.change(screen.getByLabelText('Valore corretto'),{target:{value:'14'}});fireEvent.change(screen.getByLabelText('Motivazione obbligatoria'),{target:{value:'Bozza da controllare'}});
  const next=snapshot();next.revision=5;next.facts[0]!.proposedValue='13';api.read.mockResolvedValue(next);v.rerender(<ReviewWorkspace scopeKey="draft" api={api} refreshToken={1}/>);await screen.findByText(deferredRefreshMessage);expect(api.read).toHaveBeenCalledOnce();expect(screen.getByLabelText('Valore corretto')).toHaveValue('14');expect(api.decide).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Valore corretto'),{target:{value:'12'}});fireEvent.change(screen.getByLabelText('Motivazione obbligatoria'),{target:{value:''}});fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:''}});await screen.findByText('13');expect(api.read).toHaveBeenCalledTimes(2);expect(api.decide).not.toHaveBeenCalled();
 });
 it('defers refresh through an uncertain result and retries only the original request and key',async()=>{
  const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>().mockRejectedValueOnce(new ApiError({kind:'service',status:503,code:'unavailable',message:'Synthetic'})).mockResolvedValue({replay:false,review:confirmed()})};const v=render(<ReviewWorkspace scopeKey="pending" api={api} refreshToken={0} createKey={()=>'same-key'}/>);await screen.findByLabelText('Decisione');fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:'confirm'}});fireEvent.click(screen.getByRole('button',{name:'Registra decisione'}));await screen.findByRole('button',{name:'Riprova lo stesso invio'});
  v.rerender(<ReviewWorkspace scopeKey="pending" api={api} refreshToken={1} createKey={()=>'same-key'}/>);await screen.findByText(deferredRefreshMessage);expect(api.read).toHaveBeenCalledOnce();expect(api.decide).toHaveBeenCalledOnce();const request=structuredClone(api.decide.mock.calls[0]);api.read.mockResolvedValue(confirmed());fireEvent.click(screen.getByRole('button',{name:'Riprova lo stesso invio'}));await screen.findByText('Confermato dall’agente');await waitFor(()=>expect(api.read).toHaveBeenCalledTimes(2));expect(api.decide.mock.calls[1]).toEqual(request);
 });
 it('allows an idle readonly view to receive a newer authorized snapshot without writes',async()=>{
  const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>()};const v=render(<ReviewWorkspace scopeKey="readonly" api={api} refreshToken={0} readOnly/>);await screen.findByLabelText('Decisione');api.read.mockResolvedValue(confirmed());v.rerender(<ReviewWorkspace scopeKey="readonly" api={api} refreshToken={1} readOnly/>);await screen.findByText('Confermato dall’agente');expect(screen.getByLabelText('Decisione')).toBeDisabled();expect(api.decide).not.toHaveBeenCalled();
 });
 it('does not interrupt an in-flight decision when another panel changes',async()=>{
  let finish!:(v:Awaited<ReturnType<AgencyReviewPort['decide']>>)=>void;const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>().mockImplementation(()=>new Promise(r=>finish=r))};const v=render(<ReviewWorkspace scopeKey="busy" api={api} refreshToken={0}/>);await screen.findByLabelText('Decisione');fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:'confirm'}});fireEvent.click(screen.getByRole('button',{name:'Registra decisione'}));v.rerender(<ReviewWorkspace scopeKey="busy" api={api} refreshToken={1}/>);await screen.findByText(deferredRefreshMessage);expect(api.read).toHaveBeenCalledOnce();api.read.mockResolvedValue(confirmed());await act(async()=>finish({replay:false,review:confirmed()}));await screen.findByText('Confermato dall’agente');expect(api.decide).toHaveBeenCalledOnce();
 });
 it('a draft started in the same commit as an invalidation is never overwritten by the queued refresh',async()=>{
  const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>()};const v=render(<ReviewWorkspace scopeKey="same-commit" api={api} refreshToken={0}/>);await screen.findByLabelText('Decisione');
  await act(async()=>{v.rerender(<ReviewWorkspace scopeKey="same-commit" api={api} refreshToken={1}/>);fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:'correct'}});});
  await screen.findByText(deferredRefreshMessage);expect(screen.getByLabelText('Valore corretto')).toHaveValue('12');expect(api.read).toHaveBeenCalledOnce();expect(api.decide).not.toHaveBeenCalled();
 });

 it('a readonly downgrade keeps an uncertain decision but cannot retry its write',async()=>{
  const api={read:vi.fn<AgencyReviewPort['read']>().mockResolvedValue(snapshot()),decide:vi.fn<AgencyReviewPort['decide']>().mockRejectedValue(new ApiError({kind:'service',status:503,code:'unavailable',message:'Synthetic'}))};const v=render(<ReviewWorkspace scopeKey="permission" api={api} refreshToken={0}/>);await screen.findByLabelText('Decisione');fireEvent.change(screen.getByLabelText('Decisione'),{target:{value:'confirm'}});fireEvent.click(screen.getByRole('button',{name:'Registra decisione'}));await screen.findByRole('button',{name:'Riprova lo stesso invio'});
  v.rerender(<ReviewWorkspace scopeKey="permission" api={api} refreshToken={1} readOnly/>);expect(screen.getByRole('button',{name:'Riprova lo stesso invio'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Riprova lo stesso invio'}));expect(api.decide).toHaveBeenCalledOnce();expect(api.read).toHaveBeenCalledOnce();
 });

});
