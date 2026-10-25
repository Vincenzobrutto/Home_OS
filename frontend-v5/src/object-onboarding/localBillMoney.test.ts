import {expect,it} from 'vitest';
import {localBill,localBillForm} from './localBill';

const header='Bolletta energia elettrica\nFornitore: Impresa sintetica\nData emissione: 17/01/2026\nScadenza: 20/02/2026\nPeriodo di riferimento: dicembre 2025';
const document=(value:string,extra='')=>header+'\nTotale da pagare: '+value+'\n'+extra;

it.each([
 '37,82 USD','37,82 usd','37,82 GBP','37,82 CHF','37,82 JPY','37,82 ZZZ',
 '37,82 $','37,82 £','37,82 ¥','USD 37,82','GBP 37,82','$37,82',
 '37,82USD','37,82 € USD','EUR 37,82 USD','37,82\nUSD',
 '12,34,56 EUR','12,34.56 EUR','12,34e2 EUR','12,34- EUR',
 '12,34 / 56,78 EUR','12,34 – 56,78 EUR','12,34 EUR (56,78 EUR)',
 '12,345 EUR','1.23,45 EUR','0,00 EUR','10.000.000,00 EUR',
])('never turns foreign, malformed or ambiguous total %s into euros',value=>{
 const bill=localBill([document(value)]);
 expect(bill).toMatchObject({category:'electricity',supplier:'Impresa sintetica',documentDate:'2026-01-17',dueOn:'2026-02-20',competenceFrom:'2025-12-01',competenceTo:'2025-12-31'});
 expect(bill?.amount).toBeUndefined();expect(localBillForm(bill!).amount).toBe('');
});

it.each(['USD','CHF','ZZZ','$'])('explicit non-euro document currency %s also blocks a bare or contradictory euro total',currency=>{
 for(const value of ['37,82','37,82 EUR'])expect(localBill([document(value,'Valuta: '+currency)])?.amount).toBeUndefined();
});

it.each([
 ['37,82 EUR','37.82'],['EUR 37,82','37.82'],['€37,82','37.82'],['37,82€','37.82'],
 ['37,82 Euro','37.82'],['37,82','37.82'],['1.234,56 EUR','1234.56'],
 ['37,82\nEUR','37.82'],['EUR\n37,82','37.82'],
 ['37,82 EUR IVA inclusa','37.82'],['EUR 37,82 da saldare entro 20/02/2026','37.82'],
 ['37,82 EUR per il periodo indicato','37.82'],['0,01 EUR','0.01'],['9.999.999,99 EUR','9999999.99'],
])('keeps one valid euro amount %s without changing its value', (value,amount)=>{
 expect(localBill([document(value)])?.amount).toBe(amount);
});

it('an unrelated foreign-currency note does not hide an explicitly euro total',()=>{
 expect(localBill([document('37,82 EUR','Nota: esempi di tariffe in USD disponibili sul sito.')])?.amount).toBe('37.82');
 expect(localBill([document('37,82','Valuta: EUR')])?.amount).toBe('37.82');
});
it('repeated identical euro totals stay unambiguous, while a foreign counterpart does not disappear',()=>{
 const euro=document('37,82 EUR');expect(localBill([euro,euro])?.amount).toBe('37.82');
 expect(localBill([euro,document('37,82 USD')])?.amount).toBeUndefined();
});
it('spacing, case and euro prefixes cannot hide an unsupported currency or cause conversion',()=>{
 for(const currency of ['USD','usd','CHF','ZZZ','£','₹','₩'])for(const space of ['',' ','\u00a0']){
  for(const row of ['37,82'+space+currency,'€37,82'+space+currency,'37,82'+space+'€'+space+currency,'EUR'+space+'37,82'+space+currency]){
   expect(localBill([document(row)])?.amount,row).toBeUndefined();
  }
 }
 expect(localBill([document('37,82 EUR USD inclusi')])?.amount).toBeUndefined();
 expect(localBill([document('EUR 37,82 per il periodo indicato')])?.amount).toBe('37.82');
});
it.each(['Totale\nda pagare:','Totale della\nfattura:','Importo da\npagare:'])('keeps previously supported wrapped label %s',moneyLabel=>{
 expect(localBill([header+'\n'+moneyLabel+'\n37,82 EUR'])?.amount).toBe('37.82');
});
it.each(['Valuta:\nUSD','Valuta di\nfatturazione:\nCHF','Currency:\nusd'])('a wrapped explicit currency remains binding: %s',statement=>{
 expect(localBill([document('37,82',statement)])?.amount).toBeUndefined();
});
