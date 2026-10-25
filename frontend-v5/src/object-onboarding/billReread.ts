import type {LocalBill} from './localBill';
import type {HouseForm} from './model';

export const REREAD_FIELDS=['supplier','amount','category','date','invoiceMonth','period','dueOn'] as const;
export type RereadField=typeof REREAD_FIELDS[number];
export type BillDifference={field:RereadField;label:string;before:string;after:string};
const labels:Record<RereadField,string>={supplier:'Fornitore',amount:'Importo della bolletta (€)',category:'Categoria',date:'Data di emissione',invoiceMonth:'Mese di riferimento della fattura',period:'Periodo dei servizi',dueOn:'Scadenza'};
export function rereadValues(form:HouseForm):Record<RereadField,string>{
 return {supplier:form.supplier,amount:form.amount,category:form.category,date:form.date,invoiceMonth:form.invoiceMonth??'',period:form.periodFrom||form.periodTo?form.periodFrom+' → '+form.periodTo:'',dueOn:form.dueOn};
}
/** Missing/ambiguous proposals never erase a value; the service interval is indivisible. */
export function billDifferences(form:HouseForm,bill:LocalBill):BillDifference[]{
 const before=rereadValues(form),after=rereadValues({...form,supplier:bill.supplier??'',amount:bill.amount??'',category:bill.category??'',date:bill.documentDate??'',invoiceMonth:bill.invoiceMonth??'',periodFrom:bill.competenceFrom??'',periodTo:bill.competenceTo??'',dueOn:bill.dueOn??''});
 return REREAD_FIELDS.filter(field=>after[field]&&before[field]!==after[field]&&(field!=='period'||bill.competenceFrom&&bill.competenceTo)).map(field=>({field,label:labels[field],before:before[field],after:after[field]}));
}
/** Patch only selected differing fields. Identity, mode, links and all other inputs stay intact. */
export function billRereadPatch(form:HouseForm,bill:LocalBill,selected:RereadField[]):Partial<HouseForm>{
 const allowed=new Set(billDifferences(form,bill).map(d=>d.field)),patch:Partial<HouseForm>={};
 for(const field of new Set(selected)){
  if(!allowed.has(field))continue;
  switch(field){
   case 'supplier':patch.supplier=bill.supplier;break;
   case 'amount':patch.amount=bill.amount;patch.manual=true;patch.candidateId='';patch.ack=false;break;
   case 'category':patch.category=bill.category;break;
   case 'date':patch.date=bill.documentDate;break;
   case 'invoiceMonth':patch.invoiceMonth=bill.invoiceMonth;break;
   case 'dueOn':patch.dueOn=bill.dueOn;break;
   case 'period':patch.periodFrom=bill.competenceFrom;patch.periodTo=bill.competenceTo;patch.periodDraft=undefined;break;
  }
 }
 return patch;
}
