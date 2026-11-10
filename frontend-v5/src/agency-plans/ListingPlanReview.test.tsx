import {fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ListingPlanReview} from './ListingPlanReview';
import {detectPlanScale} from './detectPlanScale';
import {readListingRaster} from './listingOpeningDetection';
import type {PlanShape} from './PlanMeasurementView';

vi.mock('./detectPlanScale',()=>({detectPlanScale:vi.fn()}));
vi.mock('./listingOpeningDetection',async importOriginal=>({...await importOriginal<typeof import('./listingOpeningDetection')>(),readListingRaster:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});

function planMap(editPlan=false){
 const map=screen.getByLabelText(editPlan?'Planimetria modificabile':'Pianta illustrativa modificabile');
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

it('finds both shared walls together and shows a single band per wall before saving',async()=>{
 const rooms:PlanShape[]=[
  {id:'k',label:'Cucina',points:[[10,10],[50,10],[50,90],[10,90]],holes:[]},
  {id:'b',label:'Bagno',points:[[55,10],[92,10],[92,90],[55,90]],holes:[]},
  {id:'c',label:'Camera',points:[[97,10],[135,10],[135,90],[97,90]],holes:[]},
 ];
 vi.mocked(readListingRaster).mockResolvedValueOnce({width:140,height:100,ink:()=>false});
 vi.mocked(readListingRaster).mockResolvedValue({width:140,height:100,ink:x=>[48,90].some(start=>Math.round(x)>=start&&Math.round(x)<=start+9)});
 const onApply=vi.fn();
 render(<ListingPlanReview editPlan sourceUrl="/plan.png" width={140} height={100} rooms={rooms}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const scan=screen.getByRole('button',{name:'Proponi pareti comuni'});
 fireEvent.click(scan);
 await screen.findByText('2 pareti da verificare');
 expect(screen.queryByRole('button',{name:'Usa correzioni'})).not.toBeInTheDocument();
 expect(screen.getByLabelText('Pareti comuni sulla tavola').querySelectorAll('polygon[stroke-dasharray]')).toHaveLength(2);
 const finish=screen.getByRole('button',{name:'Termina verifica'});
 expect(finish).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/Verifica parete · Cucina · Bagno/}));
 fireEvent.click(screen.getByRole('button',{name:'Conferma parete'}));
 fireEvent.keyDown(screen.getByRole('button',{name:/Verifica parete · Bagno · Camera/}),{key:'Enter'});
 fireEvent.click(screen.getByRole('button',{name:'Scarta parete'}));
 expect(screen.getByLabelText('Pareti comuni sulla tavola').querySelectorAll('polygon')).toHaveLength(1);
 expect(screen.getByLabelText('Pareti comuni sulla tavola').querySelector('polygon')).not.toHaveAttribute('stroke-dasharray');
 fireEvent.click(screen.getByRole('button',{name:'Scarta proposta'}));
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(scan);
 await screen.findByText('2 pareti comuni riconosciute');
 const save=screen.getByRole('button',{name:'Salva modifiche alla planimetria'});
 expect(save).toBeDisabled();
 expect(screen.getByLabelText('Pareti comuni sulla tavola').querySelectorAll('polygon')).toHaveLength(2);
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Usa correzioni'}));
 const accepted=screen.getByLabelText('Pareti comuni sulla tavola');
 expect(accepted).toHaveAttribute('stroke','#005867');
 expect(accepted).toHaveAttribute('stroke-width','6');
 expect(accepted).toHaveAttribute('opacity','1');
 expect(accepted.querySelectorAll('polygon:not([stroke-dasharray])')).toHaveLength(2);
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(save);
 expect(onApply).toHaveBeenCalledWith(expect.objectContaining({contours:[
  {id:'k',geometry:{points:[[10,10],[48,10],[48,90],[10,90]],holes:[]}},
  {id:'b',geometry:{points:[[57,10],[90,10],[90,90],[57,90]],holes:[]}},
  {id:'c',geometry:{points:[[99,10],[135,10],[135,90],[99,90]],holes:[]}},
 ]}));
});

