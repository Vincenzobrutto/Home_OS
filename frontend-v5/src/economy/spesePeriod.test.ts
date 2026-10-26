import {describe,expect,it} from 'vitest';
import {monthPeriod,samePeriod} from './spesePeriod';
describe('periodo mensile delle spese, senza cambiare il contratto server',()=>{
  it.each([
    ['2026-09','2026-10-27','2026-09-30'],
    ['2026-10','2026-10-27','2026-10-27'],
    ['2024-02','2026-10-27','2024-02-29'],
    ['2025-02','2026-10-27','2025-02-28'],
    ['2025-12','2026-10-27','2025-12-31'],
    ['0001-02','2026-10-27','0001-02-28'],
  ])('%s produce un solo intervallo dal primo giorno a %s',(month,today,to)=>{
    expect(monthPeriod(month,today)).toEqual({kind:'range',from:month+'-01',to});
  });
  it.each(['','0000-01','2026-00','2026-13','2026-1','2026-11','2026-10-01'])('rifiuta mese malformato o futuro: %s',month=>expect(monthPeriod(month,'2026-10-27')).toBeNull());
  it('non conserva la selezione Mese se cambia l’intervallo',()=>{
    expect(samePeriod(monthPeriod('2026-09','2026-10-27')!,{kind:'range',from:'2026-09-01',to:'2026-09-30'})).toBe(true);
    expect(samePeriod(monthPeriod('2026-09','2026-10-27')!,{kind:'range',from:'2026-09-02',to:'2026-09-30'})).toBe(false);
  });
});
