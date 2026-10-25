import {expect,it} from 'vitest';
import {contactBillSupplier} from './localBillSupplier';
import {localBill} from './localBill';
const contacts='APP\nMyLuceNova (Android e iOS)\nE-MAIL\nassistenza@lucenova.test\nWEB\nhttps://www.lucenova.test/reclami';
it('uses an observed app brand corroborated by both labelled contacts',()=>{
 expect(contactBillSupplier(contacts)).toBe('LuceNova');
 expect(localBill(['Bolletta energia elettrica\nTotale da pagare: 71,34 EUR\n'+contacts])).toMatchObject({supplier:'LuceNova',amount:'71.34'});
});
it.each([
 contacts.replace('MyLuceNova','MyAltro'),
 contacts.replace('assistenza@lucenova.test','cliente@posta.test'),
 contacts.replace('https://www.lucenova.test/reclami','https://www.altro.test'),
 contacts.replace('E-MAIL','Destinatario'),
 contacts.replace('WEB','Link pubblicitario'),
 contacts.replace('APP','Servizio guasti'),
 'MyLuceNova\nassistenza@lucenova.test\nwww.lucenova.test',
 contacts+'\nAPP\nMyDiversa\nE-MAIL\ninfo@diversa.test\nWEB\nwww.diversa.test',
 contacts.replace('MyLuceNova','MyLuceN0va'),
])('does not guess a supplier from missing, mismatched or ambiguous evidence: %s',text=>{
 expect(contactBillSupplier(text)).toBeUndefined();
});
it('keeps an explicit supplier instead of replacing it with a contact brand',()=>{
 expect(localBill(['Bolletta energia elettrica\nFornitore: Nome Legale Srl\n'+contacts])?.supplier).toBe('Nome Legale Srl');
});
it('accepts PDF token spacing around the at sign without changing letters or digits',()=>{
 expect(contactBillSupplier(contacts.replace('@',' @ '))).toBe('LuceNova');
 expect(contactBillSupplier(contacts.replace('@lucenova',' @ luce nova'))).toBeUndefined();
});
