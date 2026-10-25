import {expect,it} from 'vitest';
import {localBill} from './localBill';
const invoice='Fattura settembre 2026\nNumero fattura: X-001\nData emissione: 16/09/2026\n';
const service='Numero telefono: 000000000\nAbbonamenti attivi al 01/09/2026\nInformazioni linea';
it.each(['', 'Fornitore: Operatore Inventato Srl\n'])('recognizes a recurring line service without an issuer catalogue',supplier=>{
 expect(localBill([invoice+supplier+service])).toMatchObject({category:'internet_services',documentDate:'2026-09-16'});
});
it.each([
 'Numero telefono: 000000000\nAcquisto di un mobile',
 'Numero telefono: 000000000\nInformazioni linea',
 'Abbonamenti attivi al 01/09/2026\nNumero telefono: 000000000',
 'Informazioni linea\nAbbonamenti attivi al 01/09/2026',
 'Numero telefono: 000000000\nAbbonamento alla rivista\nInformazioni linea editoriale',
])('does not classify a generic invoice or isolated contact as a bill: %s',text=>{
 expect(localBill([invoice+text])).toBeNull();
});
it.each(['Preventivo','Offerta commerciale','Fac-simile','Esempio di bolletta'])('rejects %s even with line/subscription fields',heading=>{
 expect(localBill([heading+'\n'+invoice+service])).toBeNull();
});
it('retains explicit negative declarations',()=>{
 expect(localBill([invoice+service+'\nQuesto documento non costituisce una bolletta.'])).toBeNull();
});
it('does not equate the invoice month with a labelled reference period',()=>{
 expect(localBill([invoice+service])?.competenceFrom).toBeUndefined();
});
it.each(['Abbonamento attivo','Abbonamenti attivi','Servizio di accesso','Servizi di accesso','Canone mensile','Canone di abbonamento'])('accepts general singular/plural service evidence: %s',subscription=>{
 const text=invoice+'Numero telefono: 000000000\nInformazioni sulla linea\n'+subscription;
 expect(localBill([text])).toMatchObject({category:'internet_services'});
});
