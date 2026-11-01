import type {ApiTransport} from '../api/transport';
import {serviceError} from '../api/errors';
export type Point=[number,number];
export type MapRoom={id:string;name:string;type:string;points:Point[];holes:Point[][];roomId:string;state:string};
export type MapView={id:string;version:number;geometryRevision:number;document:{id:string;name:string;mimeType:string};layout:{source:{page:number};frame:{width:number;height:number};rooms:MapRoom[];qualification:'estimated'|'reviewed'|'unverified';caveats:string[]};rooms:MapRoom[];objects:{id:string;name:string;type:string;positionVersion:number}[];pins:{objectId:string;regionId:string;x:number;y:number;geometryRevision:number;needsReview:boolean}[];canEdit:boolean};
export type MapList={items:{id:string;documentId:string;name:string;version:number;roomCount:number}[]};
const uuid=(s:string)=>{if(!/^[a-f0-9-]{36}$/iu.test(s))throw new TypeError('Invalid map scope');return encodeURIComponent(s);};
function record(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw serviceError(200);return v as Record<string,unknown>;}
function string(v:unknown):asserts v is string{if(typeof v!=='string'||!v)throw serviceError(200);}
function num(v:unknown,min=0):asserts v is number{if(typeof v!=='number'||!Number.isFinite(v)||v<min)throw serviceError(200);}
export function parseMap(input:unknown):MapView{
 const r=record(input),l=record(r.layout),f=record(l.frame),d=record(r.document),s=record(l.source);string(r.id);num(r.version,1);num(r.geometryRevision,1);num(f.width,1);num(f.height,1);num(s.page,1);string(d.id);string(d.name);string(d.mimeType);
 if(typeof r.canEdit!=='boolean'||!['estimated','reviewed','unverified'].includes(String(l.qualification))||!Array.isArray(l.caveats)||!l.caveats.every(v=>typeof v==='string')||!Array.isArray(r.rooms)||r.rooms.length>100||!Array.isArray(r.objects)||!Array.isArray(r.pins))throw serviceError(200);
 for(const v of r.rooms){const x=record(v);for(const key of ['id','name','type','roomId','state'])string(x[key]);if(!Array.isArray(x.points)||x.points.length<3||!Array.isArray(x.holes))throw serviceError(200);for(const ring of [x.points,...x.holes]){if(!Array.isArray(ring))throw serviceError(200);for(const p of ring){if(!Array.isArray(p)||p.length!==2)throw serviceError(200);num(p[0]);num(p[1]);if(p[0]>Number(f.width)||p[1]>Number(f.height))throw serviceError(200);}}}
 for(const v of r.objects){const x=record(v);string(x.id);string(x.name);string(x.type);num(x.positionVersion);}
 for(const v of r.pins){const x=record(v);string(x.objectId);string(x.regionId);num(x.x);num(x.y);num(x.geometryRevision,1);if(x.x>Number(f.width)||x.y>Number(f.height)||typeof x.needsReview!=='boolean')throw serviceError(200);}
 return input as MapView;
}
export class HomeMapsApi{
 private readonly transport:ApiTransport;
 constructor(transport:ApiTransport){this.transport=transport;}
 private root(h:string){return '/homes/'+uuid(h)+'/digital-plans';}
 async list(h:string,a:string,signal?:AbortSignal):Promise<MapList>{const r=record(await this.transport.callJson<unknown>(this.root(h),{accountId:a,signal}));if(!Array.isArray(r.items))throw serviceError(200);for(const v of r.items){const p=record(v);string(p.id);string(p.documentId);string(p.name);num(p.version,1);num(p.roomCount);}return r as MapList;}
 async get(h:string,id:string,a:string,signal?:AbortSignal){return parseMap(await this.transport.callJson<unknown>(this.root(h)+'/'+uuid(id),{accountId:a,signal}));}
 async mutate(h:string,id:string,a:string,operation:'pins'|'geometry',body:unknown,key:string){return this.transport.callJson<unknown>(this.root(h)+'/'+uuid(id)+'/'+operation,{method:'POST',body,idempotencyKey:key,accountId:a});}
}
