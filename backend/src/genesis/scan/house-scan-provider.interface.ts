// Interfaccia sostituibile: oggi solo MockHouseScanProvider (dataset
// deterministico), domani un provider reale (foto/video + computer vision)
// potrà implementarla senza toccare GenesisService o il frontend — vedi
// docs/genesis-architecture.md sul confine mock/reale.
export interface StartScanInput {
  houseId: string;
  type: 'GUIDED_MOCK' | 'PHOTO' | 'VIDEO';
}

export interface ScanSessionResult {
  id: string;
  houseId: string;
  type: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface ScanObservationResult {
  id: string;
  scanSessionId: string;
  entityType: 'ROOM' | 'ASSET';
  proposedName: string;
  proposedCategory: string | null;
  confidence: number;
  payload: Record<string, unknown>;
  status: string;
}

export interface HouseScanProvider {
  startScan(input: StartScanInput): Promise<ScanSessionResult>;
  getResults(scanSessionId: string): Promise<ScanObservationResult[]>;
}
