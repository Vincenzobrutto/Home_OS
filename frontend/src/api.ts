import type { Asset, ConfirmObservationItem, Contact, ContactDetail, CustomField, DocumentRecord, DriveCandidate, DriveFolder, DriveScanResult, DriveStatus, EvidenceStatus, GenesisResults, GmailCandidate, GmailScanResult, GmailStatus, House, HouseTimelineEventRecord, Intervention, InterventionDocumentRole, InterventionKind, MaintenanceOccurrence, MaintenancePlan, MaintenanceRecurrenceUnit, MaintenanceReminder, MaintenanceSuggestion, ObservationRecord, Room, ScanSessionRecord, TimelineEvent, User, Warranty, WarrantyKind } from './types';
import type { RoomGeometry } from './geometry';

// Deriva l'host dal browser stesso invece di un "localhost" fisso: da
// cellulare "localhost" punterebbe al telefono, non al PC che fa da
// server — usando lo stesso host con cui si è raggiunto il frontend
// (es. l'IP LAN del PC) le chiamate API arrivano al posto giusto sia da
// desktop che da telefono sulla stessa rete.
const BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3000`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message || res.statusText;
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  // Alcuni endpoint "void" (es. disconnect, selectFolder) rispondono 200 con
  // corpo vuoto invece di 204: res.json() lancerebbe "Unexpected end of JSON
  // input" su una stringa vuota, quindi leggiamo come testo prima.
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    // Il cookie di sessione (httpOnly, vedi auth.controller.ts) viaggia tra
    // origin diversi (frontend :5173, backend :3000): senza credentials il
    // browser non lo invierebbe né lo salverebbe mai.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return handleResponse<T>(res);
}

// Niente Content-Type qui: il browser deve poter fissare da solo il boundary
// multipart per il FormData.
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return handleResponse<T>(res);
}

// gg/mm/aaaa (testo nei form, come nel prototipo) <-> yyyy-mm-dd (per l'API)
export function formatDateForDisplay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export function parseDateInput(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export const api = {
  auth: {
    accountStatus: (email: string) =>
      request<{ exists: boolean; hasPassword: boolean }>('/auth/account-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    register: (data: { email: string; password: string; name?: string }) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<User>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    setPassword: (data: { email: string; password: string }) =>
      request<User>('/auth/set-password', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    // null quando non c'è una sessione valida (401), non un errore da
    // propagare: è lo stato normale prima del login.
    me: async (): Promise<User | null> => {
      try {
        return await request<User>('/auth/me');
      } catch {
        return null;
      }
    },
  },
  houses: {
    get: (id: string) => request<House & { rooms: Room[]; assets: Asset[] }>(`/houses/${id}`),
    create: (data: { name: string; city?: string; surfaceSqm?: number; roomsCount?: number; buildYear?: number }) => request<House>('/houses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ floorPlanRotation: number }>) =>
      request<House>(`/houses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updatePropertyProfile: (id: string, data: Record<string, string | number | null>) =>
      request<House>(`/houses/${id}/property-profile`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    // Le case dell'utente della sessione corrente — non più "di un userId"
    // esplicito, vedi houses.controller.ts.
    mine: () => request<House[]>('/houses'),
  },
  rooms: {
    listForHouse: (houseId: string) => request<Room[]>(`/houses/${houseId}/rooms`),
    create: (houseId: string, data: { type: string; name: string; planGeometry?: RoomGeometry }) =>
      request<Room>(`/houses/${houseId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ type: string; name: string; planGeometry: RoomGeometry }>) =>
      request<Room>(`/rooms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<void>(`/rooms/${id}`, { method: 'DELETE' }),
  },
  assets: {
    listForHouse: (houseId: string) => request<(Asset & { customFields: CustomField[] })[]>(`/houses/${houseId}/assets`),
    create: (
      houseId: string,
      data: {
        type: string;
        name: string;
        roomId?: string | null;
        installedAt?: string;
        warrantyUntil?: string;
        purchasedAt?: string;
        serialNumber?: string;
        manufacturer?: string;
        model?: string;
        supplier?: string;
      },
    ) =>
      request<Asset>(`/houses/${houseId}/assets`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        roomId: string | null;
        installedAt: string;
        warrantyUntil: string;
        purchasedAt: string;
        serialNumber: string;
        manufacturer: string;
        model: string;
        supplier: string;
        planPosX: number;
        planPosY: number;
      }>,
    ) =>
      request<Asset>(`/assets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    timeline: (id: string) => request<TimelineEvent[]>(`/assets/${id}/timeline`),
    addCustomField: (id: string, data: { label: string; value: string }) =>
      request<CustomField>(`/assets/${id}/custom-fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCustomField: (customFieldId: string, data: Partial<{ label: string; value: string }>) =>
      request<CustomField>(`/custom-fields/${customFieldId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    removeCustomField: (customFieldId: string) => request<void>(`/custom-fields/${customFieldId}`, { method: 'DELETE' }),
    remove: (id: string) => request<void>(`/assets/${id}`, { method: 'DELETE' }),
    dismiss: (id: string) => request<Asset>(`/assets/${id}/dismiss`, { method: 'POST' }),
    reactivate: (id: string) => request<Asset>(`/assets/${id}/reactivate`, { method: 'POST' }),
    addTimelineEvent: (
      id: string,
      data: {
        eventDate: string;
        eventType: string;
        detail?: string;
        contactId?: string | null;
        kind?: InterventionKind;
        costAmount?: number | null;
        currency?: string | null;
        evidenceStatus?: EvidenceStatus;
        additionalAssetIds?: string[];
        documentIds?: string[];
      },
    ) =>
      request<TimelineEvent>(`/assets/${id}/timeline-events`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTimelineEventContact: (eventId: string, contactId: string | null) =>
      request<TimelineEvent>(`/timeline-events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ contactId }),
      }),
  },
  interventions: {
    list: (houseId: string, params?: { assetId?: string; contactId?: string; text?: string }) => {
      const query = new URLSearchParams();
      if (params?.assetId) query.set('assetId', params.assetId);
      if (params?.contactId) query.set('contactId', params.contactId);
      if (params?.text) query.set('text', params.text);
      const suffix = query.size ? `?${query.toString()}` : '';
      return request<Intervention[]>(`/houses/${houseId}/interventions${suffix}`);
    },
    create: (
      houseId: string,
      data: {
        occurredAt: string;
        kind: InterventionKind;
        title: string;
        description?: string;
        assetIds: string[];
        contactId?: string | null;
        costAmount?: number | null;
        currency?: string | null;
        evidenceStatus?: EvidenceStatus;
        documents?: Array<{ documentId: string; role: InterventionDocumentRole }>;
      },
    ) => request<Intervention>(`/houses/${houseId}/interventions`, { method: 'POST', body: JSON.stringify(data) }),
  },
  warranties: {
    listForAsset: (assetId: string) => request<Warranty[]>(`/assets/${assetId}/warranties`),
    create: (
      assetId: string,
      data: {
        expiresAt: string;
        startsAt?: string;
        kind?: WarrantyKind;
        providerContactId?: string | null;
        proofDocumentId?: string | null;
        notes?: string | null;
        evidenceStatus?: EvidenceStatus;
      },
    ) => request<Warranty>(`/assets/${assetId}/warranties`, { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        expiresAt: string;
        startsAt: string | null;
        kind: WarrantyKind;
        providerContactId: string | null;
        proofDocumentId: string | null;
        notes: string | null;
        evidenceStatus: EvidenceStatus;
      }>,
    ) => request<Warranty>(`/warranties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  contacts: {
    listForHouse: (houseId: string) => request<Contact[]>(`/houses/${houseId}/contacts`),
    get: (id: string) => request<ContactDetail>(`/contacts/${id}`),
    create: (
      houseId: string,
      data: {
        name: string;
        role?: string;
        phone?: string;
        email?: string;
        notes?: string;
      },
    ) =>
      request<Contact>(`/houses/${houseId}/contacts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        role: string;
        phone: string;
        email: string;
        notes: string;
      }>,
    ) =>
      request<Contact>(`/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  },
  maintenance: {
    listForAsset: (assetId: string) => request<MaintenancePlan[]>(`/assets/${assetId}/maintenance-plans`),
    suggestionsForAsset: (assetId: string) => request<MaintenanceSuggestion[]>(`/assets/${assetId}/maintenance-suggestions`),
    dismissSuggestion: (assetId: string, code: string) =>
      request<void>(`/assets/${assetId}/maintenance-suggestions/${code}/dismiss`, { method: 'POST' }),
    remindersForHouse: (houseId: string) => request<MaintenanceReminder[]>(`/houses/${houseId}/maintenance-reminders`),
    create: (
      assetId: string,
      data: {
        title: string;
        description?: string;
        recurrenceUnit: MaintenanceRecurrenceUnit;
        recurrenceInterval: number;
        nextDueAt: string;
        reminderDaysBefore: number;
        preferredContactId?: string | null;
        isMandatory: boolean;
        notes?: string;
      },
    ) =>
      request<MaintenancePlan>(`/assets/${assetId}/maintenance-plans`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        title: string;
        description: string;
        recurrenceUnit: MaintenanceRecurrenceUnit;
        recurrenceInterval: number;
        nextDueAt: string;
        reminderDaysBefore: number;
        preferredContactId: string | null;
        isMandatory: boolean;
        notes: string;
      }>,
    ) =>
      request<MaintenancePlan>(`/maintenance-plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    complete: (
      id: string,
      data: {
        completedAt: string;
        contactId?: string | null;
        documentId?: string | null;
        notes?: string;
        costAmount?: number | null;
        currency?: string | null;
      },
    ) =>
      request<MaintenancePlan>(`/maintenance-plans/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pause: (id: string) =>
      request<MaintenancePlan>(`/maintenance-plans/${id}/pause`, {
        method: 'POST',
      }),
    reactivate: (id: string, nextDueAt: string) =>
      request<MaintenancePlan>(`/maintenance-plans/${id}/reactivate`, {
        method: 'POST',
        body: JSON.stringify({ nextDueAt }),
      }),
    occurrences: (id: string) => request<MaintenanceOccurrence[]>(`/maintenance-plans/${id}/occurrences`),
    remove: (id: string) => request<void>(`/maintenance-plans/${id}`, { method: 'DELETE' }),
  },
  documents: {
    listForHouse: (houseId: string) => request<DocumentRecord[]>(`/houses/${houseId}/documents`),
    upload: (houseId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return upload<DocumentRecord>(`/houses/${houseId}/documents`, form);
    },
    analyze: (id: string) => request<DocumentRecord>(`/documents/${id}/analyze`, { method: 'POST' }),
    maintenanceProposals: (id: string) => request<import('./types').DocumentMaintenanceProposal[]>(`/documents/${id}/maintenance-proposals`),
    completeMaintenance: (id: string, items: Array<{ maintenancePlanId: string; completedAt: string; notes?: string }>, costAmount?: number | null) =>
      request<{ completed: number }>(`/documents/${id}/complete-maintenance`, { method: 'POST', body: JSON.stringify({ items, costAmount: costAmount ?? null, currency: costAmount === null || costAmount === undefined ? null : 'EUR' }) }),
    confirm: (
      id: string,
      data: {
        assetId?: string;
        createAssetType?: string;
        assetName?: string;
        quantity?: number;
        roomId?: string;
        linkToHouse?: boolean;
        applyFields: boolean;
      },
    ) =>
      request<DocumentRecord>(`/documents/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    confirmFloorPlan: (
      id: string,
      decisions: Array<{
        action: 'create' | 'update' | 'skip';
        roomId?: string;
        type?: string;
        name?: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>,
    ) =>
      request<DocumentRecord>(`/documents/${id}/confirm-floorplan`, {
        method: 'POST',
        body: JSON.stringify({ decisions }),
      }),
    confirmUtilityBill: (
      id: string,
      data: { supplier?: string | null; periods: Array<{ periodStart: string; periodEnd: string; consumptionKwh: number; amount?: number | null }> },
    ) => request<DocumentRecord>(`/documents/${id}/confirm-utility-bill`, { method: 'POST', body: JSON.stringify(data) }),
    confirmPropertyProfile: (id: string, fields: Record<string, string | number | null>) =>
      request<{ appliedFields: string[]; conflicts: string[] }>(`/documents/${id}/confirm-property-profile`, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      }),
    fileUrl: (id: string) => `${BASE_URL}/documents/${id}/file`,
    downloadUrl: (id: string) => `${BASE_URL}/documents/${id}/file?download=1`,
    uploadFloorPlanBackground: (houseId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return upload<DocumentRecord>(`/houses/${houseId}/floorplan-background`, form);
    },
    gmailCandidates: (houseId: string) => request<GmailCandidate[]>(`/houses/${houseId}/gmail-candidates`),
    driveCandidates: (houseId: string) => request<DriveCandidate[]>(`/houses/${houseId}/drive-candidates`),
    // Endpoint condiviso da candidati Gmail/Drive e documenti Inbox non
    // ancora confermati (vedi documents.controller.ts sul backend).
    importCandidate: (id: string) =>
      request<DocumentRecord>(`/documents/${id}/import-candidate`, {
        method: 'POST',
      }),
    ignoreDocument: (id: string) => request<DocumentRecord>(`/documents/${id}/ignore`, { method: 'POST' }),
    moveToHouse: (id: string) =>
      request<DocumentRecord>(`/documents/${id}/move-to-house`, {
        method: 'POST',
      }),
    searchOnline: (id: string) =>
      request<DocumentRecord>(`/documents/${id}/search-online`, {
        method: 'POST',
      }),
  },
  energy: {
    consumption: (houseId: string, year: number) =>
      request<import('./types').EnergyConsumptionResponse>(`/houses/${houseId}/energy-consumption?year=${year}`),
  },
  genesis: {
    start: (houseId: string) => request<House>(`/houses/${houseId}/genesis/start`, { method: 'POST' }),
    resume: (houseId: string) => request<import('./types').GenesisResumeState>(`/houses/${houseId}/genesis/resume`),
    saveStep: (houseId: string, step: import('./types').GenesisStep) =>
      request<House>(`/houses/${houseId}/genesis/step`, {
        method: 'PATCH',
        body: JSON.stringify({ step }),
      }),
    saveHouseInfo: (
      houseId: string,
      data: Partial<{
        name: string;
        address: string;
        city: string;
        postalCode: string;
        propertyType: string;
        country: string;
        surfaceSqm: number;
        buildYear: number;
      }>,
    ) =>
      request<House>(`/houses/${houseId}/genesis/house-info`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    demoCatalog: () => request<import('./types').GenesisDemoCatalog>('/genesis/demo-catalog'),
    startScan: (houseId: string, roomNames: string[], assetNames: string[]) =>
      request<ScanSessionRecord>(`/houses/${houseId}/genesis/scan`, {
        method: 'POST',
        body: JSON.stringify({ type: 'GUIDED_MOCK', roomNames, assetNames }),
      }),
    getScanResults: (houseId: string, scanSessionId: string) =>
      request<ObservationRecord[]>(`/houses/${houseId}/genesis/scan/${scanSessionId}`),
    confirmObservations: (houseId: string, scanSessionId: string, items: ConfirmObservationItem[]) =>
      request<ObservationRecord[]>(`/houses/${houseId}/genesis/scan/${scanSessionId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    complete: (houseId: string) => request<GenesisResults>(`/houses/${houseId}/genesis/complete`, { method: 'POST' }),
    getResults: (houseId: string) => request<GenesisResults>(`/houses/${houseId}/genesis`),
    scoreHistory: (houseId: string) =>
      request<import('./types').ScoreSnapshotRecord[]>(`/houses/${houseId}/genesis/score-history`),
    recalculateScore: (houseId: string) =>
      request<import('./types').GenesisRecalculationResult>(`/houses/${houseId}/genesis/recalculate`, { method: 'POST' }),
    getTimeline: (houseId: string) => request<HouseTimelineEventRecord[]>(`/houses/${houseId}/genesis/timeline`),
  },
  gmail: {
    // Navigazione diretta del browser, non fetch: il backend fa da redirect
    // verso la pagina di consenso di Google, poi torna al frontend. Nessun
    // userId in query: il backend usa la sessione (cookie) per sapere chi
    // sta collegando l'account.
    connectUrl: () => `${BASE_URL}/auth/gmail/connect`,
    status: () => request<GmailStatus>('/users/me/gmail-status'),
    disconnect: () => request<void>('/users/me/gmail-disconnect', { method: 'POST' }),
    scan: (houseId: string, months: number) =>
      request<GmailScanResult>(`/houses/${houseId}/gmail-scan`, {
        method: 'POST',
        body: JSON.stringify({ months }),
      }),
  },
  drive: {
    connectUrl: () => `${BASE_URL}/auth/drive/connect`,
    status: () => request<DriveStatus>('/users/me/drive-status'),
    disconnect: () => request<void>('/users/me/drive-disconnect', { method: 'POST' }),
    listFolders: () => request<DriveFolder[]>('/users/me/drive-folders'),
    selectFolder: (folderId: string, folderName: string) =>
      request<void>('/users/me/drive-folder', {
        method: 'POST',
        body: JSON.stringify({ folderId, folderName }),
      }),
    scan: (houseId: string) =>
      request<DriveScanResult>(`/houses/${houseId}/drive-scan`, {
        method: 'POST',
      }),
  },
};
