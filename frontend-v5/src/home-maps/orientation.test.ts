import {describe,it,expect} from 'vitest';
import type {Point} from './api';
import {displayFrame,toDisplayPoint,fromDisplayPoint,orientationTransform,type MapTurn} from './orientation';

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
});
