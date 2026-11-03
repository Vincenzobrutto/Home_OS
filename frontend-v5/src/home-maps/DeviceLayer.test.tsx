import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {DeviceLayer,type DeviceDrop} from './DeviceLayer';
import {deviceScene} from './spatial';
import {mapFixture} from './map-test-fixture';
import type {MapView} from './api';
import type {MapTurn} from './orientation';
beforeAll(()=>vi.stubGlobal('PointerEvent',class extends MouseEvent{pointerId:number;constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??1;}}));afterAll(()=>vi.unstubAllGlobals());
function Location(){return <output aria-label="route">{useLocation().pathname}</output>;}
function mount(data=mapFixture(),canMove=true,onDrop=vi.fn<(body:DeviceDrop,message:string)=>void>()){
 const onMessage=vi.fn(),onChoose=vi.fn();
 const view=render(<MemoryRouter><Location/><DeviceLayer data={data} markers={deviceScene(data).markers} homeId="home" canMove={canMove} onDrop={onDrop} onMessage={onMessage} onChoose={onChoose}/></MemoryRouter>);
 const layer=view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!;
 vi.spyOn(layer,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:1000,height:1000,right:1100,bottom:1050,x:100,y:50,toJSON:()=>({})});
 return {...view,onDrop,onMessage,onChoose,rerenderData:(next:MapView)=>view.rerender(<MemoryRouter><Location/><DeviceLayer data={next} markers={deviceScene(next).markers} homeId="home" canMove={canMove} onDrop={onDrop} onMessage={onMessage} onChoose={onChoose}/></MemoryRouter>)};
}
const down=(el:HTMLElement)=>fireEvent.pointerDown(el,{pointerId:1,button:0,clientX:300,clientY:250});
const move=(el:HTMLElement,x=800,y=250)=>fireEvent.pointerMove(el,{pointerId:1,button:0,clientX:x,clientY:y});
const up=(el:HTMLElement,x=800,y=250)=>fireEvent.pointerUp(el,{pointerId:1,button:0,clientX:x,clientY:y});
describe('trascinamento degli elettrodomestici',()=>{
 it('commits a cross-room drop once with captured map and canonical position revisions',async()=>{const {onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);expect(onDrop).not.toHaveBeenCalled();expect(screen.getByText('Rilascia in Balcone')).toBeInTheDocument();up(link);await waitFor(()=>expect(onDrop).toHaveBeenCalledOnce());expect(onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3},expect.stringContaining('associazione'));fireEvent.click(link);expect(screen.getByLabelText('route')).toHaveTextContent('/');});
 it('moves within the existing room using the same association',async()=>{const {onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link,350,300);up(link,350,300);await waitFor(()=>expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({regionId:'kitchen',x:25,y:25}),expect.stringContaining('Cucina')));});
 it('a short click opens the normal card and never writes',()=>{const {onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);up(link,300,250);fireEvent.click(link);expect(onDrop).not.toHaveBeenCalled();expect(screen.getByLabelText('route')).toHaveTextContent('/home/home/oggetti/object/fridge');});
 it('wall/outside/hole drops revert without a write',()=>{const {onDrop,onMessage}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});for(const [x,y]of [[580,250],[1200,250]]){down(link);move(link,x,y);up(link,x,y);}expect(onDrop).not.toHaveBeenCalled();expect(onMessage).toHaveBeenCalledWith(expect.stringContaining('annullato'));});
 it('pointer cancellation and Escape preserve the last stored state',()=>{const {onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);fireEvent.pointerCancel(link,{pointerId:1});up(link);down(link);move(link);fireEvent.keyDown(link,{key:'Escape'});up(link);expect(onDrop).not.toHaveBeenCalled();});
 it('does not overwrite newer data arriving during a drag',()=>{const data=mapFixture(),v=mount(data),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);const next=structuredClone(data);next.version++;v.rerenderData(next);up(link);expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiate'));});
 it('read-only interaction can open a card but cannot move or save',()=>{const {onDrop}=mount(mapFixture(),false),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);up(link);fireEvent.click(link);expect(onDrop).not.toHaveBeenCalled();expect(screen.getByLabelText('route')).toHaveTextContent('/home/home/oggetti/object/fridge');});
 it('a drop into a zoomed but clipped part of the page cannot update an invisible room',()=>{const {onDrop,onMessage,container}=mount(),layer=container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!,parent=layer.parentElement!;parent.setAttribute('data-map-viewport','');vi.spyOn(parent,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:500,height:1000,right:600,bottom:1050,x:100,y:50,toJSON:()=>({})});const link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);up(link);expect(onDrop).not.toHaveBeenCalled();expect(onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));});
 it('a sticky overlay hit does not become a drop on the hidden map underneath',()=>{const own=Object.hasOwn(document,'elementFromPoint'),before=document.elementFromPoint;Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>document.body});try{const {onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);up(link);expect(onDrop).not.toHaveBeenCalled();}finally{if(own)Object.defineProperty(document,'elementFromPoint',{configurable:true,value:before});else Reflect.deleteProperty(document,'elementFromPoint');}});
 it('Space offers the accessible coordinate controls without writing',()=>{const {onChoose,onDrop}=mount(),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});fireEvent.keyDown(link,{key:' '});expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({objectId:'fridge',regionId:'kitchen'}));expect(onDrop).not.toHaveBeenCalled();});
 it('preserves zoom/scroll coordinate conversion while the pointer leaves the original marker',async()=>{const {onDrop,container}=mount();const layer=container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!;vi.mocked(layer.getBoundingClientRect).mockReturnValue({left:-600,top:-150,width:2000,height:2000,right:1400,bottom:1850,x:-600,y:-150,toJSON:()=>({})});const link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});down(link);move(link);up(link);await waitFor(()=>expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({regionId:'balcony',x:70,y:20}),expect.any(String)));});
});

