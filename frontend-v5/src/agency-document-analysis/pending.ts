import {analysisBody,analysisKey,type AnalysisBody,type AnalysisScope} from './api';
export type PendingAnalysis={key:string;body:AnalysisBody};
const prefix='dimora.document-analysis.pending.';
const storageKey=(scope:AnalysisScope)=>prefix+JSON.stringify([scope.accountId,scope.agencyId,scope.practiceId]);
export function clearPendingAnalysis(scope:AnalysisScope){try{sessionStorage.removeItem(storageKey(scope));}catch{/* No credentials or document content are stored. */}}
export function purgePendingAnalyses(accountId:string|null){try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(!key?.startsWith(prefix))continue;let owner:unknown;try{const scope:unknown=JSON.parse(key.slice(prefix.length));owner=Array.isArray(scope)?scope[0]:null;}catch{owner=null;}if(accountId===null||owner!==accountId)sessionStorage.removeItem(key);}}catch{/* A blocked browser store cannot retain a new request. */}}
export function loadPendingAnalysis(scope:AnalysisScope):PendingAnalysis|null{
 try{purgePendingAnalyses(scope.accountId);const raw=sessionStorage.getItem(storageKey(scope));if(!raw)return null;const value:unknown=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!('key'in value)||!('body'in value))throw Error();return {key:analysisKey(value.key),body:analysisBody(value.body)};}catch{clearPendingAnalysis(scope);return null;}
}
export function savePendingAnalysis(scope:AnalysisScope,pending:PendingAnalysis){sessionStorage.setItem(storageKey(scope),JSON.stringify({key:analysisKey(pending.key),body:analysisBody(pending.body)}));}
