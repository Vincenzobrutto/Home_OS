import {describe,it,expect} from 'vitest';
import type {Point} from './api';
import {displayFrame,toDisplayPoint,fromDisplayPoint,orientationMatrix,orientationTransform,type MapTurn} from './orientation';

const frame={width:200,height:100};
const turns:MapTurn[]=[0,1,2,3];
describe('display-only plan orientation',()=>{
 it('uses independent non-square point and frame vectors for every quarter turn',()=>{
  const point:Point=[40,30],expected:Point[]=[[40,30],[70,40],[160,70],[30,160]];
  for(const turn of turns){
   expect(toDisplayPoint(point,frame,turn)).toEqual(expected[turn]);
   expect(fromDisplayPoint(expected[turn]!,frame,turn)).toEqual(point);
   expect(displayFrame(frame,turn)).toEqual(turn%2?{width:100,height:200}:{width:200,height:100});
  }
 });
 it('rotates all page corners into the expected positive display bounds',()=>{
  const corners:Point[]=[[0,0],[200,0],[200,100],[0,100]];
  expect(corners.map(p=>toDisplayPoint(p,frame,1))).toEqual([[100,0],[100,200],[0,200],[0,0]]);
  expect(corners.map(p=>toDisplayPoint(p,frame,2))).toEqual([[200,100],[0,100],[0,0],[200,0]]);
  expect(corners.map(p=>toDisplayPoint(p,frame,3))).toEqual([[0,200],[0,0],[100,0],[100,200]]);
 });
 it('round trips fractional and out-of-frame coordinates without clamping',()=>{
  const points:Point[]=[[0,0],[200,100],[12.5,87.25],[-5,110],[210,-20]];
  for(const turn of turns)for(const point of points){
   expect(fromDisplayPoint(toDisplayPoint(point,frame,turn),frame,turn)).toEqual(point);
   expect(toDisplayPoint(fromDisplayPoint(point,frame,turn),frame,turn)).toEqual(point);
  }
  expect(toDisplayPoint([-5,110],frame,1)).toEqual([-10,-5]);
 });
 it('provides exact SVG affine matrices for the same clockwise orientation',()=>{
  expect(turns.map(turn=>orientationTransform(frame,turn))).toEqual([
   'matrix(1 0 0 1 0 0)','matrix(0 1 -1 0 100 0)',
   'matrix(-1 0 0 -1 200 100)','matrix(0 -1 1 0 0 200)',
  ]);
 });
 it('defaults to identity and never mutates or aliases the caller inputs',()=>{
  const source={width:200,height:100},point:Point=[40,30];
  expect(displayFrame(source)).toEqual(source);expect(displayFrame(source)).not.toBe(source);
  expect(toDisplayPoint(point,source)).toEqual(point);expect(toDisplayPoint(point,source)).not.toBe(point);
  expect(fromDisplayPoint(point,source)).toEqual(point);expect(fromDisplayPoint(point,source)).not.toBe(point);
  expect(orientationTransform(source)).toBe('matrix(1 0 0 1 0 0)');
  for(const turn of turns){displayFrame(source,turn);toDisplayPoint(point,source,turn);fromDisplayPoint(point,source,turn);orientationTransform(source,turn);}
  expect(source).toEqual({width:200,height:100});expect(point).toEqual([40,30]);
 });
 it('converts canonical points through an offset non-square crop for every quarter turn',()=>{
  const crop={x:100,y:200,width:300,height:100},point:Point=[160,230],expected:Point[]=[[60,30],[70,60],[240,70],[30,240]];
  for(const turn of turns){expect(toDisplayPoint(point,crop,turn)).toEqual(expected[turn]);expect(fromDisplayPoint(expected[turn]!,crop,turn)).toEqual(point);}
  expect(displayFrame(crop,0)).toEqual({width:300,height:100});expect(displayFrame(crop,1)).toEqual({width:100,height:300});
 });
 it('shares exact canonical-to-display affine offsets between raster and vector layers',()=>{
  const crop={x:100,y:200,width:300,height:100};
  expect(turns.map(turn=>orientationMatrix(crop,turn))).toEqual([[1,0,0,1,-100,-200],[0,1,-1,0,300,-100],[-1,0,0,-1,400,300],[0,-1,1,0,-200,400]]);
  const samples:Point[]=[[100,200],[400,300],[160,230],[90,310],[145.25,288.5]];
  for(const turn of turns){
   const [a,b,c,d,e,f]=orientationMatrix(crop,turn);
   for(const [x,y]of samples){const transformed:Point=[a*x+c*y+e,b*x+d*y+f];expect(transformed).toEqual(toDisplayPoint([x,y],crop,turn));expect(fromDisplayPoint(transformed,crop,turn)).toEqual([x,y]);}
   expect(orientationTransform(crop,turn)).toBe('matrix('+orientationMatrix(crop,turn).join(' ')+')');
  }
 });
 it('defaults each missing crop offset separately and leaves inputs untouched',()=>{
  const point:Point=[40,30],source={x:10,width:200,height:100},before=structuredClone(source);
  expect(toDisplayPoint(point,source)).toEqual([30,30]);expect(fromDisplayPoint([30,30],source)).toEqual(point);
  expect(toDisplayPoint(point,{y:10,width:200,height:100})).toEqual([40,20]);
  for(const turn of turns){orientationMatrix(source,turn);toDisplayPoint(point,source,turn);fromDisplayPoint(point,source,turn);}
  expect(source).toEqual(before);expect(point).toEqual([40,30]);
 });
});
