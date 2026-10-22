// Pure evaluator for validated object-onboarding observations. It never calls a
// provider, opens a database, or treats an unverified citation as correct.
const normalize=value=>String(value??'').normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase('it');
const {detailed,identityMatch}=require('./quality-v3-measures.cjs');
function cited(source,pages){return !!source&&Number.isSafeInteger(source.page)&&source.page>=1&&source.page<=pages.length&&typeof source.excerpt==='string'&&normalize(pages[source.page-1]).includes(normalize(source.excerpt));}
function field(item,key){return item?.fields?.[key]?.value??null;}
function metrics(gold,observation,pages=[]){
 const output=observation?.output??null,plan=observation?.automatic??'review';
 const totals={correct:0,wrong:0,missing:0,invented:0,criticalAutomaticErrors:0};
 const compare=(expected,actual,automatic=false)=>{if(expected==null){if(actual!=null){totals.wrong++;if(automatic)totals.criticalAutomaticErrors++;}return;}if(actual==null){totals.missing++;return;}if(normalize(expected)===normalize(actual))totals.correct++;else{totals.wrong++;if(automatic)totals.criticalAutomaticErrors++;}};
 const type=output?.documentKind??null;compare(gold.documentKind,type,plan==='complete');
 const actualItems=output?.items??[],used=new Set();
 for(const expected of gold.items??[]){let index=actualItems.findIndex((item,i)=>!used.has(i)&&identityMatch(expected,item));if(index<0){totals.missing+=4;continue;}const item=actualItems[index];used.add(index);
  for(const [key,goldKey] of [['name','name'],['brand','brand'],['model','model']])compare(expected[goldKey]??null,field(item,key),plan==='complete'&&key!=='name');
  compare(expected.type??null,item.objectType?.value??null,plan==='complete');compare(expected.typeCertain===true?true:null,item.objectType?.certainty==='certain'?true:null,plan==='complete');
  compare(expected.quantity??null,item.quantity?.value??null,plan==='complete');
  const itemSources=[...Object.values(item.fields??{}).map(x=>x?.source).filter(Boolean),...(item.objectType?.source?[item.objectType.source]:[]),...(item.quantity?.source?[item.quantity.source]:[])];
  if(itemSources.some(source=>!cited(source,pages))){totals.invented++;if(plan==='complete')totals.criticalAutomaticErrors++;}
 }
  actualItems.forEach((_,i)=>{if(!used.has(i)){totals.wrong+=4;if(plan==='complete')totals.criticalAutomaticErrors++;}});
 const actualExpenses=[];
 for(const e of output?.houseExpenses??[]){const candidate=e.amountCandidates?.find(x=>x.role==='current_document_total');actualExpenses.push({amountCents:candidate?.amountCents??null,date:e.proposedFields?.documentDate?.value??null,supplier:e.proposedFields?.supplier?.value??null,period:e.proposedFields?.competenceFrom&&e.proposedFields?.competenceTo?[e.proposedFields.competenceFrom.value,e.proposedFields.competenceTo.value]:null,sources:[...(candidate?.sources??[]),...(e.proposedFields?.documentDate?.sources??[]),...(e.proposedFields?.supplier?.sources??[])]});}
 for(const item of output?.items??[]){const amount=item.purchaseAmount?.amountCents??(output.items.length===1?output.purchaseTotal?.amountCents:null);if(amount!=null)actualExpenses.push({amountCents:amount,date:item.fields?.purchaseDate?.value??null,supplier:null,period:null,sources:[...(item.purchaseAmount?.source?[item.purchaseAmount.source]:[]),...(item.fields?.purchaseDate?.source?[item.fields.purchaseDate.source]:[])]});}
 const expenseUsed=new Set();for(const expected of gold.expenses??[]){const i=actualExpenses.findIndex((a,n)=>!expenseUsed.has(n)&&a.amountCents===expected.amountCents);if(i<0){totals.missing+=4;continue;}expenseUsed.add(i);const e=actualExpenses[i];for(const key of ['amountCents','date','supplier','period'])compare(expected[key]??null,e[key],plan==='complete');if(e.sources.some(source=>!cited(source,pages))){totals.invented++;if(plan==='complete')totals.criticalAutomaticErrors++;}}
  actualExpenses.forEach((_,i)=>{if(!expenseUsed.has(i)){totals.wrong+=4;if(plan==='complete')totals.criticalAutomaticErrors++;}});
 for(const c of gold.contacts??[]){const found=(output?.contacts??[]).find(x=>normalize(x.values?.name)===normalize(c.name));compare(c.name,found?.values?.name??null,false);compare(c.vatId,found?.values?.fiscalId??null,false);if(found&&Object.values(found.sources??{}).some(source=>!cited(source,pages)))totals.invented++;}
 const expectedAutomatic=gold.automatic==='complete'?'complete':'review';if(plan!==expectedAutomatic){totals.wrong++;if(plan==='complete')totals.criticalAutomaticErrors++;}
 const detail=detailed(gold,output,plan,pages);
 return {...totals,...detail,criticalAutomaticErrors:Math.max(totals.criticalAutomaticErrors,detail.detailedCriticalErrors),automatic:plan,expectedAutomatic,costUsd:observation?.costUsd??null,stable:observation?.secondRun===undefined?null:JSON.stringify(observation.canonical)===JSON.stringify(observation.secondRun)};
}
function aggregate(rows){const sum=rows.reduce((a,r)=>{for(const k of ['correct','wrong','missing','invented','criticalAutomaticErrors'])a[k]+=r[k];a.costUsd+=r.costUsd??0;if(r.stable!==null){a.stabilityDenominator++;if(r.stable)a.stabilityMatches++;}return a;},{correct:0,wrong:0,missing:0,invented:0,criticalAutomaticErrors:0,costUsd:0,stabilityMatches:0,stabilityDenominator:0});return {...sum,stability:sum.stabilityDenominator?sum.stabilityMatches/sum.stabilityDenominator:null};}
module.exports={metrics,aggregate,cited};
