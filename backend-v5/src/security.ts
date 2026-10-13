import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import type { Prisma, Session } from '../generated/client';
const derive = promisify(scrypt);
export const COOKIE = 'dimora_v5_session';
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64) as Buffer).toString('hex');
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(await derive(password, salt, 64) as Buffer, expected);
}
export function validMembership(member: { validFrom: Date; validUntil: Date | null; revokedAt: Date | null }, now = new Date()) {
  return !member.revokedAt && member.validFrom <= now && (!member.validUntil || member.validUntil > now);
}
export function assertCsrf(req: Pick<Request, 'headers'>, csrf: string, expectedOrigin: string) {
  const token = req.headers['x-csrf-token'];
  if (req.headers.origin !== expectedOrigin || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || token.length !== csrf.length || !timingSafeEqual(Buffer.from(token), Buffer.from(csrf))) {
    throw new ForbiddenException({ code: 'csrf_invalid', message: 'Richiesta non autorizzata. Ricarica la sessione.' });
  }
}
@Injectable()
export class SessionsService {
  constructor(private readonly db: PrismaService) {}
  async current(req: Request): Promise<Session | null> {
    const raw: unknown = req.cookies?.[COOKIE];
    if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const session = await this.db.session.findUnique({ where: { id: digest(raw) } });
    return session && session.expiresAt > new Date() ? session : null;
  }
  async create(tx: Prisma.TransactionClient, accountId: string | null, res: Response, old?: Session | null) {
    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + (accountId ? 7 * 86400_000 : 30 * 60_000));
    if (old) await tx.session.deleteMany({ where: { id: old.id } });
    const session = await tx.session.create({ data: { id: digest(raw), accountId, csrfToken: randomBytes(32).toString('base64url'), expiresAt } });
    // Cookie impostato solo dopo la transazione dal chiamante.
    return { session, applyCookie: () => res.cookie(COOKIE, raw, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/v5', expires: expiresAt }) };
  }
  async require(req: Request, mutation = false) {
    const session = await this.current(req);
    if (!session?.accountId) throw new UnauthorizedException('Accedi per continuare.');
    const context = req.headers['x-account-context'];
    if (context !== undefined && context !== session.accountId) {
      throw new UnauthorizedException({ code: 'account_context_changed', message: 'L’account è cambiato in un’altra scheda. Ricarica la sessione.' });
    }
    if (mutation) assertCsrf(req, session.csrfToken, process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174');
    return session as Session & { accountId: string };
  }
  async requireCsrf(req: Request) {
    const session = await this.current(req);
    if (!session) throw new ForbiddenException('Ricarica la sessione prima di inviare.');
    assertCsrf(req, session.csrfToken, process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174');
    return session;
  }
}