it('restores a corrected wall and respects a saved discard on a new scan',async()=>{
 const rooms:PlanShape[]=[
  {id:'a',label:'Cucina',points:[[10,10],[50,10],[50,90],[10,90]],holes:[]},
  {id:'b',label:'Bagno',points:[[55,10],[95,10],[95,90],[55,90]],holes:[]},
  {id:'c',label:'Camera',points:[[100,10],[135,10],[135,90],[100,90]],holes:[]},
 ];
 const onApply=vi.fn();
 vi.mocked(readListingRaster).mockResolvedValue({width:145,height:100,ink:()=>false});
 const shape:PlanShape={id:'gross',label:'Perimetro',points:[[5,5],[140,5],[140,95],[5,95]],holes:[]};
 const props={editPlan:true,sourceUrl:'/plan.png',width:145,height:100,rooms,perimeter:{shape,status:'saved' as const},disabled:false,onClose:()=>{},onApply};
 const {unmount}=render(<ListingPlanReview {...props}/>);
 const map=planMap(true);
 fireEvent.click(screen.getByRole('button',{name:'Proponi pareti comuni'}));
 fireEvent.click(await screen.findByRole('button',{name:/Verifica parete · Cucina · Bagno/}));
 fireEvent.click(screen.getByRole('button',{name:'Correggi parete'}));
 const confirm=screen.getByRole('button',{name:'Conferma parete'});
 expect(confirm).toBeDisabled();
 fireEvent.click(map,{clientX:54,clientY:11});
 fireEvent.click(map,{clientX:54,clientY:89});
 expect(confirm).toBeEnabled();
 fireEvent.click(confirm);
 const band=screen.getByLabelText('Pareti comuni sulla tavola').querySelector('polygon');
 expect(band?.getAttribute('points')?.split(' ').sort()).toEqual(['51.5,5','51.5,95','56.5,5','56.5,95']);
 expect(band).toHaveAttribute('fill','#005867');
 fireEvent.click(screen.getByRole('button',{name:/Verifica parete · Bagno · Camera/}));
 fireEvent.click(screen.getByRole('button',{name:'Scarta parete'}));
 fireEvent.click(screen.getByRole('button',{name:'Termina verifica'}));
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Salva modifiche alla planimetria'}));
 expect(onApply).toHaveBeenCalledWith(expect.objectContaining({contours:[],wallReviews:[
  expect.objectContaining({status:'confirmed',axis:[[54,11],[54,89]]}),expect.objectContaining({status:'discarded'}),
 ]}));
 const reviews=structuredClone(onApply.mock.calls[0]![0].wallReviews);
 unmount();
 render(<ListingPlanReview {...props} wallReviews={reviews}/>);
 const reopened=screen.getByLabelText('Pareti comuni sulla tavola');
 expect(reopened.querySelectorAll('polygon')).toHaveLength(1);
 expect(reopened.querySelector('polygon')).toHaveAttribute('points',band?.getAttribute('points'));
 fireEvent.click(screen.getByRole('button',{name:'Proponi pareti comuni'}));
 await screen.findByText('Nessuna nuova parete comune da verificare.');
 expect(reopened.querySelectorAll('polygon')).toHaveLength(1);
});

it('edits a saved perimeter with Shift and parallel wall translation, then saves only the outline',()=>{
 const gross:PlanShape={id:'gross',label:'Perimetro lordo',points:[[20,20],[100,20],[100,80],[20,80]],holes:[]};
 const onSavePerimeter=vi.fn(),onApply=vi.fn();
 render(<ListingPlanReview editPlan sourceUrl="/plan.png" width={120} height={100} rooms={[]}
  perimeter={{shape:gross,status:'saved'}} disabled={false} onClose={()=>{}} onApply={onApply} onSavePerimeter={onSavePerimeter}/>);
 const map=planMap(true);
 fireEvent.click(screen.getByLabelText('Muri perimetrali salvati'));
 expect(screen.getByRole('button',{name:'Modifica perimetro'})).toHaveAttribute('aria-pressed','true');
 const point=screen.getByRole('button',{name:'Punto 1 · Perimetro lordo'});
 fireEvent.pointerDown(point,{button:0,pointerId:1,clientX:20,clientY:20});
 fireEvent.pointerMove(map,{pointerId:1,clientX:16,clientY:35,shiftKey:true});
 fireEvent.pointerUp(map,{pointerId:1,clientX:16,clientY:35,shiftKey:true});
 expect(screen.getByLabelText('Muri perimetrali in bozza')).toHaveAttribute('d',expect.stringContaining('M 20 35'));
 const wall=screen.getByRole('button',{name:'Parete 2 · Perimetro lordo'});
 fireEvent.pointerDown(wall,{button:0,pointerId:2,clientX:100,clientY:50});
 fireEvent.pointerMove(map,{pointerId:2,clientX:104,clientY:50});
 fireEvent.pointerUp(map,{pointerId:2,clientX:104,clientY:50});
 expect(onSavePerimeter).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Salva perimetro'}));
 expect(onSavePerimeter).toHaveBeenCalledWith({...gross,points:[[20,35],[104,20],[104,80],[20,80]]},expect.any(Function));
 expect(onApply).not.toHaveBeenCalled();
});

it('restores only the wall selected from the listing preview and waits for save',()=>{
 const room:PlanShape={id:'a',label:'Cucina',points:[[10,10],[90,10],[90,90],[10,90]],holes:[]};
 const windows=[
  {kind:'window' as const,start:[20,10] as [number,number],end:[40,10] as [number,number],fixed:true},
  {kind:'window' as const,start:[90,20] as [number,number],end:[90,40] as [number,number],fixed:true},
 ];
 const onApply=vi.fn();
 render(<ListingPlanReview initialOpening={1} sourceUrl="/plan.png" width={100} height={100} rooms={[room]}
  saved={{geometryRevision:1,openings:windows,alignments:[]}} disabled={false} onClose={()=>{}} onApply={onApply}/>);
 expect(screen.getByText('Finestra 2 di 2')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/^Ripristina muro$/}));
 expect(onApply).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Salva dettagli per l’annuncio'}));
 expect(onApply).toHaveBeenCalledWith(expect.objectContaining({openings:[windows[0]]}));
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