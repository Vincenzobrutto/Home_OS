// Tipi del contratto identity-v1 (docs/v5/api-contract.md). Non estendere qui
// senza un cambio di contratto concordato con Codex.

export type Account = { id: string; name: string; email: string };

export type HomeRole = 'owner' | 'member' | 'viewer';

export type HomePermission = 'read' | 'edit' | 'manage_members' | 'export' | 'sell';

export type Home = {
  id: string;
  name: string;
  address: string;
  version: number;
  role: HomeRole;
  permissions: HomePermission[];
};

export type SessionResponse = {
  account: Account | null;
  csrfToken: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
  };
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = { name: string; email: string; password: string };
export type CreateHomeInput = { name: string; address: string };

// documents-v1 (docs/v5/documents-api-contract.md)
export type DocumentVisibility = 'private' | 'home';
export type DocumentMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';
export type DocumentPermission = 'read' | 'export';

export type DocumentSummary = {
  id: string;
  homeId: string;
  name: string;
  originalFilename: string;
  mimeType: DocumentMimeType;
  byteSize: number;
  createdAt: string;
  version: 1;
  source: 'manual_upload';
  status: 'stored';
  visibility: DocumentVisibility;
  permissions: DocumentPermission[];
};

export type DocumentDetail = DocumentSummary & { sha256: string };

export type DocumentsPage = { items: DocumentSummary[]; nextCursor: string | null };

export type UploadDocumentInput = { file: File; name: string; visibility: DocumentVisibility };

/** Byte ricevuti da un endpoint binario (file originale o ZIP). */
export type BinaryPayload = { blob: Blob; filename: string | null; contentType: string };

// review-v1 (docs/v5/review-api-contract.md) — caso Caldaia M3,
// ampliato da analysis-v2 (docs/v5/anthropic-api-contract.md) — M4.
export type ProviderId = 'test_fixture_v1' | 'anthropic';
export type FieldKey = 'brand' | 'model' | 'power';
export type QuantityCode = 'useful_heating' | 'reported_nominal' | 'other';
export type SourceRef = {
  documentId: string;
  documentVersion: 1;
  documentSha256: string;
  /** Pagina fisica del PDF (analysis-v2: non più fissata a 1). */
  page: number;
  excerpt: string;
};
export type Measurement = { value: string; unit: 'kW'; quantityCode: QuantityCode; quantityLabel: string };
export type ValueOrigin = 'proposal_accepted' | 'user_correction' | 'manual';
export type Candidate = { id: string; value: string; sources: SourceRef[]; measurement?: Measurement };
export type FieldInput = { kind: 'text'; text: string } | { kind: 'power'; measurements: Measurement[] };
export type FieldValue =
  | { kind: 'text'; text: string }
  | { kind: 'power'; measurements: Array<Measurement & { sources: SourceRef[]; origin: ValueOrigin }> };
export type ConfirmedField = {
  fieldKey: FieldKey;
  value: FieldValue;
  revision: number;
  origin: ValueOrigin;
  sources: SourceRef[];
  note: string | null;
  confirmationId: string;
  confirmedAt: string;
};
export type ProposedField = {
  id: string;
  assetId: string;
  jobId: string;
  fieldKey: FieldKey;
  kind: 'single_value' | 'quantity_interpretation' | 'value_conflict';
  state: 'open' | 'accepted' | 'corrected' | 'discarded' | 'already_matches';
  candidates: Candidate[];
  currentConfirmed: ConfirmedField | null;
  provider: ProviderId;
  isSimulation: boolean;
  /** null per il provider di test; assente nelle risposte M3. */
  model?: string | null;
};
export type BoilerSummary = {
  id: string;
  homeId: string;
  name: string;
  type: 'boiler';
  visibility: 'private';
  state: 'provisional' | 'partially_confirmed' | 'confirmed';
  version: number;
  openReviewCount: number;
  confirmedFields: ConfirmedField[];
  permissions: Array<'read' | 'edit'>;
  /** analysis-v2: provider che hanno prodotto analisi; lista vuota per una scheda solo manuale. Assente in M3. */
  analysisProviders?: ProviderId[];
  isSimulation?: boolean;
};
export type BoilerDetail = BoilerSummary & { proposals: ProposedField[] };
export type AnalysisJob = {
  id: string;
  homeId: string;
  assetId: string | null;
  parentJobId: string | null;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  provider: ProviderId;
  isSimulation: boolean;
  model?: string | null;
  documentIds: string[];
  createdAt: string;
  finishedAt: string | null;
  outcome: null | 'proposals_created' | 'no_changes' | 'no_supported_data';
  openReviewCount: number | null;
  error: null | { code: string; message: string };
  /** null per il provider di test; costi del collaudo per Anthropic, mai uno zero inventato. */
  billing?: AnalysisBilling | null;
};
export type AnalysisBilling = {
  currency: 'USD';
  maxReservedUsd: string;
  actualUsd: string | null;
  state: 'reserved' | 'settled' | 'uncertain';
};
export type HistoryChange = {
  fieldKey: FieldKey;
  before: FieldValue | null;
  after: FieldValue | null;
  proposalId: string | null;
  action: string;
  sources: SourceRef[];
};
export type HistoryEvent = {
  id: string;
  assetId: string;
  at: string;
  kind: 'analysis_published' | 'analysis_no_changes' | 'confirmation' | 'manual_confirmation';
  origin: 'test_provider' | 'ai_provider' | 'explicit_user';
  confirmationId: string | null;
  note: string | null;
  changes: HistoryChange[];
};
export type ReviewItem = { id: string; assetId: string; assetName: string; assetVersion: number; proposal: ProposedField };
export type ProviderCapability = {
  id: ProviderId;
  label: string;
  isSimulation: boolean;
  enabled: boolean;
  disabledReason: string | null;
  model: string | null;
};
export type AnalysisCapabilities = {
  provider: ProviderId;
  isSimulation: boolean;
  enabled: boolean;
  maxDocuments: number;
  formats: string[];
  // analysis-v2 (assenti in una risposta M3)
  apiVersion?: 'analysis-v2';
  providers?: ProviderCapability[];
  limits?: { maxFileBytes: number; maxTotalPages: number; maxExtractedCodePoints: number; maxInputTokens: number };
  budget?: { currency: 'USD'; limitUsd: string; remainingUsd: string; uncertainUsd: string };
};
export type StartAnalysisInput = {
  documentIds: string[];
  targetAssetId?: string;
  /** L'app lo invia sempre; omesso solo dai test di integrazione M3 (assenza = fixture, mai Anthropic). */
  provider?: ProviderId;
  consentToProviderTransfer?: true;
};
export type Page<T> = { items: T[]; nextCursor: string | null };
export type ReviewPage = Page<ReviewItem> & { openCount: number };
export type Decision =
  | { proposalId: string; action: 'accept'; candidateId: string; replaceConfirmed?: boolean; note?: string }
  | { proposalId: string; action: 'correct'; value: string; note: string; replaceConfirmed?: boolean }
  | {
      proposalId: string;
      action: 'resolve_power';
      mode: 'keep_distinct' | 'choose_one' | 'correct';
      measurements: Array<Measurement & { candidateId?: string }>;
      note: string;
      replaceConfirmed?: boolean;
    }
  | { proposalId: string; action: 'discard'; note: string };
