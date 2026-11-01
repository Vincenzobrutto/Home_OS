import {Injectable,ForbiddenException} from '@nestjs/common';
import {Prisma,type HomeDigitalPlan} from '../../generated/client';
import {ObjectOnboardingAccess} from '../object-onboarding/access';
import {object,uuid,version,invalid,conflict} from '../review/domain';
import {digest} from '../security';
import {filled,validPolygon,overlaps,type Polygon} from '../agency-plans/geometry';
import {parseDigitalPlan,mapDigest} from './snapshot';
type Pin={objectId:string;regionId:string;x:number;y:number;geometryRevision:number};
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const deny=()=>new ForbiddenException('Accesso non consentito.');
function coordinate(v:unknown,max:number):number{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw invalid();return v;}
@Injectable()
export class HomeMapService{
 constructor(private readonly access:ObjectOnboardingAccess){}
 private async source(tx:Prisma.TransactionClient,a:string,h:string,row:HomeDigitalPlan){
  const doc=await this.access.source(tx,a,h,row.documentId,{documentVersion:row.documentVersion,documentSha256:row.documentSha256});
  if(!doc)throw deny();return doc;
 }
 private layout(row:HomeDigitalPlan){try{return parseDigitalPlan(row.layout);}catch{throw conflict('map_unavailable','La mappa deve essere ricontrollata.');}}
 private async row(tx:Prisma.TransactionClient,a:string,h:string,id:string){
  const row=await tx.homeDigitalPlan.findFirst({where:{id:uuid(id),accountId:a,homeId:h}});if(!row)throw deny();await this.source(tx,a,h,row);return row;
 }
 list(a:string,h:string,q:unknown){object(q,[]);return this.access.run(a,h,false,async tx=>{
  const rows=await tx.homeDigitalPlan.findMany({where:{accountId:a,homeId:h},orderBy:[{createdAt:'asc'},{id:'asc'}]});
  const result=[];for(const row of rows){const doc=await this.access.source(tx,a,h,row.documentId,{documentVersion:row.documentVersion,documentSha256:row.documentSha256});if(doc)result.push({id:row.id,documentId:row.documentId,name:doc.name,version:row.version,roomCount:this.layout(row).rooms.length});}return {items:result};
 });}
 get(a:string,h:string,id:string,q:unknown){object(q,[]);return this.access.run(a,h,false,async(tx,canEdit)=>{
  const row=await this.row(tx,a,h,id),doc=await this.source(tx,a,h,row),layout=this.layout(row),bindings=row.roomBindings as Record<string,string>;
  const rooms=await tx.homeRoom.findMany({where:{homeId:h,id:{in:Object.values(bindings)}}});
  const objects=await tx.homeObject.findMany({where:{accountId:a,homeId:h,state:'active'}});
  const allowed:typeof objects=[];for(const item of objects){try{await this.access.target(tx,a,h,item.id);allowed.push(item);}catch(e){if(!(e instanceof ForbiddenException))throw e;}}
  const positions=await tx.objectPosition.findMany({where:{accountId:a,homeId:h,objectId:{in:allowed.map(v=>v.id)}}});
  const pins=(row.pins as unknown as Pin[]).filter(p=>allowed.some(o=>o.id===p.objectId)).map(p=>{const room=rooms.find(v=>v.id===bindings[p.regionId]),pos=positions.find(v=>v.objectId===p.objectId);
   return {...p,needsReview:p.geometryRevision!==row.geometryRevision||!room||room.state!=='active'||!(pos?.roomIds as string[]|undefined)?.includes(room.id)};});
  return {id:row.id,version:row.version,geometryRevision:row.geometryRevision,document:{id:doc.id,name:doc.name,mimeType:doc.original!.mimeType},layout,rooms:layout.rooms.map(r=>({...r,roomId:bindings[r.id],name:rooms.find(v=>v.id===bindings[r.id])?.name??r.name,state:rooms.find(v=>v.id===bindings[r.id])?.state??'unavailable'})),
   objects:allowed.map(o=>({id:o.id,name:o.name,type:o.type,positionVersion:positions.find(p=>p.objectId===o.id)?.version??0})),pins,canEdit};
 });}
 mutate(a:string,h:string,id:string,input:unknown,key:string|undefined,geometry:boolean){
  if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();
  const b=object(input,geometry?['expectedVersion','regionId','geometry']:['expectedVersion','objectId','regionId','x','y','expectedPositionVersion']);
  const expected=version(b.expectedVersion),operation=geometry?'home-map:geometry':'home-map:pin',hash=digest(JSON.stringify(b));
  return this.access.run(a,h,true,async tx=>{
   const row=await this.row(tx,a,h,id),layout=this.layout(row),bindings=row.roomBindings as Record<string,string>;
   const prior=await tx.objectRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId:a,homeId:h,operation,target:id,key}}});
   if(prior){if(prior.digest!==hash)throw conflict('idempotency_conflict','Chiave già usata.');return prior.response;}
   if(row.version!==expected)throw conflict('map_version_conflict','La mappa è cambiata. Ricaricala.');
   if(typeof b.regionId!=='string')throw invalid();const region=layout.rooms.find(v=>v.id===b.regionId);if(!region)throw invalid();
   const room=await tx.homeRoom.findFirst({where:{id:bindings[region.id],homeId:h,state:'active'}});if(!room)throw conflict('room_unavailable','Ambiente non disponibile.');
   let pins=structuredClone(row.pins) as unknown as Pin[];
   if(geometry){
    const raw=object(b.geometry,['points','holes']) as unknown as Polygon;
    if(!validPolygon(raw)||[raw.points,...raw.holes].some(r=>r.some(([x,y])=>x<0||y<0||x>layout.frame.width||y>layout.frame.height))||layout.rooms.some(r=>r.id!==region.id&&overlaps(raw,r)))throw invalid('Contorno non valido o sovrapposto.');
    region.points=structuredClone(raw.points);region.holes=structuredClone(raw.holes);layout.geometryRevision++;layout.calibration=null;layout.qualification='unverified';layout.mainPerimeter=null;
    layout.caveats=['Geometria modificata dal proprietario: scala e computo precedenti non applicabili.','I segnaposti precedenti richiedono una nuova conferma.'];
    layout.reviewedBy=a;layout.reviewedAt=new Date().toISOString();const {digest:_old,...content}=layout;void _old;layout.digest=mapDigest(content);
   }else{
    const target=await this.access.target(tx,a,h,uuid(b.objectId));if(target.state!=='active')throw invalid();
    const x=coordinate(b.x,layout.frame.width),y=coordinate(b.y,layout.frame.height);
    if(!filled([x,y],region))throw invalid('Il segnaposto deve essere dentro il vano, fuori dai vuoti.');
    if(!Number.isSafeInteger(b.expectedPositionVersion)||Number(b.expectedPositionVersion)<0)throw invalid();
    const pos=await tx.objectPosition.findFirst({where:{accountId:a,homeId:h,objectId:target.id}});
    if((pos?.version??0)!==b.expectedPositionVersion)throw conflict('placement_version_conflict','La posizione dell’oggetto è cambiata.');
    const saved=pos?await tx.objectPosition.update({where:{id:pos.id},data:{roomIds:[room.id],version:{increment:1}}}):await tx.objectPosition.create({data:{accountId:a,homeId:h,objectId:target.id,roomIds:[room.id]}});
    await tx.objectEvent.create({data:{accountId:a,homeId:h,targetKind:'object',targetId:target.id,kind:'position_updated',before:json({kind:'object',row:target,position:pos}),after:json({kind:'object',row:target,position:saved})}});
    pins=pins.filter(p=>p.objectId!==target.id);if(pins.length>=500)throw invalid();pins.push({objectId:target.id,regionId:region.id,x,y,geometryRevision:row.geometryRevision});
   }
   const updated=await tx.homeDigitalPlan.update({where:{id},data:{layout:json(layout),pins:json(pins),geometryRevision:layout.geometryRevision,version:{increment:1},updatedAt:new Date()}});
   const response={id,version:updated.version,geometryRevision:updated.geometryRevision};
   await tx.objectRequest.create({data:{accountId:a,homeId:h,operation,target:id,key,digest:hash,response:json(response)}});return response;
  });
 }
}
