import { assert, metresPerUnit, overlaps, polygonArea, validPolygon, within, type Calibration, type Polygon } from './geometry';
/** User's commercial profile, NOT a DPR 138/98 cadastral calculation. Ranges require an explicit choice. */
export const COMMERCIAL_RULES = {
 principal:[1,1], finished_mezzanine:[.8,.8], finished_veranda:[.8,.8], habitable_attic:[.75,.8], uninhabitable_attic:[.35,.35],
 habitable_basement:[.6,.6], uncovered_balcony:[.25,.25], uncovered_terrace:[.25,.25], covered_balcony:[.35,.5], patio:[.35,.5], porch:[.35,.5],
 garden:[.1,.15], uncovered_land:[.1,.15], disconnected_cellar:[.2,.25], disconnected_loft:[.2,.25], garage:[.5,.6], uncovered_parking:[.25,.25],
} as const;
export type SurfaceKind=keyof typeof COMMERCIAL_RULES;
export type SurfaceLine={id:string;geometry:Polygon;kind:SurfaceKind;coefficient?:number;selectionReason?:string;heightMetres?:number;qualificationConfirmed?:boolean};
export type WallLine={id:string;geometry:Polygon;scope:'main_unit';kind:'internal'|'exclusive'|'shared'|'unknown';thicknessMetres:number;uniformThicknessConfirmed:boolean};
export type CommercialInput={calibration:Calibration;geometryRevision:number;policyVersion:string;surfaces:SurfaceLine[];walls:WallLine[];coverageConfirmed:boolean;wallCoverageConfirmed:boolean;policyConfirmed:boolean;unresolvedSymbols:string[];commonWallCapBasis:'physical_thickness'|'credited_thickness'};
function wallContribution(w:WallLine,m:number,basis:CommercialInput['commonWallCapBasis']){
 assert(w.scope==='main_unit'&&['internal','exclusive','shared','unknown'].includes(w.kind)&&Number.isFinite(w.thicknessMetres)&&w.thicknessMetres>0&&w.thicknessMetres<=5);
 const fraction=w.kind==='shared'?.5:1,physicalCap=w.kind==='shared'?(basis==='physical_thickness'?.25:.25/fraction):.5;
 const measuredM2=polygonArea(w.geometry)*m*m,creditedThickness=Math.min(w.thicknessMetres,physicalCap)*fraction;
 return {id:w.id,kind:w.kind,measuredM2,physicalThickness:w.thicknessMetres,creditedThickness,share:fraction,weightedM2:measuredM2*creditedThickness/w.thicknessMetres};
}
export function commercialReport(input:CommercialInput){
 assert(input&&typeof input.policyVersion==='string'&&input.policyVersion.trim()&&input.policyVersion.length<=120&&Number.isSafeInteger(input.geometryRevision)&&input.geometryRevision>0);
 assert(Array.isArray(input.surfaces)&&input.surfaces.length>0&&input.surfaces.length<=100&&Array.isArray(input.walls)&&input.walls.length<=300&&Array.isArray(input.unresolvedSymbols)&&input.unresolvedSymbols.length<=100);
 assert(['physical_thickness','credited_thickness'].includes(input.commonWallCapBasis));
 const m=metresPerUnit(input.calibration),issues:string[]=[];
 const shapes=[...input.surfaces,...input.walls];assert(new Set(shapes.map(s=>s.id)).size===shapes.length&&shapes.every(s=>typeof s.id==='string'&&s.id.trim()&&s.id.length<=100&&validPolygon(s.geometry)));
 for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++)if(overlaps(shapes[i].geometry,shapes[j].geometry))issues.push('overlap:'+shapes[i].id+':'+shapes[j].id);
 const surfaces=input.surfaces.map(s=>{
  const range=COMMERCIAL_RULES[s.kind];assert(!!range);if(s.heightMetres!==undefined)assert(Number.isFinite(s.heightMetres)&&s.heightMetres>=0&&s.heightMetres<=20);
  const belowHeight=s.heightMetres!==undefined&&s.heightMetres<1.5;
  if(['habitable_attic','uninhabitable_attic'].includes(s.kind)&&s.heightMetres===undefined)issues.push('height_required:'+s.id);
  if(s.kind==='habitable_attic'&&s.heightMetres!==undefined&&s.heightMetres<2.4)issues.push('attic_height_incompatible:'+s.id);
  if(s.kind==='uninhabitable_attic'&&s.heightMetres!==undefined&&s.heightMetres>=2.4)issues.push('attic_classification_required:'+s.id);
  if(['habitable_attic','habitable_basement','finished_mezzanine','finished_veranda'].includes(s.kind)&&s.qualificationConfirmed!==true)issues.push('qualification_required:'+s.id);
  const coefficient=belowHeight?0:s.coefficient??(range[0]===range[1]?range[0]:null);
  if(coefficient===null)issues.push('coefficient_required:'+s.id);
  else {assert(Number.isFinite(coefficient)&&coefficient>=0&&coefficient<=1);if(!belowHeight)assert(coefficient>=range[0]&&coefficient<=range[1]);}
  if(!belowHeight&&range[0]!==range[1]&&coefficient!==null&&(!s.selectionReason||!s.selectionReason.trim()))issues.push('coefficient_reason_required:'+s.id);
  const measuredM2=polygonArea(s.geometry)*m*m;
  return {id:s.id,kind:s.kind,measuredM2,coefficient,weightedM2:coefficient===null?null:measuredM2*coefficient,reason:belowHeight?'height_below_1_50m':s.selectionReason||null};
 });
 const walls=input.walls.map(w=>{
  assert(['internal','exclusive','shared','unknown'].includes(w.kind)&&Number.isFinite(w.thicknessMetres)&&w.thicknessMetres>0&&w.thicknessMetres<=5);
  if(w.kind==='unknown')issues.push('wall_classification_required:'+w.id);
  if(w.uniformThicknessConfirmed!==true)issues.push('wall_thickness_required:'+w.id);
  return wallContribution(w,m,input.commonWallCapBasis);
 });
 if(input.wallCoverageConfirmed!==true)issues.push('wall_coverage_not_confirmed');
 if(input.coverageConfirmed!==true)issues.push('coverage_not_confirmed');
 if(input.policyConfirmed!==true)issues.push('policy_not_confirmed');
 if(input.unresolvedSymbols.length)issues.push(...input.unresolvedSymbols.map(s=>'symbol_unresolved:'+s));
 const partialM2=surfaces.reduce((n,s)=>n+(s.weightedM2??0),0)+walls.reduce((n,w)=>n+w.weightedM2,0);
 return {profile:'agency_commercial_custom' as const,policyVersion:input.policyVersion,geometryRevision:input.geometryRevision,commonWallCapBasis:input.commonWallCapBasis,surfaces,walls,issues,status:issues.length?'incomplete' as const:'ready_for_review' as const,partialM2,totalM2:issues.length?null:partialM2,certification:false as const};
}