const rotatedCases:{turn:MapTurn;start:[number,number];within:[number,number];cross:[number,number];invalid:[number,number][]}[]=[
 {turn:0,start:[200,150],within:[225,175],cross:[450,150],invalid:[[340,150],[250,200],[625,150]]},
 {turn:1,start:[1000,150],within:[975,175],cross:[1000,400],invalid:[[1000,290],[950,200],[1000,575]]},
 {turn:2,start:[500,950],within:[475,925],cross:[250,950],invalid:[[360,950],[450,900],[75,950]]},
 {turn:3,start:[200,450],within:[225,425],cross:[200,200],invalid:[[200,310],[250,400],[200,25]]},
];
function mountRotated(turn:MapTurn,withHole=false){
 const data=mapFixture();data.layout.frame.height=200;
 data.pins=[{objectId:'fridge',regionId:'kitchen',x:20,y:20,geometryRevision:2,needsReview:false}];
 if(withHole)data.rooms[0]!.holes=[[[25,25],[35,25],[35,35],[25,35]]];
 const onDrop=vi.fn<(body:DeviceDrop,message:string)=>void>(),onMessage=vi.fn(),onChoose=vi.fn();
 const component=(q:MapTurn)=><MemoryRouter><Location/><DeviceLayer data={data} markers={deviceScene(data).markers} homeId="home" canMove turn={q} onDrop={onDrop} onMessage={onMessage} onChoose={onChoose}/></MemoryRouter>;
 const view=render(component(turn)),layer=view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!;
 const bounds=(q:MapTurn)=>({left:100,top:50,width:q%2?1000:500,height:q%2?500:1000,right:q%2?1100:600,bottom:q%2?550:1050,x:100,y:50,toJSON:()=>({})});
 const rect=vi.spyOn(layer,'getBoundingClientRect').mockReturnValue(bounds(turn));
 return {...view,data,onDrop,onMessage,onChoose,rerenderTurn:(next:MapTurn)=>{rect.mockReturnValue(bounds(next));view.rerender(component(next));}};
}
const rotatedPointer=(link:HTMLElement,phase:'Down'|'Move'|'Up',[clientX,clientY]:[number,number])=>fireEvent['pointer'+phase as 'pointerDown'|'pointerMove'|'pointerUp'](link,{pointerId:1,button:0,clientX,clientY});

