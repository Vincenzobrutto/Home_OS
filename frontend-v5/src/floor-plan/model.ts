export type Point={number:number;page:number;x:number;y:number;name:string;type:string;included:boolean;roomId:string|null};
export type View={page:number;x:number;y:number;width:number;height:number};
export type Plan={points:Point[];view:View;warnings:string[]};
export type PlanDraft={id:string;version:number;plan:Plan;bindings:Record<string,string>};
export type PlanResponse={document:{id:string;name:string;version:number;sha256:string;mimeType:string};draft:PlanDraft|null;job:{id:string;state:string;errorCode:string|null}|null;rooms:{id:string;name:string;type:string;state:string}[];canEdit:boolean;budget:{available:boolean;remainingUsd:number}|null};
export type PlanMutation={expectedVersion:number;documentVersion:number;documentSha256:string;plan:Plan};
export const nameKey=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('it');
export function appendPoint(plan:Plan,x:number,y:number):Plan {const number=Math.max(0,...plan.points.map(p=>p.number))+1;return {...plan,points:[...plan.points,{number,page:plan.view.page,x,y,name:`Ambiente ${number}`,type:'other',included:true,roomId:null}]};}
