import {describe, expect, it} from 'vitest';
import type {PlanShape, Point} from './PlanMeasurementView';
import {carryListingOpening, changeListingVertex, listingAlignmentGuides, listingIllustration, listingOpeningOnDrawing, moveListingWall, placeListingOpening, alignListingWall, listingWalls, simplifyListingRooms, suggestListingAlignments} from './listingGeometry';

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

it('straightens a sequence of short steps and preserves a deeper recess on the same edge',()=>{
 const terrace = room('Terrazzo',[
  [0,0],[20,0],[20,2],[40,2],[40,4],[60,4],[60,6],[80,6],[80,8],[100,8],
  [100,70],[68,70],[68,56],[46,56],[46,70],[0,70],
 ]);
 const drawing = simplifyListingRooms([terrace],3);
 expect(drawing[0]?.points).toEqual([[0,0],[100,8],[100,70],[68,70],[68,56],[46,56],[46,70],[0,70]]);
});

it('keeps a long vertical wall straight next to a short offset',()=>{
 const shape = room('Vano',[[0,0],[70,0],[70,20],[68,20],[68,80],[0,80]]);
 expect(simplifyListingRooms([shape],3)[0]?.points).toContainEqual([68,20]);
});

it('removes short rectangular returns while preserving a deeper recess',()=>{
 const terrace=room('Terrazzo',[[0,0],[32,0],[32,5],[40,5],[40,0],[76,0],[76,13],[94,13],[94,0],[125,0],[125,70],[0,70]]);
 const drawing=simplifyListingRooms([terrace],3);
 expect(drawing[0]?.points).not.toContainEqual([32,5]);
 expect(drawing[0]?.points).toContainEqual([76,13]);
});

it('makes close facing interior walls parallel while keeping a gap',()=>{
 const a=room('Disimpegno',[[0,0],[100,0],[100,20],[0,20]]);
 const b=room('Bagno',[[12,24],[82,28],[82,55],[12,55]]);
 const drawing=simplifyListingRooms([a,b],3);
 expect(drawing[0]?.points).toEqual(a.points);
 expect(drawing[1]?.points.slice(0,2)).toEqual([[12,26],[82,26]]);
 expect(b.points.slice(0,2)).toEqual([[12,24],[82,28]]);
});

it('keeps nonparallel walls with a deliberate larger angle',()=>{
 const a=room('A',[[0,0],[100,0],[100,20],[0,20]]);
 const b=room('B',[[12,23],[82,38],[82,55],[12,55]]);
 expect(simplifyListingRooms([a,b],3)[1]?.points).toEqual(b.points);
});

it('aligns a chosen wall to a reference and rejects a correction that crosses another room',()=>{
 const guide=room('Disimpegno',[[0,0],[100,0],[100,20],[0,20]]);
 const target=room('Bagno',[[12,24],[82,28],[82,55],[12,55]]);
 const wall=(shape:PlanShape,i:number)=>({roomId:shape.id,start:shape.points[i]!,end:shape.points[(i+1)%shape.points.length]!});
 const alignment={target:wall(target,0),reference:wall(guide,2)};
 expect(alignListingWall([guide,target],alignment)?.[1]?.points.slice(0,2)).toEqual([[12,26],[82,26]]);
 expect(target.points.slice(0,2)).toEqual([[12,24],[82,28]]);
 const obstacle=room('Nicchia',[[68,24],[76,24],[76,27],[68,27]]);
 expect(alignListingWall([guide,target,obstacle],alignment)).toBeNull();
});

