import {describe,it,expect} from 'vitest';
import {propertyViewport} from './viewport';

const rectangle=(left:number,top:number,right:number,bottom:number)=>({points:[[left,top],[right,top],[right,bottom],[left,bottom]] as [number,number][]});
const full={width:1000,height:800};
describe('property-only display viewport',()=>{
 it('includes detached balcony and corridor outer contours in the same union',()=>{
  const house=rectangle(200,300,500,500),balcony=rectangle(550,280,580,320),corridor=rectangle(180,490,210,570);
  expect(propertyViewport(full,[house,balcony,corridor])).toEqual({x:156,y:256,width:448,height:338});
 });
 it('uses six percent of the largest bounding side when it exceeds the minimum margin',()=>{
  expect(propertyViewport({width:2000,height:1600},[rectangle(200,300,1200,900)])).toEqual({x:140,y:240,width:1120,height:720});
 });
 it('clamps the margin to source edges without cropping any outer contour',()=>{
  expect(propertyViewport(full,[rectangle(0,700,100,800)])).toEqual({x:0,y:676,width:124,height:124});
  expect(propertyViewport(full,[rectangle(900,0,1000,100)])).toEqual({x:876,y:0,width:124,height:124});
 });
 it('uses only outer contours rather than holes or unrelated metadata',()=>{
  const region={...rectangle(300,300,400,400),holes:[rectangle(10,10,20,20).points],name:'Synthetic property'};
  expect(propertyViewport(full,[region])).toEqual({x:276,y:276,width:148,height:148});
 });
 it('falls back to the full source instead of silently skipping an invalid vertex',()=>{
  for(const point of [[NaN,100],[100,Infinity],[-1,100],[1001,100],[100,801]] as [number,number][]){
   const broken=rectangle(100,100,200,200);broken.points.push(point);
   expect(propertyViewport(full,[rectangle(500,500,600,600),broken])).toEqual({x:0,y:0,...full});
  }
 });
 it('falls back for empty, collapsed or collinear outer geometry',()=>{
  for(const points of [[],[[100,100]],[[100,100],[200,100],[300,100]],[[100,100],[100,200],[100,300]],[[100,100],[200,200],[300,300]]] as [number,number][][]){
   expect(propertyViewport(full,[{points}])).toEqual({x:0,y:0,...full});
  }
  expect(propertyViewport(full,[])).toEqual({x:0,y:0,...full});
 });
 it('does not mutate or alias the full frame or source geometry',()=>{
  const frame=Object.freeze({...full}),region=rectangle(300,300,400,400),before=structuredClone(region);
  const points=Object.freeze(region.points.map(point=>Object.freeze(point))),contours=Object.freeze([{points}]);
  const view=propertyViewport(frame,contours);expect(view).toEqual({x:276,y:276,width:148,height:148});expect(region).toEqual(before);expect(frame).toEqual(full);expect(view).not.toBe(frame);
 });
});