export type ConfirmationsInput = { expectedVersion: number; decisions: Decision[] };
export type ManualField = {
  fieldKey: FieldKey;
  value: FieldInput;
  note: string;
  replaceConfirmed?: boolean;
  proposalIdsToClose: string[];
};
export type ManualConfirmationsInput = { expectedVersion: number; fields: ManualField[] };
export type ConfirmationResult = {
  confirmationId: string;
  asset: BoilerDetail;
  resolvedProposalIds: string[];
  remainingOpenCount: number;
};

// activities-v1 (docs/v5/activities-api-contract.md) — H1 attività personali
export type ActivityState = 'open' | 'completed' | 'cancelled';
export type DueState = 'overdue' | 'today' | 'upcoming' | 'undated' | 'closed';
export type AssetLink =
  | { state: 'none'; asset: null }
  | { state: 'linked'; asset: { id: string; name: string } }
  | { state: 'unavailable'; asset: null };
export type HomeActivity = {
  id: string;
  homeId: string;
  title: string;
  description: string | null;
  /** Data di calendario YYYY-MM-DD, mai un timestamp. */
  dueDate: string | null;
  state: ActivityState;
  dueState: DueState;
  assetLink: AssetLink;
  version: number;
  origin: 'user_created';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  permissions: Array<'read' | 'edit'>;
};
export type TemporalContext = { asOf: string; today: string; timeZone: 'Europe/Rome' };
export type ActivityCapabilities = TemporalContext & {
  apiVersion: 'activities-v1';
  enabled: true;
  isSimulation: false;
  limits: {
    titleMaxCodePoints: number;
    descriptionMaxCodePoints: number;
    noteMaxCodePoints: number;
    soonDays: number;
    maxHomePreviewItems: number;
  };
};
export type CreateActivity = { title: string; description?: string | null; dueDate?: string | null; assetId?: string | null };
export type UpdateActivity = {
  expectedVersion: number;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  assetId?: string | null;
};
export type ActivityAction = { expectedVersion: number; note?: string };
export type ActivityHistorySnapshot = {
  title: string;
  description: string | null;
  dueDate: string | null;
  state: ActivityState;
  assetLink: AssetLink;
};
export type ActivityHistoryEvent = {
  id: string;
  activityId: string;
  at: string;
  kind: 'created' | 'updated' | 'completed' | 'cancelled' | 'reopened';
  origin: 'explicit_user';
  note: string | null;
  before: ActivityHistorySnapshot | null;
  after: ActivityHistorySnapshot;
};
export type ActivityFilters = {
  state: ActivityState | 'all';
  due: Exclude<DueState, 'closed'> | 'all';
  assetId?: string;
};
export type ActivitiesPage = TemporalContext & Page<HomeActivity>;
export type ActivityResponse = TemporalContext & { activity: HomeActivity };
export type ActivitySummary = TemporalContext & {
  counts: { overdue: number; today: number; upcoming: number; undated: number };
  nextItems: HomeActivity[];
};
