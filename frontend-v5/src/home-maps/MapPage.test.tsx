import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {describe,it,expect,vi} from 'vitest';
import {Workspace} from './MapPage';
import {parseMap,type MapView} from './api';
import type {ViewFrame} from './orientation';
vi.mock('../documents/hooks',()=>({useDocumentFile:()=>({isPending:false,isError:false,data:{blob:new Blob(['synthetic']),mimeType:'image/png'}})}));
vi.mock('./OriginalMap',()=>({OriginalMap:({children,onPoint,overlay,viewport}:{children:React.ReactNode;overlay?:React.ReactNode;viewport?:ViewFrame;onPoint:(x:number,y:number)=>void})=><div data-testid="synthetic-map-frame" data-viewport={JSON.stringify(viewport)}><svg>{children}</svg>{overlay}<button onClick={()=>onPoint(20,20)}>Punto sintetico sulla mappa</button></div>}));
const room:MapView['rooms'][number]={id:'kitchen',name:'Cucina',type:'kitchen',points:[[5,5],[45,5],[45,45],[5,45]],holes:[],roomId:'room',state:'active'};
function fixture():MapView{return {id:'map',version:2,geometryRevision:3,document:{id:'doc',name:'Planimetria DEMO',mimeType:'image/png'},layout:{source:{page:1},frame:{width:100,height:100},rooms:[structuredClone(room)],qualification:'estimated',caveats:['Formato A4 presunto: verificare']},rooms:[structuredClone(room)],objects:[{id:'fridge',name:'Frigorifero DEMO',type:'appliance',positionVersion:0}],pins:[],canEdit:true};}
function mount(data=fixture(),send=vi.fn().mockResolvedValue({}),refresh=vi.fn().mockResolvedValue(undefined),openManagement=true){const view=render(<MemoryRouter><Workspace data={data} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);if(openManagement)fireEvent.click(screen.getByRole('button',{name:'Gestisci vani e oggetti'}));return {send,refresh,view};}
describe('mappa indipendente della casa',()=>{
 it('starts with a full map and an icon dock inside its surface, outside the zoomed original and viewport',()=>{
  const {send,refresh,view}=mount(undefined,undefined,undefined,false),toggle=screen.getByRole('button',{name:'Gestisci vani e oggetti'}),surface=view.container.querySelector('[data-map-surface]'),dock=view.container.querySelector('[data-unplaced-dock]'),button=screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'});
  expect(toggle).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('heading',{name:'Vani e oggetti'})).not.toBeInTheDocument();expect(screen.queryByLabelText('Il tuo elettrodomestico')).not.toBeInTheDocument();
  expect(surface).not.toBeNull();expect(dock).not.toBeNull();expect(surface).toContainElement(dock as HTMLElement);expect(button.closest('[data-unplaced-dock]')).toBe(dock);expect(dock!.closest('[data-map-viewport]')).toBeNull();expect(screen.getByTestId('synthetic-map-frame')).not.toContainElement(dock as HTMLElement);
  expect(screen.getByRole('heading',{name:'Da collocare'})).toBeInTheDocument();expect(button.querySelector('svg')).not.toBeNull();expect(screen.queryByRole('heading',{name:'Da posizionare'})).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Da posizionare sulla planimetria'})).not.toBeInTheDocument();expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
 });
 it('opens the optional manual controls after the map instead of mounting a dialog or nested map sidebar',()=>{
  const {send,refresh,view}=mount(undefined,undefined,undefined,false),surface=view.container.querySelector('[data-map-surface]')!;
  fireEvent.click(screen.getByRole('button',{name:'Gestisci vani e oggetti'}));const management=screen.getByRole('heading',{name:'Vani e oggetti'}).closest('section')!;
  expect(surface).not.toContainElement(management);expect(surface.compareDocumentPosition(management)&Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByLabelText('Il tuo elettrodomestico')).toBeInTheDocument();expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
 });
 for(const action of ['tap','Enter',' '] as const)it('opens the controls with the unplaced object selected on '+(action===' '?'Space':action)+', without choosing or saving its point',()=>{
  const data=fixture(),before=structuredClone(data),{send,refresh}=mount(data,undefined,undefined,false),button=screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'});
  if(action==='tap')fireEvent.click(button);else fireEvent.keyDown(button,{key:action});
  expect(screen.getByRole('button',{name:'Chiudi gestione'})).toHaveAttribute('aria-expanded','true');expect(screen.getByRole('heading',{name:'Vani e oggetti'})).toBeInTheDocument();expect(screen.getByLabelText('Il tuo elettrodomestico')).toHaveValue('fridge');
  expect(screen.getByLabelText('Posizione X')).toHaveValue(null);expect(screen.getByLabelText('Posizione Y')).toHaveValue(null);expect(screen.getByRole('button',{name:'Salva posizione nella stanza'})).toBeDisabled();expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();expect(data).toEqual(before);
 });
 it('keeps a pending canonical position and the view settings when management is closed and reopened',()=>{
  const {send,refresh,view}=mount(),dock=view.container.querySelector('[data-unplaced-dock]');fireEvent.change(screen.getByLabelText('Il tuo elettrodomestico'),{target:{value:'fridge'}});fireEvent.change(screen.getByLabelText('Posizione X'),{target:{value:22}});fireEvent.change(screen.getByLabelText('Posizione Y'),{target:{value:24}});
  fireEvent.click(screen.getByRole('button',{name:'Ingrandisci'}));fireEvent.click(screen.getByRole('button',{name:'Ruota a destra'}));fireEvent.click(screen.getByLabelText('Mostra planimetria originale'));fireEvent.click(screen.getByRole('button',{name:'Chiudi gestione'}));
  expect(screen.queryByLabelText('Posizione X')).not.toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Vani e oggetti'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Gestisci vani e oggetti'}));
  expect(screen.getByLabelText('Il tuo elettrodomestico')).toHaveValue('fridge');expect(screen.getByLabelText('Posizione X')).toHaveValue(22);expect(screen.getByLabelText('Posizione Y')).toHaveValue(24);expect(screen.getByRole('button',{name:'Riduci'})).toBeEnabled();expect(screen.getByLabelText('Orientamento della vista')).toHaveTextContent('90°');expect(screen.getByLabelText('Mostra planimetria originale')).not.toBeChecked();expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
  expect(view.container.querySelector('[data-unplaced-dock]')).toBe(dock);expect(dock!.closest('[data-map-viewport]')).toBeNull();
 });
 it('retains the unfinished contour draft across management close and reopen without saving it',()=>{
  const {send,refresh}=mount();fireEvent.click(screen.getByText('Modifica contorno'));fireEvent.click(screen.getByText('Aggiungi punto dopo 1'));fireEvent.change(screen.getByLabelText('X punto 2'),{target:{value:27}});fireEvent.click(screen.getByRole('button',{name:'Chiudi gestione'}));
  expect(screen.queryByLabelText('X punto 2')).not.toBeInTheDocument();expect(screen.getByText('Durante la correzione del contorno vedi il foglio completo.')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Gestisci vani e oggetti'}));
  expect(screen.getByLabelText('X punto 2')).toHaveValue(27);expect(screen.getByLabelText('X punto 5')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Salva contorno e invalida le misure'})).toBeEnabled();expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
 });
 it('does not let a read-only viewer select an unplaced object for positioning',()=>{
  const data=fixture();data.canEdit=false;const {send}=mount(data,undefined,undefined,false),button=screen.getByRole('button',{name:'Posiziona Frigorifero DEMO'});expect(button).toBeDisabled();fireEvent.click(button);fireEvent.keyDown(button,{key:'Enter'});expect(screen.queryByRole('heading',{name:'Vani e oggetti'})).not.toBeInTheDocument();expect(send).not.toHaveBeenCalled();
 });
 it('keeps an imported draft caveat visible before the collapsed measurement details',()=>{
  const data=fixture();data.layout.qualification='unverified';data.layout.caveats=['Bozza importata da backoffice: contorni e ambienti da verificare.','Computo non completo.'];mount(data);
  expect(screen.getByRole('note')).toHaveTextContent(data.layout.caveats[0]!);expect(screen.getByText('Misure e limiti · scala da verificare').closest('details')).not.toHaveAttribute('open');expect(screen.queryByText(/digitalizzati dall’agenzia/)).not.toBeInTheDocument();
 });
 it('rotates either way without saving or resetting zoom, object selection and pending canonical coordinates',()=>{
  const {send,refresh}=mount();fireEvent.click(screen.getByRole('button',{name:'Ingrandisci'}));fireEvent.change(screen.getByLabelText('Il tuo elettrodomestico'),{target:{value:'fridge'}});fireEvent.click(screen.getByText('Punto sintetico sulla mappa'));
  fireEvent.click(screen.getByRole('button',{name:'Ruota a destra'}));expect(screen.getByLabelText('Orientamento della vista')).toHaveTextContent('90°');
  expect(screen.getByLabelText('Posizione X')).toHaveValue(20);expect(screen.getByLabelText('Posizione Y')).toHaveValue(20);expect(screen.getByLabelText('Il tuo elettrodomestico')).toHaveValue('fridge');expect(screen.getByRole('button',{name:'Riduci'})).toBeEnabled();
  fireEvent.click(screen.getByLabelText('Mostra planimetria originale'));fireEvent.click(screen.getByRole('button',{name:'Ruota a sinistra'}));expect(screen.getByLabelText('Orientamento della vista')).toHaveTextContent('0°');expect(screen.getByLabelText('Mostra planimetria originale')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Ruota a sinistra'}));expect(screen.getByLabelText('Orientamento della vista')).toHaveTextContent('270°');expect(screen.getByLabelText('Posizione X')).toHaveValue(20);expect(send).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
 });
 it('focuses the adopted rooms but exposes the full sheet during contour correction without saving a view change',()=>{
  const {send}=mount(),viewport=()=>JSON.parse(screen.getByTestId('synthetic-map-frame').getAttribute('data-viewport')!);
  expect(viewport()).toEqual({x:0,y:0,width:69,height:69});fireEvent.click(screen.getByLabelText('Mostra planimetria originale'));fireEvent.click(screen.getByRole('button',{name:'Ruota a destra'}));
  fireEvent.click(screen.getByRole('button',{name:'Modifica contorno'}));expect(viewport()).toEqual({x:0,y:0,width:100,height:100});expect(screen.getByText('Durante la correzione del contorno vedi il foglio completo.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('X punto 1'),{target:{value:2}});expect(viewport()).toEqual({x:0,y:0,width:100,height:100});fireEvent.click(screen.getByRole('button',{name:'Annulla modifica contorno'}));expect(viewport()).toEqual({x:0,y:0,width:69,height:69});expect(screen.getByLabelText('Mostra planimetria originale')).not.toBeChecked();expect(screen.getByLabelText('Orientamento della vista')).toHaveTextContent('90°');expect(send).not.toHaveBeenCalled();
 });
 it('places an existing fridge only after explicit save, with plan and canonical placement revisions',async()=>{
  const {send,refresh}=mount();fireEvent.change(screen.getByLabelText('Il tuo elettrodomestico'),{target:{value:'fridge'}});expect(send).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Punto sintetico sulla mappa'));expect(send).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Salva posizione nella stanza'));
  await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());expect(send).toHaveBeenCalledWith('pins',{expectedVersion:2,objectId:'fridge',regionId:'kitchen',x:20,y:20,expectedPositionVersion:0},expect.any(String));
 });
 it('supports keyboard coordinates and never guesses a position',async()=>{
  const {send}=mount();fireEvent.change(screen.getByLabelText('Il tuo elettrodomestico'),{target:{value:'fridge'}});expect(screen.getByText('Salva posizione nella stanza')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Posizione X'),{target:{value:'22'}});fireEvent.change(screen.getByLabelText('Posizione Y'),{target:{value:'24'}});fireEvent.click(screen.getByText('Salva posizione nella stanza'));await waitFor(()=>expect(send).toHaveBeenCalledWith('pins',expect.objectContaining({x:22,y:24}),expect.any(String)));
 });
 it('opens the normal object card from its actual marker and marks stale placements',()=>{
  const data=fixture();data.pins=[{objectId:'fridge',regionId:'kitchen',x:20,y:20,geometryRevision:2,needsReview:true}];mount(data);
  expect(screen.getByRole('link',{name:'Apri Frigorifero DEMO'})).toHaveAttribute('href','/home/home/oggetti/object/fridge');expect(screen.getAllByText(/da riconfermare/).length).toBeGreaterThan(0);expect(screen.getByText('Formato A4 presunto: verificare')).toBeInTheDocument();
 });
 it('adds a point to split a contour edge and submits independent geometry, not moved pins',async()=>{
  const {send}=mount();fireEvent.click(screen.getByText('Modifica contorno'));fireEvent.click(screen.getByText('Aggiungi punto dopo 1'));expect(screen.getByLabelText('X punto 2')).toHaveValue(25);fireEvent.click(screen.getByText('Salva contorno e invalida le misure'));
  await waitFor(()=>expect(send).toHaveBeenCalledOnce());expect(send.mock.calls[0]![0]).toBe('geometry');expect(send.mock.calls[0]![1].geometry.points).toHaveLength(5);expect(send.mock.calls[0]![1]).not.toHaveProperty('pins');
 });
 it('unknown send does not retry automatically and manual retry retains exact body/key',async()=>{
  const send=vi.fn().mockRejectedValueOnce(new Error('uncertain')).mockResolvedValueOnce({});mount(fixture(),send);fireEvent.change(screen.getByLabelText('Il tuo elettrodomestico'),{target:{value:'fridge'}});fireEvent.click(screen.getByText('Punto sintetico sulla mappa'));fireEvent.click(screen.getByText('Salva posizione nella stanza'));
  await screen.findByRole('alert');expect(send).toHaveBeenCalledOnce();fireEvent.click(screen.getByText('Riprova lo stesso invio'));await waitFor(()=>expect(send).toHaveBeenCalledTimes(2));expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
 });
 it('read-only users cannot send edits',()=>{const data=fixture();data.canEdit=false;const {send}=mount(data);expect(screen.getByLabelText('Il tuo elettrodomestico')).toBeDisabled();expect(send).not.toHaveBeenCalled();});
 it('malformed map response is not rendered as a usable spatial model',()=>{const data=fixture();data.rooms[0]!.points[0]![0]=-1;expect(()=>parseMap(data)).toThrow();});
 it('rejects frame mismatch, invalid pins and missing map caveats at transport boundary',()=>{for(const mutate of [(v:MapView)=>{v.layout.frame.width=0;},(v:MapView)=>{v.pins=[{objectId:'fridge',regionId:'kitchen',x:101,y:20,geometryRevision:3,needsReview:false}];},(v:MapView)=>{v.layout.qualification='certified' as MapView['layout']['qualification'];}]){const data=fixture();mutate(data);expect(()=>parseMap(data)).toThrow();}});
});
