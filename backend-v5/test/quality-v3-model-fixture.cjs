// HTTP responses in memory; this fetch implementation never opens a socket.
const {AnthropicTransport}=require('../dist/review/anthropic');
const MODEL='claude-sonnet-5-5';
const unsupported=()=>({documentKind:'unsupported',documentInfo:[],facts:[],items:[],hasMoreItems:false,requiresHumanReview:true,purchaseTotal:[],houseExpenses:[],sources:[]});
function houseDocument({page=1,visual=false,title='Planimetria catastale sintetica'}={}){
 return{...unsupported(),documentKind:'house_document',requiresHumanReview:false,documentInfo:[{kind:'floor_plan',title,evidence:0}],sources:[{page,excerpt:title,region:visual?{x:.1,y:.1,width:.6,height:.1}:null}]};
}
function fakeTransport(options={}){
 const requests=[],transport=new AnthropicTransport({headers:()=>({'x-api-key':'offline-placeholder'})});
 transport.fetchImpl=async(url,init)=>{
  const endpoint=new URL(url).pathname.replace('/v1/',''),body=init.body?JSON.parse(init.body):null;
  requests.push({endpoint,body});
  if(endpoint.startsWith('models/'))return new Response(JSON.stringify({id:options.metadataModel??MODEL}));
  if(endpoint==='messages/count_tokens'){await options.beforeCount?.();return new Response(JSON.stringify({input_tokens:700}));}
  if(endpoint!=='messages')throw Error('unexpected offline endpoint');
  await options.beforeSend?.();
  const reply=await (options.reply??unsupported)(body,requests.filter(r=>r.endpoint==='messages').length);
  return new Response(JSON.stringify({id:'msg_offline',model:MODEL,stop_reason:options.stopReason??'end_turn',content:[{type:'text',text:options.invalidJson?'INVALID':JSON.stringify(reply)}],usage:{input_tokens:600,output_tokens:80,cache_creation_input_tokens:100,...options.usage}}));
 };
 return{transport,requests,sends:()=>requests.filter(r=>r.endpoint==='messages').length};
}
module.exports={MODEL,unsupported,houseDocument,fakeTransport};
