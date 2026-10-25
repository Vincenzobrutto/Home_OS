import {expect,it} from 'vitest';
import {localBill} from './localBill';

// Independent synthetic vocabulary/layout matrix, never names or text from a customer PDF.
const families = [
 ['electricity','Energia elettrica'],
 ['electricity','Fornitura elettrica'],
 ['electricity','Tipo di servizio: fornitura di elettricità'],
 ['electricity','Fornitura di elettricità'],
 ['gas','Gas naturale'],
 ['gas','Fornitura di gas'],
 ['gas','Tipo di servizio: fornitura di gas metano'],
 ['gas','Servizio di distribuzione del gas'],
 ['water','Servizio idrico integrato'],
 ['water','Fornitura acqua'],
 ['water','Tipo di servizio: fornitura idrica'],
 ['water','Servizi idrici'],
 ['internet_services','Telefonia'],
 ['internet_services','Connessione internet'],
 ['internet_services','Tipo di servizio: servizio telefonico'],
 ['internet_services','Servizi telefonici'],
 ['internet_services','Accesso a internet'],
 ['internet_services','Connettività internet'],
] as const;
const suppliers=['Operatore del Borgo Srl','Cooperativa delle Reti','Forniture Civiche di Prova'];
for(const [category,service] of families)for(const supplier of suppliers)for(const reordered of [false,true]){
 it(`summary: ${service}, ${supplier}, reordered=${reordered}`,()=>{
  const rows=[service,'Fornitore: '+supplier,'Numero fattura: PROVA-001',
   'Totale fattura: 42,18 EUR','Data emissione: 04/03/2026',
   'Scadenza: 24/03/2026','Periodo di riferimento: febbraio 2026'];
  const text='Fattura\n'+(reordered?rows.slice().reverse():rows).join('\n');
  const result=localBill([text]);
  expect(result).toEqual({category,supplier,amount:'42.18',documentDate:'2026-03-04',
   dueOn:'2026-03-24',competenceFrom:'2026-02-01',competenceTo:'2026-02-28'});
  expect(result).not.toHaveProperty('paidOn');
 });
}
it.each([
 'Router compatibile con accesso a internet',
 'Kit manutenzione per fornitura idrica',
 'Dispositivo per il servizio telefonico',
 'Apparecchio per il servizio di distribuzione del gas',
 'Manuale dei servizi idrici',
 'Contattaci per attivare servizi telefonici',
 'Fornitore: Servizi Telefonici Srl',
 'Fornitore: Fornitura Idrica Srl',
 'Nota: connettività internet disponibile separatamente',
])('new synonyms are not classified from a product, issuer name or incidental mention: %s',line=>{
 expect(localBill(['Fattura\n'+line+'\nTotale fattura: 42,18 EUR'])).toBeNull();
});
it.each(['Preventivo','Fac-simile','Esempio di bolletta'])('new service vocabulary preserves the %s exclusion',heading=>{
 expect(localBill([heading+'\nFattura\nServizi telefonici\nTotale fattura: 42,18 EUR'])).toBeNull();
});
it('a new service synonym still requires a billing document',()=>{
 expect(localBill(['Contratto\nFornitura idrica\nCosto previsto: 42,18 EUR'])).toBeNull();
});
it('mixed services remain unclassified instead of allocating their total',()=>{
 expect(localBill(['Fattura\nFornitura idrica\nServizi telefonici\nTotale fattura: 42,18 EUR']))
  .toMatchObject({amount:'42.18',category:undefined});
});
it('service recognition does not choose between incompatible totals',()=>{
 const result=localBill(['Fattura\nServizi telefonici\nTotale fattura: 42,18 EUR\nTotale da pagare: 52,18 EUR']);
 expect(result).toMatchObject({category:'internet_services',amount:undefined});
});
it('issuer conflicts do not erase the independently supported total',()=>{
 const result=localBill(['Fattura\nFornitura idrica\nFornitore: Primo gestore\nFornitore: Secondo gestore\nTotale fattura: 42,18 EUR']);
 expect(result).toMatchObject({category:'water',amount:'42.18',supplier:undefined});
});
it.each(['Energia Elettrica Srl','Gas Naturale Spa','Telefonia S.p.A.','Acquedotto Srl'])('a utility word in the issuer name %s is not a service',supplier=>{
 for(const row of ['Fornitore: '+supplier,supplier]){
  expect(localBill(['Fattura\n'+row+'\nAcquisto di una scrivania\nTotale fattura: 42,18 EUR'])).toBeNull();
 }
});
it.each(['Fattura Servizi telefonici','Bolletta per fornitura idrica','Servizio: accesso a internet','TIPO DI SERVIZIO: CONNETTIVITÀ INTERNET'])('accepts declared service header variants: %s',line=>{
 expect(localBill(['Fattura\n'+line+'\nTotale fattura: 42,18 EUR']))
  .toMatchObject({amount:'42.18'});
});
it.each(['Servizia telefonica','Servizio telefonici','Servizi telefonico'])('does not repair corrupted service wording: %s',line=>{
 expect(localBill(['Fattura\n'+line+'\nTotale fattura: 42,18 EUR'])).toBeNull();
});
