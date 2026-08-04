import { findPossibleDuplicate } from './genesis-duplicate';

describe('findPossibleDuplicate', () => {
  it('matches an exact name regardless of case', () => {
    const match = findPossibleDuplicate('Cucina', [
      { id: 'r1', name: 'cucina' },
    ]);
    expect(match?.id).toBe('r1');
  });

  it('matches on a shared significant word (bagno_1 vs Bagno)', () => {
    const match = findPossibleDuplicate('Bagno', [
      { id: 'r1', name: 'bagno_1' },
    ]);
    expect(match?.id).toBe('r1');
  });

  it('matches "Camera da letto" against the lowercase pre-existing room', () => {
    const match = findPossibleDuplicate('Camera da letto', [
      { id: 'r1', name: 'camera da letto' },
    ]);
    expect(match?.id).toBe('r1');
  });

  it('does not match unrelated names', () => {
    const match = findPossibleDuplicate('Soggiorno', [
      { id: 'r1', name: 'cameretta' },
      { id: 'r2', name: 'studio' },
    ]);
    expect(match).toBeNull();
  });

  it('returns null when there are no candidates', () => {
    expect(findPossibleDuplicate('Cucina', [])).toBeNull();
  });

  it('ignores generic stopwords like "impianto" as the only shared word', () => {
    const match = findPossibleDuplicate('Impianto elettrico', [
      { id: 'a1', name: 'Impianto idraulico' },
    ]);
    expect(match).toBeNull();
  });
});
