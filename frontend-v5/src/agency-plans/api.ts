import type {MeasurementConfiguration} from './measurement-types';
import type { ApiTransport } from '../api/transport';
import type { PlanShape } from './PlanMeasurementView';
export type AgencyScope={accountId:string;agencyId:string;practiceId:string};
export type SourceProof={sourceId:string;version:number;sha256:string;page:number};
export type AgencyPractice={id:string;label:string;revision:number;documents:Array<{id:string;kind:string;visibility:string;version:number;filename:string}>};
export type AgencyPlan={id:string;version:number;status:string;proof:SourceProof;rooms:PlanShape[]|null;mainPerimeter?:PlanShape|null;rasterSize?:{width:number;height:number};rendering?:{dpi:number;transform:number[];renderer:string}|null;geometryRevision?:number;measurementConfiguration?:MeasurementConfiguration|null;issues?:Array<{id:string;code:string}>;measurement?:{totalM2:number|null;partialM2:number;issues:string[];status:string;certification:false;surfaces?:Array<{id:string;measuredM2:number;weightedM2:number|null}>}|null};
export type PlansResponse={revision:number;plans:AgencyPlan[]};
export type PlanEditBody={expectedRevision:number;expectedPlanVersion:number;reason:string;command:Record<string,unknown>};
export interface AgencyPlanPort{
 practice(signal?:AbortSignal):Promise<AgencyPractice>;
 plans(signal?:AbortSignal):Promise<PlansResponse>;
 image(planId:string,signal?:AbortSignal):Promise<Blob>;
 edit(planId:string,body:PlanEditBody,key:string):Promise<{replay:boolean;plans:PlansResponse}>;
}
/** Shares V5 session/CSRF transport. No local fallback, mock or stored token. */
export function agencyPlanApi(transport:Pick<ApiTransport,'callJson'|'callBinary'>,scope:AgencyScope):AgencyPlanPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId),accountId=scope.accountId;
 return {
  practice:signal=>transport.callJson(root,{accountId,signal}),
  plans:signal=>transport.callJson(root+'/plans',{accountId,signal}),
  image:async(id,signal)=>{const data=await transport.callBinary(root+'/plans/'+encodeURIComponent(id)+'/image',signal,accountId);if(!data.contentType.toLowerCase().startsWith('image/png'))throw new Error('Anteprima non disponibile.');return data.blob;},
  edit:(id,body,idempotencyKey)=>transport.callJson(root+'/plans/'+encodeURIComponent(id)+'/edits',{method:'POST',body,idempotencyKey,accountId}),
 };
}
