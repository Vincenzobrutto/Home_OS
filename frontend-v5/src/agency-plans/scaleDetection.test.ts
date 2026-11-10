import {describe,it,expect} from 'vitest';
import {detectScale,netArea,quickSurfaces,originalPoint,overlapArea,isAppurtenance,type ScaleWord} from './scaleDetection';
const word=(text:string,x:number,y=8):ScaleWord=>({text,confidence:96,box:{x0:x-5,y0:y,x1:x+5,y1:y+10}});
function raster(){const pixels=new Uint8Array(300*150).fill(255);return pixels;}
function bar(p:Uint8Array,y:number){for(let x=20;x<=220;x++)p[y*300+x]=0;for(const x of [20,120,220])for(let yy=y-7;yy<=y+7;yy++)p[yy*300+x]=0;}
const labels=[word('0',20),word('5',120),word('10',220),word('m',235)];
describe('local graphic scale detection',()=>{
 it('requires a real metric graphic with consistent labels and returns original tick endpoints',()=>{const p=raster();bar(p,35);const r=detectScale(labels,p,300,150);expect(r.bar).toMatchObject({metres:10,method:'detected_bar',start:[20,35],end:[220,35]});});
 it('does not turn OCR numbers or a denominator into a metric bar',()=>{expect(detectScale(labels,raster(),300,150).bar).toBeNull();const p=raster();bar(p,35);expect(detectScale(labels.slice(0,3),p,300,150).bar).toBeNull();});
 it('keeps printed scale separate and refuses conflicting printed scales',()=>{expect(detectScale([word('Scala 1:100',100)],raster(),300,150).denominator).toBe(100);expect(detectScale([word('1:100',100),word('1:200',100,70)],raster(),300,150)).toMatchObject({denominator:null,ambiguous:true});});
 it('does not choose between metric bars with different units per pixel',()=>{const p=raster();bar(p,35);bar(p,105);const r=detectScale([...labels,word('0',20,78),word('10',120,78),word('20',220,78),word('m',235,78)],p,300,150);expect(r.ambiguous).toBe(true);expect(r.bar).toBeNull();});
});
const room={id:'r',label:'Cucina',kind:'kitchen',points:[[0,0],[10,0],[10,10],[0,10]] as [number,number][],holes:[]};
it('reports room net, optional wall assumption and accessory coefficients without calling it a gross measured perimeter',()=>{const r=quickSurfaces([room,{...room,id:'balcony',kind:'balcony',label:'Balcone'}],1,1);expect(r.net).toBe(200);expect(r.wallAllowance).toBe(10);expect(r.commercial).toBe(135);expect(quickSurfaces([room],1,1,0).commercial).toBe(100);});
it('subtracts holes and applies area scaling twice, never linear scaling to an area',()=>{expect(netArea({...room,holes:[[[1,1],[3,1],[3,3],[1,3]]]})).toBe(96);expect(quickSurfaces([room],.5,.5).rows[0]!.area).toBe(25);expect(()=>quickSurfaces([room],0,1)).toThrow();});

it('maps both rotated OCR orientations back to original raster coordinates',()=>{expect(originalPoint([70,20],90,200,100,.5,.5)).toEqual([40,60]);expect(originalPoint([30,180],270,200,100,.5,.5)).toEqual([40,60]);});

it('finds the end tick when OCR joins the last label and its unit into one word such as 10m',()=>{const p=raster();bar(p,35);const merged={text:'10m',confidence:96,box:{x0:213,y0:8,x1:247,y1:18}};expect(detectScale([word('0',20),word('5',120),merged],p,300,150).bar).toMatchObject({metres:10,start:[20,35],end:[220,35]});});
it('measures shared area only where outlines overlap, not along a shared wall',()=>{const a={points:[[0,0],[10,0],[10,10],[0,10]] as [number,number][],holes:[]};expect(overlapArea({points:[[10,0],[20,0],[20,10],[10,10]],holes:[]},a)).toBe(0);expect(overlapArea({points:[[5,0],[15,0],[15,10],[5,10]],holes:[]},a)).toBeCloseTo(50,0);});
it('treats balconies, cellars and garages as appurtenances, not apartment rooms',()=>{expect(isAppurtenance({...room,kind:'balcony',label:'Terrazza'})).toBe(true);expect(isAppurtenance({...room,kind:'room',label:'Cantina'})).toBe(true);expect(isAppurtenance(room)).toBe(false);expect(isAppurtenance({...room,kind:'excluded',label:'Balcone comune'})).toBe(false);});
