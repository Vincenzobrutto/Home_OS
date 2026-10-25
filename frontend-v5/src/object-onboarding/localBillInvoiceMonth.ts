import {candidateTrace,type BillFieldTrace} from './localBillTrace';
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
/** Printed invoice heading only: neither issue date nor service period implies this month. */
export function localBillInvoiceMonth(text:string):{value?:string;trace:BillFieldTrace}{
 const names=months.join('|');
 const label='(?:(?:fattura|bolletta)(?:[ \\t]+(?:di|del[ \\t]+mese[ \\t]+di))?|mese[ \\t]+(?:della[ \\t]+)?fattura)';
 const heading=new RegExp('^[ \\t]*'+label+'[ \\t:]+('+names+')[ \\t]+(\\d{4})(?!\\d)[ \\t]*$','gimu');
 const values=[...text.matchAll(heading)].flatMap(m=>{const year=Number(m[2]);return year>=1900&&year<=2100?[m[2]+'-'+String(months.indexOf(m[1]!.toLowerCase())+1).padStart(2,'0')]:[];});
 const unique=[...new Set(values)];
 return {value:unique.length===1?unique[0]:undefined,trace:candidateTrace(values,new RegExp('^[ \\t]*'+label+'[ \\t:]+(?:'+names+')\\b','imu').test(text),'invoice_month_heading')};
}
