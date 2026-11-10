import type {ApiTransport} from '../api/transport';
import type {ReviewSnapshot} from './api';
import type {FindingsSnapshot} from './findings-api';
export type ComparisonBody={expectedRevision:number;command:{operation:'comparison';visibility:'private'|'practice';question:{unitId:string;subjectKey:string;epoch:string;field:string;factIds:string[]}}};
export interface AgencyComparisonPort{read(signal?:AbortSignal):Promise<ReviewSnapshot>;write(body:ComparisonBody,key:string):Promise<{replay:boolean;findings:FindingsSnapshot}>;}
export function agencyComparisonApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyComparisonPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId),accountId=scope.accountId;
 return {read:signal=>transport.callJson(root+'/review',{accountId,signal}),write:(body,idempotencyKey)=>transport.callJson(root+'/findings',{method:'POST',accountId,body,idempotencyKey})};
}
