import {Prisma} from '../../generated/client';
import {parseDigitalPlan,type DigitalPlanSnapshot} from './snapshot';
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
/** Inside the final publication transaction only; originals have passed independent admission. */
export async function publishGiftMap(tx:Prisma.TransactionClient,input:{accountId:string;homeId:string;documentId:string;sha256:string;snapshot:DigitalPlanSnapshot}){
 const snapshot=parseDigitalPlan(input.snapshot);
 if(snapshot.source.sha256!==input.sha256)throw new Error('gift_map_source_changed');
 const bindings:Record<string,string>={};
 for(const room of snapshot.rooms){
  const row=await tx.homeRoom.create({data:{homeId:input.homeId,name:room.name,type:room.type==='corridor'||room.type==='balcony'?'other':room.type}});
  bindings[room.id]=row.id;
  await tx.objectEvent.create({data:{accountId:input.accountId,homeId:input.homeId,targetKind:'room',targetId:row.id,kind:'created',before:Prisma.JsonNull,after:json({kind:'room',row})}});
 }
 await tx.homeDigitalPlan.create({data:{accountId:input.accountId,homeId:input.homeId,documentId:input.documentId,documentVersion:1,documentSha256:input.sha256,geometryRevision:snapshot.geometryRevision,received:json(snapshot),layout:json(snapshot),roomBindings:json(bindings)}});
}
