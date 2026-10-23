import { homePath } from './paths';
import { ApiTransport } from './transport';
export class FloorPlanApi {
private readonly http: ApiTransport;
constructor(http: ApiTransport) { this.http = http; }

getFloorPlan(homeId:string,documentId:string,signal:AbortSignal|undefined,accountId:string) {
    return this.http.request<import('../floor-plan/model').PlanResponse>(`${homePath(homeId)}/floor-plan-layouts/${encodeURIComponent(documentId)}`,{signal,accountId});
  }

mutateFloorPlan(homeId:string,documentId:string,action:'analysis'|'draft'|'confirmations',body:unknown,key:string,accountId:string) {
    return this.http.mutate<{draft:import('../floor-plan/model').PlanDraft;created:number;linked:number}>(`${homePath(homeId)}/floor-plan-layouts/${encodeURIComponent(documentId)}/${action}`,{body,headers:{'Idempotency-Key':key},accountId});
  }
}
