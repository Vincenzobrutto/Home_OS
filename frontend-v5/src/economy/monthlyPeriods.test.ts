import { expect, it } from 'vitest';
import { monthlyPeriods } from './monthlyPeriods';

it('tre mesi compreso quello corrente, con estremi parziali identici al riepilogo', () => {
  expect(monthlyPeriods({ from:'2026-01-01', to:'2026-10-27' },false).items).toEqual([
    { month:'2026-08',period:{from:'2026-08-01',to:'2026-08-31'},partial:false },
    { month:'2026-09',period:{from:'2026-09-01',to:'2026-09-30'},partial:false },
    { month:'2026-10',period:{from:'2026-10-01',to:'2026-10-27'},partial:true },
  ]);
});
it('espansione dell’anno e pagina limitata degli intervalli lunghi', () => {
  expect(monthlyPeriods({from:'2025-01-01',to:'2025-12-31'},true).items).toHaveLength(12);
  const range={from:'2024-01-10',to:'2026-10-27'};
  expect(monthlyPeriods(range,true).pages).toBe(3);
  expect(monthlyPeriods(range,true).items.at(0)?.month).toBe('2025-11');
  expect(monthlyPeriods(range,true,1).items.at(-1)?.month).toBe('2025-10');
  expect(monthlyPeriods(range,true,2).items[0]).toEqual({month:'2024-01',period:{from:'2024-01-10',to:'2024-01-31'},partial:true});
});
it.each([
  ['2024-02-01','2024-02-29',false],['2025-02-01','2025-02-28',false],
  ['0001-02-01','0001-02-28',false],['2026-09-15','2026-09-20',true],
])('calendario e intervallo breve %s – %s',(from,to,partial)=>{
  expect(monthlyPeriods({from,to},false).items).toEqual([{month:from.slice(0,7),period:{from,to},partial}]);
});
it.each([
  {from:'2026-02-30',to:'2026-10-01'}, {from:'2026-10-02',to:'2026-10-01'}, {from:'0000-01-01',to:'2026-10-01'},
])('nessuna richiesta per un calendario non valido',range=>expect(monthlyPeriods(range,true)).toEqual({items:[],pages:0}));
