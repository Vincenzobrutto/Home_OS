import type { ContactValues, Contact } from '../contacts/types';
import type { ObjectManual } from '../api/types';
export const labels = {brand:'Marca',model:'Modello',reference:'Riferimento prodotto',serialNumber:'Numero di serie',powerWatts:'Potenza (W)',voltageVolts:'Tensione (V)',frequencyHz:'Frequenza (Hz)',capacityLitres:'Capacità (litri)',purchaseDate:'Data di acquisto',deliveredDate:'Consegna effettiva',warrantyStart:'Inizio garanzia',warrantyEnd:'Scadenza garanzia'} as const;
export type FieldKey=keyof typeof labels;
export type Field={value:string;origin:string;sources:Array<{documentId:string;page:number;excerpt:string;basis?:string}>;externalSource?:{url:string;checkedAt:string};/** BL-02: documento di supporto di una scadenza dichiarata, solo se leggibile. */support?:{documentId:string;name:string}|null;supportUnavailable?:boolean};
export type Profile=Partial<Record<FieldKey,Field>>;
export const originLabel=(origin:string)=>({user_declared:'Inserito da te',extraction_confirmed:'Letto dal documento',derived_from_product_name:'Ricavato dal nome del prodotto',derived_from_purchase:'Proposta dalla data di acquisto: verifica la consegna',derived_from_delivery:'Proposta dalla consegna effettiva',default_24_months:'Proposta: 24 mesi, modificabile',manufacturer_page:'Pagina ufficiale del produttore'}[origin]??'Da verificare');
export type Candidate={id:string;name:string;version:number;profile:{fields:Profile;unavailable:boolean};rooms:string[];reason:string};
export type CandidatePage={items:Candidate[];nextCursor:string|null};
export type ExpenseCandidate={id:string;title:string;amountCents:number;spentOn:string;version:number;rank:number};
export type Item={objectType?:{value:string;certainty:'certain'|'uncertain';source:Field['sources'][number]};subjectKind?:'system'|'equipment'|'product';proposedType?:string;id:string;purchaseAmount?:{amountCents:number;source:Field['sources'][number]}|null;nameTruncated:boolean;disposition:string;fields:Partial<Record<FieldKey|'name',{value:string;source:Field['sources'][number]}>>;quantity:{value:number}|null;profile:Profile;enrichment:{brand?:string;reference?:string;profile?:Profile;name:string|null;candidate:{token:string;manual:ObjectManual}|null}|null;decision:null|{state:string;newObjects:number;newExpenses:number;objects:Array<{id:string|null;name:string|null;state:string}>}};
export type Form={expenseAutoState?:'pending'|'ready'|'review'|'manual';manualItemAmount?:boolean;acknowledgePossibleDuplicate?:boolean;autoWarrantyStart?:boolean;autoWarrantyEnd?:boolean;action:'create'|'link'|'skip'|'document_only';name:string;type:string;targets:Candidate[];unitNames:string[];fields:Partial<Record<FieldKey,{action:'accept'|'manual'|'keep'|'defer'|'skip'|'replace';value?:string;expectedValue?:string;consent?:boolean}>>;confirmHouseholdObject:boolean;acknowledgeExistingSource:boolean;manual:boolean;expense:'skip'|'create'|'link';expenseId:string;expenseVersion:number;amount:string;spentOn:string;supplier:string};
export type HouseExpense={invoiceSegment?:{key:string;page:number};documentKind?:'utility_bill'|'simple_invoice';id:string;reviewWarnings?:string[];proposedFields:Record<string,{value:string;sources:unknown[]}>;amountCandidates:Array<{id:string;amountCents:number;role:string;label:string}>;amountSelectionRequired:boolean;decision:null|{state:string;newExpenses:number}};
export type ContactInput={proposalId:string;action:"save"|"skip";contactId?:string;expectedVersion?:number;values?:ContactValues;createDistinct?:boolean};
export type ProposedContact={id:string;values:ContactValues;sources:Record<string,Field["sources"][number]>;warnings:string[];resolution:{state:string;contact:Contact|null;candidates:Array<{id:string;name:string;version:number;state:string}>;conflicts:string[]};decision:null|{contactId:string|null}};
export type DocumentTarget={kind:'object'|'boiler';id:string;expectedVersion:number;name:string};
export type CompilationDraft={documentTarget?:DocumentTarget|null;saved:true;documentTitle:string;documentKind:string;replaceOrganization:boolean;reuseCopy:boolean;documentOnly:boolean;manualTotal:string;contacts:ContactInput[];houseForms:Record<string,HouseForm>};
export type HouseForm={purchaseMode?:string;purchaseTotal?:string;documentNumber?:string;documentDate?:string;note?:string;objectLabel?:string;objectSuggestionReviewed?:boolean;objectChoice?:string;candidateId:string;amount:string;manual:boolean;title:string;supplier:string;date:string;category:string;mode:string;expenseId:string;ack:boolean;periodFrom:string;periodTo:string;dueOn:string;periodDraft?:import('../lib/billPeriod').BillPeriodDraft};
export type InvoiceCoverage={version:"invoice-coverage-v1";totalPages:number;sentPages:number[];coveredPages:number[];pendingPages:number[]};
export type Draft={invoiceCoverage?:InvoiceCoverage|null;contacts?:ProposedContact[];documentInfo?:{kind:string;title:{value:string;source:Field['sources'][number]};facts:Array<{subjectIndex:number;field:string;value:string;source:Field['sources'][number]}>}|null;reviewWarnings?:Array<{field:string;reason:string}>;houseExpenses?:HouseExpense[];id:string;version:number;state:string;mode:string;snapshot:{documentId:string;documentVersion:number;sha256:string}|null;document:{id:string;name:string;mimeType:string}|null;documentKind:string;items:Item[];needsReview:boolean;purchaseExpenseReady?:boolean;purchaseTotal:{amountCents:number}|null;review:{compilation?:CompilationDraft;contacts?:ContactInput[];manualPurchaseTotalCents?:number;forms?:Record<string,Form>;pending?:Pending}|null;permissions:string[]};
export type Pending={path:string;key:string;body:unknown};
export type Job={id:string;state:string;draftId:string|null;errorCode:string|null;billing?:{actualUsd:string|null;state:string}|null};
export type AiBudget={currency:string;limitUsd:string;committedUsd:string;remainingUsd:string;callsUsed:number;maxCalls:number;available:boolean;disabledReason:string|null};
export type Capabilities={analysisSucceeded?:boolean;successfulDraftId?:string|null;budget?:AiBudget|null;manualAvailable:boolean;aiAvailable:boolean;canStartAnalysis?:boolean;canStartWithUncertainAcknowledgement?:boolean;requiresConsent:boolean;drafts:Array<{id:string;state:string;mode?:string;hasSavedCompilation?:boolean}>;job:Job|null};
export function initialForm(item:Item,draft:Draft):Form {return {expenseAutoState:!draft.houseExpenses?.length&&automaticExpenseEligible(item,draft)?'pending':undefined,autoWarrantyStart:!item.profile.warrantyStart||item.profile.warrantyStart.origin.startsWith('derived_from_'),autoWarrantyEnd:!item.profile.warrantyEnd||item.profile.warrantyEnd.origin==='default_24_months',manualItemAmount:draft.items?.length>1?!!item.purchaseAmount:undefined,action:draft.documentInfo?.kind==='conformity_declaration'?'document_only':'create',name:item.fields.name?.value??item.enrichment?.name??'',type:item.objectType?.value??item.proposedType??'',targets:[],unitNames:[],fields:Object.fromEntries(Object.keys(item.profile).map(k=>[k,{action:'accept'}])),confirmHouseholdObject:false,acknowledgeExistingSource:false,manual:false,expense:'skip',expenseId:'',expenseVersion:0,amount:item.purchaseAmount?String(item.purchaseAmount.amountCents/100):draft.items?.length===1&&draft.purchaseTotal?String(draft.purchaseTotal.amountCents/100):'',spentOn:item.profile.purchaseDate?.value??'',supplier:''};}
export function choice(item:Item,form:Form){if(form.action==='document_only')return {itemId:item.id,action:'document_only' as const};if(form.action==='skip')return {itemId:item.id,action:'skip' as const};const common={itemId:item.id,fields:form.fields,manual:form.manual&&item.enrichment?.candidate?{mode:'candidate',token:item.enrichment.candidate.token}:null,expense:form.expense==='skip'?{action:'skip'}:form.expense==='link'?{action:'link',id:form.expenseId,expectedVersion:form.expenseVersion}:{action:'create',title:form.name||item.fields.name?.value||'Acquisto',amountCents:Math.round(Number(form.amount.replace(',','.'))*100),spentOn:form.spentOn,supplier:form.supplier||null,...(form.manualItemAmount?{manualItemAmount:true}:{}),...(form.acknowledgePossibleDuplicate?{acknowledgePossibleDuplicate:true}:{})}};return form.action==='link'?{...common,action:'link',targets:form.targets.map(t=>({id:t.id,expectedVersion:t.version}))}:{...common,action:'create',name:form.name,type:form.type,unitNames:form.unitNames,roomIds:[],confirmHouseholdObject:form.confirmHouseholdObject,acknowledgeExistingSource:form.acknowledgeExistingSource};}

