import type {DocumentSummary} from '../api/types';
export type BillTitleContext=Partial<Pick<DocumentSummary,'originalFilename'|'workflowState'|'savedExpenses'>> & Pick<DocumentSummary,'name'|'organization'>;
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
/** Display only. Never replace a custom title or infer a month from service/due dates. */
export function completedBillTitle(doc:BillTitleContext):string|null{
 if(doc.workflowState!=='completed'||doc.organization?.parts.length!==1||doc.organization.parts[0]?.kind!=='utility_bill')return null;
 const filename=doc.originalFilename?.trim();if(!filename)return null;
 const title=doc.organization.title.trim()||doc.name.trim();
 if(title&&title!==filename&&title!==filename.replace(/\.(?:pdf|jpe?g|png)$/iu,''))return null;
 // Never select a supplier or a month from several expenses, even when they agree.
 const expense=doc.savedExpenses?.length===1?doc.savedExpenses[0]:undefined;
 const supplier=expense?.supplier?.trim().replace(/\s+/gu,' '),month=expense?.invoiceMonth;
 const monthLabel=month&&/^\d{4}-(0[1-9]|1[0-2])$/u.test(month)&&!month.startsWith('0000')?`${months[Number(month.slice(5))-1]} ${month.slice(0,4)}`:null;
 if(supplier)return `Bolletta ${supplier}${monthLabel?' · '+monthLabel:''}`;
 if(monthLabel)return `Bolletta · ${monthLabel}`;
 return `Bolletta · ${filename}`;
}
