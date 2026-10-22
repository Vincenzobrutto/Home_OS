import { digest } from '../security';
import { ProviderFailure } from '../review/provider';
import type { HouseExpense, ProductExtraction } from './domain';

const normalized=(s:string)=>s.normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase('it');
/** Conservative first increment: one complete invoice per physical page, no global subjects or totals. */
export function separateInvoices(output:Pick<ProductExtraction,'items'|'purchaseTotal'|'documentInfo'>,expenses:HouseExpense[],sha:string,documentId:string):HouseExpense[]{
 if(expenses.length<2||!expenses.some(e=>e.documentKind==='simple_invoice'))return expenses;
 const fail=():never=>{throw new ProviderFailure('analysis_invalid_output');};
 if(output.items.length||output.purchaseTotal||output.documentInfo?.kind!=='invoice'||output.documentInfo.facts.length)fail();
 const pages=new Set<number>(),identities=new Set<string>();
 return expenses.map(item=>{
  if(item.documentKind!=='simple_invoice'||item.reviewWarnings?.length)fail();
  const f=item.proposedFields,required=['supplier','documentNumber','documentDate'];
  if(required.some(k=>!f[k]?.value||f[k].sources.length!==1))fail();
  const page=f.documentNumber.sources[0].page;
  const totals=item.amountCandidates.filter(a=>a.role==='current_document_total');
  if(totals.length!==1||pages.has(page)||!/(?:numero|fattura|invoice)/iu.test(f.documentNumber.sources[0].excerpt)||!/(?:data|date)/iu.test(f.documentDate.sources[0].excerpt))fail();
  const proofs=[...Object.values(f).flatMap(v=>v.sources),...item.amountCandidates.flatMap(a=>a.sources)];
  if(proofs.some(s=>s.page!==page||s.sha256!==sha||s.documentId!==documentId))fail();
  const identity=JSON.stringify(required.map(k=>normalized(f[k].value)));
  if(identities.has(identity))fail();identities.add(identity);pages.add(page);
  // The same physical invoice cannot become new through abbreviated/reordered model text.
  const key=digest(JSON.stringify(['invoice-page-v1',sha,page]));
  return {...item,invoiceSegment:{key,page},fingerprint:key,id:digest(documentId+':bill:'+key)};
 });
}
