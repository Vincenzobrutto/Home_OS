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
