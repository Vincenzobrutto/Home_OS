import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlanMeasurementView, type PlanMeasurementProps, type PlanShape } from './PlanMeasurementView';
const shape=(id:string,x=0):PlanShape=>({id,label:id,points:[[x,0],[x+10,0],[x+10,10],[x,10]],holes:[]});
const props=():PlanMeasurementProps=>({scopeKey:'synthetic-source-v1',sourceUrl:'blob:synthetic',width:100,height:100,rooms:[shape('room-1'),shape('room-2',20)],perimeter:shape('gross'),issues:[],onChange:vi.fn(),onCreatePerimeter:vi.fn()});
function Controlled(){const [p,set]=useState(props());return <PlanMeasurementView {...p} onChange={(view,s)=>set(v=>view==='rooms'?{...v,rooms:v.rooms.map(r=>r.id===s.id?s:r)}:{...v,perimeter:s})}/>;}
describe('agency plan room and commercial views',()=>{
 it('keeps room breakdown and switches to gross without showing duplicate room outlines',()=>{render(<PlanMeasurementView {...props()}/>);expect(screen.getByTestId('shape-room-1')).toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));expect(screen.queryByTestId('shape-room-1')).not.toBeInTheDocument();expect(screen.getByTestId('shape-gross')).toBeInTheDocument();fireEvent.click(screen.getByRole('tab',{name:'Singoli vani'}));expect(screen.getByTestId('shape-room-2')).toBeInTheDocument();});
 it('does not fabricate gross geometry from sum of rooms',()=>{const p=props();p.perimeter=null;render(<PlanMeasurementView {...p}/>);fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));expect(screen.getByText(/Il perimetro lordo non è ancora disponibile/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Definisci perimetro'}));expect(p.onCreatePerimeter).toHaveBeenCalledOnce();expect(screen.queryByTestId('shape-gross')).not.toBeInTheDocument();});
 it('adds point on closing edge, then undo restores four vertices',()=>{render(<Controlled/>);fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 4'}));expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(5);fireEvent.click(screen.getByRole('button',{name:'Annulla modifica'}));expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(4);});
 it('manual perimeter change leaves individual rooms intact',()=>{render(<Controlled/>);fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(5);fireEvent.click(screen.getByRole('tab',{name:'Singoli vani'}));expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(4);});
 it('source scope change clears undo and selected commercial mode',()=>{const p=props(),view=render(<PlanMeasurementView {...p}/>);fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));view.rerender(<PlanMeasurementView {...p} scopeKey="another-source"/>);expect(screen.getByRole('tab',{name:'Singoli vani'})).toHaveAttribute('aria-selected','true');expect(screen.getByRole('button',{name:'Annulla modifica'})).toBeDisabled();});
 it('read-only user can compare original without edit actions',()=>{render(<PlanMeasurementView {...props()} readOnly/>);expect(screen.queryByRole('button',{name:'Aggiungi punto su un lato'})).not.toBeInTheDocument();fireEvent.click(screen.getByLabelText('Mostra contorni'));expect(screen.queryByTestId('shape-room-1')).not.toBeInTheDocument();});
 it('groups repeated warnings and reveals the detail when opened',async()=>{
  const user=userEvent.setup();
  render(<PlanMeasurementView {...props()} issues={['Caminetto da verificare','Caminetto da verificare']}/>);
  const summary=screen.getByText('2 verifiche aperte sui contorni');
  await user.click(summary);
  expect(screen.getByText('Caminetto da verificare')).toBeVisible();
 });
 it('allows internal hole editing independently of outer ring',()=>{const p=props();p.rooms[0]!.holes=[[[2,2],[4,2],[4,4],[2,4]]];render(<PlanMeasurementView {...p}/>);fireEvent.change(screen.getByRole('combobox',{name:'Contorno'}),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));const [view,s]=vi.mocked(p.onChange).mock.calls[0]!;expect(view).toBe('rooms');expect(s.points).toHaveLength(4);expect(s.holes[0]!).toHaveLength(5);});
});

it('commercial accessories remain separate from apartment rooms and edit the room geometry channel',()=>{const p=props();p.configuration={base:'gross_perimeter',calibration:{start:[0,0],end:[10,0],metres:1,confirmed:true,maxRelativeError:.01},mainRegionIds:['room-1'],assignments:[{id:'room-1',kind:'principal'},{id:'room-2',kind:'uncovered_balcony'}],walls:[],policyVersion:'synthetic',commonWallCapBasis:'physical_thickness',coverageConfirmed:true,wallCoverageConfirmed:true,policyConfirmed:true};render(<PlanMeasurementView {...p}/>);fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));expect(screen.queryByTestId('shape-room-1')).not.toBeInTheDocument();expect(screen.getByTestId('shape-room-2')).toBeInTheDocument();expect(screen.getByTestId('shape-gross')).toBeInTheDocument();fireEvent.change(screen.getByRole('combobox',{name:'Geometria'}),{target:{value:'room-2'}});fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));expect(p.onChange).toHaveBeenCalledWith('rooms',expect.objectContaining({id:'room-2'}));});

