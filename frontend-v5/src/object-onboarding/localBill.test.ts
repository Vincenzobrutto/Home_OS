import {expect,it} from 'vitest';
import {localBill,localBillForm,localBillEligible} from './localBill';
import type {Draft} from './model';
const text = 'Bolletta energia elettrica\nFornitore: Energia di prova Srl\nTotale da pagare: 115,36 €\nData emissione: 24/02/2026\nDa saldare entro: 16/03/2026\nPeriodo di fatturazione: Gennaio 2026';
it('extracts an electricity bill with a calendar month, emission and due date kept separate',()=>{
 expect(localBill([text])).toEqual({supplier:'Energia di prova Srl',category:'electricity',amount:'115.36',documentDate:'2026-02-24',dueOn:'2026-03-16',competenceFrom:'2026-01-01',competenceTo:'2026-01-31'});
 expect(localBillForm(localBill([text])!)).toMatchObject({manual:true,candidateId:'',date:'2026-02-24',dueOn:'2026-03-16',amount:'115.36',mode:'create',ack:false});
 expect(localBill([text])).not.toHaveProperty('paidOn');
});
it.each([
 ['gas','Fattura gas naturale'],['water','Bolletta servizio idrico'],['internet_services','Fattura telefonia'],['electricity','Fattura POD kWh'],
])('recognizes a different %s utility without issuer or filename rules',(category,heading)=>{
 expect(localBill([heading+'\nTotale fattura: EUR 1.234,56\nPeriodo di riferimento: dal 01/08/2026 al 30/09/2026'])).toMatchObject({category,amount:'1234.56',competenceFrom:'2026-08-01',competenceTo:'2026-09-30'});
});
it.each(['Preventivo bolletta energia elettrica','Offerta commerciale fattura gas naturale','Fac-simile bolletta servizio idrico','Non è una bolletta energia elettrica','Non costituisce una bolletta energia elettrica','Esempio di bolletta energia elettrica','Fattura acquisto frigorifero','Il consumo è 30 kWh','Bolletta senza indicazioni di servizio'])('does not classify %s',value=>expect(localBill([value])).toBeNull());
it('conflicting totals do not become an arbitrary expense or a sum',()=>{
 expect(localBill([text+'\nTotale bolletta: 99,00 €'])?.amount).toBeUndefined();
 expect(localBill([text,text])?.amount).toBe('115.36');
});
it('never takes rates, VAT, previous balance or an unlabeled number as the total',()=>{
 expect(localBill(['Bolletta acqua\nFornitura acqua\nIVA: 12,00 €\nSaldo precedente: 30,00 €\n0,12 €/kWh\n999,00 €'])?.amount).toBeUndefined();
});
it('ambiguous dates, suppliers and periods remain blank independently',()=>{
 const bill=localBill([text+'\nData emissione: 25/02/2026\nScadenza: 17/03/2026\nFornitore: Secondo Srl\nPeriodo di riferimento: febbraio 2026']);
 expect(bill).toMatchObject({amount:'115.36',category:'electricity'});
 for(const field of ['supplier','documentDate','dueOn','competenceFrom','competenceTo'] as const) expect(bill?.[field]).toBeUndefined();
});
it('validates calendar dates, date ranges and leap years',()=>{
 const bill=localBill(['Bolletta gas naturale\nData emissione: 31/02/2026\nScadenza: 29/02/2026\nPeriodo di riferimento: dal 30/09/2026 al 01/09/2026']);
 expect(bill?.documentDate).toBeUndefined();expect(bill?.dueOn).toBeUndefined();expect(bill?.competenceFrom).toBeUndefined();
 expect(localBill(['Bolletta gas naturale\nPeriodo di riferimento: febbraio 2024'])).toMatchObject({competenceFrom:'2024-02-01',competenceTo:'2024-02-29'});
});
it('does not assign a category to mixed gas and electricity',()=>expect(localBill(['Bolletta energia elettrica e gas naturale'])?.category).toBeUndefined());
it('a unique legal heading is usable without knowing the supplier',()=>expect(localBill(['Nuova Energia S.p.A.\nBolletta energia elettrica'])?.supplier).toBe('Nuova Energia S.p.A.'));
it('different legal headings do not guess the supplier',()=>expect(localBill(['Venditore Srl\nDistributore Spa\nBolletta energia elettrica'])?.supplier).toBeUndefined());
it('handles explicit labels followed by a line break',()=>expect(localBill(['Fattura energia elettrica\nTotale da pagare:\n87,90 €\nData emissione:\n01.02.2026']) ).toMatchObject({amount:'87.90',documentDate:'2026-02-01'}));
it('rejects empty, excessive and image-only input',()=>{expect(localBill([])).toBeNull();expect(localBill([''])).toBeNull();expect(localBill(Array(21).fill(text))).toBeNull();expect(localBill([text+'x'.repeat(100001)])).toBeNull();});
it('does not merge two different invoices into one expense',()=>expect(localBill([text+'\nNumero fattura: A-001',text+'\nNumero fattura: A-002'])).toBeNull());
it('a contract mentioning billing and consumption is not a bill',()=>expect(localBill(['Contratto energia elettrica\nLa fattura dei consumi kWh arriverà il mese successivo.'])).toBeNull());
it('commercial information in the footer does not hide a real bill',()=>expect(localBill([text+'\nInformazioni sulla tua offerta commerciale. Richiedi un preventivo per altri servizi.'])).toMatchObject({amount:'115.36',category:'electricity'}));
it('a customer legal name after the heading is not treated as the supplier',()=>expect(localBill(['Bolletta energia elettrica\nIntestatario\nCliente Commerciale Srl'])?.supplier).toBeUndefined());
it('existing compilations, decisions, proposals and extracted drafts are never overwritten',()=>{
 const draft={mode:'manual',documentKind:'unsupported',state:'open',review:null,snapshot:{documentId:'own',documentVersion:1,sha256:'a'.repeat(64)},items:[]} as unknown as Draft;
 expect(localBillEligible(draft,'application/pdf')).toBe(true);
 for(const next of [{review:{}},{review:{pending:{}}},{review:{compilation:{saved:true}}},{mode:'extraction'},{state:'confirmed'},{snapshot:null},{houseExpenses:[{decision:null,proposedFields:{supplier:{}},amountCandidates:[]}]},{items:[{decision:{state:'confirmed'},fields:{}}]}])expect(localBillEligible({...draft,...next} as Draft,'application/pdf')).toBe(false);
 expect(localBillEligible(draft,'image/jpeg')).toBe(false);
});