it('suggests a nearby overlapping reference and skips distant parallel-looking walls',()=>{
 const targetRoom=room('Bagno',[[12,24],[82,28],[82,55],[12,55]]);
 const guide=room('Disimpegno',[[0,0],[100,0],[100,20],[0,20]]);
 const distant=room('Camera',[[0,100],[100,100],[100,140],[0,140]]);
 const target={roomId:targetRoom.id,start:targetRoom.points[0]!,end:targetRoom.points[1]!};
 const suggestions=suggestListingAlignments([targetRoom,guide,distant],target);
 expect(suggestions.map(item=>item.reference.roomId)).toEqual(['Disimpegno']);
 expect(alignListingWall([targetRoom,guide,distant],suggestions[0]!)?.[0]?.points.slice(0,2)).toEqual([[12,26],[82,26]]);
});

it('moves an illustration vertex, carrying the attached opening without changing the source',()=>{
 const room:PlanShape={id:'a',label:'Bagno',points:[[0,0],[40,0],[40,30],[0,30]],holes:[]};
 const opening=placeListingOpening({kind:'window',start:[8,1],end:[16,1]},listingWalls([room]),2)!;
 const moved=changeListingVertex([room],'a',1,[40,5])!;
 const carried=carryListingOpening(opening,room,moved);
 expect(carried).toMatchObject({start:[8,1],end:[16,2],fixed:true});
 expect(listingOpeningOnDrawing(carried,listingWalls([moved]),40)).toEqual(carried);
 expect(listingIllustration([room],{alignments:[],contours:[{id:'a',geometry:moved}]})[0]?.points).toEqual(moved.points);
 expect(room.points[1]).toEqual([40,0]);
 expect(changeListingVertex([room],'a',1,[-10,40])).toBeNull();
});

it('snaps a corner to adjacent axes only when the point is close enough',()=>{
 const shape=room('A',[[0,0],[40,0],[38,32],[0,30]]);
 expect(changeListingVertex([shape],'A',2,[39,31],2)?.points[2]).toEqual([40,30]);
 expect(changeListingVertex([shape],'A',2,[35,34],2)?.points[2]).toEqual([35,34]);
 expect(changeListingVertex([shape],'A',2,[39,31])?.points[2]).toEqual([39,31]);
});

it('translates an entire wall, carries its opening and blocks entry into a neighbouring room',()=>{
 const shape=room('A',[[0,0],[40,0],[40,30],[0,30]]);
 const neighbour=room('B',[[52,0],[92,0],[92,30],[52,30]]);
 const moved=moveListingWall([shape,neighbour],'A',1,[8,13])!;
 expect(moved.points).toEqual([[0,0],[48,0],[48,30],[0,30]]);
 const opening={kind:'door' as const,start:[40,8] as Point,end:[40,16] as Point,fixed:true};
 expect(carryListingOpening(opening,shape,moved)).toMatchObject({start:[48,8],end:[48,16]});
 expect(moveListingWall([shape,neighbour],'A',1,[14,0])).toBeNull();
 expect(moveListingWall([shape],'A',1,[0,13])).toBeNull();
});

it('extends a wall guide to the closest aligned reference and ignores a parallel wall farther away',()=>{
 const shape=room('A',[[0,0],[40,0],[40,30],[0,30]]);
 const reference=room('B',[[60,8],[90,8],[90,24],[60,24]]);
 const moved=moveListingWall([shape,reference],'A',0,[0,8])!;
 expect(listingAlignmentGuides([shape,reference],shape,moved,{edge:0},1)).toEqual([[[0,8],[90,8]]]);
 const farther=moveListingWall([shape,reference],'A',0,[0,11])!;
 expect(listingAlignmentGuides([shape,reference],shape,farther,{edge:0},1)).toEqual([]);
});

it('moves an opening to a new wall without shortening it or accepting a drop in empty space',()=>{
 const opening={kind:'door' as const,start:[4,0] as Point,end:[10,0] as Point};
 const walls:[[Point,Point],[Point,Point]]=[[[0,0],[20,0]],[[20,0],[20,20]]];
 expect(placeListingOpening(opening,walls,2,[19,12])).toMatchObject({start:[20,9],end:[20,15],fixed:true});
 expect(placeListingOpening(opening,walls,2,[10,10])).toBeNull();
});