import {act,render,renderHook,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect,vi} from 'vitest';
import {NewPractice} from './NewPractice';
import {emptyProfile,useJourney,type JourneySnapshot} from './journey';
import type {ApiTransport} from '../api/transport';
vi.mock('../documents/PdfPreview',()=>({PdfPreview:()=>null}));
vi.mock('./readMandate',()=>({readMandate:vi.fn(async()=>({profile:{...emptyProfile(),seller:'Venditore DEMO',address:'Via Sintetica 1'},pages:{seller:1,address:2},warning:'Proposte da controllare'}))}));
const snapshot=():JourneySnapshot=>({revision:1,profileStale:false,state:{profile:emptyProfile(),mandateSourceId:null,mandateVersion:null,stage:'preparation',checklist:{answers:{},custom:[],assignments:{},waiting:[]},listing:{title:'',description:''},transaction:{buyer:'',offerPrice:'',outcome:'',mortgage:'',notary:'',closingDate:'',tasks:''}}});
function api(handler:(path:string,options:NonNullable<Parameters<ApiTransport['callJson']>[1]>)=>Promise<unknown>){return {callJson:vi.fn(handler)} as unknown as Pick<ApiTransport,'callJson'>;}
describe('practice journey persisted flow',()=>{
 it('requires reviewing the mandate, resumes the same uploaded file after a lost reply and confirms its source',async()=>{
  const user=userEvent.setup(),created=vi.fn();let dropped=false;
  const a=api(async(path)=>{
   if(path.endsWith('/sources')){if(!dropped){dropped=true;throw Error('lost');}return {practice:{id:'p',revision:2},receipt:{sourceId:'s'}};}
   if(path.endsWith('/journey'))return snapshot();
   return {practice:{id:'p',revision:1}};
  });
  render(<NewPractice api={a} agencyId="g" accountId="a" onCreated={created} onCancel={vi.fn()}/>);
  await user.upload(screen.getByLabelText('Incarico firmato PDF'),new File(['synthetic'],'incarico.pdf',{type:'application/pdf'}));
  await user.click(screen.getByRole('button',{name:'Leggi incarico e continua'}));
  await screen.findByDisplayValue('Venditore DEMO');expect(screen.getByText('Incarico · pagina 2',{exact:false})).toBeVisible();
  expect(a.callJson).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Conferma e crea pratica'})).toBeDisabled();
  await user.click(screen.getByLabelText('Ho controllato i dati e confermo quelli inseriti'));
  await user.click(screen.getByRole('button',{name:'Conferma e crea pratica'}));
  await screen.findByRole('alert');expect(created).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('Venditore DEMO')).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Riprendi creazione della pratica'}));
  await waitFor(()=>expect(created).toHaveBeenCalledWith('p'));
  const calls=vi.mocked(a.callJson).mock.calls;
  expect(calls.filter(([path])=>path==='/agencies/g/practices')).toHaveLength(1);
  const uploads=calls.filter(([path])=>path.endsWith('/sources'));
  expect(uploads).toHaveLength(2);expect(uploads[0]![1]!.body).toBe(uploads[1]![1]!.body);expect(uploads[0]![1]!.idempotencyKey).toBe(uploads[1]![1]!.idempotencyKey);
  expect(calls.find(([path])=>path.endsWith('/journey'))![1]!.body).toMatchObject({expectedRevision:2,command:{operation:'profile',sourceId:'s',version:1,profile:{seller:'Venditore DEMO',address:'Via Sintetica 1'}}});
 });
 it('allows independent document revision changes but prevents overwriting a changed section',async()=>{
  const current=snapshot();const changed=vi.fn(),a=api(async(_path,options)=>options?.method==='POST'?structuredClone({...current,revision:current.revision+1}):structuredClone(current));
  const hook=renderHook(()=>useJourney(a,'/p','a',changed));await waitFor(()=>expect(hook.result.current.snapshot).not.toBeNull());
  current.revision=3;
  await act(async()=>{expect(await hook.result.current.save({operation:'stage',stage:'marketing'})).toBe(true);});
  expect(vi.mocked(a.callJson).mock.calls.find(([,options])=>options?.method==='POST')![1]!.body).toMatchObject({expectedRevision:3});
  current.state.listing.title='Other agent';
  await act(async()=>{expect(await hook.result.current.save({operation:'listing',listing:{title:'Mine',description:''}})).toBe(false);});
  expect(hook.result.current.error).toContain('cambiata');expect(vi.mocked(a.callJson).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(1);
 });
 it('does not resend automatically and retries the same saved command and key on uncertain response',async()=>{
  let lost=true;const changed=vi.fn(),a=api(async(_path,options)=>{if(options?.method==='POST'&&lost){lost=false;throw Error('lost reply');}return snapshot();});
  const hook=renderHook(()=>useJourney(a,'/p','a',changed));await waitFor(()=>expect(hook.result.current.snapshot).not.toBeNull());
  await act(async()=>{await hook.result.current.save({operation:'stage',stage:'completed'});});
  expect(hook.result.current.uncertain).toBe(true);expect(changed).not.toHaveBeenCalled();
  expect(vi.mocked(a.callJson).mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(1);
  await act(async()=>{await hook.result.current.retry();});
  const posts=vi.mocked(a.callJson).mock.calls.filter(([,o])=>o?.method==='POST');expect(posts).toHaveLength(2);expect(posts[0]![1]!.body).toBe(posts[1]![1]!.body);expect(posts[0]![1]!.idempotencyKey).toBe(posts[1]![1]!.idempotencyKey);expect(hook.result.current.uncertain).toBe(false);expect(changed).toHaveBeenCalledTimes(1);
 });
});
