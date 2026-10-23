import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { ApparatusSuggestion } from './ApparatusSuggestion';
import { apparatusReference, apparatusSuggestions, typicalRooms } from './apparatusSuggestions';

it('reference contains only the 91 generic rows, with stable provenance and supported types', () => {
  expect(apparatusReference.entries).toHaveLength(91);
  expect(new Set(apparatusReference.entries.map(e=>e.id)).size).toBe(91);
  for(const e of apparatusReference.entries){expect(e.aliases.length).toBeGreaterThan(0);expect(e.sourceRow).toBeGreaterThanOrEqual(2);expect(e.sourceRow).toBeLessThanOrEqual(92);expect(['appliance','heating','cooling','electrical','plumbing','security','fixture','other']).toContain(e.objectType);}
  expect(JSON.stringify(apparatusReference)).not.toMatch(/Numero di serie|Prezzo pagato|Ce l.ho in casa/);
});
it('recognizes explicit names and aliases but preserves disjoint and unspecified ambiguities', () => {
  expect(apparatusSuggestions('MACC CAFFE NUBEO C2')[0]?.sourceRow).toBe(12);
  expect(apparatusSuggestions('Robot aspirapolvere Nubeo')[0]?.sourceRow).toBe(79);
  expect(apparatusSuggestions('Ferro da stiro a caldaia Nubeo')).toHaveLength(1);
  expect(apparatusSuggestions('Ferro da stiro a caldaia Nubeo')[0]?.sourceRow).toBe(21);
  expect(apparatusSuggestions('Climatizzatore portatile Nubeo')[0]?.subjectKind).toBe('product');
  expect(apparatusSuggestions('Climatizzatore fisso Nubeo')[0]?.subjectKind).toBe('system');
  expect(apparatusSuggestions('Lavatrice e asciugatrice')).toHaveLength(2);
  for(const name of ['Nubeo X100','Climatizzatore Nubeo','Filtro per lavatrice','Riparazione caldaia','Kit pulizia forno','Nubeo filtro per lavatrice','Nubeo cartuccia per stampante']) expect(apparatusSuggestions(name)).toEqual([]);
});
it('room proposals are restricted to supplied active rooms, without a default or invented room', () => {
  const rooms:Pick<Room,'id'|'name'|'type'|'state'>[]=[{id:'k',name:'Cucina blu',type:'kitchen',state:'active'},{id:'c',name:'Cantina',type:'other',state:'active'},{id:'g',name:'Garage',type:'other',state:'active'},{id:'l',name:'Lavanderia',type:'utility',state:'active'},{id:'b',name:'Bagno',type:'bathroom',state:'archived'}];
  expect(typicalRooms(apparatusSuggestions('Congelatore')[0]!,rooms).map(r=>r.id)).toEqual(['k','c','g']);
  expect(typicalRooms(apparatusSuggestions('Lavatrice')[0]!,rooms).map(r=>r.id)).toEqual(['k','l']);
  expect(typicalRooms(apparatusSuggestions('Frigorifero')[0]!,[])).toEqual([]);
  expect(typicalRooms(apparatusSuggestions('Impianto fotovoltaico')[0]!,rooms)).toEqual([]);
});
it('offers a type only after an explicit click and never overrides a chosen type', async () => {
  const onType=vi.fn();const view=render(<ApparatusSuggestion name="Lavatrice Nubeo" selectedType="" disabled={false} onType={onType}/>);
  expect(onType).not.toHaveBeenCalled();expect(screen.getByText(/Ambiente tipico, da confermare/)).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button',{name:'Usa il tipo suggerito'}));expect(onType).toHaveBeenCalledExactlyOnceWith('appliance');
  view.rerender(<ApparatusSuggestion name="Lavatrice Nubeo" selectedType="other" disabled={false} onType={onType}/>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(onType).toHaveBeenCalledOnce();
});
