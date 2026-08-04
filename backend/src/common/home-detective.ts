// Home Detective — motore a regole deterministiche (Genesis MVP, vedi
// docs/genesis-architecture.md). NIENTE LLM qui: ogni regola è if/else
// esplicito e leggibile, stesso stile "euristica trasparente" già scelto
// per maintenance-guidelines.ts e per il matching documento→asset.
//
// Questa funzione è pura: calcola quali Issue DOVREBBERO esistere ORA dato
// lo stato attuale della casa. Non tocca il database e non decide da sola
// l'idempotenza — quello è compito del chiamante (GenesisService), che
// confronta questo output con le Issue OPEN già in DB per creare solo le
// nuove e risolvere quelle non più valide (vedi genesis.service.ts).
//
// ASSET_WITHOUT_ROOM è stata adattata rispetto alla richiesta originale:
// nel modello dati di HomeOS `roomId: null` su un Asset è una scelta
// deliberata ("impianto di casa", es. impianto elettrico condominiale — non
// dato mancante, vedi domain-model.md). Applicare la regola a QUALUNQUE
// asset senza stanza avrebbe generato falsi positivi sistematici sui tipi
// tipicamente di casa (ELETTRICO, IDRAULICO, FOTOVOLTAICO, TETTO). La regola
// scatta quindi solo per i tipi che tipicamente vivono in una stanza
// specifica (elettrodomestici, climatizzatori) — per gli altri l'assenza di
// stanza resta legittima.
const ROOM_BOUND_ASSET_TYPES = new Set(['ELETTRODOMESTICO', 'CLIMA']);

export interface HomeDetectiveAssetInput {
  id: string;
  type: string;
  confirmed: boolean;
  dismissed: boolean;
  hasDocument: boolean;
  roomId: string | null;
}

export interface HomeDetectiveInput {
  houseHasAnyDocument: boolean;
  genesisCompleted: boolean;
  assets: HomeDetectiveAssetInput[];
  unconfirmedObservationsCount: number;
}

export type IssueSeverityValue = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IssueDraft {
  ruleCode: string;
  category: string;
  severity: IssueSeverityValue;
  title: string;
  description: string;
  resolutionHint: string;
  assetId: string | null;
}

export function evaluateHomeDetectiveRules(
  input: HomeDetectiveInput,
): IssueDraft[] {
  const drafts: IssueDraft[] = [];
  const activeAssets = input.assets.filter((a) => a.confirmed && !a.dismissed);

  // HEATING_SYSTEM_WITHOUT_DOCUMENTATION
  for (const asset of activeAssets) {
    if (asset.type === 'CALDAIA' && !asset.hasDocument) {
      drafts.push({
        ruleCode: 'HEATING_SYSTEM_WITHOUT_DOCUMENTATION',
        category: 'documentation',
        severity: 'MEDIUM',
        title: 'Caldaia senza documentazione tecnica',
        description:
          'Non risulta nessun documento collegato alla caldaia (libretto, manuale, dichiarazione di conformità).',
        resolutionHint:
          'Carica il libretto di impianto, il manuale o la dichiarazione disponibile.',
        assetId: asset.id,
      });
    }
  }

  // ASSET_WITHOUT_ROOM — solo per i tipi "da stanza", vedi commento in cima al file.
  for (const asset of activeAssets) {
    if (ROOM_BOUND_ASSET_TYPES.has(asset.type) && asset.roomId === null) {
      drafts.push({
        ruleCode: 'ASSET_WITHOUT_ROOM',
        category: 'completeness',
        severity: 'LOW',
        title: 'Asset non collegato a un ambiente',
        description: `L'asset di tipo ${asset.type} non è ancora associato a nessuna stanza.`,
        resolutionHint:
          "Completa la classificazione associando l'asset a un ambiente.",
        assetId: asset.id,
      });
    }
  }

  // UNCONFIRMED_SCAN_RESULTS
  if (input.unconfirmedObservationsCount > 0) {
    drafts.push({
      ruleCode: 'UNCONFIRMED_SCAN_RESULTS',
      category: 'completeness',
      severity: 'LOW',
      title: 'Risultati della scansione da verificare',
      description: `${input.unconfirmedObservationsCount} elementi rilevati dalla scansione non sono ancora stati confermati.`,
      resolutionHint: 'Rivedi e conferma o rifiuta gli elementi rilevati.',
      assetId: null,
    });
  }

  // HOUSE_WITHOUT_DOCUMENTS
  if (!input.houseHasAnyDocument) {
    drafts.push({
      ruleCode: 'HOUSE_WITHOUT_DOCUMENTS',
      category: 'documentation',
      severity: 'MEDIUM',
      title: 'Nessun documento caricato',
      description:
        'Non è ancora stato caricato nessun documento per questa casa.',
      resolutionHint:
        "Carica almeno un documento dell'immobile (es. APE, planimetria, rogito).",
      assetId: null,
    });
  }

  // GENESIS_INCOMPLETE
  if (!input.genesisCompleted) {
    drafts.push({
      ruleCode: 'GENESIS_INCOMPLETE',
      category: 'completeness',
      severity: 'LOW',
      title: 'Percorso Genesis non completato',
      description:
        'Il percorso guidato di creazione del Digital Twin non è ancora stato completato.',
      resolutionHint: "Riprendi il percorso Genesis da dove l'avevi lasciato.",
      assetId: null,
    });
  }

  return drafts;
}
