export interface User {
  id: string;
  email: string;
  name: string | null;
}

export type GenesisStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PROCESSING' | 'COMPLETED';

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
  // Campi aggiunti per il wizard Genesis — vedi Genesis.tsx.
  address: string | null;
  postalCode: string | null;
  propertyType: string | null;
  country: string | null;
  genesisStatus: GenesisStatus;
}

export interface ScanSessionRecord {
  id: string;
  houseId: string;
  type: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

export type ObservationEntityType = 'ROOM' | 'ASSET';
export type ObservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EDITED';

export interface ObservationRecord {
  id: string;
  scanSessionId: string;
  entityType: ObservationEntityType;
  proposedName: string;
  proposedCategory: string | null;
  confidence: number;
  payload: { roomType?: string; assetType?: string; roomName?: string | null };
  status: ObservationStatus;
  // Room/Asset già confermato in casa con nome simile e stesso tipo — solo
  // un avviso per l'utente, mai una fusione automatica. Vedi genesis-architecture.md.
  possibleDuplicate: { id: string; name: string } | null;
}

export type ConfirmObservationAction = 'confirm' | 'reject' | 'edit';

export interface ConfirmObservationItem {
  observationId: string;
  action: ConfirmObservationAction;
  name?: string;
  type?: string;
  roomId?: string | null;
}

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IssueRecord {
  id: string;
  houseId: string;
  assetId: string | null;
  documentId: string | null;
  category: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  resolutionHint: string | null;
  status: 'OPEN' | 'RESOLVED';
  ruleCode: string;
  createdAt: string;
  resolvedAt: string | null;
}

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RecommendationRecord {
  id: string;
  houseId: string;
  issueId: string | null;
  category: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  estimatedImpact: string | null;
  status: 'OPEN' | 'DISMISSED' | 'DONE';
  createdAt: string;
}

export interface ScoreSnapshotRecord {
  id: string;
  houseId: string;
  overallScore: number;
  documentationScore: number;
  maintenanceScore: number;
  safetyScore: number;
  efficiencyScore: number;
  completenessScore: number;
  calculationVersion: string;
  calculatedAt: string;
}

export interface GenesisResults {
  genesisStatus: GenesisStatus;
  score: ScoreSnapshotRecord | null;
  issues: IssueRecord[];
  recommendations: RecommendationRecord[];
  confirmedRoomsCount: number;
  confirmedAssetsCount: number;
}

export interface HouseTimelineEventRecord {
  id: string;
  houseId: string;
  assetId: string | null;
  documentId: string | null;
  type: string;
  title: string;
  description: string | null;
  eventDate: string;
  source: string;
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

export type MaintenanceRecurrenceUnit = 'NONE' | 'DAY' | 'MONTH' | 'YEAR';
export type MaintenanceStatus = 'SCHEDULED' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'PAUSED';

export interface MaintenancePlan {
  id: string;
  assetId: string;
  title: string;
  description: string | null;
  recurrenceUnit: MaintenanceRecurrenceUnit;
  recurrenceInterval: number;
  nextDueAt: string;
  reminderDaysBefore: number;
  preferredContactId: string | null;
  preferredContact?: ContactRef | null;
  isMandatory: boolean;
  notes: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  lastCompletedAt: string | null;
  status: MaintenanceStatus;
  _count: { occurrences: number };
}

export interface MaintenanceOccurrence {
  id: string;
  maintenancePlanId: string;
  assetId: string;
  scheduledFor: string;
  completedAt: string;
  notes: string | null;
  contact?: ContactRef | null;
  document?: {
    id: string;
    originalFilename: string;
    docType: string | null;
  } | null;
}

export interface MaintenanceSuggestion {
  code: string;
  title: string;
  description?: string;
  recurrenceUnit: MaintenanceRecurrenceUnit;
  recurrenceInterval: number;
  reminderDaysBefore: number;
  isMandatory: boolean;
  suggestedNextDueAt: string;
  basedOn: 'installedAt' | 'purchasedAt' | 'createdAt';
}

export interface MaintenanceReminder extends MaintenancePlan {
  asset: {
    id: string;
    name: string;
    code: string;
    type: string;
    room: { id: string; name: string } | null;
  };
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
  maintenanceInterventions?: Array<{
    title: string;
    completedAt: string | null;
    quantity: number;
    notes: string | null;
  }>;
}

export interface DocumentMaintenanceProposal {
  interventionIndex: number;
  title: string;
  completedAt: string | null;
  quantity: number;
  notes: string | null;
  candidates: Array<{
    maintenancePlanId: string;
    title: string;
    score: number;
    reason: string;
    recommended: boolean;
    alreadyCompleted: boolean;
    asset: { id: string; name: string; code: string; room: { id: string; name: string } | null };
  }>;
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
