import {expect,it} from 'vitest';
import {billSupplierLabel,isBillServiceHeading} from './billSupplierLabel';
import {documentDisplayTitle} from './presentation';
import type {BillTitleContext} from './completedBillTitle';
const generic='SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO';
const expense={id:'e1',title:generic,amountCents:100,supplier:'Fornitore Prova S.p.A.',documentNumber:null,documentDate:null};
const doc:BillTitleContext={name:'hash.pdf',originalFilename:'hash.pdf',workflowState:'completed',organization:{title:generic,version:1,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-01'},savedExpenses:[expense]};
it.each(['SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO','Fornitura di gas naturale','Acqua potabile','Servizio internet e telefonia','Energia elettrica - mercato tutelato'])('recognizes generic service heading %s without inferring issuer',value=>{
 expect(isBillServiceHeading(value)).toBe(true);expect(billSupplierLabel(value)).toBeUndefined();
});
it.each(['Servizio Elettrico Nazionale','Energia Prova','Fornitore Energia elettrica','Energia elettrica cucina','Bolletta','Bolletta di casa scelta da me'])('preserves actual names and custom wording %s',value=>{
 expect(isBillServiceHeading(value)).toBe(false);expect(billSupplierLabel(value)).toBe(value);
});
it.each(['Fornitore Prova S.p.A.','Fornitore Prova S.p.A','Fornitore Prova - S.p.A.','Fornitore Prova S.r.l.','Fornitore Prova SRL','Fornitore Prova SRLS'])('formats legal suffix %s only for presentation',value=>{
 expect(billSupplierLabel(value)).toBe('Fornitore Prova');
});
it('does not remove embedded company words or collapse a legal company into a generic service',()=>{
 expect(billSupplierLabel('Spa Natura')).toBe('Spa Natura');expect(billSupplierLabel('Energia elettrica S.p.A.')).toBe('Energia elettrica S.p.A.');
 expect(billSupplierLabel('Hotel Spa')).toBe('Hotel Spa');expect(billSupplierLabel('Aqua Srl')).toBe('Aqua Srl');
});
it('uniforms only a generic service heading using the existing confirmed supplier, without mutating saved facts',()=>{
 const before=JSON.stringify(doc);expect(documentDisplayTitle(doc)).toBe('Bolletta Fornitore Prova');expect(JSON.stringify(doc)).toBe(before);
 expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,invoiceMonth:'2026-09'}]})).toBe('Bolletta Fornitore Prova · settembre 2026');
});
it('does not guess a supplier from a generic heading without an unambiguous usable supplier',()=>{
 for(const supplier of [null,'',generic])expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,supplier,invoiceMonth:'2026-09'}]})).toBe(generic);
 expect(documentDisplayTitle({...doc,savedExpenses:[expense,{...expense,id:'e2'}]})).toBe(generic);
 expect(documentDisplayTitle({...doc,savedExpenses:[]})).toBe(generic);
});
it('does not display a service description as issuer on filename-based titles',()=>{
 expect(documentDisplayTitle({...doc,organization:{...doc.organization!,title:'hash.pdf'},savedExpenses:[{...expense,supplier:generic}]})).toBe('Bolletta · hash.pdf');
});
it('preserves all other custom titles, incomplete/composite documents and unknown original filename',()=>{
 const custom='Energia elettrica della mia cucina';expect(documentDisplayTitle({...doc,organization:{...doc.organization!,title:custom}})).toBe(custom);
 expect(documentDisplayTitle({...doc,workflowState:'review'})).toBe(generic);
 expect(documentDisplayTitle({...doc,originalFilename:undefined})).toBe(generic);
 expect(documentDisplayTitle({...doc,organization:{...doc.organization!,parts:[...doc.organization!.parts,...doc.organization!.parts]}})).toBe(generic);
});
