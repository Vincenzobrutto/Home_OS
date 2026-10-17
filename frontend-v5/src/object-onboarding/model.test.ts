import { expect, it } from 'vitest';
import { editProfileField, initialForm, type Draft, type Item } from './model';
const item={id:'x',profile:{},fields:{name:{value:'Demo'}},enrichment:null} as Item;
const form=()=>initialForm(item,{purchaseTotal:null} as Draft);
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