describe('canonical appliance movement through a rotated non-square plan',()=>{
 for(const sample of rotatedCases){
  it('keeps same-room payload coordinates canonical at turn '+sample.turn,async()=>{
   const v=mountRotated(sample.turn),before=structuredClone(v.data),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',sample.within);expect(v.onDrop).not.toHaveBeenCalled();rotatedPointer(link,'Up',sample.within);
   await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());
   expect(v.onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'fridge',regionId:'kitchen',x:25,y:25,expectedPositionVersion:3},expect.stringContaining('Cucina'));
   expect(v.data).toEqual(before);
  });
  it('keeps a cross-room payload canonical at turn '+sample.turn,async()=>{
   const v=mountRotated(sample.turn),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',sample.cross);expect(screen.getByText('Rilascia in Balcone')).toBeInTheDocument();rotatedPointer(link,'Up',sample.cross);
   await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());
   expect(v.onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3},expect.stringContaining('associazione'));
  });
  it('rejects wall, hole and outside drops at turn '+sample.turn,()=>{
   const v=mountRotated(sample.turn,true),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   for(const point of sample.invalid){rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',point);rotatedPointer(link,'Up',point);}
   expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledTimes(3);expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('annullato'));
  });
 }
 it('rejects a rotated destination outside the visible clipped viewport',()=>{
  const v=mountRotated(1),layer=v.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!,parent=layer.parentElement!;
  parent.setAttribute('data-map-viewport','');vi.spyOn(parent,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:1000,height:250,right:1100,bottom:300,x:100,y:50,toJSON:()=>({})});
  const link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[1000,150]);rotatedPointer(link,'Move',[1000,400]);rotatedPointer(link,'Up',[1000,400]);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));
 });
 it('rejects a rotated destination covered by another panel',()=>{
  const own=Object.hasOwn(document,'elementFromPoint'),before=document.elementFromPoint;Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>document.body});
  try{const v=mountRotated(3),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[200,450]);rotatedPointer(link,'Move',[200,200]);rotatedPointer(link,'Up',[200,200]);expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));}
  finally{if(own)Object.defineProperty(document,'elementFromPoint',{configurable:true,value:before});else Reflect.deleteProperty(document,'elementFromPoint');}
 });
 it('cancels when orientation changes after pointer-down before movement',()=>{
  const v=mountRotated(0),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[200,150]);v.rerenderTurn(1);rotatedPointer(link,'Move',[1000,400]);rotatedPointer(link,'Up',[1000,400]);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiati'));
 });
 it('cancels when orientation changes between movement and release',()=>{
  const v=mountRotated(1),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[1000,150]);rotatedPointer(link,'Move',[1000,400]);v.rerenderTurn(2);rotatedPointer(link,'Up',[250,950]);fireEvent.click(link);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiate'));expect(screen.getByLabelText('route')).toHaveTextContent('/');
 });
});

