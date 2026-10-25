import {expect,it} from 'vitest';
import {localBillInvoiceMonth} from './localBillInvoiceMonth';
import {localBill,localBillForm} from './localBill';
it.each(['Fattura Settembre 2026','Bolletta settembre 2026','Mese fattura: settembre 2026','Mese della fattura: settembre 2026','Fattura di settembre 2026','Bolletta del mese di settembre 2026'])('recognizes explicit invoice month: %s',text=>expect(localBillInvoiceMonth(text).value).toBe('2026-09'));
it.each(['Data emissione: 16/09/2026','Abbonamenti attivi al 01/09/2026','Periodo di riferimento: agosto 2026','Mese di fatturazione: settembre 2026','Periodo di fatturazione: settembre 2026','Offerta promozionale Fattura Settembre 2026','Fattura settembre','Fattura settembre 0000','Fattura settembre 20266'])('does not infer an invoice month: %s',text=>expect(localBillInvoiceMonth(text).value).toBeUndefined());
it('conflicting invoice headings remain unresolved, repeated identical headings agree',()=>{
 expect(localBillInvoiceMonth('Fattura settembre 2026\nFattura ottobre 2026')).toMatchObject({value:undefined,trace:{state:'conflicting'}});
 expect(localBillInvoiceMonth('Fattura settembre 2026\nFattura settembre 2026').value).toBe('2026-09');
});
it('keeps invoice September separate from August services, issue date and due date',()=>{
 const bill=localBill(['Fattura settembre 2026\nServizi telefonici\nPeriodo di riferimento: agosto 2026\nData emissione: 16/09/2026\nScadenza: 08/10/2026\nTotale fattura: 36,70 EUR']);
 expect(bill).toMatchObject({invoiceMonth:'2026-09',competenceFrom:'2026-08-01',competenceTo:'2026-08-31',documentDate:'2026-09-16',dueOn:'2026-10-08',amount:'36.70'});
 expect(localBillForm(bill!)).toMatchObject({invoiceMonth:'2026-09',periodFrom:'2026-08-01',periodTo:'2026-08-31'});
});
it('an invoice month without a service period never becomes competence dates',()=>{
 const bill=localBill(['Fattura settembre 2026\nServizi telefonici\nTotale fattura: 36,70 EUR']);
 expect(bill?.invoiceMonth).toBe('2026-09');expect(bill?.competenceFrom).toBeUndefined();expect(bill?.competenceTo).toBeUndefined();
});
