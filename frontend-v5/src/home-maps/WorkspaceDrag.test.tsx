import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {Workspace} from './MapPage';
import {mapFixture} from './map-test-fixture';
import {ApiError} from '../api/errors';
vi.mock('../documents/hooks',()=>({useDocumentFile:()=>({isPending:false,isError:false,data:{blob:new Blob(['synthetic'])}})}));
vi.mock('./OriginalMap',()=>({OriginalMap:({children,overlay}:{children:React.ReactNode;overlay?:React.ReactNode})=><div><svg>{children}</svg>{overlay}</div>}));
beforeAll(()=>vi.stubGlobal('PointerEvent',class extends MouseEvent{pointerId:number;constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??1;}}));afterAll(()=>vi.unstubAllGlobals());
const error=(status:number)=>new ApiError({kind:'http',status,code:'map_version_conflict',message:'changed'});
function mount(send=vi.fn().mockResolvedValue({}),refresh=vi.fn().mockResolvedValue(undefined),data=mapFixture()){
 const view=render(<MemoryRouter><Workspace data={data} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);
 const layer=view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!;
 // The fixture now displays a 100×69 property frame; canonical drop assertions stay unchanged.
 vi.spyOn(layer,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1000,height:690,right:1000,bottom:690,x:0,y:0,toJSON:()=>({})});
 const viewport=view.container.querySelector('[data-map-viewport]')!;vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1000,height:690,right:1000,bottom:690,x:0,y:0,toJSON:()=>({})});
 return {data,view,send,refresh};
}
function drag(){const el=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});fireEvent.pointerDown(el,{pointerId:1,button:0,clientX:200,clientY:200});fireEvent.pointerMove(el,{pointerId:1,button:0,clientX:700,clientY:200});fireEvent.pointerUp(el,{pointerId:1,button:0,clientX:700,clientY:200});}
describe('salvataggio del trascinamento',()=>{
 it('only displays initial room placement, then saves a drop with matching map/placement versions',async()=>{const {send,refresh}=mount();expect(screen.getByText(/I segnaposti tratteggiati/)).toBeInTheDocument();expect(send).not.toHaveBeenCalled();drag();await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());expect(send).toHaveBeenCalledWith('pins',{expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3},expect.any(String));expect(screen.getByText(/Anche l’associazione alla stanza è aggiornata/)).toBeInTheDocument();});
 it('unknown result locks further moves, never retries automatically and keeps the same key/body for manual recovery',async()=>{const send=vi.fn().mockRejectedValueOnce(new TypeError('lost reply')).mockResolvedValueOnce({});mount(send);drag();await screen.findByRole('alert');expect(send).toHaveBeenCalledOnce();drag();expect(send).toHaveBeenCalledOnce();fireEvent.click(screen.getByText('Riprova lo stesso invio'));await waitFor(()=>expect(send).toHaveBeenCalledTimes(2));expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);});
 it('acknowledged save plus read failure is a refresh problem and never reissues the mutation',async()=>{const {send,refresh}=mount(vi.fn().mockResolvedValue({}),vi.fn().mockRejectedValueOnce(new Error('read down')).mockResolvedValueOnce(undefined));drag();await screen.findByRole('alert');expect(send).toHaveBeenCalledOnce();expect(screen.queryByText('Riprova lo stesso invio')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Aggiorna dati'));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));expect(send).toHaveBeenCalledOnce();});
 it('a conflict requires fresh data instead of replaying a stale drag',async()=>{const {send}=mount(vi.fn().mockRejectedValue(error(409)));drag();await screen.findByRole('alert');expect(screen.getByText('Aggiorna dati')).toBeInTheDocument();expect(screen.queryByText('Riprova lo stesso invio')).not.toBeInTheDocument();drag();expect(send).toHaveBeenCalledOnce();});
 it('access revoked on save hides map data and does not retry',async()=>{const {send,view}=mount(vi.fn().mockRejectedValue(error(403)));drag();await screen.findByText('Accesso alla mappa non disponibile. Nessuna modifica viene ripetuta.');expect(view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')).toBeNull();expect(send).toHaveBeenCalledOnce();});
 it('a contour draft cannot overwrite a newer plan version',()=>{const {view,data,send,refresh}=mount();fireEvent.click(screen.getByRole('button',{name:'Gestisci vani e oggetti'}));fireEvent.click(screen.getByText('Modifica contorno'));fireEvent.click(screen.getByText('Aggiungi punto dopo 1'));const newer=structuredClone(data);newer.version++;view.rerender(<MemoryRouter><Workspace data={newer} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);expect(screen.getByText('Salva contorno e invalida le misure')).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('La mappa è cambiata');expect(send).not.toHaveBeenCalled();});
});

function unassigned(){const data=mapFixture();data.objects[0]!.roomIds=[];return data;}
function trayStart(){const button=screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'});fireEvent.pointerDown(button,{pointerId:1,button:0,clientX:900,clientY:30});return button;}
function trayMove(button:HTMLElement){fireEvent.pointerMove(button,{pointerId:1,button:0,clientX:700,clientY:200});}
function trayUp(button:HTMLElement){fireEvent.pointerUp(button,{pointerId:1,button:0,clientX:700,clientY:200});}
function trayDrag(){const button=trayStart();trayMove(button);trayUp(button);return button;}
describe('placing a previously unassigned object from the tray',()=>{
 it('submits one canonical placement and uses the refreshed server model instead of inventing a local association',async()=>{
  const data=unassigned(),before=structuredClone(data),{view,send,refresh}=mount(undefined,undefined,data);
  const surface=view.container.querySelector('[data-map-surface]'),dock=view.container.querySelector('[data-unplaced-dock]');expect(surface).not.toBeNull();expect(dock).not.toBeNull();expect(surface).toContainElement(dock as HTMLElement);expect(dock!.closest('[data-map-viewport]')).toBeNull();expect(screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'}).querySelector('svg')).not.toBeNull();
  expect(screen.queryByRole('link',{name:'Apri Frigorifero DEMO'})).not.toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Vani e oggetti'})).not.toBeInTheDocument();expect(send).not.toHaveBeenCalled();trayDrag();
  await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());expect(send).toHaveBeenCalledOnce();expect(send).toHaveBeenCalledWith('pins',{expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3},expect.any(String));expect(data).toEqual(before);expect(screen.getByText(/Frigorifero DEMO posizionato in Balcone/)).toBeInTheDocument();
  const confirmed=structuredClone(data);confirmed.version=6;confirmed.objects[0]!.positionVersion=4;confirmed.objects[0]!.roomIds=['room-balcony'];confirmed.pins=[{objectId:'fridge',regionId:'balcony',x:70,y:20,geometryRevision:2,needsReview:false}];
  view.rerender(<MemoryRouter><Workspace data={confirmed} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);
  expect(screen.queryByRole('button',{name:'Posiziona Frigorifero DEMO'})).not.toBeInTheDocument();expect(view.container.querySelector('[data-unplaced-dock]')).toBeNull();expect(screen.getByRole('link',{name:'Apri Frigorifero DEMO'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Vani e oggetti'})).not.toBeInTheDocument();expect(send).toHaveBeenCalledOnce();
 });
 it('retains the exact canonical body and idempotency key after an uncertain tray drop',async()=>{
  const send=vi.fn().mockRejectedValueOnce(new TypeError('lost reply')).mockResolvedValueOnce({});mount(send,undefined,unassigned());trayDrag();await screen.findByRole('alert');expect(send).toHaveBeenCalledOnce();trayDrag();expect(send).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Riprova lo stesso invio'));await waitFor(()=>expect(send).toHaveBeenCalledTimes(2));expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);expect(send.mock.calls[0]![1]).toEqual({expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3});
 });
 it('does not replay an acknowledged tray placement when the subsequent refresh fails',async()=>{
  const {send,refresh}=mount(vi.fn().mockResolvedValue({}),vi.fn().mockRejectedValueOnce(new Error('read down')).mockResolvedValueOnce(undefined),unassigned());trayDrag();await screen.findByRole('alert');expect(send).toHaveBeenCalledOnce();expect(screen.queryByText('Riprova lo stesso invio')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Aggiorna dati'));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));expect(send).toHaveBeenCalledOnce();
 });
 it('requires fresh data after a conflict on the initial tray placement',async()=>{
  const {send}=mount(vi.fn().mockRejectedValue(error(409)),undefined,unassigned());trayDrag();await screen.findByRole('alert');expect(screen.getByText('Aggiorna dati')).toBeInTheDocument();expect(screen.queryByText('Riprova lo stesso invio')).not.toBeInTheDocument();trayDrag();expect(send).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'})).toBeDisabled();
 });
 it('removes both the tray and map when access is revoked on the first placement',async()=>{
  const {send,view}=mount(vi.fn().mockRejectedValue(error(403)),undefined,unassigned());trayDrag();await screen.findByText('Accesso alla mappa non disponibile. Nessuna modifica viene ripetuta.');expect(view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')).toBeNull();expect(view.container.querySelector('[data-unplaced-dock]')).toBeNull();expect(view.container.querySelector('[data-map-surface]')).toBeNull();expect(screen.queryByRole('button',{name:'Posiziona Frigorifero DEMO'})).not.toBeInTheDocument();expect(send).toHaveBeenCalledOnce();
 });
 it('cancels a tray gesture when newer canonical placement data arrives before release',()=>{
  const {data,view,send,refresh}=mount(undefined,undefined,unassigned()),button=trayStart();trayMove(button);const next=structuredClone(data);next.version++;next.objects[0]!.positionVersion++;view.rerender(<MemoryRouter><Workspace data={next} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);trayUp(button);
  expect(send).not.toHaveBeenCalled();expect(screen.getByText('La mappa o la posizione sono cambiate: ricarica prima di spostare l’oggetto.')).toBeInTheDocument();expect(next.objects[0]!.roomIds).toEqual([]);expect(next.pins).toEqual([]);expect(refresh).not.toHaveBeenCalled();
 });
});
