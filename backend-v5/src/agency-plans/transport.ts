import type { PlanProviderTransport } from './provider';

export class PlanTransportError extends Error {
 constructor(readonly code:'disabled'|'invalid_request'|'unconfigured'|'auth_failed'|'rate_limited'|'unavailable'|'invalid_output'|'response_limit',readonly uncertain:boolean){super('plan_provider_'+code);}
}
/** Explicitly injected configuration only: no inherited M4 consent/key/budget.
 * Creating this port does not enable it or call the network. No automatic retry. */
export function createPlanHttpTransport(options:{enabled:()=>boolean;credential:()=>string;authorize:()=>Promise<void>;fetchImpl:typeof fetch;timeoutMs?:number}):PlanProviderTransport{
 const timeout=options.timeoutMs??90000;
 if(!Number.isSafeInteger(timeout)||timeout<1||timeout>90000||typeof options.fetchImpl!=='function')throw new PlanTransportError('invalid_request',false);
 return {post:async(endpoint,body)=>{
  if(!['messages/count_tokens','messages'].includes(endpoint))throw new PlanTransportError('invalid_request',false);
  const uncertain=endpoint==='messages';
  if(!options.enabled())throw new PlanTransportError('disabled',false);
  let encoded:string;
  try{encoded=JSON.stringify(body);if(typeof encoded!=='string'||Buffer.byteLength(encoded)>24*1024*1024)throw new Error();}catch{throw new PlanTransportError('invalid_request',false);}
  await options.authorize(); // Fresh source/grant/budget check for count AND dispatch.
  if(!options.enabled())throw new PlanTransportError('disabled',false);
  let key:string;try{key=options.credential();}catch{throw new PlanTransportError('unconfigured',false);}
  if(typeof key!=='string'||key.length<16||key.length>500||Array.from(key).some(c=>c.charCodeAt(0)<33||c.charCodeAt(0)>126))throw new PlanTransportError('unconfigured',false);
  let response:Response;
  try{response=await options.fetchImpl('https://api.anthropic.com/v1/'+endpoint,{method:'POST',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':key},body:encoded,signal:AbortSignal.timeout(Math.min(timeout,endpoint==='messages/count_tokens'?20000:90000))});}
  catch{throw new PlanTransportError('unavailable',uncertain);}
  // Never read provider error bodies: they can echo originals, prompts or keys.
  const cancel=async()=>{await response.body?.cancel().catch(()=>{});};
  if(!response.ok){await cancel();throw new PlanTransportError([401,403].includes(response.status)?'auth_failed':response.status===429?'rate_limited':'unavailable',uncertain);}
  const contentType=response.headers.get('content-type');
  if(contentType&&!contentType.toLowerCase().startsWith('application/json')){await cancel();throw new PlanTransportError('invalid_output',uncertain);}
  const length=response.headers.get('content-length');
  if(length&&(!/^\d+$/u.test(length)||Number(length)>2*1024*1024)){await cancel();throw new PlanTransportError('response_limit',uncertain);}
  if(!response.body)throw new PlanTransportError('invalid_output',uncertain);
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2*1024*1024)throw new PlanTransportError('response_limit',uncertain);chunks.push(value);}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  }catch(e){await reader.cancel().catch(()=>{});throw e instanceof PlanTransportError?e:new PlanTransportError('invalid_output',uncertain);}
  finally{reader.releaseLock();}
 }};
}
