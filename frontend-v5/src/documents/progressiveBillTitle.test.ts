import {expect,it} from 'vitest';
import {completedBillTitle,type BillTitleContext} from './completedBillTitle';
import {documentDisplayTitle} from './presentation';
const original='b'.repeat(32)+'.pdf';
const expense={id:'e1',title:'Una proposta diversa',amountCents:100,supplier:'  Fornitore\n generico  ',documentNumber:null,documentDate:'2026-10-03'};
const doc:BillTitleContext={name:original,originalFilename:original,workflowState:'completed',organization:{title:original,version:1,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-01'},savedExpenses:[expense]};
it('shows a known supplier without inventing the month from document date or filename',()=>{
 const before=JSON.stringify(doc);expect(documentDisplayTitle(doc)).toBe('Bolletta Fornitore generico');expect(JSON.stringify(doc)).toBe(before);
});
it('shows a valid invoice month independently of supplier',()=>{
 expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,supplier:null,invoiceMonth:'2026-09'}]})).toBe('Bolletta · settembre 2026');
});
it.each([undefined,[]])('keeps the original hashed filename visible when no saved expense facts exist: %s',savedExpenses=>{
 expect(documentDisplayTitle({...doc,savedExpenses})).toBe('Bolletta · '+original);
});
it.each(['','2026-00','2026-13','0000-01','settembre','2026-09-01'])('ignores invalid month %s while retaining available supplier',invoiceMonth=>{
 expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,invoiceMonth}]})).toBe('Bolletta Fornitore generico');
 expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,supplier:null,invoiceMonth}]})).toBe('Bolletta · '+original);
});
it('does not use either supplier or month from multiple expenses, including agreeing ones',()=>{
 expect(documentDisplayTitle({...doc,savedExpenses:[{...expense,invoiceMonth:'2026-09'},{...expense,id:'e2',invoiceMonth:'2026-09'}]})).toBe('Bolletta · '+original);
});
it.each(['Documento senza titolo','Bolletta','Titolo scelto da me'])('preserves saved custom title %s even with partial facts',title=>{
 expect(documentDisplayTitle({...doc,organization:{...doc.organization!,title}})).toBe(title);
});
it('does not rename a composite document, an unfinished bill or an older response without original filename',()=>{
 expect(completedBillTitle({...doc,organization:{...doc.organization!,parts:[...doc.organization!.parts,...doc.organization!.parts]}})).toBeNull();
 expect(completedBillTitle({...doc,workflowState:'review'})).toBeNull();
 expect(completedBillTitle({...doc,originalFilename:undefined})).toBeNull();
});
