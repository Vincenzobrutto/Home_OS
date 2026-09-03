// Home Score — motore deterministico e trasparente (Genesis MVP, vedi
// docs/genesis-architecture.md). Ogni scostamento dal punteggio pieno è
// spiegato in "reasons": niente numero senza motivazione. Nessuna stima di
// valore immobiliare, nessuna promessa di risparmio, nessuna diagnosi
// tecnica certa — solo segnali osservabili dai dati già in HomeOS (asset
// censiti, documenti collegati, piani di manutenzione, completezza Genesis).
//
// v2 (B44): "Efficienza" è stata rimossa — il suo unico segnale
// (`Asset.estimatedReplacementYear`) non è mai valorizzato da alcun flusso
// automatico, un numero che sembrava più solido di quanto fosse. Sostituita
// da "Affidabilità del record": riusa `computeMemoryReliability` (B48),
// calcolato dal chiamante (GenesisService) e passato già pronto come
// `recordReliability` — stessa fonte di verità della card "Affidabilità
// della memoria" (endpoint separato, mai fusa con questa card, vedi
// docs/HANDOFF.md e decisions.md #48).

export const HOME_SCORE_VERSION = 'v2';

const WEIGHTS = {
  documentation: 0.25,
  maintenance: 0.2,
  safety: 0.25,
  reliability: 0.15,
  completeness: 0.15,
} as const;

// Tipi di impianto per cui "nessun documento collegato" è un segnale forte
// (non un elettrodomestico qualunque) — stessa lista usata per le linee
// guida di manutenzione in maintenance-guidelines.ts, per coerenza.
const CRITICAL_ASSET_TYPES = new Set([
  'CALDAIA',
  'ELETTRICO',
  'IDRAULICO',
  'FOTOVOLTAICO',
]);

export interface HomeScoreAssetInput {
  id: string;
  type: string;
  confirmed: boolean;
  dismissed: boolean;
  hasDocument: boolean;
  hasMaintenancePlan: boolean;
}

export interface HomeScoreInput {
  currentYear: number;
  houseHasAnyDocument: boolean;
  assets: HomeScoreAssetInput[];
  confirmedRoomsCount: number;
  genesisCompleted: boolean;
  // overallCoverage di computeMemoryReliability (common/memory-reliability.ts)
  // — null se nessuna delle sue tre dimensioni ha ancora dati, trattato come
  // 0 qui (stessa convenzione di "Completezza", che parte da 0 per una casa
  // nuova, non una penalità nascosta).
  recordReliability: number | null;
}

export interface ScoreReason {
  code: string;
  label: string;
  impact: number;
}

export interface ScoreResult {
  overall: number;
  dimensions: {
    documentation: number;
    maintenance: number;
    safety: number;
    reliability: number;
    completeness: number;
  };
  reasons: ScoreReason[];
  version: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeHomeScore(input: HomeScoreInput): ScoreResult {
  const reasons: ScoreReason[] = [];
  const activeAssets = input.assets.filter((a) => a.confirmed && !a.dismissed);

  // --- Documentazione ---------------------------------------------------
  let documentation = 100;
  if (!input.houseHasAnyDocument) {
    documentation -= 30;
    reasons.push({
      code: 'HOUSE_WITHOUT_DOCUMENTS',
      label: 'Nessun documento caricato per la casa',
      impact: -30,
    });
  }
  for (const asset of activeAssets) {
    if (CRITICAL_ASSET_TYPES.has(asset.type) && !asset.hasDocument) {
      documentation -= 10;
      reasons.push({
        code: 'CRITICAL_ASSET_WITHOUT_DOCUMENT',
        label: `Nessun documento collegato: ${asset.type}`,
        impact: -10,
      });
    }
  }
  documentation = clamp(documentation);

  // --- Manutenzione -------------------------------------------------------
  let maintenance = 100;
  for (const asset of activeAssets) {
    if (asset.type === 'CALDAIA' && !asset.hasMaintenancePlan) {
      maintenance -= 25;
      reasons.push({
        code: 'HEATING_SYSTEM_WITHOUT_MAINTENANCE',
        label: 'Caldaia senza manutenzione registrata',
        impact: -25,
      });
    }
  }
  maintenance = clamp(maintenance);

  // --- Sicurezza ------------------------------------------------------
  // Deliberatamente conservativo: penalizza solo quando manca SIA un
  // documento SIA un piano di manutenzione per un impianto critico — un
  // doppio segnale, non una certificazione di sicurezza (vedi limitazioni
  // in docs/genesis-architecture.md).
  let safety = 100;
  for (const asset of activeAssets) {
    if (
      CRITICAL_ASSET_TYPES.has(asset.type) &&
      !asset.hasDocument &&
      !asset.hasMaintenancePlan
    ) {
      safety -= 20;
      reasons.push({
        code: 'CRITICAL_ASSET_NO_EVIDENCE',
        label: `Nessuna documentazione né manutenzione tracciata: ${asset.type}`,
        impact: -20,
      });
    }
  }
  safety = clamp(safety);

  // --- Affidabilità del record (v2) --------------------------------------
  const reliability = clamp(input.recordReliability ?? 0);
  reasons.push({
    code: 'RECORD_RELIABILITY',
    label: `Affidabilità del record: ${reliability}% di copertura`,
    impact: reliability - 100,
  });

  // --- Completezza Digital Twin --------------------------------------
  let completeness = 0;
  if (input.confirmedRoomsCount > 0) {
    const roomsPoints = Math.min(input.confirmedRoomsCount * 10, 40);
    completeness += roomsPoints;
    reasons.push({
      code: 'ROOMS_CONFIRMED',
      label: `${input.confirmedRoomsCount} ambienti confermati`,
      impact: roomsPoints,
    });
  }
  if (activeAssets.length > 0) {
    const assetsPoints = Math.min(activeAssets.length * 5, 30);
    completeness += assetsPoints;
    reasons.push({
      code: 'ASSETS_CONFIRMED',
      label: `${activeAssets.length} asset confermati`,
      impact: assetsPoints,
    });
  }
  if (input.genesisCompleted) {
    completeness += 30;
    reasons.push({
      code: 'GENESIS_COMPLETED',
      label: 'Percorso Genesis completato',
      impact: 30,
    });
  }
  completeness = clamp(completeness);

  const overall = clamp(
    documentation * WEIGHTS.documentation +
      maintenance * WEIGHTS.maintenance +
      safety * WEIGHTS.safety +
      reliability * WEIGHTS.reliability +
      completeness * WEIGHTS.completeness,
  );

  return {
    overall,
    dimensions: {
      documentation,
      maintenance,
      safety,
      reliability,
      completeness,
    },
    reasons,
    version: HOME_SCORE_VERSION,
  };
}
