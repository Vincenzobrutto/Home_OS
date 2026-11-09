import {fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ListingPlanReview} from './ListingPlanReview';
import type {PlanShape} from './PlanMeasurementView';

afterEach(()=>vi.unstubAllGlobals());

it('shows a guide when Shift is held mid-drag and saves the snapped vertex',()=>{
 const rooms:PlanShape[]=[
  {id:'room',label:'Soggiorno',points:[[10,10],[50,10],[49,41],[10,40]],holes:[]},
  {id:'reference',label:'Studio',points:[[65,40],[90,40],[90,60],[65,60]],holes:[]},
 ];
 const onApply=vi.fn();
 render(<ListingPlanReview sourceUrl="/plan.png" width={100} height={100} rooms={rooms}
  saved={{geometryRevision:1,openings:[],alignments:[],contours:rooms.map(({id,points,holes})=>({id,geometry:{points,holes}}))}}
  disabled={false} onClose={()=>{}} onApply={onApply}/>);
 const map=screen.getByLabelText('Pianta illustrativa modificabile');
 Object.defineProperty(map,'getScreenCTM',{value:()=>({a:1,b:0,inverse:()=>null})});
 vi.stubGlobal('DOMPoint',class {
  constructor(public x:number,public y:number){}
  matrixTransform(){return this;}
 });
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