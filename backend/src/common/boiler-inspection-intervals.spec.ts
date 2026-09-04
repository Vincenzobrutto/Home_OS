import { lookupBoilerInterval } from './boiler-inspection-intervals';

describe('lookupBoilerInterval', () => {
  it('rispetta i confini stretti del Lazio a 10 e 100 kW', () => {
    expect(lookupBoilerInterval('Lazio', 10)).toBeNull();
    expect(lookupBoilerInterval('Lazio', 10.01)?.years).toBe(4);
    expect(lookupBoilerInterval('Lazio', 99.99)?.years).toBe(4);
    expect(lookupBoilerInterval('Lazio', 100)?.years).toBe(2);
  });

  it('copre anche la fascia Lombardia da 350 kW in su', () => {
    expect(lookupBoilerInterval('Lombardia', 34.99)?.years).toBe(2);
    expect(lookupBoilerInterval('Lombardia', 35)?.years).toBe(1);
    expect(lookupBoilerInterval('Lombardia', 350)?.years).toBe(1);
    expect(lookupBoilerInterval('Lombardia', 500)?.years).toBe(1);
  });
});
