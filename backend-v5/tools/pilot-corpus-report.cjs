// No network: materializes hashes and optionally scores an existing local observation file.
const {readFile}=require('node:fs/promises');
const {cases,materialize,score}=require('../test/pilot-corpus.cjs');
async function main(){
  const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--observations'))throw Error('invalid_arguments');
  const observations=args.length?JSON.parse(await readFile(args[1],'utf8')):null;
  if(observations&&(!Array.isArray(observations)||new Set(observations.map(o=>o.caseId)).size!==observations.length||observations.some(o=>!cases.some(c=>c.id===o.caseId))))throw Error('invalid_observations');
  const report={format:'dimora-v5-pilot-corpus-v1',synthetic:true,providerCalled:false,providerAccuracy:observations?'see_per_case_scores':null,requiresIndependentAnnotationReview:true,cases:[]};
  for(const item of cases){const fixture=await materialize(item);report.cases.push({id:item.id,group:item.group,sha256:fixture.sha256,byteSize:fixture.bytes.length,format:fixture.format,expectedOutcome:item.outcome,expectedFacts:item.facts,absentFields:item.absent,...(observations?{score:score(item,observations.find(o=>o.caseId===item.id))}:{})});}
  console.log(JSON.stringify(report,null,2));
  if(observations&&report.cases.some(c=>c.score.missingObservation))process.exitCode=1;
}
main().catch(()=>{console.error('Corpus report non completato: controllare argomenti o annotazioni locali. Nessuna richiesta inviata.');process.exitCode=1;});
