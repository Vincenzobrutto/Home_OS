// Explicitly authorized synthetic campaign only. Never run via the test scripts.
require('reflect-metadata');
const fs=require('node:fs'),path=require('node:path'),{parseEnv}=require('node:util'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('../generated/client');
const {PrismaCampaignLedger,assertQualityDatabase}=require('./quality-v3-ledger.cjs');
const {createAuthorization,validateAuthorization,jsonHash}=require('./quality-v3-authorization.cjs');
const {createModelAdapter}=require('./quality-v3-model.cjs');
const {runCampaign,runProgressiveCampaign}=require('./quality-v3-runner.cjs');
const {AnthropicTransport}=require('../dist/review/anthropic');
const {load}=require('./corpus-v3/corpus.cjs');
const {detailed}=require('./quality-v3-measures.cjs');
const CAMPAIGN='fase0-quality-v3-20261022-synthetic-01',MODEL='claude-sonnet-5-5';
function write(file,value){const fd=fs.openSync(file,'w');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function audit(file,value){const fd=fs.openSync(file,'a');try{fs.writeFileSync(fd,JSON.stringify({at:new Date().toISOString(),...value})+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function compile(rows,auth,completed,reason){
 const corpus=load().cases,dimensions={},pairs=[],base=rows.filter(r=>r.id.split(':')[3]==='full'),costByMode={};let unsafe=0,automatic=0,valid=0,critical=0;
 for(const c of corpus){const entries=[];for(const run of [1,2]){
  const row=base.find(r=>r.id.split(':')[1]===c.id&&Number(r.id.split(':')[2])===run),ok=row?.state==='settled'&&row.observation?.failureCode===null;
  const measured=row?.score??detailed(c.gold,null,'review');entries.push(ok?row:null);if(ok)valid++;
  if(row?.observation?.automatic==='complete'){automatic++;if(row.score?.criticalAutomaticErrors>0)unsafe++;}critical+=row?.score?.criticalAutomaticErrors??0;
  for(const [name,m] of Object.entries(measured.measures??{})){const total=dimensions[name]??={correct:0,total:0};total.correct+=name==='difficultReview'&&!ok?0:m.correct;total.total+=m.total;}
 }
  pairs.push({id:c.id,available:entries.every(Boolean),sameDecision:entries.every(Boolean)&&entries[0].observation.automatic===entries[1].observation.automatic,sameCanonical:entries.every(Boolean)&&entries[0].score.canonicalFingerprint===entries[1].score.canonicalFingerprint});
 }
 for(const row of rows){const mode=row.id.split(':')[3],cost=costByMode[mode]??={calls:0,settled:0,actualMicroUsd:0,uncertainReservedMicroUsd:0,sentPages:0};cost.calls++;if(row.state==='settled'){cost.settled++;cost.actualMicroUsd+=row.costMicroUsd;}else cost.uncertainReservedMicroUsd+=row.reserveMicroUsd;cost.sentPages+=row.observation?.reading.sentPages.length??0;}
 const criteria=[];for(const [name,threshold] of [['documentKind',.9],['objectType',.9],['labelBrandModel',.9],['expenseAmountCents',.95],['expenseDate',.95],['expenseSupplier',.9],['professionalVatId',.95],['difficultReview',1]]){const m=dimensions[name]??{correct:0,total:0};criteria.push({name,threshold,...m,rate:m.total?m.correct/m.total:null,passed:m.total>0&&m.correct/m.total>=threshold});}
 criteria.push({name:'criticalAutomaticErrors',count:critical,passed:critical===0},{name:'automaticCorrectness',correct:automatic-unsafe,total:automatic,rate:automatic?(automatic-unsafe)/automatic:null,passed:automatic>0&&unsafe===0},{name:'decisionStability',correct:pairs.filter(p=>p.sameDecision).length,total:52,rate:pairs.filter(p=>p.sameDecision).length/52,threshold:.9,passed:pairs.filter(p=>p.sameDecision).length/52>=.9});
 const actualMicroUsd=rows.reduce((n,r)=>n+(r.state==='settled'?r.costMicroUsd:0),0),uncertainReservedMicroUsd=rows.reduce((n,r)=>n+(r.state==='settled'?0:r.reserveMicroUsd),0);
 return{campaignId:CAMPAIGN,authorizationHash:jsonHash(auth),planHash:auth.planSha256,model:MODEL,state:reason??'complete',completedTasks:completed,plannedTasks:auth.plan.tasks.length,plannedMaxMessages:auth.plan.maxMessageCalls,calls:rows.length,settled:rows.filter(r=>r.state==='settled').length,uncertain:rows.filter(r=>r.state==='uncertain').length,actualMicroUsd,uncertainReservedMicroUsd,committedMicroUsd:actualMicroUsd+uncertainReservedMicroUsd,budgetMicroUsd:auth.budgetMicroUsd,maxCalls:auth.maxCalls,validBaselineExecutions:valid,dimensions,criteria,automaticExecutions:automatic,unsafeAutomaticExecutions:unsafe,automaticShare:automatic/104,pairs,costByMode,gatePassed:!reason&&completed===auth.plan.tasks.length&&criteria.every(c=>c.passed),results:rows};
}
async function main(){
 const [action,folder]=process.argv.slice(2);if(!['prepare','run','report'].includes(action)||!folder)throw Error('explicit_live_action_and_work_directory_required');
 const root=path.resolve(folder);fs.mkdirSync(root,{recursive:true});const databaseUrl=process.env.QUALITY_V3_DATABASE_URL;assertQualityDatabase(databaseUrl);if(new URL(databaseUrl).pathname!=='/dimora_v5_quality_v3_campaign')throw Error('live_database_required');
 const authFile=path.join(root,'authorization.json');
 if(action==='prepare'&&!fs.existsSync(authFile))write(authFile,createAuthorization(CAMPAIGN,MODEL));
 if(!fs.existsSync(authFile))throw Error('authorization_receipt_required');const auth=JSON.parse(fs.readFileSync(authFile,'utf8'));
 validateAuthorization(auth,{campaignId:CAMPAIGN,model:MODEL,maxCalls:150,budgetMicroUsd:12000000});
 const db=new PrismaClient({datasources:{db:{url:databaseUrl}}});let ledger;
 try{
  const email='fase0-quality-v3-20261022@example.test';let account=await db.account.findUnique({where:{email}});if(!account)account=await db.account.create({data:{email,name:'Synthetic AI quality campaign',passwordHash:'not-a-login'}});
  let home=await db.home.findFirst({where:{name:'SYNTHETIC QUALITY V3',memberships:{some:{accountId:account.id}}}});if(!home)home=await db.home.create({data:{name:'SYNTHETIC QUALITY V3',address:'Synthetic only',memberships:{create:{accountId:account.id,role:'owner'}}}});
  const cases=[];for(const c of load().cases){let doc=await db.document.findFirst({where:{homeId:home.id,uploaderId:account.id,name:c.id},include:{original:true}});if(!doc)doc=await db.document.create({data:{homeId:home.id,uploaderId:account.id,name:c.id,visibility:'private',original:{create:{originalFilename:path.basename(c.path),mimeType:c.mimeType,sha256:c.sha256,byteSize:c.bytes.length,file:{create:{storageKey:'synthetic-campaign-'+randomUUID()}}}}},include:{original:true}});if(doc.original?.sha256!==c.sha256)throw Error('existing_source_mismatch');cases.push({id:c.id,gold:c.gold,sha256:c.sha256,documentId:doc.id,documentVersion:1,pages:[]});}
  write(path.join(root,'scope.json'),{campaignId:CAMPAIGN,accountId:account.id,homeId:home.id,documents:cases.map(c=>({id:c.id,documentId:c.documentId,sha256:c.sha256}))});
  ledger=await PrismaCampaignLedger.open({databaseUrl,campaignId:CAMPAIGN,accountId:account.id,homeId:home.id,model:MODEL,maxCalls:150,budgetMicroUsd:12000000,execution:'live',authorization:auth});
  if(action==='prepare'){console.log(JSON.stringify({state:'prepared',campaignId:CAMPAIGN,authorizationHash:jsonHash(auth),maxMessages:auth.plan.maxMessageCalls,syntheticCases:cases.length}));return;}
  const checkpointFile=path.join(root,'checkpoint.json'),old=fs.existsSync(checkpointFile)?JSON.parse(fs.readFileSync(checkpointFile,'utf8')):{completedTasks:0};let completed=old.completedTasks??0,reason=null;
  let rows=await ledger.entries();if(rows.some(r=>r.state==='uncertain'))reason='halted_uncertain';
  if(action==='run'&&!reason){
   const config=parseEnv(fs.readFileSync(path.resolve(__dirname,'../.env'),'utf8'));if(config.ONBOARDING_AI_MODEL!==MODEL||!config.ANTHROPIC_API_KEY?.trim())throw Error('configured_model_or_key_unavailable');
   const transport=new AnthropicTransport({headers:()=>({'x-api-key':config.ANTHROPIC_API_KEY.trim(),'anthropic-version':'2023-06-01','content-type':'application/json',...(config.ANTHROPIC_WORKSPACE_ID?.trim()?{'anthropic-workspace-id':config.ANTHROPIC_WORKSPACE_ID.trim()}:{})})});
   const realFetch=transport.fetchImpl;let current=null;
   transport.fetchImpl=async(url,init)=>{const u=new URL(url),endpoint=u.pathname.startsWith('/v1/models/')?'models':u.pathname==='/v1/messages/count_tokens'?'count_tokens':u.pathname==='/v1/messages'?'messages':null;if(u.origin!=='https://api.anthropic.com'||!endpoint)throw Error('provider_destination_forbidden');const record={task:current,endpoint};audit(path.join(root,'http-audit.jsonl'),{...record,phase:'dispatch'});try{const r=await realFetch(url,{...init,redirect:'error'});const id=r.headers.get('request-id');audit(path.join(root,'http-audit.jsonl'),{...record,phase:'response',status:r.status,requestId:id&&/^req_[A-Za-z0-9_-]{1,190}$/.test(id)?id:null});return r;}catch{audit(path.join(root,'http-audit.jsonl'),{...record,phase:'uncertain'});throw Error('provider_network_outcome_unknown');}};
   const provider=createModelAdapter({transport,model:MODEL});
   for(let index=completed;index<auth.plan.tasks.length;index++){
    const task=auth.plan.tasks[index],item={...cases.find(c=>c.id===task.id),run:task.run,mode:task.mode};current=task;
    const report=task.mode==='progressive'?await runProgressiveCampaign({item,provider,ledger}):await runCampaign({cases:[item],provider,ledger});
    rows=await ledger.entries();if(rows.some(r=>r.state==='uncertain'))reason='halted_uncertain';else if(report.progressive&&['ai_budget_exhausted','ai_evaluation_limit_reached'].includes(report.progressive.reason))reason=report.progressive.reason;
    if(!reason)completed=index+1;write(checkpointFile,{campaignId:CAMPAIGN,completedTasks:completed,reason});const snapshot=compile(rows,auth,completed,reason);write(path.join(root,'results.json'),snapshot);console.log(JSON.stringify({task,index:index+1,calls:snapshot.calls,settled:snapshot.settled,uncertain:snapshot.uncertain,actualUsd:(snapshot.actualMicroUsd/1e6).toFixed(6),reservedUncertainUsd:(snapshot.uncertainReservedMicroUsd/1e6).toFixed(6),reason}));if(reason)break;
   }
  }
  rows=await ledger.entries();const result=compile(rows,auth,completed,reason??(completed<auth.plan.tasks.length?'not_completed':null));write(path.join(root,'results.json'),result);console.log(JSON.stringify({state:result.state,calls:result.calls,settled:result.settled,uncertain:result.uncertain,actualUsd:(result.actualMicroUsd/1e6).toFixed(6),committedUsd:(result.committedMicroUsd/1e6).toFixed(6),gatePassed:result.gatePassed}));
  if(result.uncertain)process.exitCode=2;
 }finally{if(ledger)await ledger.close();await db.$disconnect();}
}
if(require.main===module)main().catch(()=>{console.error('quality_live_stopped; inspect durable ledger and safe audit metadata; no automatic retry');process.exitCode=1;});
module.exports={compile};
