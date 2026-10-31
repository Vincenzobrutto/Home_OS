import type {ApiTransport} from '../api/transport';
import type {ReviewEvidence,ReviewValue} from './api';
export type FindingOutcome='reviewed_difference'|'explained_historical_change'|'technical_document_received'|'not_applicable';
export type FindingState='open'|'resolved'|'reopened';
export type FindingResolution={actorId:string;at:string;fingerprint:string;outcome:FindingOutcome;reason:string;evidence:ReviewEvidence[];current:boolean};
type Common={id:string;unitId:string;fingerprint:string;state:FindingState;resolutions:FindingResolution[]};
export type FindingComparison=Common&{subjectKey:string;epoch:string;field:string;status:'not_evaluable'|'difference_to_review'|'matching_confirmed_values'|'matching_proposals';allConfirmed:boolean;values:Array<{factId:string;version:number;status:string;value:ReviewValue;evidence:ReviewEvidence[]}>};
export type FindingObservation=Common&{kind:'succession_chain'|'internal_layout'|'other';description:string;evidence:ReviewEvidence[];current:boolean};
export type FindingsSnapshot={revision:number;comparisons:FindingComparison[];observations:FindingObservation[];certification:false};
export type FindingBody={expectedRevision:number;command:
 |{operation:'resolve';target:'comparison'|'observation';targetId:string;expectedFingerprint:string;outcome:FindingOutcome;reason:string;evidence:ReviewEvidence[]}
 |{operation:'observation';unitId:string;kind:FindingObservation['kind'];description:string;visibility:'private'|'practice';evidence:ReviewEvidence[]}};
export interface AgencyFindingsPort{read(signal?:AbortSignal):Promise<FindingsSnapshot>;write(body:FindingBody,key:string):Promise<{replay:boolean;findings:FindingsSnapshot}>;}
export function agencyFindingsApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyFindingsPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId)+'/findings',accountId=scope.accountId;
 return {read:signal=>transport.callJson(root,{accountId,signal}),write:(body,idempotencyKey)=>transport.callJson(root,{method:'POST',accountId,body,idempotencyKey})};
}
