import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {SaveSummary} from './SaveSummary';
import {initialForm,type Draft,type HouseForm} from './model';
const draft:Draft={id:'d',version:1,state:'open',mode:'manual',documentKind:'utility_bill',snapshot:null,document:{id:'doc',name:'Bolletta di prova',mimeType:'application/pdf'},items:[],houseExpenses:[{id:'cost',documentKind:'utility_bill',proposedFields:{},amountCandidates:[],amountSelectionRequired:false,decision:null}],needsReview:false,purchaseTotal:null,review:null,permissions:[]};
const form:HouseForm={candidateId:'',manual:true,amount:'93,39',title:'Luce dicembre',supplier:'Fornitore di prova',date:'2026-01-17',category:'electricity',mode:'create',expenseId:'',ack:false,periodFrom:'2025-12-01',periodTo:'2025-12-31',dueOn:'2026-02-06'};
it('shows current amount, supplier, reference month and separate issue/due dates; updates with edits',()=>{
 const {rerender}=render(<SaveSummary draft={draft} forms={{}} houseForms={{cost:form}} documentOnly={false}/>);
 expect(screen.getByText('dicembre 2025')).toBeVisible();expect(screen.getByText(/Fornitore di prova/)).toBeVisible();expect(screen.getByText('93,39 €')).toBeVisible();
 expect(screen.getByText('Emissione').nextSibling).toHaveTextContent('17 gennaio 2026');expect(screen.getByText('Scadenza').nextSibling).toHaveTextContent('6 febbraio 2026');expect(screen.getByText(/Nessun nuovo oggetto/)).toBeVisible();
 rerender(<SaveSummary draft={draft} forms={{}} houseForms={{cost:{...form,amount:'12,',periodTo:'',date:'',dueOn:''}}} documentOnly={false}/>);
 expect(screen.queryByText('93,39 €')).not.toBeInTheDocument();expect(screen.queryByText('dicembre 2025')).not.toBeInTheDocument();expect(screen.getAllByText('Da completare').length).toBeGreaterThan(0);
});
it('existing links, exclusion and only-document mode never present a new expense',()=>{
 const {rerender}=render(<SaveSummary draft={draft} forms={{}} houseForms={{cost:{...form,mode:'link_existing',expenseId:'existing'}}} documentOnly={false}/>);
 expect(screen.getByText('Collega una spesa esistente')).toBeVisible();expect(screen.queryByText('93,39 €')).not.toBeInTheDocument();
 rerender(<SaveSummary draft={draft} forms={{}} houseForms={{cost:{...form,mode:'skip'}}} documentOnly={false}/>);expect(screen.getByText('Spesa esclusa')).toBeVisible();
 rerender(<SaveSummary draft={draft} forms={{}} houseForms={{cost:form}} documentOnly/>);expect(screen.getByText(/Conservi solo il documento/)).toBeVisible();expect(screen.queryByText('Nuova spesa')).not.toBeInTheDocument();
});
it('invoice installment summary distinguishes reuse of an existing installation from creating an object',()=>{
 render(<SaveSummary draft={{...draft,houseExpenses:[{...draft.houseExpenses![0]!,documentKind:'simple_invoice'}]}} forms={{}} houseForms={{cost:{...form,title:'Acconto · Impianto sintetico',objectChoice:'object:existing'}}} documentOnly={false}/>);
 expect(screen.getByText('Acconto · Impianto sintetico')).toBeVisible();expect(screen.getByText(/Spesa e documento collegati a oggetto o impianto scelto/)).toBeVisible();expect(screen.queryByText(/Nessun nuovo oggetto. Usi quello già esistente/)).not.toBeInTheDocument();expect(screen.queryByText('Nessun nuovo oggetto o collegamento a oggetti.')).not.toBeInTheDocument();
});
it('invoice uses expense date and excluded articles do not appear as objects or expenses',()=>{
 const item:Draft['items'][number]={id:'i',nameTruncated:false,disposition:'household_object',fields:{},quantity:{value:2},profile:{},enrichment:null,decision:null};
 const invoice={...draft,items:[item],houseExpenses:[{...draft.houseExpenses![0]!,documentKind:'simple_invoice' as const}]};const f={...initialForm(item,invoice),action:'skip' as const,name:'Escluso',expense:'create' as const,amount:'999'};
 render(<SaveSummary draft={invoice} forms={{i:f}} houseForms={{cost:form}} documentOnly={false}/>);expect(screen.getByText('Data della spesa')).toBeVisible();expect(screen.queryByText('Periodo di riferimento')).not.toBeInTheDocument();expect(screen.queryByText(/Escluso/)).not.toBeInTheDocument();expect(screen.queryByText('999,00 €')).not.toBeInTheDocument();
});
