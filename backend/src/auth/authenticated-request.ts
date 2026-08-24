import type { Request } from 'express';
import type { User } from '@prisma/client';

// req.user viene attaccato da AuthGuard (vedi auth.guard.ts) — include
// passwordHash perché arriva diretto dalla riga Prisma, ma non deve mai
// uscire da un controller senza passare da sanitizeUser().
export interface AuthenticatedRequest extends Request {
  user: User;
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const safe: Partial<User> = { ...user };
  delete safe.passwordHash;
  return safe as Omit<User, 'passwordHash'>;
}
