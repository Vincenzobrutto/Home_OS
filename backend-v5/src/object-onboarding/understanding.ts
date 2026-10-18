import { HttpException } from '@nestjs/common';
import { ProviderFailure } from '../review/provider';
import { DOCUMENT_KINDS, type DocumentKind } from '../document-intake/domain';
import { object, text, invalid } from '../review/domain';
import { calendar } from '../activities/domain';
import { printedDates } from '../economy/document-evidence';
import type { ProductSource } from './domain';

export const documentFactKeys = ['issuer','documentDate','installationDate','interventionDescription','availablePowerKw','systemType'] as const;
export type DocumentFactKey = typeof documentFactKeys[number];
export type UnderstandingWarning = { field: string; reason: 'unverified' | 'missing_identity' };
export type DocumentUnderstanding = { kind: DocumentKind; title: { value: string; source: ProductSource; origin?: 'document_type' }; facts: Array<{ subjectIndex: number; field: DocumentFactKey; value: string; source: ProductSource }> };
const normalize=(value:string)=>value.normalize('NFC').replace(/\s+/gu,' ').trim();
const systemWords:Record<string,RegExp>={electrical:/elettric|electric/iu,heating:/riscaldamento|termic|heating/iu,cooling:/climatizz|condizion|cooling/iu,plumbing:/idric|idrico|idraulic|plumbing/iu,security:/sicurezza|allarme|security/iu};
const kinds:Partial<Record<DocumentKind,RegExp>>={conformity_declaration:/dichiarazione.{0,10}conformit[aà]|declaration.{0,10}conformity/iu,invoice:/fattura|invoice/iu,receipt:/ricevuta|scontrino|receipt/iu,utility_bill:/bolletta|fornitura|energia|elettric|gas|acqua|internet/iu,product_label:/marca|model|modello|type|ref|serial|\bW\b|\bV\b/iu,purchase_order:/ordine|order/iu,delivery_notice:/consegna|delivery|spedito/iu,ape:/attestato|prestazione energetica|\bAPE\b/iu,floor_plan:/planimetri|floor plan/iu};

export function readUnderstanding(raw:unknown, rawFacts:unknown, itemCount:number, readSource:(value:unknown)=>ProductSource) {
 const warnings:UnderstandingWarning[]=[];
 if(raw===undefined){if(rawFacts!==undefined&&(!Array.isArray(rawFacts)||rawFacts.length))throw invalid();return {documentInfo:undefined,warnings};}
 if(!Array.isArray(raw)||raw.length>1)throw invalid();
 if(!Array.isArray(rawFacts)||rawFacts.length>80)throw invalid();
 if(!raw.length){if(rawFacts.length)throw invalid();return {documentInfo:undefined,warnings};}
 const row=object(raw[0],['kind','title','evidence']);
 if(typeof row.kind!=='string'||!Object.hasOwn(DOCUMENT_KINDS,row.kind))throw invalid();
 const kind=row.kind as DocumentKind,source=readSource(row.evidence);let title=normalize(text(row.title,120));
 const literal=normalize(source.excerpt).toLocaleLowerCase('it').includes(title.toLocaleLowerCase('it'))&&(!kinds[kind]||kinds[kind]!.test(source.excerpt));
 // Floor plans are often drawings with room labels and no printed document heading.
 // A visual classification is a proposal to review, never a fabricated quotation or an asset.
 const visualFloorPlan=!literal&&kind==='floor_plan'&&source.basis==='provider_observed_image';
 if(!literal&&!visualFloorPlan)throw invalid('Tipo o titolo del documento non verificabile.');
 if(visualFloorPlan){title='Planimetria';warnings.push({field:'documentTitle',reason:'unverified'});}
 const facts:DocumentUnderstanding['facts']=[],seen=new Set<string>();
 for(const raw of rawFacts){
  const fact=object(raw,['subjectIndex','field','value','evidence']);
  if(!Number.isSafeInteger(fact.subjectIndex)||Number(fact.subjectIndex)<-1||Number(fact.subjectIndex)>=itemCount||!(documentFactKeys as readonly unknown[]).includes(fact.field))throw invalid();
  const field=fact.field as DocumentFactKey,key=fact.subjectIndex+':'+field;if(seen.has(key))throw invalid();seen.add(key);
  try{
   let proof=readSource(fact.evidence);const value=normalize(text(fact.value,field==='interventionDescription'?500:120));
   if(field==='documentDate'&&kind==='invoice'&&proof.page===source.page&&normalize(source.excerpt).includes(normalize(proof.excerpt))&&printedDates(source.excerpt).length===1&&printedDates(source.excerpt).includes(value))proof=source;
   const excerpt=normalize(proof.excerpt);
   if(field==='documentDate'||field==='installationDate'){
    calendar(value);if(printedDates(excerpt).length!==1||!printedDates(excerpt).includes(value))throw invalid();
    if(field==='installationDate'&&!/installat|messa in servizio|installation/iu.test(excerpt))throw invalid();
    if(field==='documentDate'&&!/data|emess|rilasc|date|dichiarazione|fattura|invoice/iu.test(excerpt))throw invalid();
   }else if(field==='systemType'){
    if(!systemWords[value]?.test(excerpt)||!['conformity_declaration','invoice'].includes(kind)||Number(fact.subjectIndex)<0)throw invalid();
   }else if(field==='availablePowerKw'){
    if(!/^\d+(?:[.,]\d+)?$/u.test(value)||Number(value.replace(',','.'))<=0||Number(value.replace(',','.'))>1000000||!/(?:impegnabil|disponibil|contrattual)/iu.test(excerpt)||!new RegExp('(?:^|[^0-9.,])'+value.replace('.','\\.')+'\\s*kW\\b','iu').test(excerpt))throw invalid();
   }else if(!excerpt.includes(value))throw invalid();
   facts.push({subjectIndex:Number(fact.subjectIndex),field,value,source:proof});
  }catch(error){if(!(error instanceof HttpException)&&!(error instanceof ProviderFailure))throw error;warnings.push({field:key,reason:'unverified'});}
 }
 return {documentInfo:{kind,title:{value:title,source,...(visualFloorPlan?{origin:'document_type' as const}:{})},facts},warnings};
}
