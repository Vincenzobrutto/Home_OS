import {expect,it} from 'vitest';
import {proposalIdentity} from './proposalStatus';
import type {Draft} from './model';
const fixture=():Draft=>({id:'d',version:1,state:'confirmed',mode:'extraction',documentKind:'utility_bill',snapshot:null,document:null,items:[],needsReview:false,purchaseTotal:null,review:null,permissions:[],houseExpenses:[{id:'cost',amountCandidates:[],amountSelectionRequired:false,decision:null,documentKind:'utility_bill',proposedFields:Object.fromEntries(Object.entries({supplier:'Fornitore di prova',documentDate:'2026-01-17',competenceFrom:'2025-12-01',competenceTo:'2025-12-31',dueOn:'2026-02-06'}).map(([key,value])=>[key,{value,sources:[]}]))}]});
it('labels the existing proposal date explicitly as emission without duplicating the saved summary',()=>{
 const label=proposalIdentity(fixture());expect(label).not.toContain('Periodo');expect(label).toContain('Emissione sab 17 gennaio 2026');expect(label).not.toContain('Scadenza');expect(label).not.toContain('17/01/2026');
});
it('does not invent a missing emission date or substitute the reference month',()=>{
 const draft=fixture();delete draft.houseExpenses![0]!.proposedFields.documentDate;expect(proposalIdentity(draft)).not.toContain('Emissione');expect(proposalIdentity(draft)).not.toContain('dicembre');
});
it('keeps invoice/receipt identity and avoids inventing a billing period for them',()=>{
 const draft=fixture();draft.houseExpenses![0]!.documentKind='simple_invoice';expect(proposalIdentity(draft,'receipt')).toMatch(/^Ricevuta/);expect(proposalIdentity(draft,'invoice')).toMatch(/^Fattura/);expect(proposalIdentity(draft)).not.toContain('Periodo');
});
