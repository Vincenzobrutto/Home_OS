import {fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ListingPlanReview} from './ListingPlanReview';
import {detectPlanScale} from './detectPlanScale';
import {readListingRaster} from './listingOpeningDetection';
import type {PlanShape} from './PlanMeasurementView';

vi.mock('./detectPlanScale',()=>({detectPlanScale:vi.fn()}));
vi.mock('./listingOpeningDetection',async importOriginal=>({...await importOriginal<typeof import('./listingOpeningDetection')>(),readListingRaster:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});

function planMap(){
 const map=screen.getByLabelText('Pianta illustrativa modificabile');
 Object.defineProperty(map,'getScreenCTM',{value:()=>({a:1,b:0,inverse:()=>null})});
 vi.stubGlobal('DOMPoint',class {
  x:number;
  y:number;
  constructor(x:number,y:number){this.x=x;this.y=y;}
  matrixTransform(){return this;}
 });
 return map;
}

it('inserts an 80 cm door from the document bar without a saved scale',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue({
  bar:{start:[0,0],end:[100,0],metres:5,method:'detected_bar'},denominator:null,ambiguous:false,
 });
 const rooms:PlanShape[]=[{id:'room',label:'Soggiorno',points:[[10,10],[80,10],[80,80],[10,80]],holes:[]}];
 const onApply=vi.fn();
 render(<ListingPlanReview sourceUrl="/plan.png" width={100} height={100} rooms={rooms}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const map=planMap();
 fireEvent.click(screen.getByRole('button',{name:'Aggiungi porta'}));
 expect(screen.getByText(/Cerco la barra metrica/)).toBeInTheDocument();
 await screen.findByText(/porta da 80 cm/);
 fireEvent.click(map,{clientX:45,clientY:10});
 fireEvent.click(screen.getByRole('button',{name:'Salva dettagli per l’annuncio'}));
 expect(onApply.mock.calls[0]?.[0]).toMatchObject({
  scale:{mode:'bar',start:[0,0],end:[100,0],metres:5},
  openings:[{kind:'door',start:[37,10],end:[53,10],fixed:true}],
 });
});

it('uses the same wall controls on original geometry and keeps listing-only overrides out',()=>{
 const room:PlanShape={id:'a',label:'Cucina',points:[[10,10],[90,10],[90,90],[10,90]],holes:[]};
 const onApply=vi.fn();
 render(<ListingPlanReview editPlan sourceUrl="/plan.png" width={120} height={120} rooms={[room]}
  saved={{geometryRevision:1,openings:[],alignments:[],contours:[{id:'a',geometry:{...room,points:[[11,11],[85,11],[85,85],[11,85]]}}]}}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const map=screen.getByLabelText('Planimetria modificabile');
 expect(screen.getByRole('checkbox',{name:'Mostra originale'})).toBeChecked();
 const target=within(map).getByRole('button',{name:'Cucina · modifica muri'});
 expect(target).toHaveAttribute('d',expect.stringContaining('90 90'));
 fireEvent.click(target);
 fireEvent.keyDown(within(map).getByRole('button',{name:'Parete 2 · Cucina'}),{key:'ArrowRight'});
 fireEvent.click(screen.getByRole('button',{name:'Salva modifiche alla planimetria'}));
 expect(onApply).toHaveBeenCalledWith({openings:[],alignments:[],contours:[{id:'a',geometry:{points:[[10,10],[91,10],[91,90],[10,90]],holes:[]}}]});
});

it('checks both faces against source ink and requires review before saving the pair',async()=>{
 const rooms:PlanShape[]=[
  {id:'k',label:'Cucina',points:[[10,10],[50,10],[50,90],[10,90]],holes:[]},
  {id:'b',label:'Bagno',points:[[55,10],[110,10],[110,90],[55,90]],holes:[]},
 ];
 vi.mocked(readListingRaster).mockResolvedValueOnce({width:120,height:100,ink:()=>false});
 vi.mocked(readListingRaster).mockResolvedValue({width:120,height:100,ink:x=>Math.round(x)>=48&&Math.round(x)<=57});
 const onApply=vi.fn();
 render(<ListingPlanReview editPlan sourceUrl="/plan.png" width={120} height={100} rooms={rooms}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 fireEvent.click(screen.getByRole('button',{name:'Cucina · modifica muri'}));
 fireEvent.click(screen.getByRole('button',{name:'Verifica parete condivisa'}));
 fireEvent.click(screen.getByRole('button',{name:'Parete 2 · Cucina'}));
 await screen.findByText(/non mostra una correzione affidabile/);
 expect(screen.queryByRole('button',{name:'Usa correzione'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Parete 2 · Cucina'}));
 await screen.findByText('Proposta per Cucina e Bagno');
 const save=screen.getByRole('button',{name:'Salva modifiche alla planimetria'});
 expect(save).toBeDisabled();
 expect(screen.getByLabelText('Contorni proposti sulla tavola originale').querySelectorAll('line')).toHaveLength(2);
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Usa correzione'}));
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(save);
 expect(onApply).toHaveBeenCalledWith(expect.objectContaining({contours:[
  {id:'k',geometry:{points:[[10,10],[48,10],[48,90],[10,90]],holes:[]}},
  {id:'b',geometry:{points:[[57,10],[110,10],[110,90],[57,90]],holes:[]}},
 ]}));
});

it('sets a manual scale on the full original and saves it with the new door',()=>{
 const rooms:PlanShape[]=[{id:'room',label:'Soggiorno',points:[[10,10],[80,10],[80,80],[10,80]],holes:[]}];
 const onApply=vi.fn();
 render(<ListingPlanReview sourceUrl="/plan.png" width={100} height={100} rooms={rooms}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const map=planMap();
 fireEvent.click(screen.getByRole('button',{name:'Imposta scala'}));
 expect(map).toHaveAttribute('viewBox','0 0 100 100');
 fireEvent.click(map,{clientX:0,clientY:95});
 fireEvent.click(map,{clientX:100,clientY:95});
 fireEvent.change(screen.getByLabelText('Distanza reale (m)'),{target:{value:'5,0'}});
 fireEvent.click(screen.getByRole('button',{name:'Usa questa scala'}));
 expect(screen.getByText(/porta da 80 cm/)).toBeInTheDocument();
 expect(detectPlanScale).not.toHaveBeenCalled();
 fireEvent.click(map,{clientX:45,clientY:10});
 fireEvent.click(screen.getByRole('button',{name:'Salva dettagli per l’annuncio'}));
 expect(onApply.mock.calls[0]?.[0]).toMatchObject({
  scale:{mode:'manual',start:[0,95],end:[100,95],metres:5},
  openings:[{kind:'door',start:[37,10],end:[53,10],fixed:true}],
 });
});

it('reuses the saved scale immediately when adding a door',()=>{
 const rooms:PlanShape[]=[{id:'room',label:'Soggiorno',points:[[10,10],[80,10],[80,80],[10,80]],holes:[]}];
 render(<ListingPlanReview sourceUrl="/plan.png" width={100} height={100} rooms={rooms}
  metresPerPixel={[.05,.05]} scaleLabel="Scala salvata in Calcola superfici" disabled={false}
  onClose={()=>{}} onApply={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Aggiungi porta'}));
 expect(screen.getByText(/porta da 80 cm/)).toBeInTheDocument();
 expect(screen.getByText('Scala salvata in Calcola superfici')).toBeInTheDocument();
 expect(detectPlanScale).not.toHaveBeenCalled();
});

it('shows a guide when Shift is held mid-drag and saves the snapped vertex',()=>{
 const rooms:PlanShape[]=[
  {id:'room',label:'Soggiorno',points:[[10,10],[50,10],[49,41],[10,40]],holes:[]},
  {id:'reference',label:'Studio',points:[[65,40],[90,40],[90,60],[65,60]],holes:[]},
 ];
 const onApply=vi.fn();
 render(<ListingPlanReview sourceUrl="/plan.png" width={100} height={100} rooms={rooms}
  saved={{geometryRevision:1,openings:[],alignments:[],contours:rooms.map(({id,points,holes})=>({id,geometry:{points,holes}}))}}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const map=planMap();
 const room=within(map).getByRole('button',{name:'Soggiorno · modifica muri'});
 fireEvent.click(room);
 const vertex=within(map).getByRole('button',{name:'Punto 3 · Soggiorno'});
 function pointer(target:Element,type:string,clientX:number,clientY:number,shiftKey=false){
  const event=new MouseEvent(type,{bubbles:true,clientX,clientY,shiftKey});
  Object.defineProperty(event,'pointerId',{value:1});
  fireEvent(target,event);
 }
 pointer(vertex,'pointerdown',49,41);
 pointer(map,'pointermove',48,43);
 expect(room).toHaveAttribute('d',expect.stringContaining('48 43'));
 fireEvent.keyDown(window,{key:'Shift',shiftKey:true});
 expect(room).toHaveAttribute('d',expect.stringContaining('50 40'));
 expect(map.querySelector('g[aria-hidden] line[y1="40"][y2="40"]')).toBeInTheDocument();
 fireEvent.keyUp(window,{key:'Shift',shiftKey:false});
 expect(room).toHaveAttribute('d',expect.stringContaining('48 43'));
 expect(map.querySelector('g[aria-hidden] line')).toBeNull();
 fireEvent.keyDown(window,{key:'Shift',shiftKey:true});
 pointer(map,'pointerup',48,43,true);
 expect(map.querySelector('g[aria-hidden] line')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Salva dettagli per l’annuncio'}));
 expect(onApply.mock.calls[0]?.[0].contours.find(({id}:{id:string})=>id==='room').geometry.points[2]).toEqual([50,40]);
});