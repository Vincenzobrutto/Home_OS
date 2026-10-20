import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Home } from '../api/types';
import { SearchForm } from './SearchForm';

const home={id:'home-test',name:'Casa test'} as Home;
const filters={q:'',format:'all' as const,visibility:'all' as const,workflow:'pending' as const};

it('shows the current view until text is entered, then visibly searches globally',async()=>{
  const user=userEvent.setup(),onApply=vi.fn();
  render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={onApply}/>);
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('pending');
  await user.click(screen.getByRole('button',{name:'Cerca'}));
  expect(onApply).toHaveBeenLastCalledWith(filters);
  await user.type(screen.getByRole('searchbox'),'bolletta');
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('all');
  expect(onApply).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button',{name:'Cerca'}));
  expect(onApply).toHaveBeenLastCalledWith({...filters,q:'bolletta',workflow:'all'});
});

it('honors an explicit scope while typing and resynchronizes on navigation',async()=>{
  const user=userEvent.setup(),onApply=vi.fn();
  const view=render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={onApply}/>);
  await user.selectOptions(screen.getByRole('combobox',{name:'Cerca in'}),'completed');
  await user.type(screen.getByRole('searchbox'),'fattura');
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('completed');
  await user.click(screen.getByRole('button',{name:'Cerca'}));
  expect(onApply).toHaveBeenLastCalledWith({...filters,q:'fattura',workflow:'completed'});
  view.rerender(<SearchForm home={home} applied={{...filters,q:'fattura',workflow:'completed'}} maxQuery={120} autoFocus={false} onApply={onApply}/>);
  await user.type(screen.getByRole('searchbox'),' luce');
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('completed');
  view.rerender(<SearchForm home={home} applied={{...filters,workflow:'review'}} maxQuery={120} autoFocus={false} onApply={onApply}/>);
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('review');
  expect(screen.getByRole('searchbox')).toHaveValue('');
});

it('clearing or resetting an unapplied query restores the current view',async()=>{
  const user=userEvent.setup();
  render(<SearchForm home={home} applied={filters} maxQuery={120} autoFocus={false} onApply={vi.fn()}/>);
  await user.type(screen.getByRole('searchbox'),'test');
  await user.clear(screen.getByRole('searchbox'));
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('pending');
  await user.type(screen.getByRole('searchbox'),'test');
  await user.click(screen.getByRole('button',{name:'Azzera filtri'}));
  expect(screen.getByRole('combobox',{name:'Cerca in'})).toHaveValue('pending');
});
