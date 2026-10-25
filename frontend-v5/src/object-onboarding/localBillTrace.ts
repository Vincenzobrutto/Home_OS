/** Local diagnostics only: no field values, excerpts or persistence payload. */
export const LOCAL_BILL_READER_VERSION='local-bill-summary-trace-v2';
export const BILL_TRACE_FIELDS=['invoiceMonth','category','supplier','amount','documentDate','period','dueOn'] as const;
export type BillTraceField=typeof BILL_TRACE_FIELDS[number];
export type BillFieldTrace={state:'proposed'|'not_found'|'unusable'|'conflicting'|'not_read';rule:string;method?:'pdf'|'pdf_ocr'};
export type BillTrace={version:typeof LOCAL_BILL_READER_VERSION;outcome:'bill'|'unrecognized'|'excluded'|'multiple_invoices'|'limits'|'source_mismatch';fields:Record<BillTraceField,BillFieldTrace>;source?:{sha256:string;pagesRead:number[];verified:boolean;ocr:'unused'|'completed'|'failed'}};
export function emptyBillTrace(outcome:BillTrace['outcome']):BillTrace{
 return {version:LOCAL_BILL_READER_VERSION,outcome,fields:Object.fromEntries(BILL_TRACE_FIELDS.map(field=>[field,{state:'not_read',rule:'document_gate'}])) as BillTrace['fields']};
}
export function candidateTrace(values:string[],present:boolean,rule:string):BillFieldTrace{
 const count=new Set(values.filter(value=>value.trim())).size;
 return {state:count===1?'proposed':count>1?'conflicting':present?'unusable':'not_found',rule};
}
export function localBillReadingError(message:string):string{
 const errors:Record<string,string>={
  local_ocr_timeout:'L’OCR locale ha raggiunto il tempo massimo di lettura.',
  local_ocr_limits:'La lettura OCR supera i limiti locali di dimensione o testo.',
  local_ocr_unavailable:'L’OCR locale non è disponibile su questo dispositivo.',
  local_ocr_failed:'Il lettore OCR locale ha incontrato un errore.',
  local_ocr_unreliable:'La lettura OCR non è sufficiente per proporre i dati della bolletta.',
  local_ocr_cancelled:'La lettura locale è stata interrotta.',
 };
 return Object.hasOwn(errors,message)?errors[message]!:'Lettura locale non disponibile.';
}
