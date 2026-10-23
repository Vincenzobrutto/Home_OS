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

it('a more specific alias suppresses only the same occurrence, never another explicitly named apparatus', () => {
  for (const names of [['Forno', 'Forno microonde'], ['Caldaia', 'Ferro da stiro a caldaia']]) {
    const expected = [...new Set(names.flatMap(name => apparatusSuggestions(name).map(entry => entry.id)))].sort();
    expect(expected).toHaveLength(2);
    for (const text of [names.join(' e '), [...names].reverse().join(' + '), names.join('; ')]) {
      expect(apparatusSuggestions(text).map(entry => entry.id).sort()).toEqual(expected);
    }
  }
  expect(apparatusSuggestions('Forno microonde')).toHaveLength(1);
  expect(apparatusSuggestions('Ferro da stiro a caldaia')).toHaveLength(1);
});

it('declared room type takes precedence over another room mentioned in its name', () => {
  const rooms: Pick<Room, 'id' | 'name' | 'type' | 'state'>[] = [
    { id: 'hall', name: 'Corridoio della cucina', type: 'hall', state: 'active' },
    { id: 'bath', name: 'Bagno ex cucina', type: 'bathroom', state: 'active' },
    { id: 'real', name: 'Ambiente 7', type: 'kitchen', state: 'active' },
    { id: 'named', name: 'Cucina al piano terra', type: 'other', state: 'active' },
    { id: 'archived', name: 'Cucina', type: 'kitchen', state: 'archived' },
  ];
  const before = structuredClone(rooms), entry = apparatusSuggestions('Frigorifero')[0]!;
  expect(typicalRooms(entry, rooms).map(room => room.id)).toEqual(['real', 'named']);
  expect(rooms).toEqual(before);
});

it('catalog hints normalize Unicode without guessing brand/model-only identities', () => {
  for (const name of ['Macchina da caffè ORBITA QX-51/B', 'MACCHINA\u00a0DA CAFFE\u0300 Lumen AB.100', 'macchina-da-caffè NuovaMarca ZX.2']) {
    expect(apparatusSuggestions(name)[0]?.sourceRow).toBe(12);
  }
  expect(apparatusSuggestions('frigoriferone')).toEqual([]);
  expect(apparatusSuggestions('Lumen AB.100')).toEqual([]);
});

it('broader room types retain explicitly named subtypes without treating every outdoor space as a garden', () => {
  const rooms: Pick<Room, 'id' | 'name' | 'type' | 'state'>[] = [
    { id: 'garden', name: 'Giardino', type: 'outdoor', state: 'active' },
    { id: 'balcony', name: 'Balcone', type: 'outdoor', state: 'active' },
    { id: 'unknown', name: 'Spazio aperto', type: 'outdoor', state: 'active' },
    { id: 'contradiction', name: 'Cucina sul giardino', type: 'kitchen', state: 'active' },
    { id: 'stairs', name: 'Vano scale', type: 'hall', state: 'active' },
  ];
  expect(typicalRooms(apparatusSuggestions('Tosaerba')[0]!, rooms).map(room => room.id)).toEqual(['garden']);
  expect(typicalRooms(apparatusSuggestions('Caldaia')[0]!, rooms).map(room => room.id)).toEqual(['balcony', 'contradiction']);
  expect(typicalRooms(apparatusReference.entries.find(entry => entry.roomKeys.includes('stairs'))!, rooms).map(room => room.id)).toEqual(['stairs']);
});

it('separately named generic and specific apparatus remain ambiguous in the editor', () => {
  const onType = vi.fn();
  render(<ApparatusSuggestion name="Caldaia ORBITA Q-7 e ferro da stiro a caldaia Lumen B/20" selectedType="" disabled={false} onType={onType}/>);
  expect(screen.getByText(/più apparati/)).toBeVisible();
  expect(screen.queryByLabelText('Suggerimento dal catalogo apparati')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(onType).not.toHaveBeenCalled();
});

it('disabled and ambiguous suggestions never select a type or room', async () => {
  const onType = vi.fn(), view = render(<ApparatusSuggestion name="Frigorifero" selectedType="" disabled onType={onType}/>);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Usa il tipo suggerito' }));
  expect(onType).not.toHaveBeenCalled();
  view.rerender(<ApparatusSuggestion name="Lavatrice e asciugatrice" selectedType="" disabled={false} onType={onType}/>);
  expect(screen.getByText(/più apparati/)).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(onType).not.toHaveBeenCalled();
});
