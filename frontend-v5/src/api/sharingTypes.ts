// sharing-v1 (C1a): tipi del contratto congelato docs/v5/sharing-api-contract.md (master Codex).
// Nessun campo aggiunto: ciò che manca è documentato nel report di consegna, non inventato qui.

export type ShareRecipient = { kind: 'member'; accountId: string } | { kind: 'external' };

export interface ShareItem {
  documentId: string;
  documentVersion: number;
  name: string;
  byteSize: number;
  mimeType: string;
}

/** Profilo dichiarato dall'account: mai una prova d'identità. */
export interface SharePerson {
  id: string;
  name: string;
  email: string;
  identityVerified: false;
}

export type ShareState =
  | 'awaiting_pairing'
  | 'awaiting_confirmation'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'unavailable';

export interface SharePreview {
  id: string;
  version: 1;
  recipient: ShareRecipient;
  recipientPerson: SharePerson | null;
  items: ShareItem[];
  expiresAt: string;
  validUntil: string;
  manifestFingerprint: string;
}

export type SharePermission = 'revoke' | 'rotate_code' | 'confirm_pairing' | 'accept' | 'decline' | 'read_files';

export interface ShareClaim {
  id: string;
  account: SharePerson;
  comparisonCode: string;
  expiresAt: string;
}

export interface Share {
  id: string;
  version: number;
  state: ShareState;
  createdAt: string;
  expiresAt: string | null;
  senderName: string | null;
  recipient: SharePerson | null;
  /** [] prima dell'accettazione per il destinatario. */
  items: ShareItem[];
  permissions: SharePermission[];
  pairing: null | { code: string | null; codeExpiresAt: string | null; claim: ShareClaim | null };
  comparison: null | { claimId: string; code: string; expiresAt: string };
}

export interface SharingCapabilities {
  apiVersion: 'sharing-v1';
  enabled: boolean;
  isSimulation: boolean;
  externalPairing: boolean;
  technicalData: boolean;
  economy: boolean;
  limits: { maxDocuments: number; maxBytes: number; durationDays: number[]; previewMinutes: number; codeMinutes: number };
  permissions: Array<'prepare'>;
}

export type SharingDocument = ShareItem & {
  visibility: 'private' | 'home';
  eligible: boolean;
  ineligibleReason: 'not_uploader' | null;
};

export interface CreatePreview {
  documentIds: string[];
  recipient: ShareRecipient;
  durationDays: number;
}

export interface CreateShare {
  previewId: string;
  expectedPreviewVersion: 1;
  manifestFingerprint: string;
  acknowledgedDocumentIds: string[];
}
