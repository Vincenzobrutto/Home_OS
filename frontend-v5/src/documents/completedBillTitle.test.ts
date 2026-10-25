import {expect,it} from 'vitest';
import {completedBillTitle,type BillTitleContext} from './completedBillTitle';
import {documentDisplayTitle} from './presentation';
const doc:BillTitleContext={name:'file.pdf',originalFilename:'file.pdf',workflowState:'completed',organization:{title:'file.pdf',version:1,parts:[{kind:'utility_bill',pageFrom:null,pageTo:null}],collections:['utilities'],origin:'user_declared',updatedAt:'2026-01-01'},savedExpenses:[{id:'expense',title:'Bolletta',amountCents:1234,supplier:'Fornitore Prova',invoiceMonth:'2026-09',documentDate:'2026-10-03',documentNumber:null}]};
it('uses confirmed supplier and invoice month for completed bills without mutating source values',()=>{
 const before=JSON.stringify(doc);expect(documentDisplayTitle(doc)).toBe('Bolletta Fornitore Prova · settembre 2026');expect(JSON.stringify(doc)).toBe(before);
 expect(completedBillTitle({...doc,organization:{...doc.organization!,title:'file'}})).toBe('Bolletta Fornitore Prova · settembre 2026');
});
it.each(['to_compile','review','analyzing','attention',undefined] as const)('does not derive a title for workflow=%s',workflowState=>{
 expect(completedBillTitle({...doc,workflowState})).toBeNull();expect(documentDisplayTitle({...doc,workflowState})).toBe('file.pdf');
});
it.each(['Bolletta di casa scelta da me','Bolletta','bolletta settembre','Documento senza titolo'])('preserves custom title %s',title=>{
 expect(documentDisplayTitle({...doc,organization:{...doc.organization!,title}})).toBe(title);
});
it.each([undefined,'','2026-00','2026-13','0000-09','settembre','2026-09-01'])('does not infer missing or invalid invoice month %s from emission date',invoiceMonth=>{
 expect(completedBillTitle({...doc,savedExpenses:[{...doc.savedExpenses![0]!,invoiceMonth}]})).toBeNull();
});
it('does not choose between multiple expenses, infer missing supplier, or use proposals',()=>{
 expect(completedBillTitle({...doc,savedExpenses:[...doc.savedExpenses!,{...doc.savedExpenses![0]!,id:'second'}]})).toBeNull();
 for(const supplier of [null,'','  '])expect(completedBillTitle({...doc,savedExpenses:[{...doc.savedExpenses![0]!,supplier}]})).toBeNull();
 expect(completedBillTitle({...doc,savedExpenses:[]})).toBeNull();expect(completedBillTitle({...doc,savedExpenses:undefined})).toBeNull();
});
it.each(['invoice','receipt','purchase_order','other'])('does not apply bill title to type %s',kind=>{
 expect(completedBillTitle({...doc,organization:{...doc.organization!,parts:[{kind,pageFrom:null,pageTo:null}]}})).toBeNull();
});
it('mixed documents and older API responses keep their saved title',()=>{
 expect(completedBillTitle({...doc,organization:{...doc.organization!,parts:[...doc.organization!.parts,{kind:'invoice',pageFrom:2,pageTo:2}]}})).toBeNull();
 expect(completedBillTitle({...doc,organization:{...doc.organization!,parts:[...doc.organization!.parts,...doc.organization!.parts]}})).toBeNull();
 expect(documentDisplayTitle({name:'Nome vecchio'})).toBe('Nome vecchio');expect(completedBillTitle({...doc,originalFilename:undefined})).toBeNull();
});
