import type { ProductExtraction } from './domain';
export const ONBOARDING_READING_VERSION='onboarding-reading-v1';
export type ReadingMode='full'|'local_pages'|'progressive';
export type ReadingPlan={version:typeof ONBOARDING_READING_VERSION;mode:ReadingMode;totalPages:number;sentPages:number[]};
/** Keep headers and every page carrying potentially useful evidence. */
export function localPageSelection(pages:string[]):number[]{
 if(!pages.length)return [];
 const selected=new Set([1]);
 for(const [i,text] of pages.entries()){
  const useful=/(?:totale\s+(?:da\s+pagare|documento|fattura|bolletta|ricevuta|costi|complessivo)|riepilogo\s+(?:importi|economico)|dati\s+(?:cliente|fornitore)|impresa\s+installatrice|modello\s*:|quantit[aà]\s*:|competenza\s+(?:dal|al)|fatturazione|numero\s+fattura|data\s+(?:documento|fattura|acquisto)|destinatario|installatore|marca\s*:|matricola\s*:)/iu.test(text);
  const detail=/dettaglio\s+consumi|condizioni\s+(?:generali|contrattuali)/iu.test(text);
  // Keep all pages that are not clearly boilerplate/consumption detail. Excluding
  // those pages is a cost hint only; every useful-looking page remains available.
  if(useful||!detail)selected.add(i+1);
 }
 return [...selected].sort((a,b)=>a-b);
}
/** Extraction completeness heuristic, never permission to save. */
export function progressiveComplete(output:ProductExtraction):boolean{
 if(output.needsReview||output.reviewWarnings?.length||output.documentKind==='unsupported')return false;
 if(['house_document','conformity_declaration'].includes(output.documentKind))return !!output.documentInfo;
 if(output.houseExpenses?.length)return output.houseExpenses.every(e=>{
  const f=e.proposedFields;
  return e.amountCandidates.filter(c=>c.role==='current_document_total').length===1&&!!f.documentDate&&!!f.supplier&&!!f.category&&
   (output.documentKind!=='utility_bill'||!!f.competenceFrom&&!!f.competenceTo);
 });
 return output.items.length>0&&output.items.every(i=>i.objectType?.certainty==='certain'&&!!i.fields.name&&
  (!['purchase_document','order_confirmation'].includes(output.documentKind)||!!i.fields.purchaseDate&&!!(i.purchaseAmount||output.purchaseTotal)));
}
/** Sequential, caller-budgeted scan loop; each iteration must authorize/reserve before sending. */
export async function readProgressively<T>(pageCount:number,readPage:(throughPage:number)=>Promise<T>,complete:(value:T)=>boolean):Promise<{value:T;pagesRead:number;complete:boolean}>{
 if(!Number.isSafeInteger(pageCount)||pageCount<1||pageCount>20)throw new RangeError('page_count');
 let value!:T;
 for(let page=1;page<=pageCount;page++){value=await readPage(page);if(complete(value))return{value,pagesRead:page,complete:true};}
 return{value,pagesRead:pageCount,complete:false};
}
