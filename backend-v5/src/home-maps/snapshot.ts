import {createHash} from 'node:crypto';
import {validPolygon,overlaps,metresPerUnit,type Polygon,type Calibration} from '../agency-plans/geometry';
import type {StoredPlan} from '../agency-plans/records';
import {PracticeError,type Practice} from '../agency-practices/domain';
export type MapRoom=Polygon&{id:string;name:string;type:string};
export type DigitalPlanSnapshot={
 schemaVersion:1;planId:string;planVersion:number;geometryRevision:number;
 source:{sourceId:string;version:number;sha256:string;page:number};
 frame:{width:number;height:number;rasterSha256:string;coordinateSystem:'rendered-page-top-left';transform:number[]|null};
 rooms:MapRoom[];calibration:Calibration|null;qualification:'estimated'|'reviewed'|'unverified';
 mainPerimeter:Polygon|null;caveats:string[];reviewedBy:string;reviewedAt:string;digest:string
};
function fail():never{throw new PracticeError('invalid_input');}
const positive=(v:unknown,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(v)||Number(v)<1||Number(v)>max)fail();return Number(v);};
const text=(v:unknown,max=200):string=>{if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\p{Cc}\p{Cf}]/u.test(v))fail();return v;};
const sha=(v:unknown)=>{const s=text(v,64);if(!/^[a-f0-9]{64}$/u.test(s))fail();return s;};
function obj(v:unknown,keys:string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k)))fail();return v as Record<string,unknown>;}
function canonical(v:unknown):unknown{if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,x])=>[k,canonical(x)]));return v;}
export const mapDigest=(v:unknown)=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export function parseDigitalPlan(input:unknown):DigitalPlanSnapshot{
 const r=obj(input,['schemaVersion','planId','planVersion','geometryRevision','source','frame','rooms','calibration','qualification','mainPerimeter','caveats','reviewedBy','reviewedAt','digest']);
 if(r.schemaVersion!==1)fail();
 const s=obj(r.source,['sourceId','version','sha256','page']),f=obj(r.frame,['width','height','rasterSha256','coordinateSystem','transform']);
 const width=positive(f.width,5000),height=positive(f.height,5000);
 if(width*height>4000000||f.coordinateSystem!=='rendered-page-top-left'||f.transform!==null&&(!Array.isArray(f.transform)||f.transform.length!==6||!f.transform.every(x=>typeof x==='number'&&Number.isFinite(x))))fail();
 const polygon=(v:unknown):Polygon=>{const g=obj(v,['points','holes']) as unknown as Polygon;if(!validPolygon(g)||[g.points,...g.holes].some(ring=>ring.some(([x,y])=>x<0||y<0||x>width||y>height)))fail();return structuredClone(g);};
 if(!Array.isArray(r.rooms)||!r.rooms.length||r.rooms.length>100)fail();
 let vertices=0;
 const rooms=r.rooms.map(v=>{const x=obj(v,['id','name','type','points','holes']);const g=polygon({points:x.points,holes:x.holes});vertices+=g.points.length+g.holes.reduce((n,h)=>n+h.length,0);return {...g,id:text(x.id,100),name:text(x.name,80),type:text(x.type,30)};});
 if(vertices>12000||new Set(rooms.map(x=>x.id)).size!==rooms.length||new Set(rooms.map(x=>x.name.normalize('NFKC').toLocaleLowerCase('it'))).size!==rooms.length||rooms.some(x=>!['other','kitchen','bathroom','corridor','balcony'].includes(x.type)))fail();
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++)if(overlaps(rooms[i],rooms[j]))fail();
 const calibration=r.calibration===null?null:structuredClone(r.calibration) as Calibration;
 if(calibration){try{metresPerUnit(calibration);}catch{fail();}if(calibration.paper&&(calibration.paper.widthUnits!==width||calibration.paper.heightUnits!==height))fail();}
 const qualification=calibration?(calibration.paper?'estimated':'reviewed'):'unverified';
 if(r.qualification!==qualification||!Array.isArray(r.caveats)||r.caveats.length<1||r.caveats.length>220)fail();
 const reviewedAt=text(r.reviewedAt,40);if(!Number.isFinite(Date.parse(reviewedAt))||new Date(reviewedAt).toISOString()!==reviewedAt)fail();
 const result:DigitalPlanSnapshot={schemaVersion:1,planId:text(r.planId,120),planVersion:positive(r.planVersion),geometryRevision:positive(r.geometryRevision),
 source:{sourceId:text(s.sourceId,100),version:positive(s.version),sha256:sha(s.sha256),page:positive(s.page,20)},
 frame:{width,height,rasterSha256:sha(f.rasterSha256),coordinateSystem:'rendered-page-top-left',transform:structuredClone(f.transform) as number[]|null},
 rooms,calibration,qualification,mainPerimeter:r.mainPerimeter===null?null:polygon(r.mainPerimeter),caveats:r.caveats.map(x=>text(x,500)),reviewedBy:text(r.reviewedBy,100),reviewedAt,digest:sha(r.digest)};
 const {digest,...content}=result;if(mapDigest(content)!==digest)fail();return result;
}
export function giftDigitalPlan(practice:Practice,sourceId:string,selection:{planId:string;expectedPlanVersion:number;reviewed:true},accountId:string,now:string){
 const p=(practice as Practice&{planAnalyses?:StoredPlan[]}).planAnalyses?.find(v=>v.id===selection.planId&&v.proof.sourceId===sourceId);
 const source=practice.sources.find(s=>s.id===sourceId),original=source?.versions.at(-1);
 if(!p||!original||source?.kind!=='floor_plan'||p.version!==selection.expectedPlanVersion||p.proof.version!==original.version||p.proof.sha256!==original.sha256)throw new PracticeError('source_changed');
 if(selection.reviewed!==true||!p.rooms.length||p.surfaceProposal?.state==='pending')fail();
 const calibration=p.measurementConfiguration?.calibration??null,qualification=calibration?(calibration.paper?'estimated':'reviewed'):'unverified';
 const content={schemaVersion:1 as const,planId:p.id,planVersion:p.version,geometryRevision:p.geometryRevision,source:structuredClone(p.proof),
 frame:{...p.rasterSize,rasterSha256:p.rasterSHA256,coordinateSystem:'rendered-page-top-left' as const,transform:p.rendering?.transform??null},
 rooms:p.rooms.map(v=>({id:v.id,name:v.label,type:v.kind==='room'?'other':v.kind,points:v.points,holes:v.holes})),calibration,
 qualification,mainPerimeter:p.mainPerimeter,caveats:[qualification==='estimated'?'Scala da foglio presunto: superfici stimate, da verificare.':qualification==='unverified'?'Scala non disponibile: nessuna superficie verificata.':'Scala controllata dall’agente: misure da verificare sul posto.',
 'Contorni e destinazioni revisionati dall’agente; nessuna conformità o completezza certificata.',
 ...p.issues.map(v=>'Verifica geometrica aperta: '+v.code)],reviewedBy:accountId,reviewedAt:now};
 return parseDigitalPlan({...content,digest:mapDigest(content)});
}
export function assertCurrentDigitalPlan(practice:Practice,snapshot:DigitalPlanSnapshot){
 const current=giftDigitalPlan(practice,snapshot.source.sourceId,{planId:snapshot.planId,expectedPlanVersion:snapshot.planVersion,reviewed:true},snapshot.reviewedBy,snapshot.reviewedAt);
 if(current.digest!==snapshot.digest)throw new PracticeError('source_changed');
}

export function digitalPlanSummary(p:DigitalPlanSnapshot){return {planId:p.planId,geometryRevision:p.geometryRevision,page:p.source.page,roomCount:p.rooms.length,qualification:p.qualification,caveats:[...p.caveats]};}
