import type {ApiTransport} from '../api/transport';
import type {ReviewSnapshot,ReviewValue} from './api';
export type DeclarationBody={expectedRevision:number;command:{operation:'unit';label:string}|{operation:'declare';unitId:string;subjectKey:string;field:string;value:ReviewValue;visibility:'private'|'practice'}};
export interface AgencyDeclarationPort{read(signal?:AbortSignal):Promise<ReviewSnapshot>;write(body:DeclarationBody,key:string):Promise<{replay:boolean;review:ReviewSnapshot}>;}
export function agencyDeclarationApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyDeclarationPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId)+'/review',accountId=scope.accountId;
 return {read:signal=>transport.callJson(root,{accountId,signal}),write:(body,idempotencyKey)=>transport.callJson(root,{method:'POST',accountId,body,idempotencyKey})};
}
