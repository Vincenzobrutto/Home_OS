import { ConflictException, HttpException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
import { digest, hashPassword, SessionsService } from '../security';
import { BrevoRecoveryMail, type RecoveryMailPurpose } from './recovery-mail';
import { RecoveryConfig, type RecoverySettings } from './recovery-config';
import type { CompleteRecoveryDto, CompleteVerificationDto } from './recovery.dto';
const invalid = () => new UnprocessableEntityException({ code: 'recovery_invalid', message: 'Link non più valido. Chiedi un nuovo link oppure prova ad accedere.' });
const logoutRequired = () => new ConflictException({ code: 'recovery_logout_required', message: 'Esci dall’account corrente prima di continuare con questo link.' });
@Injectable()
export class RecoveryService {
  constructor(private readonly db: PrismaService, private readonly sessions: SessionsService, private readonly config: RecoveryConfig) {}
  protected mail(settings: RecoverySettings) { return new BrevoRecoveryMail(settings); }
  private async throttle(settings: RecoverySettings, scope: string, value: string) {
    const now = Date.now(), window = Math.floor(now / 900000);
    const key = createHmac('sha256', settings.throttleSecret).update(`${scope}:${window}:${value}`).digest('hex');
    const rows = await this.db.$queryRaw<Array<{ count: number }>>`INSERT INTO "AuthThrottle" (key,count,"expiresAt") VALUES (${key},1,${new Date((window + 1) * 900000)}) ON CONFLICT (key) DO UPDATE SET count="AuthThrottle".count+1 RETURNING count`;
    return rows[0].count;
  }
  private async ipLimit(settings: RecoverySettings, req: Request, scope: string) {
    if (await this.throttle(settings, scope, req.ip || 'loopback') > 20) throw new HttpException({ code: 'recovery_rate_limited', message: 'Troppe richieste da questa connessione. Attendi qualche minuto.' },429);
  }
  async request(purpose: RecoveryMailPurpose, email: string | null, req: Request) {
    const settings = this.config.settings();
    const session = purpose === 'verify_email' ? await this.sessions.require(req,true) : await this.sessions.requireCsrf(req);
    if (purpose === 'reset_password' && session.accountId) throw logoutRequired();
    await this.ipLimit(settings,req,`${purpose}:request`);
    const account = purpose === 'verify_email' ? await this.db.account.findUnique({where:{id:session.accountId!}}) : await this.db.account.findUnique({where:{email:email!}});
    const address = purpose === 'verify_email' ? account?.email || '' : email!;
    const limited = await this.throttle(settings,`${purpose}:email`,address) > 3;
    if (!limited && account && !(purpose === 'verify_email' && account.emailVerifiedAt)) {
      const token = randomBytes(32).toString('base64url');
      const challenge = await this.db.authChallenge.create({data:{accountId:account.id,purpose,tokenHash:digest(token),emailFingerprint:digest(account.email),expiresAt:new Date(Date.now()+(purpose==='reset_password'?1800000:86400000))}});
      // No persisted plaintext token or retry worker. A process crash may lose the
      // dispatch; the neutral response offers a fresh explicit request instead.
      setImmediate(() => { void this.deliver(settings,purpose,account.email,token,challenge.id); });
    }
    // Purge expired security metadata only; never delete personal product data.
    await this.db.authChallenge.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-7*86400000)}}});
    await this.db.authThrottle.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}});
    return { message: 'Se il recapito è associato a un account, riceverai le istruzioni.' };
  }
  private async deliver(settings: RecoverySettings,purpose: RecoveryMailPurpose,email: string,token: string,id: string) {
    let deliveryState = 'accepted';
    try { await this.mail(settings).send(purpose,email,token); }
    catch (e) { const code = (e as {code?:string}).code; deliveryState = code === 'mail_rejected' || code === 'mail_rate_limited' ? 'rejected' : 'uncertain'; }
    await this.db.authChallenge.updateMany({where:{id},data:{deliveryState}}).catch(()=>undefined);
  }
  async complete(purpose: RecoveryMailPurpose, dto: CompleteRecoveryDto | CompleteVerificationDto, req: Request, res: Response) {
    const settings = this.config.settings(), session = await this.sessions.requireCsrf(req);
    if (purpose === 'reset_password' && session.accountId) throw logoutRequired();
    await this.ipLimit(settings,req,`${purpose}:complete`);
    const tokenHash = digest(dto.token), initial = await this.db.authChallenge.findUnique({where:{tokenHash}});
    if (!initial || initial.purpose !== purpose) throw invalid();
    if (session.accountId && session.accountId !== initial.accountId) throw logoutRequired();
    const passwordHash = purpose === 'reset_password' ? await hashPassword((dto as CompleteRecoveryDto).password) : null;
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${initial.accountId} FOR UPDATE`;
      const challenge = await tx.authChallenge.findUnique({where:{tokenHash}}), account = await tx.account.findUnique({where:{id:initial.accountId}}), now = new Date();
      if (!challenge || !account || challenge.purpose !== purpose || challenge.consumedAt || challenge.expiresAt <= now || challenge.emailFingerprint !== digest(account.email)) throw invalid();
      const consumed = await tx.authChallenge.updateMany({where:{id:challenge.id,consumedAt:null,expiresAt:{gt:now}},data:{consumedAt:now}});
      if (consumed.count !== 1) throw invalid();
      await tx.account.update({where:{id:account.id},data:{emailVerifiedAt:now,...(passwordHash?{passwordHash}:{})}});
      if (passwordHash) {
        await tx.session.deleteMany({where:{accountId:account.id}});
        await tx.authChallenge.updateMany({where:{accountId:account.id,purpose:'reset_password',consumedAt:null},data:{consumedAt:now}});
      }
    });
    if (purpose === 'reset_password') res.clearCookie('dimora_v5_session',{path:'/api/v5',httpOnly:true,sameSite:'lax'});
  }
}
