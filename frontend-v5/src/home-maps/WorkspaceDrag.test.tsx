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
function mount(send=vi.fn().mockResolvedValue({}),refresh=vi.fn().mockResolvedValue(undefined)){
 const data=mapFixture(),view=render(<MemoryRouter><Workspace data={data} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);
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
 it('a contour draft cannot overwrite a newer plan version',()=>{const {view,data,send,refresh}=mount();fireEvent.click(screen.getByText('Modifica contorno'));fireEvent.click(screen.getByText('Aggiungi punto dopo 1'));const newer=structuredClone(data);newer.version++;view.rerender(<MemoryRouter><Workspace data={newer} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);expect(screen.getByText('Salva contorno e invalida le misure')).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('La mappa è cambiata');expect(send).not.toHaveBeenCalled();});
});
