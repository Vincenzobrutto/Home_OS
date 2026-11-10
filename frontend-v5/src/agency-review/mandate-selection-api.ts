import type {ApiTransport} from '../api/transport';
import {ApiError} from '../api/errors';
import type {ReviewSnapshot} from './api';
import type {FindingsSnapshot} from './findings-api';
export type MandateSelectionView={review:ReviewSnapshot;findings:FindingsSnapshot};
export interface AgencyMandateSelectionPort{read(signal?:AbortSignal):Promise<MandateSelectionView>;}
export function agencyMandateSelectionApi(transport:Pick<ApiTransport,'callJson'>,scope:{accountId:string;agencyId:string;practiceId:string}):AgencyMandateSelectionPort{
 const root='/agencies/'+encodeURIComponent(scope.agencyId)+'/practices/'+encodeURIComponent(scope.practiceId),accountId=scope.accountId;
 return {read:async signal=>{const [review,findings]=await Promise.all([transport.callJson<ReviewSnapshot>(root+'/review',{accountId,signal}),transport.callJson<FindingsSnapshot>(root+'/findings',{accountId,signal})]);if(review.revision!==findings.revision)throw new ApiError({kind:'http',status:409,code:'revision_conflict',message:'La pratica è cambiata durante la lettura.'});return {review,findings};}};
}
