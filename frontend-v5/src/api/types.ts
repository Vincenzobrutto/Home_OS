// Tipi del contratto identity-v1 (docs/v5/api-contract.md). Non estendere qui
// senza un cambio di contratto concordato con Codex.

export type Account = { id: string; name: string; email: string; emailVerifiedAt?: string | null; requiresEmailVerification?: boolean };

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
  authRecovery?: { enabled: boolean };
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

export type DocumentWorkflowState = 'to_compile' | 'analyzing' | 'review' | 'completed' | 'attention';
export type DocumentSummary = {
  /** Personal read-only context, absent on older API versions and detail responses. */
  linkedObjects?: Array<{id:string;kind:'object'|'boiler';name:string}>;
  savedExpenses?: Array<{id:string;title:string;amountCents:number;supplier:string|null;documentNumber:string|null;documentDate:string|null}>;
  /** Personal state for this source/version; provided by the canonical list and detail. */
  workflowState?: DocumentWorkflowState;
  /** Successful extraction for this account and exact source snapshot, independent of confirmation. */
  aiAnalysisSucceeded?: boolean;
  organization?: { houseFamily?:DocumentGroup|null; documentVersion?:number; documentSha256?:string; version: number; title: string; parts: Array<{ kind: string; pageFrom: number | null; pageTo: number | null }>; collections: DocumentCollection[]; origin: 'user_declared'; updatedAt: string } | null;
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

export type DocumentView='all'|'house'|'objects';
export type DocumentGroup='plans'|'building'|'energy'|'contracts'|'other';
export type DocumentViewSummary={views:Record<DocumentView,number>;groups:Record<DocumentGroup,number>};
export type DocumentsPage = { items: DocumentSummary[]; nextCursor: string | null;summary?:DocumentViewSummary };

export type UploadDocumentInput = { file: File; name: string; visibility: DocumentVisibility };

// document-search-v1 (H2, docs/v5/document-search-api-contract.md): estende la sola lista documenti.
export type DocumentFormatFilter = 'all' | 'pdf' | 'jpeg' | 'png';
export type DocumentVisibilityFilter = 'all' | DocumentVisibility;
/** Filtri canonici: q già trim + NFC ('' = nessuna ricerca testuale). */
export type DocumentCollection = 'contracts' | 'energy' | 'building' | 'technical' | 'condominium' | 'purchases' | 'utilities' | 'unclassified';
export type DocumentSearchFilters = { view?:DocumentView;group?:DocumentGroup; q: string; format: DocumentFormatFilter; visibility: DocumentVisibilityFilter; collection?: 'all' | 'house' | 'floor_plans' | DocumentCollection; workflow?: 'all'|'pending'|'completed'|'to_compile'|'review' };

export type DocumentSearchCapabilities = {
  documentViews?:boolean;
  collections?: Record<DocumentCollection, string>;
  apiVersion: 'document-search-v1';
  enabled: true;
  isSimulation: false;
  searchableFields: Array<'name' | 'originalFilename'>;
  formats: Array<Exclude<DocumentFormatFilter, 'all'>>;
  visibilities: DocumentVisibility[];
  limits: { queryMaxCodePoints: number; maxPageSize: number };
};

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
  q?: string;
  state: ActivityState | 'all';
  due: Exclude<DueState, 'closed'> | 'all';
  assetId?: string;
};
export type ActivitiesPage = TemporalContext & Page<HomeActivity> & {total?: number};
export type ActivityResponse = TemporalContext & { activity: HomeActivity };
export type ActivitySummary = TemporalContext & {
  counts: { overdue: number; today: number; upcoming: number; undated: number };
  nextItems: HomeActivity[];
};

// expenses-v1 (H3a, docs/v5/expenses-api-contract.md): costi sostenuti personali del creatore.
export type ExpenseState = 'active' | 'archived';
export type ExpenseOrigin = 'manual' | 'document';
export type ExpenseDocumentLink =
  | { state: 'none'; document: null }
  | { state: 'linked'; document: { id: string; name: string } }
  | { state: 'unavailable'; document: null };
export type ExpenseAssetLink =
  | { state: 'none'; asset: null }
  | { state: 'linked'; asset: { id: string; name: string } }
  | { state: 'unavailable'; asset: null };

export type HomeExpense = {
  id: string;
  homeId: string;
  title: string;
  amountCents: number;
  currency: 'EUR';
  spentOn: string;
  note: string | null;
  origin: ExpenseOrigin;
  documentLink: ExpenseDocumentLink;
  assetLink: ExpenseAssetLink;
  state: ExpenseState;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  permissions: Array<'read' | 'edit'>;
};

export type ExpenseCapabilities = {
  apiVersion: 'expenses-v1';
  enabled: true;
  isSimulation: false;
  currency: 'EUR';
  limits: { titleMaxCodePoints: number; noteMaxCodePoints: number; amountMaxCents: number; maxPageSize: number };
  asOf: string;
  today: string;
  timeZone: 'Europe/Rome';
};

export type ExpenseFilters = {
  state: ExpenseState | 'all';
  /** Anno YYYY oppure null = tutti gli anni. */
  year: string | null;
  source: ExpenseOrigin | 'all';
  assetId?: string;
  documentId?: string;
};

