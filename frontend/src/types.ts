export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface House {
  id: string;
  ownerId: string;
  name: string;
  city: string | null;
  surfaceSqm: string | null;
  roomsCount: number | null;
  buildYear: number | null;
  code: string;
  // 0/90/180/270 — quanto ruotare lo sfondo caricato per restare allineato
  // alle coordinate di ambienti/asset, ruotate "sul serio" quando l'utente
  // gira la vista mappa. Vedi FloorPlan.tsx.
  floorPlanRotation: number;
}

export interface Room {
  id: string;
  houseId: string;
  type: string;
  name: string;
  code: string;
  // Forma grezza dal backend (rettangolo o poligono, o dati legacy senza
  // "kind"): vedi geometry.ts per l'interpretazione tipata.
  planGeometry?: unknown;
}

export interface CustomField {
  id: string;
  assetId: string;
  label: string;
  value: string;
  source: 'MANUAL' | 'AI_EXTRACTED';
}

export interface Asset {
  id: string;
  houseId: string;
  roomId: string | null;
  type: string;
  name: string;
  code: string;
  installedAt: string | null;
  warrantyUntil: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  purchasedAt: string | null;
  supplier: string | null;
  status: 'OK' | 'ATTENTION' | 'DUE';
  // Impostato direttamente dall'utente (dismetti/riattiva), non calcolato
  // come "status" — vedi START_HERE.md.
  dismissedAt: string | null;
  // Posizione dell'icona sulla planimetria (0-1, relativa al contenitore) —
  // null finché l'utente non la trascina almeno una volta, vedi FloorPlan.tsx.
  // Decimal di Prisma: arriva come stringa via JSON, come warrantyUntil ecc.
  // — va convertita con Number(...) prima di farci aritmetica.
  planPosX: string | null;
  planPosY: string | null;
  // Metadati di sistema (non modificabili dall'utente, a differenza degli
  // altri campi data come installedAt/purchasedAt che vengono da un
  // documento): quando la scheda asset è stata creata in HomeOS e quando è
  // stata l'ultima modifica a un suo campo qualunque.
  createdAt: string;
  updatedAt: string;
  customFields?: CustomField[];
}

export interface ContactRef {
  id: string;
  name: string;
  role: string | null;
}

export interface TimelineEvent {
  id: string;
  assetId: string;
  eventDate: string;
  eventType: string;
  detail: string | null;
  contactId: string | null;
  contact?: ContactRef | null;
}

export interface Contact {
  id: string;
  houseId: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Presente solo nella lista (houses/:houseId/contacts), calcolato al volo.
  interventionsCount?: number;
}

export interface ContactTimelineEvent extends TimelineEvent {
  asset: { id: string; name: string; code: string; type: string };
}

export interface ContactDetail extends Contact {
  timelineEvents: ContactTimelineEvent[];
}

export interface AssetDocumentFields {
  kind: 'asset_document';
  docType: string;
  fields: [string, string][];
  suggestedAssetType: string | null;
  suggestedAssetId: string | null;
  suggestedAssetName: string | null;
  // >1 se il documento descrive più unità identiche (es. 3 climatizzatori):
  // la creazione di un nuovo asset propone di crearne altrettanti separati.
  quantity: number;
}

export interface FloorPlanRoomProposal {
  name: string;
  suggestedType: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlanFields {
  kind: 'floor_plan';
  rooms: FloorPlanRoomProposal[];
}

export type ExtractedFields = AssetDocumentFields | FloorPlanFields;

export interface DocumentRecord {
  id: string;
  assetId: string | null;
  houseId: string;
  fileUrl: string;
  originalFilename: string;
  docType: string | null;
  status: 'PENDING' | 'ANALYZING' | 'ANALYZED' | 'CONFIRMED';
  aiConfidence: string | null;
  extractedFields: ExtractedFields | null;
  uploadedAt: string;
  confirmedAt: string | null;
  // true solo se confermato esplicitamente come "collega alla casa, non a un
  // asset specifico" (es. APE, certificazione energetica generale).
  houseLevel: boolean;
  // Calcolato al volo dal backend, solo per i documenti ANALYZED: altri
  // documenti non ancora confermati che sembrano dello stesso intervento
  // (stesso tipo di asset suggerito + fornitore uguale o date vicine).
  relatedDocumentIds?: string[];
}

export interface GmailCandidate extends DocumentRecord {
  source: 'GMAIL';
  emailFrom: string;
  emailSubject: string;
  emailDate: string;
}

export interface GmailStatus {
  connected: boolean;
  email?: string;
}

export interface GmailScanResult {
  messagesFound: number;
  messagesSkippedAlreadySeen: number;
  candidatesCreated: number;
  attachmentsIrrelevant: number;
  attachmentsFailed: number;
  reachedScanCap: boolean;
}

export interface DriveCandidate extends DocumentRecord {
  source: 'DRIVE';
  driveModifiedAt: string;
}

export interface DriveStatus {
  connected: boolean;
  email?: string;
  folderId?: string | null;
  folderName?: string | null;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveScanResult {
  filesFound: number;
  filesSkippedAlreadySeen: number;
  candidatesCreated: number;
  attachmentsIrrelevant: number;
  attachmentsFailed: number;
  reachedScanCap: boolean;
}
