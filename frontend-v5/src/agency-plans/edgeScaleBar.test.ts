import {describe,expect,it} from 'vitest';
import {edgeBars,edgeBarCaption,labeledEdgeBar} from './edgeScaleBar';
import {originalPoint} from './scaleDetection';

const w=600,h=350,row=31,left=150,right=390;
function raster({bold=true,ticks=true}={}){
 const pixels=new Uint8Array(w*h).fill(255);
 const ink=(x:number,y:number)=>{pixels[y*w+x]=0;};
 for(let x=0;x<w;x++){ink(x,row);ink(x,16);}
 if(bold)for(let x=left;x<=right;x++){ink(x,row-1);ink(x,row+1);}
 if(ticks)for(const x of [left,right])for(let d=-5;d<=5;d++)ink(x-d,row+d);
 for(let y=12;y<=20;y++)ink(260,y);
 return pixels;
}
describe('metric bars printed on the edge of a PDF page',()=>{
 it('recognizes a bold segment with diagonal endpoint marks on a continuous hairline, and restores vertical coordinates',()=>{
  const candidates=edgeBars(raster(),w,h);
  expect(candidates).toEqual([{start:[left,row],end:[right,row]}]);
  const bar=labeledEdgeBar(candidates[0]!,'10 metri')!;
  expect(bar.metres).toBe(10);
  expect(originalPoint(bar.start,270,h,w,1,1)).toEqual([h-row,left]);
  expect(originalPoint(bar.end,270,h,w,1,1)).toEqual([h-row,right]);
 });
 it('rejects unmarked bold lines and ordinary page rules with crossings',()=>{
  expect(edgeBars(raster({ticks:false}),w,h)).toEqual([]);
  expect(edgeBars(raster({bold:false}),w,h)).toEqual([]);
 });
 it('removes crossing page rules while preserving text strokes and accepts only a full metric caption',()=>{
  const bar={start:[left,row],end:[right,row]} as const;
  const candidate={start:[...bar.start] as [number,number],end:[...bar.end] as [number,number]};
  const crop=edgeBarCaption(raster(),w,h,candidate,-1)!;
  expect(crop.pixels.filter(value=>value<170).length).toBeLessThan(crop.width);
  expect(crop.pixels.filter(value=>value<170).length).toBeGreaterThan(1);
  const erased=edgeBarCaption(raster(),w,h,candidate,-1,false)!;
  expect(erased.pixels.filter(value=>value<170).length).toBeLessThan(crop.pixels.filter(value=>value<170).length);
  for(const text of ['1:200','10','lO metri','Particella 10 metri','0 metri'])expect(labeledEdgeBar(candidate,text)).toBeNull();
  expect(labeledEdgeBar(candidate,'2,5 m')?.metres).toBe(2.5);
 });
});