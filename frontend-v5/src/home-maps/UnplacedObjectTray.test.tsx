import {act,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router';
import {afterAll,afterEach,beforeAll,describe,it,expect,vi} from 'vitest';
import {DeviceLayer,type DeviceDrop} from './DeviceLayer';
import {deviceScene} from './spatial';
import {mapFixture} from './map-test-fixture';
import type {MapView} from './api';
import type {MapTurn,ViewFrame} from './orientation';

const originalHit=Object.getOwnPropertyDescriptor(document,'elementFromPoint'),targets:HTMLElement[]=[];
beforeAll(()=>vi.stubGlobal('PointerEvent',class extends MouseEvent{pointerId:number;constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??1;}}));
afterEach(()=>{vi.restoreAllMocks();for(const target of targets.splice(0))target.remove();if(originalHit)Object.defineProperty(document,'elementFromPoint',originalHit);else Reflect.deleteProperty(document,'elementFromPoint');});
afterAll(()=>vi.unstubAllGlobals());
function Location(){return <output aria-label="route">{useLocation().pathname}</output>;}
function fixture():MapView{const data=mapFixture();data.objects.push({id:'oven',name:'Forno da posizionare',type:'appliance',positionVersion:7,roomIds:[]});return data;}
function mount(options:{data?:MapView;turn?:MapTurn;viewport?:ViewFrame;canMove?:boolean;onDrop?:(body:DeviceDrop,message:string)=>void|Promise<void>}={}){
 let data=options.data??fixture(),turn=options.turn??0,viewport=options.viewport??{x:5,y:5,width:90,height:45};
 const tray=document.createElement('section');tray.setAttribute('aria-label','Fila esterna');document.body.append(tray);targets.push(tray);
 const onDrop=options.onDrop??vi.fn(),onChooseUnplaced=vi.fn(),onChoose=vi.fn(),onMessage=vi.fn();
 const content=()=><MemoryRouter><Location/><div data-map-viewport><div data-testid="map-surface"><DeviceLayer data={data} markers={deviceScene(data).markers} homeId="home" canMove={options.canMove??true} onDrop={onDrop} onMessage={onMessage} onChoose={onChoose} turn={turn} viewport={viewport} trayTarget={tray} unplaced={deviceScene(data).unplaced} onChooseUnplaced={onChooseUnplaced}/></div></div></MemoryRouter>;
 const view=render(content()),layer=view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!,clip=view.container.querySelector('[data-map-viewport]')!;
 const bounds=()=>{const width=(turn%2?viewport.height:viewport.width)*10,height=(turn%2?viewport.width:viewport.height)*10;return {left:100,top:50,width,height,right:100+width,bottom:50+height,x:100,y:50,toJSON:()=>({})};};
 vi.spyOn(layer,'getBoundingClientRect').mockImplementation(bounds);vi.spyOn(clip,'getBoundingClientRect').mockImplementation(bounds);
 Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>layer});
 return {...view,tray,layer,onDrop,onChooseUnplaced,onMessage,rerenderData:(next:MapView)=>{data=next;view.rerender(content());},rerenderView:(next:ViewFrame,q=turn)=>{viewport=next;turn=q;view.rerender(content());}};
}
const pointer=(element:HTMLElement,phase:'Down'|'Move'|'Up',clientX:number,clientY:number)=>fireEvent['pointer'+phase as 'pointerDown'|'pointerMove'|'pointerUp'](element,{pointerId:1,button:0,clientX,clientY});
const source=()=>screen.getByRole('button',{name:'Posiziona Forno da posizionare'});
const drag=(element:HTMLElement,x=750,y=200)=>{pointer(element,'Down',200,1100);pointer(element,'Move',x,y);pointer(element,'Up',x,y);};

