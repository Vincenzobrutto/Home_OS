import { ConflictException, ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { hashPassword, verifyPassword, SessionsService } from '../security';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from '../dto';
import { RecoveryConfig } from './recovery-config';

const publicAccount = (a: { id: string; name: string; email: string; emailVerifiedAt?: Date | null; requiresEmailVerification?: boolean }) => ({ id: a.id, name: a.name, email: a.email, emailVerifiedAt:a.emailVerifiedAt?.toISOString()??null, requiresEmailVerification:a.requiresEmailVerification??false });
@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly db: PrismaService, private readonly sessions: SessionsService, private readonly recoveryConfig: RecoveryConfig) {}
  private limit(req: Request) {
    const key = req.ip || 'local'; const now = Date.now();
    for (const [ip, slot] of this.attempts) if (slot.until <= now) this.attempts.delete(ip);
    const slot = this.attempts.get(key) || { count: 0, until: now + 60_000 };
    this.attempts.set(key, slot);
    if (++slot.count > 15) throw new HttpException('Troppi tentativi. Riprova tra un minuto.', 429);
  }
  async session(req: Request, res: Response) {
    let session = await this.sessions.current(req);
    if (!session) {
      const created = await this.db.$transaction(tx => this.sessions.create(tx, null, res));
      created.applyCookie(); session = created.session;
    }
    const account = session.accountId ? await this.db.account.findUnique({ where: { id: session.accountId } }) : null;
    return { account: account ? publicAccount(account) : null, csrfToken: session.csrfToken, authRecovery:{enabled:this.recoveryConfig?.enabled()??false} };
  }
  async register(dto: RegisterDto, req: Request, res: Response) {
    const old = await this.sessions.requireCsrf(req); this.limit(req);
    const passwordHash = await hashPassword(dto.password);
    try {
      const created = await this.db.$transaction(async tx => {
        const account = await tx.account.create({ data: { name: dto.name, email: dto.email, passwordHash, requiresEmailVerification:this.recoveryConfig?.enabled()??false } });
        const session = await this.sessions.create(tx, account.id, res, old);
        return { account, ...session };
      });
      created.applyCookie(); return { account: publicAccount(created.account) };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Registrazione non completabile con questi dati.');
      throw e;
    }
  }
  async login(dto: LoginDto, req: Request, res: Response) {
    const old = await this.sessions.requireCsrf(req); this.limit(req);
    const account = await this.db.account.findUnique({ where: { email: dto.email } });
    const stored = account?.passwordHash || '0'.repeat(32) + ':' + '0'.repeat(128);
    const valid = await verifyPassword(dto.password, stored);
    if (!account || !valid) throw new UnauthorizedException('Email o password non validi.');
    const created = await this.db.$transaction(async tx => {
      // Serialize session creation against password recovery. A password checked
      // before the reset must not create a surviving session after the reset.
      await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${account.id} FOR UPDATE`;
      const fresh = await tx.account.findUnique({where:{id:account.id}});
      if (!fresh || fresh.passwordHash !== account.passwordHash) throw new UnauthorizedException('Email o password non validi.');
      return this.sessions.create(tx, account.id, res, old);
    });
    created.applyCookie(); return { account: publicAccount(account) };
  }
  async logout(req: Request, res: Response) {
    const current = await this.sessions.current(req);
    if (current) {
      const session = await this.sessions.requireCsrf(req);
      await this.db.session.deleteMany({ where: { id: session.id } });
    } else if (req.headers.origin !== (process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174')) {
      throw new ForbiddenException({ code: 'csrf_invalid', message: 'Richiesta non autorizzata.' });
    }
    res.clearCookie('dimora_v5_session', { path: '/api/v5', httpOnly: true, sameSite: 'lax' });
  }
}
