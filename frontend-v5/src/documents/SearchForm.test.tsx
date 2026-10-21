import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Home, DocumentSearchFilters } from '../api/types';
import { SearchForm } from './SearchForm';
const home={id:'home-test',name:'Casa test'} as Home;
const filters:DocumentSearchFilters={q:'',format:'pdf',visibility:'private',workflow:'pending',collection:'utilities'};

it('new search spans the archive and removes explicit restrictions without a second Tutti control',async()=>{
 const user=userEvent.setup(),onApply=vi.fn();
 render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 expect(screen.queryByRole('group',{name:'Stato dei documenti'})).not.toBeInTheDocument();
 expect(screen.queryByRole('combobox',{name:'Stato'})).not.toBeInTheDocument();
 await user.type(screen.getByRole('searchbox'),'bolletta');
 await waitFor(()=>expect(onApply).toHaveBeenLastCalledWith({q:'bolletta',workflow:'all',format:'all',visibility:'all'},true));
 expect(screen.getByRole('status')).toHaveTextContent('Ricerca nell’intero archivio');
});

it('state and type are staged together, cancellable and do not duplicate the house view',async()=>{
 const user=userEvent.setup(),onApply=vi.fn(),applied={...filters,q:'fattura',view:'all' as const};
 render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} collectionsEnabled documentViewsEnabled onApply={onApply}/>);
 const trigger=screen.getByRole('button',{name:'Filtri (4)'});await user.click(trigger);
 expect(screen.getByRole('combobox',{name:'Stato'})).toHaveValue('pending');
 expect(screen.queryByRole('option',{name:'Documenti della casa'})).not.toBeInTheDocument();
 await user.selectOptions(screen.getByRole('combobox',{name:'Stato'}),'completed');
 await user.selectOptions(screen.getByRole('combobox',{name:'Categoria del documento'}),'contracts');
 expect(onApply).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Annulla'}));
 expect(trigger).toHaveFocus();await user.click(trigger);
 expect(screen.getByRole('combobox',{name:'Stato'})).toHaveValue('pending');
 await user.selectOptions(screen.getByRole('combobox',{name:'Stato'}),'completed');
 await user.click(screen.getByRole('button',{name:'Mostra risultati'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,workflow:'completed'});
});

it('state is visible as a removable filter; reset filters keeps query and view',async()=>{
 const user=userEvent.setup(),onApply=vi.fn(),applied={...filters,q:'luce',view:'house' as const,workflow:'completed' as const};
 render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 await user.click(screen.getByRole('button',{name:'Rimuovi filtro Stato: Completati'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,workflow:'all'});
 await user.click(screen.getByRole('button',{name:'Rimuovi filtri'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,format:'all',visibility:'all',collection:'all',workflow:'all'});
 await user.click(screen.getByRole('button',{name:'Azzera ricerca'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,q:''});expect(screen.getByRole('searchbox')).toHaveFocus();
});

it('modal traps focus and Escape restores the filters button',async()=>{
 const user=userEvent.setup(),onApply=vi.fn();
 render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 const trigger=screen.getByRole('button',{name:'Filtri (4)'});await user.click(trigger);
 expect(screen.getByRole('button',{name:'Chiudi filtri'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Tab',shiftKey:true});expect(screen.getByRole('button',{name:'Mostra risultati'})).toHaveFocus();
 await user.keyboard('{Escape}');expect(trigger).toHaveFocus();expect(onApply).not.toHaveBeenCalled();
});

it('changing query retains explicit filters; invalid queries never reach the server',async()=>{
 const user=userEvent.setup(),onApply=vi.fn(),applied={...filters,q:'gas'};
 const view=render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 await user.type(screen.getByRole('searchbox'),' luce');
 await waitFor(()=>expect(onApply).toHaveBeenLastCalledWith({...applied,q:'gas luce'},true));
 onApply.mockClear();view.rerender(<SearchForm home={home} applied={{...applied,q:'altro'}} maxQuery={5} autoFocus={false} onApply={onApply}/>);
 await user.type(screen.getByRole('searchbox'),'x');expect(screen.getByRole('alert')).toHaveTextContent('5 caratteri');
 fireEvent.submit(screen.getByRole('searchbox').closest('form')!);expect(onApply).not.toHaveBeenCalled();
});

it('archivio unico: famiglia e collegamento nello stesso dialogo, senza categorie duplicate',async()=>{
 const user=userEvent.setup(),onApply=vi.fn(),applied:DocumentSearchFilters={q:'fattura',format:'all',visibility:'all',view:'archive'};
 render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} collectionsEnabled documentViewsEnabled documentFamiliesEnabled onApply={onApply}/>);
 await user.click(screen.getByRole('button',{name:'Filtri'}));expect(screen.queryByRole('combobox',{name:'Categoria del documento'})).not.toBeInTheDocument();
 await user.selectOptions(screen.getByRole('combobox',{name:'Famiglia'}),'works');await user.selectOptions(screen.getByRole('combobox',{name:'Collegamento'}),'objects');await user.click(screen.getByRole('button',{name:'Mostra risultati'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,workflow:'all',collection:undefined,group:'works',related:'objects'});
});
