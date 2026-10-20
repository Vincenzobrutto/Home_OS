import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Home, DocumentSearchFilters } from '../api/types';
import { SearchForm } from './SearchForm';
const home={id:'home-test',name:'Casa test'} as Home;
const filters:DocumentSearchFilters={q:'',format:'pdf',visibility:'private',workflow:'pending',collection:'utilities'};

it('new query searches the entire archive after debounce, with one visible status control',async()=>{
 const user=userEvent.setup(),onApply=vi.fn();
 render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 await user.type(screen.getByRole('searchbox'),'bolletta');
 expect(screen.getByRole('button',{name:'Tutti'})).toHaveAttribute('aria-pressed','true');
 expect(onApply).not.toHaveBeenCalled();
 await waitFor(()=>expect(onApply).toHaveBeenLastCalledWith({q:'bolletta',workflow:'all',format:'all',visibility:'all'},true));
 expect(screen.queryByRole('combobox',{name:'Cerca in'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Cerca'})).not.toBeInTheDocument();
});

it('editing a query keeps explicit filters; clear query and remove filters are independent',async()=>{
 const user=userEvent.setup(),onApply=vi.fn(),applied={...filters,q:'luce',workflow:'completed' as const};
 render(<SearchForm home={home} applied={applied} maxQuery={120} autoFocus={false} onApply={onApply}/>);
 await user.type(screen.getByRole('searchbox'),' gas');
 await waitFor(()=>expect(onApply).toHaveBeenLastCalledWith({...applied,q:'luce gas'},true));
 await user.click(screen.getByRole('button',{name:'Rimuovi filtri'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,q:'luce gas',format:'all',visibility:'all',collection:'all'});
 await user.click(screen.getByRole('button',{name:'Azzera ricerca'}));
 expect(onApply).toHaveBeenLastCalledWith({...applied,q:''});
 expect(screen.getByRole('searchbox')).toHaveFocus();
});

it('filters are staged, cancellable and applied together; modal traps focus and restores it',async()=>{
 const user=userEvent.setup(),onApply=vi.fn();
 render(<SearchForm home={home} applied={{...filters,q:'luce'}} maxQuery={120} collectionsEnabled autoFocus={false} onApply={onApply}/>);
 const trigger=screen.getByRole('button',{name:'Filtri (3)'});
 await user.click(trigger);
 expect(screen.getByRole('button',{name:'Chiudi filtri'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Tab',shiftKey:true});
 expect(screen.getByRole('button',{name:'Mostra risultati'})).toHaveFocus();
 await user.selectOptions(screen.getByRole('combobox',{name:'Formato'}),'png');
 expect(onApply).not.toHaveBeenCalled();
 await user.keyboard('{Escape}');expect(trigger).toHaveFocus();
 await user.click(trigger);expect(screen.getByRole('combobox',{name:'Formato'})).toHaveValue('pdf');
 await user.selectOptions(screen.getByRole('combobox',{name:'Formato'}),'png');
 await user.click(screen.getByRole('button',{name:'Mostra risultati'}));
 expect(onApply).toHaveBeenLastCalledWith({...filters,q:'luce',format:'png'});
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('navigation cancels pending search; invalid query is never sent',async()=>{
 const user=userEvent.setup(),onApply=vi.fn();
 const view=render(<SearchForm home={home} applied={filters} maxQuery={5} autoFocus={false} onApply={onApply}/>);
 await user.type(screen.getByRole('searchbox'),'abcdef');
 expect(screen.getByRole('alert')).toHaveTextContent('5 caratteri');
 view.rerender(<SearchForm home={home} applied={{...filters,q:'gas',workflow:'review'}} maxQuery={5} autoFocus={false} onApply={onApply}/>);
 expect(screen.getByRole('searchbox')).toHaveValue('gas');
 await user.click(screen.getByRole('button',{name:'Filtri (3)'}));
 await user.click(screen.getByRole('button',{name:'Annulla'}));
 expect(onApply).not.toHaveBeenCalled();
});
