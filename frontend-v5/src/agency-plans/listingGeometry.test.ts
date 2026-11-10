import {describe, expect, it} from 'vitest';
import type {PlanShape, Point} from './PlanMeasurementView';
import {carryListingOpening, changeListingVertex, listingAlignmentGuides, listingDoorOpposite, listingIllustration, listingOpeningOnDrawing, moveListingWall, placeListingOpening, placeScaledListingDoor, alignListingWall, listingWalls, simplifyListingRooms, suggestListingAlignments} from './listingGeometry';
import {suggestInternalWallThickness} from './listingGeometry';

const room = (id: string, points: Point[], holes: Point[][]=[]): PlanShape => ({id,label:id,points,holes});

describe('listing illustration',()=>{
 it('squares slightly tilted sides and evens comparable interior gaps without moving a balcony',()=>{
  const a=room('Soggiorno',[[0,0],[100,.7],[100.6,80],[0,80]]);
  const b=room('Bagno',[[104,0],[204,0],[204,80],[104,80]]);
  const c=room('Camera',[[210,0],[310,0],[310,80],[210,80]]);
  const balcony={...room('Balcone',[[316,0],[355,0],[355,80],[316,80]]),kind:'balcony'};
  const original=[a,b,c,balcony],copy=structuredClone(original);
  const [left,middle,right,terrace]=listingIllustration(original);
  expect(left!.points[0]![1]).toBe(left!.points[1]![1]);
  expect(left!.points[1]![0]).toBe(left!.points[2]![0]);
  expect(middle!.points[0]![0]-left!.points[1]![0]).toBeCloseTo(right!.points[0]![0]-middle!.points[1]![0]);
  expect(terrace!.points).toEqual(balcony.points);
  expect(original).toEqual(copy);
 });
 it.each([false,true])('evens horizontal and vertical gaps around an L-shaped living room (saved contours: %s)',saved=>{
  const outlines=[
   room('Soggiorno',[[164,48],[659,48],[659,278],[595,278],[595,448],[446,448],[446,295],[164,295]],[[[300,90],[320,90],[320,110],[300,110]]]),
   room('Bagno',[[167,307],[437,307],[437,449],[167,449]]),
   room('Cucina',[[278,461],[600,461],[600,630],[278,630]]),
   room('Stanza',[[612,289],[993,289],[993,630],[612,630]]),
   room('Veranda',[[146,462],[260,462],[260,630],[146,630]]),
   room('Cantina',[[211,1367],[430,1367],[430,1488],[211,1488]]),
   {...room('Balcone',[[48,326],[126,326],[126,553],[48,553]]),kind:'balcony'},
  ];
  if(saved)outlines[1]!.symbols=[{id:'reviewed-symbol',reason:'Synthetic reviewed detail'}];
  const details=saved?{alignments:[],contours:outlines.map(({id,points,holes})=>({id,geometry:{points,holes}}))}:undefined;
  const before=structuredClone(details);
  const [living,bath,kitchen,bedroom,veranda,cellar,balcony]=listingIllustration(outlines,details);
  const vertical=living!.points[6]![0]-bath!.points[1]![0];
  const horizontal=bath!.points[1]![1]-living!.points[6]![1];
  expect(vertical).toBeCloseTo(horizontal,0);
  expect(vertical).toBeCloseTo(kitchen!.points[0]![1]-bath!.points[2]![1],0);
  expect(vertical).toBeCloseTo(kitchen!.points[0]![1]-living!.points[5]![1],0);
  expect(vertical).toBeCloseTo(bedroom!.points[0]![0]-living!.points[4]![0],0);
  expect(vertical).toBeCloseTo(bedroom!.points[0]![0]-kitchen!.points[1]![0],0);
  expect(vertical).toBeCloseTo(kitchen!.points[0]![0]-veranda!.points[1]![0],0);
  expect(veranda!.points[0]![0]).toBe(bath!.points[0]![0]);
  expect(veranda!.points[3]![0]).toBe(bath!.points[0]![0]);
  expect(veranda!.points[0]![0]-balcony!.points[1]![0]).toBe(20);
  expect(balcony!.points[1]![0]-balcony!.points[0]![0]).toBe(78);
  expect(cellar!.points).toEqual(outlines[5]!.points);
  expect(living!.holes).toEqual(outlines[0]!.holes);
  expect(details).toEqual(before);
 });

 it('makes opposing oblique edges parallel while keeping the adjacent sides vertical',()=>{
  const upper=room('Studio',[[0,0],[100,0],[100,55],[0,45]]);
  const lower=room('Corridoio',[[0,47],[100,58],[100,110],[0,110]]);
  const [a,b]=listingIllustration([upper,lower]);
  const leftGap=b!.points[0]![1]-a!.points[3]![1],rightGap=b!.points[1]![1]-a!.points[2]![1];
  expect(leftGap).toBeCloseTo(rightGap,7);
  expect(a!.points[2]![1]-a!.points[3]![1]).toBeCloseTo(10);
  expect([a!.points[3]![0],a!.points[2]![0],b!.points[0]![0],b!.points[1]![0]]).toEqual([0,100,0,100]);
  expect(lower.points[0]).toEqual([0,47]);
 });

 it('uses the oblique terrace facade for the two nearly aligned room fronts',()=>{
  const terrace={...room('Terrazzo',[[0,0],[220,22],[220,35],[0,13]]),kind:'balcony'};
  const living=room('Soggiorno',[[10,19],[100,29],[100,60],[10,60]]);
  const studio=room('Studio',[[110,29],[205,39],[205,70],[110,70]]);
  const [out,a,b]=listingIllustration([terrace,living,studio]);
  const line=[...a!.points.slice(0,2),...b!.points.slice(0,2)].map(([x,y])=>y-x/10);
  expect(Math.max(...line)-Math.min(...line)).toBeLessThan(1e-7);
  expect(out!.points).toEqual(terrace.points);
 });

 it('keeps meaningful diagonals and sides associated with saved openings',()=>{
  const a=room('Studio',[[0,0],[100,.5],[100,75],[75,100],[0,100]]);
  const result=listingIllustration([a])[0]!;
  expect(result.points.slice(2,4)).toEqual([[100,75],[75,100]]);
  const details={alignments:[],openings:[{kind:'window' as const,start:[20,.1] as Point,end:[80,.4] as Point,fixed:true}]};
  expect(listingIllustration([a],details)[0]!.points).toEqual(a.points);
 });

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

it('sizes a door from the plan scale and projects its opening onto the facing room only',()=>{
 const left=room('A',[[0,0],[40,0],[40,30],[0,30]]);
 const right=room('B',[[44,0],[80,0],[80,30],[44,30]]);
 const opening=placeScaledListingDoor([42,15],listingWalls([left]),4,[.05,.04])!;
 expect(opening.start[0]).toBe(40);
 expect(Math.abs(opening.end[1]-opening.start[1])*.04).toBeCloseTo(.8);
 const opposite=listingDoorOpposite(opening,[left,right],6)!;
 expect(opposite[0][0]).toBe(44);
 expect(opposite[0][1]).toBeCloseTo(opening.start[1]);
 expect(opposite[1][1]).toBeCloseTo(opening.end[1]);
 expect(listingDoorOpposite(opening,[left,right],2)).toBeNull();
 expect(listingDoorOpposite({...opening,kind:'window'},[left,right],6)).toBeNull();

 const short=room('C',[[44,6],[80,6],[80,30],[44,30]]);
 const fitted=placeScaledListingDoor([41,15],listingWalls([left]),4,[.05,.04],[left,short],6)!;
 expect(fitted.start[1]).toBeCloseTo(6);
 expect(fitted.end[1]).toBeCloseTo(26);
 expect(listingDoorOpposite(fitted,[left,short],6)).not.toBeNull();
});

it('moves an opening to a new wall without shortening it or accepting a drop in empty space',()=>{
 const opening={kind:'door' as const,start:[4,0] as Point,end:[10,0] as Point};
 const walls:[[Point,Point],[Point,Point]]=[[[0,0],[20,0]],[[20,0],[20,20]]];
 expect(placeListingOpening(opening,walls,2,[19,12])).toMatchObject({start:[20,9],end:[20,15],fixed:true});
 expect(placeListingOpening(opening,walls,2,[10,10])).toBeNull();
});
it('uniforms comparable facing partitions while leaving the balcony and wall centres intact',()=>{
 const rectangle=(id:string,x:number,width:number,kind?:PlanShape['kind']):PlanShape=>({id,label:id,kind,points:[[x,0],[x+width,0],[x+width,80],[x,80]],holes:[]});
 const drawing=[rectangle('a',0,100),rectangle('b',104,100),rectangle('c',210,100),rectangle('Balcone',315,80,'balcony')];
 const proposal=suggestInternalWallThickness(drawing);
 expect(proposal?.adjusted).toBe(2);
 expect(proposal?.nominal).toBe(5);
 const [a,b,c,balcony]=proposal!.drawing;
 expect([a!.points[1]![0],b!.points[0]![0],b!.points[1]![0],c!.points[0]![0]]).toEqual([99.5,104.5,204.5,209.5]);
 expect(balcony).toBe(drawing[3]);
 expect(suggestInternalWallThickness(drawing.slice(0,2))).toBeNull();
});
