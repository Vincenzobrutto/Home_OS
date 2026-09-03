import { computeMemoryReliability } from './memory-reliability';

describe('memory reliability engine', () => {
  it('returns null overall coverage when no dimension has data', () => {
    const result = computeMemoryReliability({
      assetDocumentation: { completed: 0, total: 0 },
      fieldCoverage: { completed: 0, total: 0 },
      factEvidence: { completed: 0, total: 0 },
    });

    expect(result.overallCoverage).toBeNull();
    expect(result.version).toBe('v1');
  });

  it('excludes dimensions without data instead of treating them as 0%', () => {
    const result = computeMemoryReliability({
      assetDocumentation: { completed: 5, total: 10 },
      fieldCoverage: { completed: 0, total: 0 },
      factEvidence: { completed: 0, total: 0 },
    });

    // Solo assetDocumentation ha dati: 50% a peso pieno, non diluito dalle
    // altre due dimensioni assenti.
    expect(result.overallCoverage).toBe(50);
  });

  it('computes a weighted average across dimensions with data', () => {
    const result = computeMemoryReliability({
      assetDocumentation: { completed: 8, total: 10 }, // 80%, peso 0.4
      fieldCoverage: { completed: 30, total: 60 }, // 50%, peso 0.3
      factEvidence: { completed: 3, total: 4 }, // 75%, peso 0.3
    });

    // (80*0.4 + 50*0.3 + 75*0.3) / 1 = 32 + 15 + 22.5 = 69.5 -> 70 (round)
    expect(result.overallCoverage).toBe(70);
  });

  it('rounds the overall coverage to the nearest integer', () => {
    const result = computeMemoryReliability({
      assetDocumentation: { completed: 1, total: 3 },
      fieldCoverage: { completed: 0, total: 0 },
      factEvidence: { completed: 0, total: 0 },
    });

    expect(result.overallCoverage).toBe(33);
  });
});