describe('unplaced objects outside the map',()=>{
 it('portals the source row outside the map and never invents an initial room or point',()=>{
  const v=mount(),button=source();expect(v.tray).toContainElement(button);expect(v.container).not.toContainElement(button);expect(v.layer).not.toContainElement(button);
  expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();pointer(button,'Down',200,1100);pointer(button,'Up',200,1100);expect(v.onDrop).not.toHaveBeenCalled();expect(v.onChooseUnplaced).not.toHaveBeenCalled();
 });
 for(const sample of [{turn:0 as const,x:750,y:200},{turn:1 as const,x:400,y:700},{turn:2 as const,x:350,y:350},{turn:3 as const,x:250,y:300}]){
  it('keeps a tray drop canonical through crop and turn '+sample.turn,async()=>{
   const v=mount({turn:sample.turn}),button=source();pointer(button,'Down',200,1100);pointer(button,'Move',sample.x,sample.y);
   expect(v.onDrop).not.toHaveBeenCalled();expect(screen.getByText('Rilascia in Balcone')).toBeInTheDocument();expect(v.layer.querySelector('[data-tray-ghost]')).toHaveAttribute('aria-hidden','true');
   pointer(button,'Up',sample.x,sample.y);await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());
   expect(v.onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'oven',regionId:'balcony',x:70,y:20,expectedPositionVersion:7},expect.stringContaining('posizionato in Balcone'));
   expect(source()).toBeInTheDocument();expect(v.onChooseUnplaced).not.toHaveBeenCalled();fireEvent.click(button);expect(v.onChooseUnplaced).not.toHaveBeenCalled();
  });
 }
 it('rejects row, wall, hole and outside releases while keeping the card available',()=>{
  const data=fixture();data.rooms[0]!.holes=[[[25,25],[35,25],[35,35],[25,35]]];const v=mount({data}),button=source();
  for(const [x,y]of [[200,1100],[530,200],[350,300],[1100,200]])drag(button,x,y);
  expect(v.onDrop).not.toHaveBeenCalled();expect(source()).toBeInTheDocument();expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();
 });
 it('rejects a canonical room outside the visible cropped viewport',()=>{
  const v=mount({viewport:{x:5,y:5,width:60,height:45}});drag(source(),750,200);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));
 });
 it('does not treat the portal source or another panel as a map drop target',()=>{
  const v=mount(),button=source();Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>button});drag(button);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));expect(source()).toBeInTheDocument();
 });
 it('cancels pointer cancellation, lost capture and Escape without choosing or saving',()=>{
  const v=mount(),button=source();
  for(const cancel of ['pointerCancel','lostPointerCapture','Escape']){
   pointer(button,'Down',200,1100);pointer(button,'Move',750,200);
   if(cancel==='Escape')fireEvent.keyDown(button,{key:'Escape'});else fireEvent[cancel as 'pointerCancel'|'lostPointerCapture'](button,{pointerId:1});
   pointer(button,'Up',750,200);
  }
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onChooseUnplaced).not.toHaveBeenCalled();expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();
 });
 it('offers tap, Enter and Space selection without generating a position or a save',()=>{
  const v=mount(),button=source();pointer(button,'Down',200,1100);pointer(button,'Up',200,1100);fireEvent.click(button);fireEvent.keyDown(button,{key:'Enter'});fireEvent.keyDown(button,{key:' '});
  expect(v.onChooseUnplaced).toHaveBeenCalledTimes(3);expect(v.onChooseUnplaced).toHaveBeenLastCalledWith(expect.objectContaining({id:'oven',roomIds:[],positionVersion:7}));expect(v.onDrop).not.toHaveBeenCalled();expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();
 });
 it('keeps a pending card until refreshed data and does not suppress a different marker click',async()=>{
  let finish!:()=>void;const pending=new Promise<void>(resolve=>{finish=resolve;}),onDrop=vi.fn(()=>pending),v=mount({onDrop});drag(source());await waitFor(()=>expect(onDrop).toHaveBeenCalledOnce());expect(source()).toBeInTheDocument();
  const next=fixture();next.version++;next.objects[1]!.roomIds=['room-balcony'];next.objects[1]!.positionVersion++;next.pins=[{objectId:'oven',regionId:'balcony',x:70,y:20,geometryRevision:2,needsReview:false}];v.rerenderData(next);
  expect(screen.queryByRole('button',{name:'Posiziona Forno da posizionare'})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Apri Forno da posizionare'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link',{name:'Apri Frigorifero DEMO'}));expect(screen.getByLabelText('route')).toHaveTextContent('/home/home/oggetti/object/fridge');await act(async()=>{finish();await pending;});
 });
 it('cancels a stale object revision and a changed crop during tray gestures',()=>{
  const v=mount(),button=source();pointer(button,'Down',200,1100);pointer(button,'Move',750,200);const next=fixture();next.objects[1]!.positionVersion++;v.rerenderData(next);pointer(button,'Up',750,200);expect(v.onDrop).not.toHaveBeenCalled();
  pointer(button,'Down',200,1100);pointer(button,'Move',750,200);v.rerenderView({x:0,y:0,width:100,height:100},1);pointer(button,'Up',750,200);expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiate'));
 });
 it('does not offer manual placement or drag writes to read-only viewers',()=>{
  const v=mount({canMove:false}),button=source();expect(button).toBeDisabled();drag(button);fireEvent.click(button);fireEvent.keyDown(button,{key:'Enter'});fireEvent.keyDown(button,{key:' '});
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onChooseUnplaced).not.toHaveBeenCalled();
 });
 for(const field of ['left','top','width','height'] as const){
  it('cancels a tray gesture if map '+field+' changes before movement',()=>{
   const v=mount(),button=source(),before=v.layer.getBoundingClientRect();pointer(button,'Down',200,1100);
   vi.mocked(v.layer.getBoundingClientRect).mockReturnValue({...before,[field]:before[field]+1} as DOMRect);
   pointer(button,'Move',750,200);pointer(button,'Up',750,200);fireEvent.click(button);
   expect(v.onDrop).not.toHaveBeenCalled();expect(v.onChooseUnplaced).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('Inquadratura cambiata'));expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();
  });
 }
 it('cancels an existing marker drop if the physical frame changes after movement',()=>{
  const v=mount(),marker=screen.getByRole('link',{name:'Apri Frigorifero DEMO'}),before=v.layer.getBoundingClientRect();pointer(marker,'Down',250,200);pointer(marker,'Move',750,200);
  vi.mocked(v.layer.getBoundingClientRect).mockReturnValue({...before,width:before.width-200} as DOMRect);pointer(marker,'Up',750,200);fireEvent.click(marker);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('Inquadratura cambiata'));expect(screen.getByLabelText('route')).toHaveTextContent('/');
 });
 it('allows subpixel layout noise within half a CSS pixel',async()=>{
  const v=mount(),button=source(),before=v.layer.getBoundingClientRect();pointer(button,'Down',200,1100);
  vi.mocked(v.layer.getBoundingClientRect).mockReturnValue({...before,left:before.left+.25,top:before.top+.25} as DOMRect);
  pointer(button,'Move',750.25,200.25);pointer(button,'Up',750.25,200.25);await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());
  expect(v.onDrop).toHaveBeenCalledWith(expect.objectContaining({objectId:'oven',regionId:'balcony',x:70,y:20}),expect.any(String));expect(v.onMessage).not.toHaveBeenCalled();
 });
 it('refuses to start either source without a finite positive map rectangle',()=>{
  const v=mount(),button=source(),marker=screen.getByRole('link',{name:'Apri Frigorifero DEMO'}),before=v.layer.getBoundingClientRect();
  for(const invalid of [null,{...before,left:NaN},{...before,top:Infinity},{...before,width:0},{...before,height:-1}]){
   vi.mocked(v.layer.getBoundingClientRect).mockReturnValue(invalid as unknown as DOMRect);drag(button);pointer(marker,'Down',250,200);pointer(marker,'Move',750,200);pointer(marker,'Up',750,200);
  }
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onChooseUnplaced).not.toHaveBeenCalled();expect(v.layer.querySelector('[data-tray-ghost]')).toBeNull();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('Planimetria non pronta'));
 });
});
