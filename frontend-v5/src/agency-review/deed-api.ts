import type {ApiTransport} from '../api/transport';
import {ApiError} from '../api/errors';
import type {ReviewEvidence,ReviewSnapshot} from './api';
export type DocumentRole='historical_owner'|'acquirer_in_deed'|'deceased'|'declared_heir'|'unresolved';
export type DeedCandidate={candidateId:string;field:string;proposedValue:string;documentSubjectRef:string;documentUnitRef:string;proposedDocumentRole:DocumentRole;status:'unbound_proposal';evidence:ReviewEvidence;lexicalEvidenceVerified:true;semanticEvidenceVerified:false;requiresHumanBinding:true};
export type DeedBinding={candidateId:string;unitId:string;subjectKey:string;factId:string;actorId:string;at:string;acknowledgedDocumentRole:DocumentRole;reason:string|null};
export type DeedRecord={id:string;visibility:'private'|'practice';sourceId:string;version:number;sha256:string;status:'current'|'stale';result:null|{fingerprint:string;proposals:DeedCandidate[];issues:Array<{candidateId:string|null;code:string}>};bindings:DeedBinding[]|null};
export type DeedSnapshot={revision:number;records:DeedRecord[];certification:false;canGenerateDraft:false};
export type DeedView={proposals:DeedSnapshot;units:ReviewSnapshot['units']};
export type DeedBindingBody={expectedRevision:number;candidateId:string;expectedFingerprint:string;unitId:string;subjectKey:string;acknowledgedDocumentRole:DocumentRole;reason:string|null};
export interface AgencyDeedPort{read(signal?:AbortSignal):Promise<DeedView>;bind(recordId:string,body:DeedBindingBody,key:string):Promise<{replay:boolean;recordId:string;factId:string;proposals:DeedSnapshot;review:ReviewSnapshot}>;}
/** No stage endpoint, browser-supplied evidence or synthetic runtime fallback. */
export function agencyDeedApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyDeedPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId),accountId=scope.accountId;
 return {read:async signal=>{const [proposals,review]=await Promise.all([transport.callJson<DeedSnapshot>(root+'/deed-proposals',{accountId,signal}),transport.callJson<ReviewSnapshot>(root+'/review',{accountId,signal})]);if(proposals.revision!==review.revision)throw new ApiError({kind:'http',status:409,code:'revision_conflict',message:'La pratica è cambiata durante la lettura.'});return {proposals,units:review.units};},bind:(recordId,body,idempotencyKey)=>transport.callJson(root+'/deed-proposals/'+encodeURIComponent(recordId)+'/bindings',{method:'POST',accountId,body,idempotencyKey})};
}
