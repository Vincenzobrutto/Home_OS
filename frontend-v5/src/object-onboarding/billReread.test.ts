import {expect,it} from 'vitest';
import {billDifferences,billRereadPatch} from './billReread';
import type {HouseForm} from './model';
const form:HouseForm={candidateId:'old',manual:false,amount:'80',supplier:'Corretto da me',date:'2026-09-03',invoiceMonth:'2026-08',category:'gas',periodFrom:'2026-08-01',periodTo:'2026-08-31',dueOn:'2026-09-20',title:'Titolo mio',mode:'link_existing',expenseId:'existing',ack:true,note:'Nota mia'};
it('compares only usable proposals and never erases missing fields',()=>{
 expect(billDifferences(form,{invoiceMonth:'2026-09',competenceFrom:'2026-09-01'})).toEqual([{field:'invoiceMonth',label:'Mese di riferimento della fattura',before:'2026-08',after:'2026-09'}]);
 expect(billRereadPatch(form,{},['supplier','amount','date','period'])).toEqual({});
});
it('applies only explicit fields, preserves links, mode, title, supplier and service period',()=>{
 const bill={invoiceMonth:'2026-09',supplier:'Proposto',amount:'90'};
 expect({...form,...billRereadPatch(form,bill,['invoiceMonth'])}).toEqual({...form,invoiceMonth:'2026-09'});
 expect(form.invoiceMonth).toBe('2026-08');
});
it('amount replacement becomes manual and invalidates old candidate and duplicate acknowledgement',()=>{
 expect(billRereadPatch(form,{amount:'90'},['amount','amount'])).toEqual({amount:'90',manual:true,candidateId:'',ack:false});
});
it('service period requires both ends and clears its old draft only on explicit selection',()=>{
 const bill={competenceFrom:'2026-09-01',competenceTo:'2026-09-30'};
 expect(billRereadPatch(form,bill,[])).toEqual({});
 expect(billRereadPatch(form,bill,['period'])).toEqual({periodFrom:'2026-09-01',periodTo:'2026-09-30',periodDraft:undefined});
 expect(billRereadPatch(form,{competenceFrom:'2026-09-01'},['period'])).toEqual({});
});
it('does not infer invoice month or service period from emission and due dates',()=>{
 expect(billDifferences(form,{documentDate:'2026-10-01',dueOn:'2026-10-20'}).map(d=>d.field)).toEqual(['date','dueOn']);
});
