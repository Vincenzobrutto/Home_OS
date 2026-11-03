import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {describe,it,expect,vi} from 'vitest';
import {Workspace} from './MapPage';
import {parseMap,type MapView} from './api';
vi.mock('../documents/hooks',()=>({useDocumentFile:()=>({isPending:false,isError:false,data:{blob:new Blob(['synthetic']),mimeType:'image/png'}})}));
vi.mock('./OriginalMap',()=>({OriginalMap:({children,onPoint,overlay}:{children:React.ReactNode;overlay?:React.ReactNode;onPoint:(x:number,y:number)=>void})=><div><svg>{children}</svg>{overlay}<button onClick={()=>onPoint(20,20)}>Punto sintetico sulla mappa</button></div>}));
const room:MapView['rooms'][number]={id:'kitchen',name:'Cucina',type:'kitchen',points:[[5,5],[45,5],[45,45],[5,45]],holes:[],roomId:'room',state:'active'};
function fixture():MapView{return {id:'map',version:2,geometryRevision:3,document:{id:'doc',name:'Planimetria DEMO',mimeType:'image/png'},layout:{source:{page:1},frame:{width:100,height:100},rooms:[structuredClone(room)],qualification:'estimated',caveats:['Formato A4 presunto: verificare']},rooms:[structuredClone(room)],objects:[{id:'fridge',name:'Frigorifero DEMO',type:'appliance',positionVersion:0}],pins:[],canEdit:true};}
function mount(data=fixture(),send=vi.fn().mockResolvedValue({}),refresh=vi.fn().mockResolvedValue(undefined)){render(<MemoryRouter><Workspace data={data} homeId="home" send={send} refresh={refresh}/></MemoryRouter>);return {send,refresh};}
describe('mappa indipendente della casa',()=>{
 it('keeps an imported draft caveat visible before the collapsed measurement details',()=>{
  const data=fixture();data.layout.qualification='unverified';data.layout.caveats=['Bozza importata da backoffice: contorni e ambienti da verificare.','Computo non completo.'];mount(data);
  expect(screen.getByRole('note')).toHaveTextContent(data.layout.caveats[0]!);expect(screen.getByText('Misure e limiti · scala da verificare').closest('details')).not.toHaveAttribute('open');expect(screen.queryByText(/digitalizzati dall’agenzia/)).not.toBeInTheDocument();
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
