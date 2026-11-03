import {parseDocumentAnalysisConfiguration,type DocumentAnalysisConfiguration} from './domain';
import {createAnthropicDocumentProvider,DOCUMENT_FIELD_CONTRACT_VERSION,DOCUMENT_PROMPT_VERSION,type DocumentAnalysisProvider} from './provider-port';
export type DocumentAnalysisRuntime={config:DocumentAnalysisConfiguration|null;provider:DocumentAnalysisProvider|null;autoStart:boolean;pollIntervalMs:number;concurrency:number};
export const DOCUMENT_ANALYSIS_RUNTIME=Symbol('AgencyDocumentAnalysisRuntime');
/** No inherited plan budget, key, model or prices. Invalid/missing configuration stays disabled. */
export function documentAnalysisRuntimeFromEnvironment(env:NodeJS.ProcessEnv=process.env):DocumentAnalysisRuntime{
 const disabled:DocumentAnalysisRuntime={config:null,provider:null,autoStart:false,pollIntervalMs:2000,concurrency:1};
 if(env.DIMORA_AGENCY_DOCUMENT_ANALYSIS_ENABLED!=='1'||!env.DIMORA_AGENCY_DOCUMENT_ANALYSIS_CONFIG||!env.DIMORA_AGENCY_STORAGE_ROOT)return disabled;
 try{
  const config=parseDocumentAnalysisConfiguration(JSON.parse(env.DIMORA_AGENCY_DOCUMENT_ANALYSIS_CONFIG));
  if(config.mode!=='configured'||config.provider!=='anthropic'||config.promptVersion!==DOCUMENT_PROMPT_VERSION||config.fieldContractVersion!==DOCUMENT_FIELD_CONTRACT_VERSION)return disabled;
  const provider=createAnthropicDocumentProvider({credential:()=>env.DIMORA_AGENCY_DOCUMENT_ANALYSIS_API_KEY??'',fetchImpl:fetch});
  if(!provider.available())return disabled;
  return {config,provider,autoStart:true,pollIntervalMs:2000,concurrency:1};
 }catch{return disabled;}
}