function calendarPlus24(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const [year,month,day]=value.split('-').map(Number),end=new Date(Date.UTC(year!+2,month!,0));return `${end.getUTCFullYear()}-${String(month).padStart(2,'0')}-${String(Math.min(day!,end.getUTCDate())).padStart(2,'0')}`;}
/** Editable defaults follow dates until the user independently changes the guarantee. BL-02: nessuna scadenza presunta. */
export function editProfileField(form:Form,key:FieldKey,decision:NonNullable<Form['fields'][FieldKey]>,proposals:Profile,current:Profile):Form {
 const result={...form,fields:{...form.fields,[key]:decision}};
 if(key==='warrantyStart')result.autoWarrantyStart=false;
 if(key==='warrantyEnd')result.autoWarrantyEnd=false;
 const value=(field:FieldKey)=>{const d=result.fields[field];return d?.action==='manual'?d.value:d?.action==='skip'?undefined:d?.action==='replace'?proposals[field]?.value:current[field]?.value??proposals[field]?.value;};
 if((key==='purchaseDate'||key==='deliveredDate')&&!current.warrantyStart&&result.autoWarrantyStart!==false){const start=value('deliveredDate')||value('purchaseDate');if(start&&calendarPlus24(start))result.fields.warrantyStart={action:'manual',value:start};else if(!start){result.fields.warrantyStart={action:'skip'};if(result.autoWarrantyEnd!==false)result.fields.warrantyEnd={action:'skip'};}}
 return result;
}
/** BL-02: scorciatoia esplicita «24 mesi» dalla decorrenza scelta o proposta; null se manca la decorrenza. */
export function legalWarrantyEnd(form:Form,proposals:Profile,current:Profile):string|null{const d=form.fields.warrantyStart;const start=d?.action==='manual'?d.value:d?.action==='skip'?undefined:current.warrantyStart?.value??proposals.warrantyStart?.value;return start?calendarPlus24(start):null;}

