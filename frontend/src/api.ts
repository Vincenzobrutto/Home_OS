import type { Asset, Contact, ContactDetail, CustomField, DocumentRecord, DriveCandidate, DriveFolder, DriveScanResult, DriveStatus, GmailCandidate, GmailScanResult, GmailStatus, House, MaintenanceOccurrence, MaintenancePlan, MaintenanceRecurrenceUnit, MaintenanceReminder, MaintenanceSuggestion, Room, TimelineEvent, User } from './types';
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
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return handleResponse<T>(res);
}

// Niente Content-Type qui: il browser deve poter fissare da solo il boundary
// multipart per il FormData.
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
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
  users: {
    list: () => request<User[]>('/users'),
    create: (data: { email: string; name?: string }) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
    housesOf: (userId: string) => request<House[]>(`/users/${userId}/houses`),
  },
  houses: {
    get: (id: string) => request<House & { rooms: Room[]; assets: Asset[] }>(`/houses/${id}`),
    create: (data: { ownerId: string; name: string; city?: string; surfaceSqm?: number; roomsCount?: number; buildYear?: number }) => request<House>('/houses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ floorPlanRotation: number }>) =>
      request<House>(`/houses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
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
  gmail: {
    // Navigazione diretta del browser, non fetch: il backend fa da redirect
    // verso la pagina di consenso di Google, poi torna al frontend.
    connectUrl: (userId: string) => `${BASE_URL}/auth/gmail/connect?userId=${userId}`,
    status: (userId: string) => request<GmailStatus>(`/users/${userId}/gmail-status`),
    disconnect: (userId: string) => request<void>(`/users/${userId}/gmail-disconnect`, { method: 'POST' }),
    scan: (houseId: string, userId: string, months: number) =>
      request<GmailScanResult>(`/houses/${houseId}/gmail-scan`, {
        method: 'POST',
        body: JSON.stringify({ userId, months }),
      }),
  },
  drive: {
    connectUrl: (userId: string) => `${BASE_URL}/auth/drive/connect?userId=${userId}`,
    status: (userId: string) => request<DriveStatus>(`/users/${userId}/drive-status`),
    disconnect: (userId: string) => request<void>(`/users/${userId}/drive-disconnect`, { method: 'POST' }),
    listFolders: (userId: string) => request<DriveFolder[]>(`/users/${userId}/drive-folders`),
    selectFolder: (userId: string, folderId: string, folderName: string) =>
      request<void>(`/users/${userId}/drive-folder`, {
        method: 'POST',
        body: JSON.stringify({ folderId, folderName }),
      }),
    scan: (houseId: string, userId: string) =>
      request<DriveScanResult>(`/houses/${houseId}/drive-scan`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
  },
};
