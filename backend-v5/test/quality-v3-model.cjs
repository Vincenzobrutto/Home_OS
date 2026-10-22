// No default transport, credentials or environment. Tests inject HTTP responses.
require('reflect-metadata');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
const {PdfTextExtractor}=require('../dist/review/pdf-text');
const {ProviderFailure}=require('../dist/review/provider');
const {onboardingUsageCost}=require('../dist/review/anthropic');
const {MODEL_PRICES}=require('../dist/review/ai-config');
const {automaticPlan,AutomaticReviewNeeded}=require('../dist/object-onboarding/automatic-plan');
const {progressiveComplete,ONBOARDING_READING_VERSION}=require('../dist/object-onboarding/reading');
const {load}=require('./corpus-v3/corpus.cjs');
const MODEL_ADAPTER_VERSION='quality-v3-model-v1';
function checkedObservation(value){
 if(!value||value.version!==MODEL_ADAPTER_VERSION||typeof value.complete!=='boolean'||!['review','complete'].includes(value.automatic)||![null,'analysis_invalid_output','analysis_authorization_lost'].includes(value.failureCode))throw new ProviderFailure('analysis_invalid_output');
 const r=value.reading,u=value.usage;
 if(!r||r.version!==ONBOARDING_READING_VERSION||!['full','local_pages','progressive'].includes(r.mode)||!Number.isSafeInteger(r.totalPages)||r.totalPages<1||r.totalPages>20||!Array.isArray(r.sentPages)||!r.sentPages.length||r.sentPages.some((p,i)=>!Number.isSafeInteger(p)||p<1||p>r.totalPages||(i>0&&p<=r.sentPages[i-1]))||!u||['input','output','uncachedInput','cacheCreation','cacheRead'].some(k=>!Number.isSafeInteger(u[k])||u[k]<0)||u.input>50000||u.output>4096||u.input!==u.uncachedInput+u.cacheCreation+u.cacheRead||value.failureCode&&(value.complete||value.automatic!=='review'))throw new ProviderFailure('analysis_invalid_output');
 return{version:MODEL_ADAPTER_VERSION,complete:value.complete,automatic:value.automatic,failureCode:value.failureCode,reading:{version:r.version,mode:r.mode,totalPages:r.totalPages,sentPages:[...r.sentPages]},usage:{input:u.input,output:u.output,uncachedInput:u.uncachedInput,cacheCreation:u.cacheCreation,cacheRead:u.cacheRead}};
}
function createModelAdapter({transport,model,parser=new PdfTextExtractor()}){
 if(!transport||typeof transport.prepareStructured!=='function'||typeof transport.send!=='function'||!MODEL_PRICES[model])throw new ProviderFailure('ai_provider_disabled');
 const corpus=new Map(load().cases.map(c=>[c.id,c])),provider=new ObjectOnboardingAnthropicProvider(parser,transport);
 const source=item=>{const c=corpus.get(item.id);if(!c||c.sha256!==item.sha256||item.documentVersion!==1||!item.documentId)throw new ProviderFailure('storage_unavailable');return c;};
 const adapter=async(item,context)=>{
  if(!context||context.model!==model||typeof context.authorize!=='function'||!Number.isSafeInteger(context.reserveMicroUsd))throw new ProviderFailure('ai_provider_disabled');
  const c=source(item),signal=context.signal??new AbortController().signal;
  const authorize=async(afterResponse=false)=>{if(signal.aborted)throw new ProviderFailure('analysis_timeout');await context.authorize({afterResponse});};
  await authorize();
  const prepared=await provider.prepare({bytes:c.bytes,mimeType:c.mimeType,snapshot:{documentId:item.documentId,documentVersion:1,documentSha256:c.sha256}},model,signal,authorize,'products',{mode:item.mode??'full',...(item.throughPage?{throughPage:item.throughPage}:{})});
  await authorize();
  const response=await transport.send(prepared.request,signal);
  const {cost,usage}=onboardingUsageCost(response,model,MODEL_PRICES[model]);
  if(cost>context.reserveMicroUsd)throw new ProviderFailure('analysis_invalid_output');
  let output=null,automatic='review',complete=false,failureCode=null;
  try{
   output=provider.decode(response,prepared).output;
   try{automaticPlan(output);automatic='complete';}catch(error){if(!(error instanceof AutomaticReviewNeeded))throw error;}
   complete=progressiveComplete(output);
  }catch{output=null;automatic='review';complete=false;failureCode='analysis_invalid_output';}
  try{await authorize(true);}catch{output=null;automatic='review';complete=false;failureCode='analysis_authorization_lost';}
  // A received/priceable invalid output still has a known charge. Settle that
  // charge, report failure and stop; never retry it or certify it as complete.
  return{state:'settled',costMicroUsd:cost,output,automatic,pages:prepared.context.kind==='text'?prepared.context.pages:[],observation:checkedObservation({version:MODEL_ADAPTER_VERSION,complete,automatic,failureCode,reading:prepared.reading,usage})};
 };
 adapter.protocol=MODEL_ADAPTER_VERSION;adapter.pageCount=item=>source(item).pages;
 return adapter;
}
module.exports={createModelAdapter,checkedObservation,MODEL_ADAPTER_VERSION};
