import { describe, expect, it } from 'vitest';
import { changeList } from './History';

describe('storia G1 sul DTO reale proiettato', () => {
  it('mostra la posizione annidata nella scheda senza stampare identificativi', () => {
    const changes = changeList({ id: 'evento', kind: 'position_updated', at: '2026-10-14T10:00:00Z',
      before: { name: 'Lavatrice', position: { rooms: [] } },
      after: { name: 'Lavatrice', position: { rooms: [{ id: 'identificativo-interno', name: 'Ripostiglio' }] } },
    });
    expect(changes).toEqual(['Posizione: Da collocare → Ripostiglio']);
    expect(changes.join(' ')).not.toContain('identificativo-interno');
  });
});
