import {createHash} from 'node:crypto';
import {PracticeError,type Source} from '../agency-practices/domain';

export const DOCUMENT_ANALYSIS_PURPOSE='DOCUMENT_EXTRACT' as const;
export const DOCUMENT_ANALYSIS_STATES=['queued','leased_before_dispatch','dispatched','completed_with_proposals','completed_unusable','discarded_source_changed','denied_after_revocation','uncertain_no_retry','failed_before_dispatch'] as const;
export type DocumentAnalysisState=typeof DOCUMENT_ANALYSIS_STATES[number];
export type DocumentAnalysisScope={accountId:string;agencyId:string;practiceId:string};
export type DocumentAnalysisConfiguration={configVersion:string;provider:string;model:string;priceVersion:string;currency:string;inputMicrosPerMillion:number;outputMicrosPerMillion:number;countMicrosPerRequest:number;maxOutputTokens:number;capMicros:number;mode:'synthetic_fixture'|'configured';transfersData:boolean;promptVersion:string;fieldContractVersion:string};
export type DocumentAnalysisProof={sourceId:string;version:number;sha256:string;sourceKind:Source['kind'];pages:number[]};
export type DocumentAnalysisSelection={sourceId:string;expectedSourceVersion:number;pages:number[]};
export type DocumentAnalysisJobBody=DocumentAnalysisSelection&{expectedRevision:number;offerId:string;approved:true};
export type DocumentAnalysisLease={jobId:string;epoch:number;token:string};
export type DocumentAnalysisPhase='count'|'generate';
export type DocumentAnalysisUsage={providerRequestId:string;inputTokens:number;outputTokens:number;countedInputTokens?:number};
export type DocumentAnalysisOffer={id:string;sourceId:string;sourceVersion:number;sourceSha256:string;sourceKind:Source['kind'];pages:number[];purpose:typeof DOCUMENT_ANALYSIS_PURPOSE;provider:string;model:string;priceVersion:string;currency:string;capMicros:number;mode:DocumentAnalysisConfiguration['mode'];transfersData:boolean;expiresAt:string;configVersion:string};
export type DocumentAnalysisJobView={id:string;sourceId:string;sourceVersion:number;sourceKind:Source['kind'];pages:number[];state:DocumentAnalysisState;version:number;capMicros:number;spentMicros:number;committedMicros:number;currency:string;createdAt:string;updatedAt:string;recordId:string|null;reason:string|null};
export type DocumentAnalysisWorkJob={id:string;scope:DocumentAnalysisScope;proof:DocumentAnalysisProof;config:DocumentAnalysisConfiguration;offerId:string;state:DocumentAnalysisState;countedInputTokens:number|null;recordId:string|null;consentReceipt:string};
export function analysisFail(code:PracticeError['code']='invalid_input'):never{throw new PracticeError(code);}
export function analysisObject(input:unknown,keys:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)analysisFail();
 const own=Reflect.ownKeys(input);if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))analysisFail();
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(input,k);if(!d||!('value'in d)||!d.enumerable)analysisFail();}
 return input as Record<string,unknown>;
}
export function analysisText(input:unknown,max=120):string{if(typeof input!=='string'||!input.trim()||input!==input.trim()||input.length>max||/[\p{Cc}\p{Cf}]/u.test(input))analysisFail();return input;}
export function analysisInteger(input:unknown,min=0,max=1_000_000_000):number{if(!Number.isSafeInteger(input)||Number(input)<min||Number(input)>max)analysisFail();return Number(input);}
export function analysisPages(input:unknown,pageCount=20):number[]{
 if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype||!input.length||input.length>20||Reflect.ownKeys(input).length!==input.length+1)analysisFail();
 const result:number[]=[];for(let i=0;i<input.length;i++){const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!('value'in d))analysisFail();result.push(analysisInteger(d.value,1,Math.min(20,pageCount)));}
 if(result.some((p,i)=>i>0&&p<=result[i-1]))analysisFail();return result;
}
export function parseDocumentAnalysisSelection(input:unknown):DocumentAnalysisSelection{const r=analysisObject(input,['sourceId','expectedSourceVersion','pages']);return {sourceId:analysisText(r.sourceId,100),expectedSourceVersion:analysisInteger(r.expectedSourceVersion,1),pages:analysisPages(r.pages)};}
export function parseDocumentAnalysisJobBody(input:unknown):DocumentAnalysisJobBody{const r=analysisObject(input,['expectedRevision','sourceId','expectedSourceVersion','pages','offerId','approved']);if(r.approved!==true)analysisFail();return {...parseDocumentAnalysisSelection({sourceId:r.sourceId,expectedSourceVersion:r.expectedSourceVersion,pages:r.pages}),expectedRevision:analysisInteger(r.expectedRevision,1),offerId:analysisText(r.offerId,100),approved:true};}
export function parseDocumentAnalysisConfiguration(input:unknown):DocumentAnalysisConfiguration{
 const r=analysisObject(input,['configVersion','provider','model','priceVersion','currency','inputMicrosPerMillion','outputMicrosPerMillion','countMicrosPerRequest','maxOutputTokens','capMicros','mode','transfersData','promptVersion','fieldContractVersion']);
 if(r.mode!=='synthetic_fixture'&&r.mode!=='configured'||typeof r.transfersData!=='boolean'||typeof r.currency!=='string'||!/^[A-Z]{3}$/u.test(r.currency))analysisFail();
 const c:DocumentAnalysisConfiguration={configVersion:analysisText(r.configVersion),provider:analysisText(r.provider),model:analysisText(r.model),priceVersion:analysisText(r.priceVersion),currency:r.currency,inputMicrosPerMillion:analysisInteger(r.inputMicrosPerMillion),outputMicrosPerMillion:analysisInteger(r.outputMicrosPerMillion),countMicrosPerRequest:analysisInteger(r.countMicrosPerRequest),maxOutputTokens:analysisInteger(r.maxOutputTokens,1,100_000),capMicros:analysisInteger(r.capMicros),mode:r.mode,transfersData:r.transfersData,promptVersion:analysisText(r.promptVersion),fieldContractVersion:analysisText(r.fieldContractVersion)};
 if(c.mode==='synthetic_fixture'?(c.provider!=='synthetic_fixture'||c.transfersData||c.capMicros!==0||c.inputMicrosPerMillion!==0||c.outputMicrosPerMillion!==0||c.countMicrosPerRequest!==0):(!c.transfersData||c.capMicros<1||c.inputMicrosPerMillion<1||c.outputMicrosPerMillion<1||c.countMicrosPerRequest>c.capMicros))analysisFail();
 return c;
}
export function analysisDigest(value:unknown):string{
 const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,canonical(x)])):v;
 return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function analysisUsage(input:DocumentAnalysisUsage,phase:DocumentAnalysisPhase):DocumentAnalysisUsage{
 const r=analysisObject(input,['providerRequestId','inputTokens','outputTokens',...(Object.hasOwn(input,'countedInputTokens')?['countedInputTokens']:[])]);
 const usage={providerRequestId:analysisText(r.providerRequestId,200),inputTokens:analysisInteger(r.inputTokens,0,2_000_000),outputTokens:analysisInteger(r.outputTokens,0,100_000),...(r.countedInputTokens!==undefined?{countedInputTokens:analysisInteger(r.countedInputTokens,0,2_000_000)}:{})};
 if(phase==='count'&&(usage.countedInputTokens===undefined||usage.inputTokens!==0||usage.outputTokens!==0)||phase==='generate'&&usage.countedInputTokens!==undefined)analysisFail();return usage;
}
export function analysisCost(config:DocumentAnalysisConfiguration,usage:DocumentAnalysisUsage,phase:DocumentAnalysisPhase='generate'):bigint{return phase==='count'?BigInt(config.countMicrosPerRequest):(BigInt(usage.inputTokens)*BigInt(config.inputMicrosPerMillion)+BigInt(usage.outputTokens)*BigInt(config.outputMicrosPerMillion)+999_999n)/1_000_000n;}
