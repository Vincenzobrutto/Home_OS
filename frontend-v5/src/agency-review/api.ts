import type { ApiTransport } from '../api/transport';
export type ReviewEvidence={sourceId:string;version:number;sha256:string;page:number;excerpt:string};
export type ReviewValue=string|number|boolean;
export type ReviewFact={id:string;unitId:string;subjectKey:string;field:string;version:number;status:'proposed'|'confirmed'|'rejected'|'stale';proposedValue:ReviewValue;confirmedValue:ReviewValue|null;origin:'extracted'|'declared';confirmedOrigin:'extracted'|'declared'|'manual_correction'|null;confirmedBy:string|null;confirmedAt:string|null;evidence:ReviewEvidence[]};
export type ReviewSnapshot={revision:number;units:Array<{id:string;label:string}>;facts:ReviewFact[]};
export type DecisionBody={expectedRevision:number;command:{operation:'decide';factId:string;expectedFactVersion:number;action:'confirm'|'correct'|'reject';value?:ReviewValue;reason:string|null}};
export interface AgencyReviewPort {
 read(signal?:AbortSignal):Promise<ReviewSnapshot>;
 decide(body:DecisionBody,key:string):Promise<{replay:boolean;review:ReviewSnapshot}>;
}
/** Real V5 transport only; never infer an account, fixture or local fallback. */
export function agencyReviewApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyReviewPort {
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId)+'/review',accountId=scope.accountId;
 return {read:signal=>transport.callJson(root,{accountId,signal}),decide:(body,idempotencyKey)=>transport.callJson(root,{method:'POST',accountId,body,idempotencyKey})};
}
