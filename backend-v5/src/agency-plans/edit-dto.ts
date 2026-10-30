import { PracticeError } from '../agency-practices/domain';
import { COMMERCIAL_RULES, type SurfaceKind } from './commercial';
import { validPolygon, type Point, type Polygon, type Calibration } from './geometry';
import type { MeasurementConfiguration, PlanEdit } from './records';
function fail():never{throw new PracticeError('invalid_input');}
function obj(v:unknown,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail();return v as Record<string,unknown>;}
function text(v:unknown,max=100){if(typeof v!=='string'||!v.trim()||v.length>max||Array.from(v).some(c=>c.charCodeAt(0)<32))fail();return v.trim();}
function num(v:unknown,min:number,max:number){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail();return v;}
function integer(v:unknown){const n=num(v,1,1e9);if(!Number.isSafeInteger(n))fail();return n;}
function bool(v:unknown){if(typeof v!=='boolean')fail();return v;}
function choice<T extends string>(v:unknown,values:readonly T[]):T{if(typeof v!=='string'||!values.includes(v as T))fail();return v as T;}
function list(v:unknown,max:number){if(!Array.isArray(v)||v.length>max)fail();return v;}
function point(v:unknown):Point{if(!Array.isArray(v)||v.length!==2)fail();return [num(v[0],0,5000),num(v[1],0,5000)];}
export function parsePlanEdit(body:unknown,headerKey:string,planId:string):PlanEdit{
 const b=obj(body,['expectedRevision','expectedPlanVersion','reason','command']);let vertices=0;
 function ring(v:unknown){const r=list(v,2000);if(r.length<3)fail();vertices+=r.length;if(vertices>4096)fail();return r.map(point);}
 function polygon(v:unknown):Polygon{const p=obj(v,['points','holes']),shape={points:ring(p.points),holes:list(p.holes,100).map(ring)};if(!validPolygon(shape))fail();return shape;}
 function calibration(v:unknown):Calibration{const c=obj(v,['start','end','metres','confirmed','check','maxRelativeError','paper']);const r:Calibration={start:point(c.start),end:point(c.end),metres:num(c.metres,Number.MIN_VALUE,1e6),confirmed:bool(c.confirmed),maxRelativeError:num(c.maxRelativeError,0,.1)};if(c.paper!==undefined){const p=obj(c.paper,['format','orientation','denominator','widthUnits','heightUnits']);r.paper={format:choice(p.format,['A4','A3']),orientation:choice(p.orientation,['portrait','landscape']),denominator:num(p.denominator,1,10000),widthUnits:integer(p.widthUnits),heightUnits:integer(p.heightUnits)};}if(c.check!==undefined){const k=obj(c.check,['start','end','metres']);r.check={start:point(k.start),end:point(k.end),metres:num(k.metres,Number.MIN_VALUE,1e6)};}return r;}
 const c=obj(b.command,['operation','view','id','geometry','configuration','issueId','code','resolution','label','kind','parentId','proposalDigest']);let command:PlanEdit['command'];
 if(c.operation==='apply_surface_proposal'){obj(c,['operation','proposalDigest']);const digest=text(c.proposalDigest,64);if(!/^[a-f0-9]{64}$/u.test(digest))fail();command={operation:'apply_surface_proposal',proposalDigest:digest};}
 else if(c.operation==='add_room'){obj(c,['operation','id','label','kind','geometry','parentId']);command={operation:'add_room',id:text(c.id),label:text(c.label,200),kind:choice(c.kind,['room','bathroom','kitchen','corridor','balcony']),geometry:polygon(c.geometry),...(c.parentId!==undefined?{parentId:text(c.parentId)}:{})};}
 else if(c.operation==='geometry'){obj(c,['operation','view','id','geometry']);command={operation:'geometry',view:choice(c.view,['rooms','perimeter']),id:text(c.id),geometry:polygon(c.geometry)};}
 else if(c.operation==='resolve_issue'){obj(c,['operation','issueId','code','resolution']);command={operation:'resolve_issue',issueId:text(c.issueId),code:text(c.code),resolution:choice(c.resolution,['included_in_geometry','excluded_from_computation','not_applicable'])};}
 else if(c.operation==='measure'){
  obj(c,['operation','configuration']);const m=obj(c.configuration,['base','calibration','policyVersion','mainRegionIds','assignments','walls','coverageConfirmed','wallCoverageConfirmed','policyConfirmed','commonWallCapBasis']);
  const configuration:MeasurementConfiguration={base:choice(m.base,['rooms_and_walls','gross_perimeter']),calibration:calibration(m.calibration),policyVersion:text(m.policyVersion,120),mainRegionIds:list(m.mainRegionIds,100).map(v=>text(v)),assignments:list(m.assignments,100).map(v=>{const a=obj(v,['id','kind','coefficient','selectionReason','heightMetres','qualificationConfirmed']);return {id:text(a.id),kind:choice(a.kind,Object.keys(COMMERCIAL_RULES) as SurfaceKind[]),...(a.coefficient!==undefined?{coefficient:num(a.coefficient,0,1)}:{}),...(a.selectionReason!==undefined?{selectionReason:text(a.selectionReason,1000)}:{}),...(a.heightMetres!==undefined?{heightMetres:num(a.heightMetres,0,20)}:{}),...(a.qualificationConfirmed!==undefined?{qualificationConfirmed:bool(a.qualificationConfirmed)}:{})};}),walls:list(m.walls,300).map(v=>{const w=obj(v,['id','geometry','scope','kind','thicknessMetres','uniformThicknessConfirmed']);return {id:text(w.id),geometry:polygon(w.geometry),scope:choice(w.scope,['main_unit']),kind:choice(w.kind,['internal','exclusive','shared','unknown']),thicknessMetres:num(w.thicknessMetres,Number.MIN_VALUE,5),uniformThicknessConfirmed:bool(w.uniformThicknessConfirmed)};}),coverageConfirmed:bool(m.coverageConfirmed),wallCoverageConfirmed:bool(m.wallCoverageConfirmed),policyConfirmed:bool(m.policyConfirmed),commonWallCapBasis:choice(m.commonWallCapBasis,['physical_thickness','credited_thickness'])};
  command={operation:'measure',configuration};
 }else fail();
 return {key:text(headerKey,120),planId:text(planId,120),expectedRevision:integer(b.expectedRevision),expectedPlanVersion:integer(b.expectedPlanVersion),reason:text(b.reason,1000),command};
}
