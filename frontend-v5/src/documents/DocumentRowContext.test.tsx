import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {describe,it,expect} from 'vitest';
import type {DocumentSummary} from '../api/types';
import {DocumentRowContext} from './DocumentRowContext';

const doc={name:'Fattura',organization:{parts:[{kind:'invoice'}]},linkedObjects:[{kind:'object',id:'one',name:'Impianto elettrico'},{kind:'boiler',id:'two',name:'Caldaia'}],savedExpenses:[{id:'e',title:'Acconto lavori elettrici',supplier:'Fornitore di esempio',documentNumber:'14',documentDate:'2026-06-16',amountCents:153720}]} as DocumentSummary;
describe('contesto Documenti con dati già salvati',()=>{
 it('mostra tutti i riferimenti e distingue la fattura senza cambiare il titolo',()=>{
  const before=JSON.stringify(doc);render(<MemoryRouter><DocumentRowContext doc={doc} homeId="home"/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Impianto elettrico'})).toHaveAttribute('href','/home/home/oggetti/object/one');
  expect(screen.getByRole('link',{name:'Caldaia'})).toHaveAttribute('href','/home/home/oggetti/boiler/two');
  expect(screen.getByText('Acconto lavori elettrici')).toBeVisible();
  expect(screen.getByText(/N. 14 · Emissione 16\/06\/2026/)).toHaveTextContent('1537,20');
  expect(JSON.stringify(doc)).toBe(before);
 });
 it('non inventa emissione, fornitore o collegamenti mancanti',()=>{
  const {container}=render(<MemoryRouter><DocumentRowContext homeId="home" doc={{...doc,linkedObjects:[],savedExpenses:[{...doc.savedExpenses![0]!,supplier:null,documentNumber:null,documentDate:null}]}}/></MemoryRouter>);
  expect(container).not.toHaveTextContent('Emissione');expect(screen.queryByRole('link')).toBeNull();
 });
 it('non presenta una ricevuta come fattura e supporta risposte API precedenti',()=>{
  const {container}=render(<MemoryRouter><DocumentRowContext homeId="home" doc={{...doc,linkedObjects:undefined,organization:null}}/></MemoryRouter>);
  expect(container).toBeEmptyDOMElement();
 });
});