const croppedCases:{turn:MapTurn;start:[number,number];within:[number,number];cross:[number,number];invalid:[number,number][]}[]=[
 {turn:0,start:[250,200],within:[300,250],cross:[750,200],invalid:[[530,200],[350,300],[1100,200]]},
 {turn:1,start:[400,200],within:[350,250],cross:[400,700],invalid:[[400,480],[300,300],[400,1050]]},
 {turn:2,start:[850,350],within:[800,300],cross:[350,350],invalid:[[570,350],[750,250],[0,350]]},
 {turn:3,start:[250,800],within:[300,750],cross:[250,300],invalid:[[250,520],[350,700],[250,-50]]},
];
type TestCrop={x:number;y:number;width:number;height:number};
function mountCropped(turn:MapTurn,crop:TestCrop={x:5,y:5,width:90,height:45},withHole=false){
 const data=mapFixture();data.pins=[{objectId:'fridge',regionId:'kitchen',x:20,y:20,geometryRevision:2,needsReview:false}];
 if(withHole)data.rooms[0]!.holes=[[[25,25],[35,25],[35,35],[25,35]]];
 const onDrop=vi.fn<(body:DeviceDrop,message:string)=>void>(),onMessage=vi.fn(),onChoose=vi.fn();
 const component=(viewport:TestCrop)=><MemoryRouter><Location/><DeviceLayer data={data} markers={deviceScene(data).markers} homeId="home" canMove turn={turn} viewport={viewport} onDrop={onDrop} onMessage={onMessage} onChoose={onChoose}/></MemoryRouter>;
 const view=render(component(crop)),layer=view.container.querySelector('[aria-label="Elettrodomestici sulla planimetria"]')!,parent=layer.parentElement!;
 parent.setAttribute('data-map-viewport','');
 const bounds=(viewport:TestCrop)=>{const width=(turn%2?viewport.height:viewport.width)*10,height=(turn%2?viewport.width:viewport.height)*10;return {left:100,top:50,width,height,right:100+width,bottom:50+height,x:100,y:50,toJSON:()=>({})};};
 const layerRect=vi.spyOn(layer,'getBoundingClientRect').mockReturnValue(bounds(crop)),clipRect=vi.spyOn(parent,'getBoundingClientRect').mockReturnValue(bounds(crop));
 return {...view,data,onDrop,onMessage,rerenderCrop:(next:TestCrop)=>{layerRect.mockReturnValue(bounds(next));clipRect.mockReturnValue(bounds(next));view.rerender(component(next));}};
}
describe('canonical movement from a cropped and rotated property viewport',()=>{
 for(const sample of croppedCases){
  it('saves the same canonical in-room coordinates from cropped turn '+sample.turn,async()=>{
   const v=mountCropped(sample.turn),before=structuredClone(v.data),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',sample.within);rotatedPointer(link,'Up',sample.within);
   await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());
   expect(v.onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'fridge',regionId:'kitchen',x:25,y:25,expectedPositionVersion:3},expect.stringContaining('Cucina'));expect(v.data).toEqual(before);
  });
  it('keeps cross-room coordinates in the full original frame from cropped turn '+sample.turn,async()=>{
   const v=mountCropped(sample.turn),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',sample.cross);expect(screen.getByText('Rilascia in Balcone')).toBeInTheDocument();rotatedPointer(link,'Up',sample.cross);
   await waitFor(()=>expect(v.onDrop).toHaveBeenCalledOnce());expect(v.onDrop).toHaveBeenCalledWith({expectedVersion:5,objectId:'fridge',regionId:'balcony',x:70,y:20,expectedPositionVersion:3},expect.stringContaining('associazione'));
  });
  it('rejects wall, hole and outside original-frame drops from cropped turn '+sample.turn,()=>{
   const v=mountCropped(sample.turn,undefined,true),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
   for(const point of sample.invalid){rotatedPointer(link,'Down',sample.start);rotatedPointer(link,'Move',point);rotatedPointer(link,'Up',point);}
   expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledTimes(3);expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('annullato'));
  });
 }
 it('rejects a valid canonical room hidden beyond the chosen crop',()=>{
  const v=mountCropped(1,{x:5,y:5,width:60,height:45}),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});
  // Start (20,20) is visible; destination (80,20) is in Balcone but outside crop x<=65.
  rotatedPointer(link,'Down',[400,200]);rotatedPointer(link,'Move',[400,800]);expect(screen.getByText('Rilascia in Balcone')).toBeInTheDocument();rotatedPointer(link,'Up',[400,800]);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));
 });
 it('retains occlusion checks over a cropped rotated destination',()=>{
  const own=Object.hasOwn(document,'elementFromPoint'),before=document.elementFromPoint;Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>document.body});
  try{const v=mountCropped(3),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[250,800]);rotatedPointer(link,'Move',[250,300]);rotatedPointer(link,'Up',[250,300]);expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('parte visibile'));}
  finally{if(own)Object.defineProperty(document,'elementFromPoint',{configurable:true,value:before});else Reflect.deleteProperty(document,'elementFromPoint');}
 });
 it('cancels if the crop origin changes between pointer-down and movement',()=>{
  const v=mountCropped(0),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[250,200]);v.rerenderCrop({x:0,y:5,width:90,height:45});rotatedPointer(link,'Move',[750,200]);rotatedPointer(link,'Up',[750,200]);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiati'));
 });
 it('cancels if the crop changes between movement and release even with unchanged geometry revisions',()=>{
  const v=mountCropped(1),link=screen.getByRole('link',{name:'Apri Frigorifero DEMO'});rotatedPointer(link,'Down',[400,200]);rotatedPointer(link,'Move',[400,700]);v.rerenderCrop({x:5,y:10,width:80,height:45});rotatedPointer(link,'Up',[400,700]);fireEvent.click(link);
  expect(v.onDrop).not.toHaveBeenCalled();expect(v.onMessage).toHaveBeenCalledWith(expect.stringContaining('cambiate'));expect(screen.getByLabelText('route')).toHaveTextContent('/');
 });
});
