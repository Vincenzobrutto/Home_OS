global.fetch=async()=>{throw Error('network_forbidden');};
const {PrismaCampaignLedger}=require('./quality-v3-ledger.cjs');
const {createModelAdapter}=require('./quality-v3-model.cjs');
const {runCampaign,runProgressiveCampaign}=require('./quality-v3-runner.cjs');
const {MODEL,unsupported,houseDocument,fakeTransport}=require('./quality-v3-model-fixture.cjs');
let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{raw+=chunk;});
process.stdin.on('end',async()=>{
 let ledger;
 try{
  const {options,item,action}=JSON.parse(raw);ledger=await PrismaCampaignLedger.open(options);
  const fake=fakeTransport({beforeSend:async()=>{if(action==='crash')process.exit(23);},reply:body=>JSON.stringify(body.messages).includes('Physical page 2')?houseDocument({visual:true,page:2}):unsupported()});
  const provider=createModelAdapter({transport:fake.transport,model:MODEL});
  const report=action==='partial'?await runCampaign({cases:[{...item,mode:'progressive',throughPage:1}],provider,ledger}):await runProgressiveCampaign({item,provider,ledger});
  const {ledger:ignored,...rest}=report;void ignored;process.stdout.write(JSON.stringify({providerCalls:fake.sends(),...rest}));
 }catch{process.exitCode=1;process.stderr.write('quality_model_worker_failed');}finally{if(ledger)await ledger.close();}
});
