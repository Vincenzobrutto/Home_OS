import { expect, it } from 'vitest';
import { choice, profileNeedsReview, expenseNeedsReview, editProfileField, initialForm, houseExpenseTitle, type HouseExpense, type Draft, type Item } from './model';
const item={id:'x',profile:{},fields:{name:{value:'Demo'}},enrichment:null} as Item;
const form=()=>initialForm(item,{purchaseTotal:null} as Draft);
it('prefills only explicit and unambiguous invoice installment wording from the current original',()=>{
 const invoice={documentKind:'simple_invoice',proposedFields:{title:{value:'Fattura di primo acconto',sources:[]}}} as unknown as HouseExpense;
 const draft={snapshot:{documentId:'source'},documentInfo:null} as Draft;
 expect(houseExpenseTitle(invoice,draft)).toBe('Acconto · Fattura di primo acconto');
 const source={documentId:'source',page:1,excerpt:'Fattura di saldo per lavori'};
 const described={...invoice,proposedFields:{title:{value:'Lavori impianto',sources:[source]}}} as unknown as HouseExpense;
 expect(houseExpenseTitle(described,draft)).toBe('Saldo · Lavori impianto');
 expect(houseExpenseTitle({...described,proposedFields:{title:{value:'Lavori impianto',sources:[{...source,documentId:'another'}]}}} as unknown as HouseExpense,draft)).toBe('Lavori impianto');
 expect(houseExpenseTitle({...described,proposedFields:{title:{value:'Saldo precedente del conto',sources:[]}}} as unknown as HouseExpense,draft)).toBe('Saldo precedente del conto');
 expect(houseExpenseTitle({...described,proposedFields:{title:{value:'Fattura di acconto',sources:[source]}}} as unknown as HouseExpense,draft)).toBe('Fattura di acconto');
 expect([...houseExpenseTitle({...described,proposedFields:{title:{value:'x'.repeat(120),sources:[source]}}} as unknown as HouseExpense,draft)!]).toHaveLength(120);
});
it('manual purchase proposes 24 calendar months and clamps leap-day',()=>{const r=editProfileField(form(),'purchaseDate',{action:'manual',value:'2024-02-29'},{},{});expect(r.fields.warrantyStart).toEqual({action:'manual',value:'2024-02-29'});expect(r.fields.warrantyEnd?.value).toBe('2026-02-28');});
it('effective delivery takes precedence and removing dates removes only automatic defaults',()=>{let r=editProfileField(form(),'purchaseDate',{action:'manual',value:'2025-01-01'},{},{});r=editProfileField(r,'deliveredDate',{action:'manual',value:'2025-01-05'},{},{});expect(r.fields.warrantyStart?.value).toBe('2025-01-05');r=editProfileField(r,'deliveredDate',{action:'skip'},{},{});expect(r.fields.warrantyStart?.value).toBe('2025-01-01');r=editProfileField(r,'purchaseDate',{action:'skip'},{},{});expect(r.fields.warrantyStart?.action).toBe('skip');expect(r.fields.warrantyEnd?.action).toBe('skip');});
it('manual extension remains unchanged when purchase or delivery changes',()=>{let r=editProfileField(form(),'purchaseDate',{action:'manual',value:'2025-01-01'},{},{});r=editProfileField(r,'warrantyEnd',{action:'manual',value:'2030-01-01'},{},{});r=editProfileField(r,'deliveredDate',{action:'manual',value:'2025-01-08'},{},{});expect(r.fields.warrantyEnd?.value).toBe('2030-01-01');});
it('explicit document warranty and already confirmed dates are never recomputed',()=>{const profile={warrantyStart:{value:'2024-01-01',origin:'extraction_confirmed',sources:[]},warrantyEnd:{value:'2029-01-01',origin:'extraction_confirmed',sources:[]}},f=initialForm({...item,profile},{purchaseTotal:null} as Draft);const r=editProfileField(f,'purchaseDate',{action:'manual',value:'2025-01-01'},profile,{});expect(r.fields.warrantyStart?.action).toBe('accept');expect(r.fields.warrantyEnd?.action).toBe('accept');const linked=editProfileField(form(),'purchaseDate',{action:'manual',value:'2025-01-01'},{},profile);expect(linked.fields.warrantyStart).toBeUndefined();expect(linked.fields.warrantyEnd).toBeUndefined();});
import { automaticExpenseEligible } from './model';
it('automatic expense requires one supported item, verified amount/date and no review ambiguity',()=>{
 const receipt={mode:'extraction',documentKind:'purchase_document',needsReview:false,purchaseTotal:{amountCents:9999},items:[item]} as Draft;
 const dated={...item,quantity:{value:1},profile:{purchaseDate:{value:'2025-06-13',origin:'extraction_confirmed',sources:[]}}} as Item;
 expect(automaticExpenseEligible(dated,receipt)).toBe(true);
 for(const patch of [{mode:'manual'},{documentKind:'delivery_notice'},{needsReview:true},{purchaseTotal:null},{items:[item,item]}])expect(automaticExpenseEligible(dated,{...receipt,...patch} as Draft)).toBe(false);
 expect(automaticExpenseEligible({...dated,quantity:{value:2}},receipt)).toBe(false);expect(automaticExpenseEligible(item,receipt)).toBe(false);
});
it('excluded item never carries stale amounts, expense links, profile fields or manual selections',()=>{
 const f={...form(),action:'skip' as const,expense:'create' as const,amount:'500',expenseId:'stale',expenseAutoState:'pending' as const};
 expect(choice(item,f)).toEqual({itemId:'x',action:'skip'});expect(expenseNeedsReview(f)).toBe(false);
});

it('replacement requires current value and explicit consent, never a client supplied replacement value',()=>{
 const f=form();f.fields.brand={action:'replace',expectedValue:'Old',consent:false};expect(profileNeedsReview(f)).toBe(true);
 f.fields.brand.consent=true;expect(profileNeedsReview(f)).toBe(false);expect(choice(item,f)).toMatchObject({fields:{brand:{action:'replace',expectedValue:'Old',consent:true}}});
});
it('multi-item purchases never prefill the total as an item price and require item-only consent',()=>{
 const d={purchaseTotal:{amountCents:22990},items:[item,item]} as Draft;const f=initialForm(item,d);expect(f.amount).toBe('');expect(f.expense).toBe('skip');
 f.expense='create';f.amount='99';f.spentOn='2025-06-13';expect(expenseNeedsReview(f)).toBe(true);f.manualItemAmount=true;expect(expenseNeedsReview(f)).toBe(false);
 expect(choice(item,f)).toMatchObject({expense:{action:'create',amountCents:9900,manualItemAmount:true}});
});