export type PerimeterInput=Omit<CommercialInput,'surfaces'>&{mainPerimeter:Polygon;accessories:SurfaceLine[];roomBreakdown:Array<{id:string;geometry:Polygon}>};
/** Alternative base: gross perimeter already contains walls. Room breakdown is retained, never added to gross. */
export function commercialPerimeterReport(input:PerimeterInput){
 assert(input&&validPolygon(input.mainPerimeter)&&Array.isArray(input.roomBreakdown)&&input.roomBreakdown.length<=100);
 const allIds=[...input.walls,...input.accessories,...input.roomBreakdown].map(x=>x.id);assert(allIds.every(id=>typeof id==='string'&&id.trim()&&id.length<=100)&&new Set(allIds).size===allIds.length&&!allIds.includes('__gross_main'));
 const base=commercialReport({...input,walls:[],surfaces:[{id:'__gross_main',kind:'principal',geometry:input.mainPerimeter},...input.accessories]});
 const issues=[...base.issues],m=metresPerUnit(input.calibration),contained=(p:Polygon)=>within(p,input.mainPerimeter);
 for(const room of input.roomBreakdown){assert(validPolygon(room.geometry));if(!contained(room.geometry))issues.push('room_outside_perimeter:'+room.id);}
 for(let i=0;i<input.roomBreakdown.length;i++)for(let j=i+1;j<input.roomBreakdown.length;j++)if(overlaps(input.roomBreakdown[i].geometry,input.roomBreakdown[j].geometry))issues.push('room_overlap:'+input.roomBreakdown[i].id+':'+input.roomBreakdown[j].id);
 const adjustments=input.walls.map(w=>{assert(validPolygon(w.geometry));if(!contained(w.geometry))issues.push('wall_outside_perimeter:'+w.id);if(w.kind==='unknown')issues.push('wall_classification_required:'+w.id);if(!w.uniformThicknessConfirmed)issues.push('wall_thickness_required:'+w.id);const contribution=wallContribution(w,m,input.commonWallCapBasis);return {...contribution,deductionM2:contribution.measuredM2-contribution.weightedM2};});
 for(let i=0;i<input.walls.length;i++)for(let j=i+1;j<input.walls.length;j++)if(overlaps(input.walls[i].geometry,input.walls[j].geometry))issues.push('wall_overlap:'+input.walls[i].id+':'+input.walls[j].id);
 const partialM2=base.partialM2-adjustments.reduce((s,w)=>s+w.deductionM2,0);if(partialM2<0)issues.push('negative_commercial_area');
 return {...base,base:'gross_perimeter' as const,roomBreakdown:input.roomBreakdown.map(r=>({id:r.id,netM2:polygonArea(r.geometry)*m*m})),wallAdjustments:adjustments,issues,status:issues.length?'incomplete' as const:'ready_for_review' as const,partialM2,totalM2:issues.length?null:partialM2};
}
