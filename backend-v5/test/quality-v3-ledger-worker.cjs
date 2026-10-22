// Test child: JSON configuration on stdin, synthetic data only. No AI transport.
global.fetch=async()=>{throw new Error('network_forbidden');};
const {PrismaCampaignLedger}=require('./quality-v3-ledger.cjs');
const {runCampaign}=require('./quality-v3-runner.cjs');
let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{raw+=chunk;});
process.stdin.on('end',async()=>{
 let ledger;
 try{
  const {options,cases,action}=JSON.parse(raw);ledger=await PrismaCampaignLedger.open(options);let calls=0;
  const report=await runCampaign({cases,ledger,provider:async()=>{calls++;if(action==='crash')process.exit(23);return{state:'settled',costMicroUsd:1000,output:{documentKind:'unsupported',items:[],houseExpenses:[],needsReview:true},automatic:'review'};}});
  const {ledger:ignored,...summary}=report;void ignored;
  process.stdout.write(JSON.stringify({providerCalls:calls,...summary}));
 }catch{process.exitCode=1;process.stderr.write('quality_worker_failed');}finally{if(ledger)await ledger.close();}
});