export type ExpenseResponse = { expense: HomeExpense };

export type CreateExpense = {
  title: string;
  amountCents: number;
  spentOn: string;
  note?: string;
  documentId?: string;
  assetId?: string;
};

/** Solo i campi cambiati; null scollega riferimento o nota. */
export type UpdateExpense = {
  expectedVersion: number;
  title?: string;
  amountCents?: number;
  spentOn?: string;
  note?: string | null;
  documentId?: string | null;
  assetId?: string | null;
};

export type ExpenseAction = { expectedVersion: number; note?: string };

export type ExpenseSnapshot = {
  title: string;
  amountCents: number;
  currency: 'EUR';
  spentOn: string;
  note: string | null;
  origin: ExpenseOrigin;
  documentLink: ExpenseDocumentLink;
  assetLink: ExpenseAssetLink;
  state: ExpenseState;
};

export type ExpenseHistoryEvent = {
  id: string;
  kind: 'created' | 'updated' | 'archived' | 'restored';
  at: string;
  note: string | null;
  before: ExpenseSnapshot | null;
  after: ExpenseSnapshot;
};

export type ExpenseSummary = {
  year: string;
  counts: { manual: number; document: number };
  totalsCents: { manual: number; document: number };
  totalCents: number;
  lastItems: HomeExpense[];
  asOf: string;
  today: string;
  timeZone: 'Europe/Rome';
};

// home-objects-v1 (G1, docs/v5/home-objects-api-contract.md): ambienti condivisi, oggetti personali, collegamenti.
export type RoomType = 'kitchen' | 'living' | 'bedroom' | 'bathroom' | 'hall' | 'utility' | 'outdoor' | 'other';
export type ObjectType = 'appliance' | 'heating' | 'cooling' | 'electrical' | 'plumbing' | 'security' | 'fixture' | 'other';
export type G1State = 'active' | 'archived';
export type G1Permission = 'read' | 'edit';

export type Room = {
  id: string;
  homeId: string;
  name: string;
  type: RoomType;
  note: string | null;
  state: G1State;
  version: number;
  createdAt: string;
  updatedAt: string;
  permissions: G1Permission[];
};

export type ObjectKind = 'object' | 'boiler';
export type ObjectRef = { kind: ObjectKind; id: string };

export type CatalogItem = {
  summary?: {brand:string|null;model:string|null;nextActivity:{title:string;dueDate:string|null}|null};
  profile?: { fields: import('../object-onboarding/model').Profile; unavailable: boolean } | null;
  manual?: ObjectManual | null;
  ref: ObjectRef;
  name: string;
  type: ObjectType | 'boiler';
  kindLabel: string;
  state: G1State;
  permissions: G1Permission[];
  position: { version: number; rooms: Room[] };
  technicalLink: null | { assetId: string };
  /** Presenti per gli oggetti manuali (DTO Object); assenti per le caldaie. */
  homeId?: string;
  note?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ObjectManual = {
  url: string; kind: 'manual' | 'support'; brand: string; reference: string;
  origin: 'manufacturer_page' | 'user_provided'; sourceUrl: string | null;
  checkedAt: string | null; boundVersion: number; needsReview?: boolean;
};

export type ObjectCapabilities = {
  apiVersion: 'home-objects-v1';
  enabled: true;
  isSimulation: false;
  limits: { nameMaxCodePoints: number; roomNameMaxCodePoints: number; noteMaxCodePoints: number; maxRoomsPerObject: number; maxPageSize: number };
  types: ObjectType[];
  roomTypes: RoomType[];
};

export type RoomFilters = { state: G1State | 'all' };
export type CatalogPage = Page<CatalogItem> & {total?:number;today?:string;facets?:{all:number;unplaced:number;rooms:Array<{id:string;name:string;count:number}>}};
export type CatalogFilters = {
  sort?: 'name'|'recent';
  state: G1State | 'all';
  /** Nome già NFC/trim; '' = nessuna ricerca. */
  q: string;
  type: ObjectType | 'boiler' | null;
  roomId: string | null;
  placement: 'all' | 'unplaced';
};

export type G1ResourceType = 'document' | 'activity' | 'expense';
export type LinkedResource = {
  linkId: string | null;
  version: number | null;
  origin: 'native' | 'reference';
  state: 'active' | 'removed' | 'unavailable';
  resourceType: G1ResourceType;
  resource: null | { id: string; title: string; amountCents?: number; currency?: 'EUR'; spentOn?: string; document?: { id: string; title: string } | null };
  objectRef: ObjectRef;
};

/** Eventi di storia G1: forma comune, snapshot proiettati dal server. */
export type G1HistoryEvent = { id: string; kind: string; at: string; before: unknown; after: unknown };

export type CreateRoom = { name: string; type: RoomType; note?: string };
export type UpdateRoom = { expectedVersion: number; name?: string; type?: RoomType; note?: string | null };
export type CreateObject = { name: string; type: ObjectType; note?: string; roomIds?: string[] };
export type UpdateObject = { expectedVersion: number; name?: string; type?: ObjectType; note?: string | null };
