// Frozen field-level measures for the live campaign; no source/model text saved.
const {createHash}=require('node:crypto');
const VERSION='quality-v3-measures-v1';
const norm=x=>String(x??'').normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase('it');
const field=(i,k)=>i?.fields?.[k]?.value??null;
const same=(a,b)=>norm(a)===norm(b);
const identityMatch=(g,a)=>same(g.name,field(a,'name'))||!!(g.brand&&g.model&&same(g.brand,field(a,'brand'))&&same(g.model,field(a,'model')))||!!(field(a,'name')&&norm(field(a,'name')).length>=5&&norm(g.name).includes(norm(field(a,'name'))));
function detailed(gold,output,automatic,pages=[]){
 const measures={},critical=new Set(),extras={objects:0,expenses:0,professionals:0},count=(key,ok)=>{const m=measures[key]??={correct:0,total:0};m.total++;if(ok)m.correct++;};
 const auto=automatic==='complete',items=output?.items??[],used=new Set();
 count('documentKind',same(gold.documentKind,output?.documentKind));
 for(const [index,g] of (gold.items??[]).entries()){
  let i=items.findIndex((a,n)=>!used.has(n)&&(same(g.name,field(a,'name'))||g.brand&&g.model&&same(g.brand,field(a,'brand'))&&same(g.model,field(a,'model'))));
  if(i<0)i=items.findIndex((_,n)=>!used.has(n));const a=i<0?null:items[i];if(i>=0)used.add(i);
  const identity=!!a&&(same(g.name,field(a,'name'))||g.brand&&g.model&&same(g.brand,field(a,'brand'))&&same(g.model,field(a,'model'))||field(a,'name')&&norm(g.name).includes(norm(field(a,'name'))));
  count('objectIdentity',!!identity);if(auto&&!identity)critical.add('identity:'+index);
  for(const k of ['brand','model','quantity','powerWatts'])if(g[k]!=null){const actual=k==='quantity'?a?.quantity?.value:field(a,k);const ok=same(g[k],actual);count(k,ok);if(auto&&!ok)critical.add(k+':'+index);}
  const typeOk=same(g.type,a?.objectType?.value);count('objectType',typeOk);count('objectTypeSafe',typeOk||a?.objectType?.certainty==='uncertain');if(auto&&!typeOk&&a?.objectType?.certainty==='certain')critical.add('type:'+index);
  if(gold.documentKind==='device_label'){for(const k of ['brand','model'])if(g[k]!=null)count('label'+k[0].toUpperCase()+k.slice(1),same(g[k],field(a,k)));count('labelBrandModel',!!a&&['brand','model'].every(k=>g[k]==null||same(g[k],field(a,k))));}
 }
 extras.objects=items.filter((_,i)=>!used.has(i)).length;
 const expenses=[];
 for(const e of output?.houseExpenses??[]){const total=e.amountCandidates?.filter(c=>c.role==='current_document_total');expenses.push({amountCents:total?.length===1?total[0].amountCents:null,date:e.proposedFields?.documentDate?.value??null,supplier:e.proposedFields?.supplier?.value??null,period:e.proposedFields?.competenceFrom&&e.proposedFields?.competenceTo?[e.proposedFields.competenceFrom.value,e.proposedFields.competenceTo.value]:null});}
 for(const i of items){const amount=i.purchaseAmount?.amountCents??(items.length===1?output.purchaseTotal?.amountCents:null);if(amount!=null)expenses.push({amountCents:amount,date:field(i,'purchaseDate'),supplier:null,period:null});}
 const usedExpenses=new Set();for(const [index,g] of (gold.expenses??[]).entries()){
  let i=expenses.findIndex((a,n)=>!usedExpenses.has(n)&&a.amountCents===g.amountCents&&(g.supplier==null||same(g.supplier,a.supplier)));if(i<0)i=expenses.findIndex((_,n)=>!usedExpenses.has(n));if(i>=0)usedExpenses.add(i);const a=expenses[i];
  for(const k of ['amountCents','date','supplier','period'])if(g[k]!=null){const ok=same(g[k],a?.[k]);count('expense'+k[0].toUpperCase()+k.slice(1),ok);if(auto&&!ok)critical.add('expense:'+index+':'+k);}
 }
 extras.expenses=expenses.filter((_,i)=>!usedExpenses.has(i)).length;
 const contacts=output?.contacts??[],usedContacts=new Set();for(const [index,g] of (gold.contacts??[]).entries()){
  let i=contacts.findIndex((a,n)=>!usedContacts.has(n)&&(same(g.name,a.values?.name)||g.vatId&&same(g.vatId,a.values?.fiscalId)));if(i<0)i=contacts.findIndex((_,n)=>!usedContacts.has(n));if(i>=0)usedContacts.add(i);const a=contacts[i];
  for(const [key,actual] of [['name',a?.values?.name],['vatId',a?.values?.fiscalId]])if(g[key]!=null){const ok=same(g[key],actual);count('professional'+(key==='name'?'Name':'VatId'),ok);if(auto&&!ok)critical.add('professional:'+index+':'+key);}
 }
 extras.professionals=contacts.filter((_,i)=>!usedContacts.has(i)).length;
 if(auto)for(const [k,n] of Object.entries(extras))if(n)critical.add('unexpected:'+k);
 let unverifiedVisual=0,badText=0;const seen=new Set();
 function proofs(x){if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(typeof x.basis==='string'&&typeof x.excerpt==='string'&&Number.isSafeInteger(x.page)){if(x.basis==='verified_text'){if(!norm(x.excerpt)||!norm(pages[x.page-1]).includes(norm(x.excerpt)))badText++;}else unverifiedVisual++;return;}Object.values(x).forEach(proofs);}
 proofs(output);if(auto&&(badText||unverifiedVisual))critical.add('unverified_automatic_evidence');
 if(auto&&gold.automatic!=='complete')critical.add('automatic_when_review_expected');
 if(/^Q(4[7-9]|5[0-2])$/.test(gold.id??''))count('difficultReview',automatic==='review');
 const canonical=output?{automatic,documentKind:output.documentKind,items:items.map(i=>({name:field(i,'name'),brand:field(i,'brand'),model:field(i,'model'),type:i.objectType?.value??null,quantity:i.quantity?.value??null})),expenses,contacts:contacts.map(c=>({name:c.values?.name??null,tax:c.values?.fiscalId??null}))}:null;
 return{measuresVersion:VERSION,measures,extraProposals:extras,unverifiedVisual,badTextEvidence:badText,detailedCriticalErrors:critical.size,criticalReasons:[...critical].sort(),canonicalFingerprint:canonical?createHash('sha256').update(JSON.stringify(canonical)).digest('hex'):null};
}
module.exports={detailed,identityMatch,VERSION};
