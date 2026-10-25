import {expect,it} from 'vitest';
import {billSummaryAmounts} from './localBillSummary';
import {localBillAmount} from './localBillMoney';
import {localBill} from './localBill';
import {billLayoutHints,type BillPageLayout,type BillToken} from './localBillLayout';
const token=(text:string,x:number,y:number,width=130,height=10):BillToken=>({text,x,y,width,height});
function page():BillPageLayout{return {height:840,tokens:[token('Fattura novembre 2026',200,200,150,13),token('Numero fattura: DEMO-7',200,230),token('Data emissione: 16/11/2026',200,245),token('€',200,275,18,26),token('48,37',225,275,65,26)]};}
const bill='Fattura novembre 2026\nNumero telefono: 000000000\nAbbonamenti attivi al 01/11/2026\nInformazioni linea\nData emissione: 16/11/2026';
it('uses a single prominent invoice amount corroborated by fiscal number and issue date',()=>{
 expect(billSummaryAmounts(page())).toEqual(['€ 48,37']);
 expect(localBill([bill],billLayoutHints([page()]))).toMatchObject({category:'internet_services',amount:'48.37'});
});
it.each([.6,1,2])('does not depend on fixed coordinates, font size or provider: scale %s',scale=>{
 const p=page();p.tokens=p.tokens.map(t=>({...t,x:40+t.x*scale,y:20+t.y*scale,width:t.width*scale,height:t.height*scale}));
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBe('48.37');
});
it.each(['number','date','small','outside','invalidDate'] as const)('leaves an unsupported summary amount blank: %s',change=>{
 const p=page();if(change==='number')p.tokens=p.tokens.filter(t=>!t.text.startsWith('Numero fattura'));
 if(change==='date')p.tokens=p.tokens.filter(t=>!t.text.startsWith('Data emissione'));
 if(change==='small')p.tokens=p.tokens.map(t=>({...t,height:10}));
 if(change==='outside')p.tokens=p.tokens.map(t=>t.text==='48,37'?{...t,x:500}:t);
 if(change==='invalidDate')p.tokens=p.tokens.map(t=>t.text.startsWith('Data emissione')?{...t,text:'Data emissione: 31/02/2026'}:t);
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBeUndefined();
});
it.each(['$','USD','GBP'])('does not convert a foreign summary amount (%s)',currency=>{
 const p=page();p.tokens[3]!.text=currency;
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBeUndefined();
});
it.each(['48,370','48,37.90','48,37,90','-48,37','0,00'])('does not repair or truncate %s',value=>{
 const p=page();p.tokens[4]!.text=value;
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBeUndefined();
});
it('does not select or sum two equally prominent amounts',()=>{
 const p=page();p.tokens.push(token('€',200,310,18,26),token('12,10',225,310,65,26));
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBeUndefined();
});
it('does not use a fiscal summary to bypass contradictory or malformed labelled totals',()=>{
 expect(localBillAmount('Totale da pagare: 49,00 EUR',['€ 48,37'])).toBeUndefined();
 expect(localBillAmount('Totale da pagare: 48,370 EUR',['€ 48,37'])).toBeUndefined();
 expect(localBillAmount('Valuta: USD',['€ 48,37'])).toBeUndefined();
 expect(localBillAmount('Totale da pagare: 48,37 EUR',['€ 48,37'])).toBe('48.37');
});
it('does not turn an invoice month into the consumption period',()=>{
 expect(localBill([bill],billLayoutHints([page()]))?.competenceFrom).toBeUndefined();
});
it.each(['-','−','+','/mese','/kWh','al mese','per unità','%','cad.'])('does not drop a separate operator or unit token: %s',extra=>{
 const p=page();p.tokens.push(token(extra,295,280,35,10));
 expect(localBill([bill],billLayoutHints([p]))?.amount).toBeUndefined();
});