it('simple map shows contextual editing only after selecting a room, and offers independent zoom',async()=>{
 const user=userEvent.setup(),p=props();render(<PlanMeasurementView {...p} drawingOnly simple onAddRoom={vi.fn()} onSaveGeometry={vi.fn()}/>);
 expect(screen.queryByRole('combobox',{name:'Geometria'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Aggiungi punto su un lato'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Salva modifiche'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Seleziona vano room-2'}));
 expect(screen.getByRole('group',{name:'Correzione del vano selezionato'})).toBeVisible();
 expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(4);
 await user.click(screen.getByRole('button',{name:'Aumenta zoom'}));expect(screen.getByRole('group',{name:'Zoom planimetria'})).toHaveTextContent('125%');
 await user.click(screen.getByRole('button',{name:'Seleziona'}));
 expect(screen.queryByRole('button',{name:'Aggiungi punto su un lato'})).not.toBeInTheDocument();
});

it('zooms around the pointer only with Ctrl+wheel and consumes the gesture at both limits',()=>{
 render(<PlanMeasurementView {...props()} drawingOnly simple/>);
 const map=screen.getByRole('img',{name:'Contorni dei singoli vani'}),viewport=map.parentElement!.parentElement!;
 const controls=screen.getByRole('group',{name:'Zoom planimetria'});
 const box=()=>{const width=Number(controls.textContent?.match(/(\d+)%/)?.[1]??100);return {width,height:width,left:-viewport.scrollLeft,top:-viewport.scrollTop} as DOMRect;};
 vi.spyOn(map,'getBoundingClientRect').mockImplementation(box);
 const wheel=(deltaY:number,ctrlKey=false)=>fireEvent(map,new WheelEvent('wheel',{
  bubbles:true,cancelable:true,deltaY,ctrlKey,clientX:40,clientY:60,
 }));
 expect(wheel(-100)).toBe(true);
 expect(controls).toHaveTextContent('100%');
 expect(wheel(100,true)).toBe(false);
 expect(wheel(-100,true)).toBe(false);
 expect(controls).toHaveTextContent('125%');
 expect(viewport.scrollLeft).toBe(10);
 expect(viewport.scrollTop).toBe(15);
 for(let i=0;i<19;i++)wheel(-100,true);
 expect(controls).toHaveTextContent('600%');
 expect(screen.getByRole('button',{name:'Aumenta zoom'})).toBeDisabled();
 expect(wheel(-100,true)).toBe(false);
 expect(wheel(100)).toBe(true);
 expect(controls).toHaveTextContent('600%');
});

it('frames the apartment rooms first and zooms in on a separately selected accessory',()=>{
 const accessory=shape('cantina',75);
 const options={...props(),simple:true,contextShapes:[shape('camera'),shape('cucina',30)],rooms:[accessory],perimeter:null};
 const view=render(<PlanMeasurementView {...options}/>);
 const map=screen.getByRole('img'),viewport=map.parentElement!.parentElement!;
 const controls=screen.getByRole('group',{name:'Zoom planimetria'});
 Object.defineProperties(viewport,{clientWidth:{value:100},clientHeight:{value:100}});
 const rect=(left:number,top:number,size:number)=>({left,top,width:size,height:size}) as DOMRect;
 vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue(rect(0,0,100));
 vi.spyOn(map,'getBoundingClientRect').mockImplementation(()=>{
  const size=Number(controls.textContent?.match(/(\d+)%/)?.[1]??100);
  return rect(50-viewport.scrollLeft,50-viewport.scrollTop,size);
 });
 view.rerender(<PlanMeasurementView {...options} frameApartment/>);
 expect(controls).toHaveTextContent('200%');
 expect(viewport.scrollLeft).toBe(40);
 view.rerender(<PlanMeasurementView {...options} frameApartment focus={{id:'cantina',key:1}}/>);
 expect(controls).toHaveTextContent('600%');
 expect(viewport.scrollLeft).toBe(480);
 expect(screen.getByTestId('shape-cantina')).toHaveAttribute('data-selected','true');
 fireEvent.click(screen.getByRole('button',{name:'Riduci zoom'}));
 expect(controls).toHaveTextContent('575%');
});

it('moves a focused vertex with the arrow keys and keeps context outlines out of the interactive map',()=>{
 const p=props(),onChange=vi.fn();
 render(<PlanMeasurementView {...p} onChange={onChange} simple contextShapes={[shape('context',40)]} rooms={[shape('room-1')]} perimeter={null}/>);
 expect(screen.getByTestId('context-context')).toHaveAttribute('pointer-events','none');
 expect(screen.queryByRole('button',{name:'Seleziona vano context'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Seleziona vano room-1'}));
 fireEvent.keyDown(screen.getByRole('button',{name:'Vertice 2'}),{key:'ArrowLeft',shiftKey:true});
 const [view,next]=onChange.mock.calls.at(-1)!;
 expect(view).toBe('rooms');expect(next.points[1][0]).toBeLessThan(10);expect(next.points[1][1]).toBe(0);
});
