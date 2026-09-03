// Affidabilità della memoria (B48) — quanto sappiamo davvero della casa,
// non quanto è a posto (Home Score, home-score.ts) né quanto è conforme
// (compliance/*). Tre dimensioni come frazioni oneste {completed, total}:
// una dimensione senza dati viene esclusa dal peso, mai trattata come 0%
// (UNKNOWN/assenza di righe non equivale a "non affidabile").

export const MEMORY_RELIABILITY_VERSION = 'v1';

const WEIGHTS = {
  assetDocumentation: 0.4,
  fieldCoverage: 0.3,
  factEvidence: 0.3,
} as const;

export interface CoverageMetric {
  completed: number;
  total: number;
}

export interface MemoryReliabilityInput {
  assetDocumentation: CoverageMetric;
  fieldCoverage: CoverageMetric;
  factEvidence: CoverageMetric;
}

export interface MemoryReliabilityResult {
  overallCoverage: number | null;
  dimensions: MemoryReliabilityInput;
  version: string;
}

export function computeMemoryReliability(
  input: MemoryReliabilityInput,
): MemoryReliabilityResult {
  const parts: Array<{ ratio: number; weight: number }> = [];
  for (const key of Object.keys(WEIGHTS) as (keyof MemoryReliabilityInput)[]) {
    const { completed, total } = input[key];
    if (total > 0) {
      parts.push({ ratio: completed / total, weight: WEIGHTS[key] });
    }
  }
  const weightSum = parts.reduce((sum, p) => sum + p.weight, 0);
  const overallCoverage =
    weightSum === 0
      ? null
      : Math.round(
          (parts.reduce((sum, p) => sum + p.ratio * p.weight, 0) / weightSum) *
            100,
        );

  return {
    overallCoverage,
    dimensions: input,
    version: MEMORY_RELIABILITY_VERSION,
  };
}
