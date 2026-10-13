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
