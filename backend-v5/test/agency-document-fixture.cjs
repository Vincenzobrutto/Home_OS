// Internal synthetic test port only. Nothing in src/ imports this helper.
const {randomUUID}=require('node:crypto');
const {DOCUMENT_PROMPT_VERSION,DOCUMENT_FIELD_CONTRACT_VERSION}=require('../dist/agency-document-analysis/provider-port');
function syntheticDocumentConfiguration(){return {configVersion:'synthetic-document-test-v1',provider:'synthetic_fixture',model:'hash-bound-synthetic-v1',priceVersion:'zero-fixture-v1',currency:'USD',inputMicrosPerMillion:0,outputMicrosPerMillion:0,countMicrosPerRequest:0,maxOutputTokens:1000,capMicros:0,mode:'synthetic_fixture',transfersData:false,promptVersion:DOCUMENT_PROMPT_VERSION,fieldContractVersion:DOCUMENT_FIELD_CONTRACT_VERSION};}
/** manifest: [{sha256, sourceKind, pages?:number[], candidates:[]}]. Exact bytes hash is mandatory. */
function createHashBoundDocumentProvider(manifest){
 const namespace=randomUUID();let sequence=0;const calls=[];
 function selected(request){const row=manifest.find(row=>row.sha256===request.proof.sha256&&row.sourceKind===request.proof.sourceKind&&(!row.pages||JSON.stringify(row.pages)===JSON.stringify(request.proof.pages)));if(!row||request.text.sha256!==row.sha256||request.config.mode!=='synthetic_fixture'||request.config.transfersData)throw Error('synthetic_fixture_unsupported');return row;}
 return {calls,available:()=>true,async count(request){selected(request);calls.push({phase:'count',sha256:request.proof.sha256,pages:[...request.proof.pages]});return {providerRequestId:'synthetic-count-'+namespace+'-'+(++sequence),inputTokens:0,outputTokens:0,countedInputTokens:20};},async generate(request){const row=selected(request);calls.push({phase:'generate',sha256:request.proof.sha256,pages:[...request.proof.pages]});return {proposal:{candidates:structuredClone(row.candidates)},usage:{providerRequestId:'synthetic-generation-'+namespace+'-'+(++sequence),inputTokens:20,outputTokens:10}};}};
}
module.exports={syntheticDocumentConfiguration,createHashBoundDocumentProvider};
