import {describe, expect, it} from 'vitest';
import type {PlanShape, Point} from './PlanMeasurementView';
import {listingWalls, simplifyListingRooms} from './listingGeometry';

const room = (id: string, points: Point[], holes: Point[][]=[]): PlanShape => ({id,label:id,points,holes});

describe('listing illustration',()=>{
 it('smooths small tracing deviations while retaining diagonals, recesses and inner holes',()=>{
  const outline = room('Soggiorno',[[0,0],[30,.3],[60,0],[100,0],[100,30],[85,30],[85,50],[100,50],[100,70],[80,90],[0,90]],
   [[[20,20],[30,20],[30,30],[20,30]]]);
  const original = structuredClone(outline);
  const simplified = simplifyListingRooms([outline],1);
  expect(simplified[0]?.points).toEqual([[0,0],[100,0],[100,30],[85,30],[85,50],[100,50],[100,70],[80,90],[0,90]]);
  expect(simplified[0]?.holes).toEqual(original.holes);
  expect(outline).toEqual(original);
  expect(simplifyListingRooms([outline],1)).toEqual(simplified);
 });

 it('keeps shared edges aligned and draws a partially shared wall once without merging a real gap',()=>{
  const a=room('A',[[0,0],[10,0],[10,10],[10,20],[0,20]]);
  const b=room('B',[[10,5],[20,5],[20,15],[10,15],[10,10]]);
  const terrace=room('Terrazzo',[[10.1,16],[20,16],[20,20],[10.1,20]]);
  const drawing=simplifyListingRooms([a,b,terrace],1);
  expect(drawing[0]?.points).toContainEqual([10,10]);
  const walls=listingWalls(drawing);
  expect(walls.filter(([start,end])=>start[0]===10&&end[0]===10)).toEqual([[[10,0],[10,20]]]);
  expect(walls).toContainEqual([[10.1,16],[10.1,20]]);
 });

 it('keeps a tracing vertex if the replacement would cross another boundary',()=>{
  const a=room('A',[[0,0],[50,2],[100,0],[100,80],[0,80]]);
  const b=room('B',[[42,-4],[58,-4],[58,1],[42,1]]);
  expect(simplifyListingRooms([a,b],3)[0]?.points).toContainEqual([50,2]);
 });
});
