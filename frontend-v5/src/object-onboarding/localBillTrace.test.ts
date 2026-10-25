import {expect,it} from 'vitest';
import {localBill,localBillForm} from './localBill';
import {BILL_TRACE_FIELDS,localBillReadingError,type BillTrace} from './localBillTrace';
function read(text:string){let trace:BillTrace|undefined;const bill=localBill([text],undefined,value=>{trace=value;});if(!trace)throw Error('missing trace');return {bill,trace};}
const header='Fattura\nServizi telefonici\n';
it.each(['local_ocr_timeout','local_ocr_limits','local_ocr_unavailable','local_ocr_failed','local_ocr_unreliable','local_ocr_cancelled'])('a known read error has a specific safe explanation: %s',code=>{
 expect(localBillReadingError(code)).not.toBe('Lettura locale non disponibile.');expect(localBillReadingError(code)).not.toContain(code);
});
it('unknown errors and prototype property names never expose raw diagnostic content',()=>{
 for(const message of ['private/path customer data','toString','__proto__'])expect(localBillReadingError(message)).toBe('Lettura locale non disponibile.');
});
it('diagnostics do not change proposals or the confirmation form and contain no extracted values',()=>{
 const text=header+'Fornitore: Società di prova\nTotale fattura: 43,29 EUR\nData emissione: 01/03/2026\nScadenza: 20/03/2026\nPeriodo di riferimento: febbraio 2026';
 const {bill,trace}=read(text);
 expect(bill).toEqual(localBill([text]));expect(localBillForm(bill!)).toEqual(localBillForm(localBill([text])!));
 expect(BILL_TRACE_FIELDS.every(field=>trace.fields[field].state==='proposed')).toBe(true);
 expect(JSON.stringify(trace)).not.toMatch(/43[.,]29|Società di prova|2026-03-01/);
 expect(bill).not.toHaveProperty('trace');expect(localBillForm(bill!)).not.toHaveProperty('trace');
});
it('a missing period is not derived from the invoice month',()=>{
 const {trace}=read('Fattura marzo 2026\nServizi telefonici\nTotale fattura: 43,29 EUR');
 expect(trace.fields.period.state).toBe('not_found');expect(trace.fields.amount.state).toBe('proposed');
 expect(trace.fields.supplier.state).toBe('not_found');expect(trace.fields.dueOn.state).toBe('not_found');
});
it.each(['Data emissione: 31/02/2026','Data emissione: 01/03/20260','Data emissione: illeggibile'])('distinguishes unusable dates from missing dates: %s',line=>{
 const {bill,trace}=read(header+line);expect(bill?.documentDate).toBeUndefined();expect(trace.fields.documentDate.state).toBe('unusable');
});
it('distinguishes conflicting dates and suppliers',()=>{
 const {trace}=read(header+'Data emissione: 01/03/2026\nData emissione: 02/03/2026\nFornitore: Uno\nFornitore: Due');
 expect(trace.fields.documentDate.state).toBe('conflicting');expect(trace.fields.supplier.state).toBe('conflicting');
});
it.each(['Totale fattura: -43,29 EUR','Totale fattura: 43,291 EUR','Totale fattura: [lettura incerta]'])('does not pretend an unusable total is absent: %s',line=>{
 const {bill,trace}=read(header+line);expect(bill?.amount).toBeUndefined();expect(trace.fields.amount.state).toBe('unusable');
});
it('reports unsupported currency independently of readable dates',()=>{
 const {trace}=read(header+'Totale fattura: 43,29 USD\nData emissione: 01/03/2026');
 expect(trace.fields.amount).toEqual({state:'unusable',rule:'invalid_total'});expect(trace.fields.documentDate.state).toBe('proposed');
 const declared=read(header+'Valuta: USD\nTotale fattura: 43,29 EUR').trace;
 expect(declared.fields.amount.rule).toBe('unsupported_currency');
});
it('conflicting totals remain one unresolved field, never multiple expenses',()=>{
 const {bill,trace}=read(header+'Totale fattura: 43,29 EUR\nTotale da pagare: 53,29 EUR');
 expect(bill?.amount).toBeUndefined();expect(trace.fields.amount.state).toBe('conflicting');
 expect(Object.keys(trace.fields).filter(key=>key.includes('amount'))).toEqual(['amount']);
});
it.each(['Periodo di riferimento: dal 30/04/2026 al 01/04/2026','Periodo di riferimento: illeggibile'])('reports unusable explicit periods: %s',line=>expect(read(header+line).trace.fields.period.state).toBe('unusable'));
it('reports conflicting periods and mixed services',()=>{
 const {trace}=read(header+'Fornitura idrica\nPeriodo di riferimento: febbraio 2026\nPeriodo di riferimento: marzo 2026');
 expect(trace.fields.category.state).toBe('conflicting');expect(trace.fields.period.state).toBe('conflicting');
});
it.each([
 ['Preventivo\n'+header,'excluded'],['Fattura acquisto scrivania','unrecognized'],
 [header+'Numero fattura: A\nNumero fattura: B','multiple_invoices'],
] as const)('a document gate does not fabricate field diagnoses', (text,outcome)=>{
 const {bill,trace}=read(text);expect(bill).toBeNull();expect(trace.outcome).toBe(outcome);
 expect(BILL_TRACE_FIELDS.every(field=>trace.fields[field].state==='not_read')).toBe(true);
});