export function automaticExpenseEligible(item:Item,draft:Draft){return draft.mode==='extraction'&&['purchase_document','order_confirmation'].includes(draft.documentKind)&&(draft.items.length===1||!!item.purchaseAmount)&&(item.quantity?.value??1)===1&&(!draft.needsReview||draft.purchaseExpenseReady===true)&&!!draft.purchaseTotal&&draft.purchaseTotal.amountCents>0&&!!item.profile.purchaseDate?.value;}
export function expenseNeedsReview(form:Form){return !['skip','document_only'].includes(form.action)&&(form.expenseAutoState==='pending'||form.expenseAutoState==='review'||form.expense==='create'&&form.manualItemAmount===false);}

export function profileNeedsReview(form:Form){return !['skip','document_only'].includes(form.action)&&Object.values(form.fields).some(f=>f?.action==='replace'&&(!f.consent||!f.expectedValue));}

/** An editable display title, derived only from the already verified document description. */
export function houseExpenseTitle(item:HouseExpense,draft:Draft){
 const proposed=item.proposedFields.title?.value;
 if(item.documentKind!=='simple_invoice')return proposed;
 const description=draft.documentInfo?.facts.find(f=>f.field==='interventionDescription'&&f.subjectIndex===-1);
 const title=(!proposed||/^fattura$/iu.test(proposed.trim()))?description?.value??proposed:proposed;
 if(!title||/^(Acconto|Saldo) · /u.test(title))return title;
 // Only explicit invoice-purpose wording from this original can prefill the editable label.
 // A balance in an account statement, an amount, or an object's past costs is not evidence.
 const excerpts=(item.proposedFields.title?.sources??[]).flatMap(s=>s&&typeof s==='object'&&'documentId' in s&&'excerpt' in s&&typeof s.excerpt==='string'&&!!draft.snapshot?.documentId&&s.documentId===draft.snapshot.documentId?[s.excerpt]:[]);
 const texts=[title,...excerpts,...(description?.source&&description.source.documentId===draft.snapshot?.documentId?[description.value,description.source.excerpt]:[])];
 const purposes=new Set(texts.flatMap(text=>[...text.matchAll(/\bfattura\s+(?:di|a)\s+(?:(?:primo|secondo|terzo|ultimo)\s+)?(acconto|saldo)\b/giu)].map(m=>m[1]!.toLowerCase())));
 if(purposes.size!==1)return [...title].slice(0,120).join('');
 const prefix=purposes.has('acconto')?'Acconto · ':'Saldo · ';
 return prefix+[...title].slice(0,120-[...prefix].length).join('');
}

/** Suggest a readable initial title; callers preserve any saved organization or user edit. */
export function documentTitleSuggestion(draft:Draft){
 const original=draft.documentInfo?.title.value;
 const invoice=draft.houseExpenses?.find(e=>e.documentKind==='simple_invoice');
 if(invoice&&(!original||/^(fattura|ricevuta)$/iu.test(original.trim()))){
  const number=invoice.proposedFields.documentNumber?.value,supplier=invoice.proposedFields.supplier?.value?.replace(/\s+/gu,' ').trim();
  const purpose=houseExpenseTitle(invoice,draft),prefix=purpose?.startsWith('Acconto · ')?'Acconto · ':purpose?.startsWith('Saldo · ')?'Saldo · ':'';
  if(number||supplier)return [...prefix+(original?.toLocaleLowerCase('it')==='ricevuta'?'Ricevuta':'Fattura')+(number?' '+number:'')+(supplier?' · '+supplier:'')].slice(0,120).join('');
 }
 if(draft.documentInfo?.kind==='system_diagram'&&(!original||original.length<=12&&/^[\p{Lu}\s.\-/]+$/u.test(original)))return 'Schema dell’impianto'+(draft.documentInfo.facts.some(f=>f.field==='systemType'&&f.value==='electrical')?' elettrico':'');
 return original;
}
