export type FGasFamily = 'ANNEX_I' | 'ANNEX_II_SECTION_1';

export interface FGasPolicy {
  thresholdMetric: 'T_CO2_EQ' | 'CHARGE_KG';
  bands: Array<{ minimum: number; intervalMonths: number }>;
  residentialHermeticExemptionMaxKg?: number;
}

export interface FGasInput {
  family: FGasFamily | null;
  chargeKg: number | null;
  gwp: number | null;
  hermeticallySealed: boolean | null;
  sealedLabelPresent: boolean | null;
  residentialUse: boolean;
  leakDetectionSystem: boolean | null;
  policy: FGasPolicy | null;
}

export type FGasResult =
  | { status: 'UNKNOWN'; reason: string; tCo2Equivalent: number | null }
  | { status: 'NOT_APPLICABLE'; reason: string; tCo2Equivalent: number }
  | {
      status: 'APPLICABLE';
      reason: string;
      intervalMonths: number;
      tCo2Equivalent: number;
    };

export function tonnesCo2Equivalent(chargeKg: number, gwp: number) {
  return (chargeKg * gwp) / 1000;
}

export function evaluateFGas(input: FGasInput): FGasResult {
  if (
    !input.family ||
    input.chargeKg === null ||
    input.gwp === null ||
    !input.policy
  ) {
    return {
      status: 'UNKNOWN',
      reason: 'Refrigerante, carica o regola normativa attiva non disponibili.',
      tCo2Equivalent:
        input.chargeKg !== null && input.gwp !== null
          ? tonnesCo2Equivalent(input.chargeKg, input.gwp)
          : null,
    };
  }

  const tCo2Equivalent = tonnesCo2Equivalent(input.chargeKg, input.gwp);
  if (
    input.residentialUse &&
    input.policy.residentialHermeticExemptionMaxKg !== undefined &&
    input.chargeKg < input.policy.residentialHermeticExemptionMaxKg &&
    input.hermeticallySealed === true
  ) {
    if (input.sealedLabelPresent === null) {
      return {
        status: 'UNKNOWN',
        reason: "Serve verificare l'etichetta di sigillatura.",
        tCo2Equivalent,
      };
    }
    if (input.sealedLabelPresent) {
      return {
        status: 'NOT_APPLICABLE',
        reason:
          'Esenzione applicata dalla regola attiva per apparecchio residenziale ermeticamente sigillato ed etichettato.',
        tCo2Equivalent,
      };
    }
  }

  const value =
    input.policy.thresholdMetric === 'T_CO2_EQ'
      ? tCo2Equivalent
      : input.chargeKg;
  const band = [...input.policy.bands]
    .sort((a, b) => b.minimum - a.minimum)
    .find((candidate) => value >= candidate.minimum);
  if (!band) {
    return {
      status: 'NOT_APPLICABLE',
      reason:
        'Questo controllo non risulta applicabile in base ai dati inseriti.',
      tCo2Equivalent,
    };
  }

  return {
    status: 'APPLICABLE',
    reason: 'La soglia della regola attiva risulta raggiunta.',
    intervalMonths:
      input.leakDetectionSystem === true
        ? band.intervalMonths * 2
        : band.intervalMonths,
    tCo2Equivalent,
  };
}
