import {expect,it} from 'vitest';
import {billOcrPages} from './localOcr';
import {localBill} from './localBill';
it('OCRs a missing labelled issue date even when total and due date are already native',()=>{
 const text='Bolletta energia elettrica\nTotale da pagare: 81,43 EUR\nScadenza: 09/06/2026\nEmessa il\n[graphic date]\nDettagli del periodo di fatturazione e della fornitura';
 const native=localBill([text]);expect(native).toMatchObject({amount:'81.43',dueOn:'2026-06-09'});expect(native?.documentDate).toBeUndefined();expect(billOcrPages([text],native)).toEqual([0]);
});
it('OCRs a missing explicitly labelled supplier without inventing its name',()=>{
 const text='Bolletta energia elettrica\nTotale da pagare: 81,43 EUR\nScadenza: 09/06/2026\nFornitore:\n[graphic name]\nDettagli del periodo di fatturazione e della fornitura';
 const native=localBill([text]);expect(native?.supplier).toBeUndefined();expect(billOcrPages([text],native)).toEqual([0]);
});
it('does not trigger OCR just because a document casually mentions a supplier',()=>{
 const text='Bolletta energia elettrica\nTotale da pagare: 81,43 EUR\nScadenza: 09/06/2026\nData emissione: 20/05/2026\nInformazioni sui diritti del cliente verso il fornitore';
 expect(billOcrPages([text],localBill([text]))).toEqual([]);
});
