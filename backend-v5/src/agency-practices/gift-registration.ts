import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { publicAccount } from '../auth/auth.service';
import { RecoveryConfig, type RecoverySettings } from '../auth/recovery-config';
import { RecoveryService } from '../auth/recovery.service';
import { hashPassword, SessionsService } from '../security';
import { GiftInvitationError, type GiftInvitation } from './gift-invitations';
import { GiftInvitationsStore } from './gift-invitations-store';

type Invitation = Pick<GiftInvitation, 'id' | 'version' | 'recipientEmail'>;
type Credential = { secret: string; proof: string };
type Guest = Awaited<ReturnType<SessionsService['requireCsrf']>>;
const windowMs = 15 * 60 * 1000;
const proofPattern = /^[A-Za-z0-9_-]{43}$/u;

function proofForWindow(invitation: Invitation, secret: string, key: string, window: number) {
  return createHmac('sha256', Buffer.from(key, 'hex'))
    .update(JSON.stringify(['dimora:gift-registration:v1', invitation.id, invitation.version, invitation.recipientEmail, secret, window]))
    .digest('base64url');
}

export function giftRegistrationProof(invitation: Invitation, secret: string, key: string, now: number) {
  return proofForWindow(invitation, secret, key, Math.floor(now / windowMs));
}

export function matchesGiftRegistrationProof(invitation: Invitation, { secret, proof }: Credential, key: string, now: number) {
  if (!proofPattern.test(proof)) return false;
  const window = Math.floor(now / windowMs);
  const received = Buffer.from(proof);
  const current = timingSafeEqual(received, Buffer.from(proofForWindow(invitation, secret, key, window)));
  const previous = timingSafeEqual(received, Buffer.from(proofForWindow(invitation, secret, key, window - 1)));
  return current || previous;
}

@Injectable()
export class GiftRegistrationService {
  constructor(
    private readonly invitations: GiftInvitationsStore,
    private readonly sessions: SessionsService,
    private readonly recovery: RecoveryService,
    private readonly config: RecoveryConfig,
  ) {}

  private checkProof(invitation: Invitation, credential: Credential, settings: RecoverySettings) {
    if (!isEmail(invitation.recipientEmail) ||
        !matchesGiftRegistrationProof(invitation, credential, settings.throttleSecret, Date.now())) {
      throw new GiftInvitationError('unavailable');
    }
  }

  async requestEmail(invitationId: string, secret: string, req: Request) {
    const settings = this.config.settings();
    const invitation = await this.invitations.withRegistrationInvitation(invitationId, secret, async (_tx, current) => current);
    if (!isEmail(invitation.recipientEmail)) throw new GiftInvitationError('unavailable');
    const proof = giftRegistrationProof(invitation, secret, settings.throttleSecret, Date.now());
    return this.recovery.requestGiftRegistration(settings, invitation.recipientEmail, { invitationId, secret, proof }, req);
  }

  private readContext(invitationId: string, credential: Credential, settings: RecoverySettings) {
    return this.invitations.withRegistrationInvitation(invitationId, credential.secret, async (_tx, invitation) => {
      this.checkProof(invitation, credential, settings);
      return { recipientEmail: invitation.recipientEmail };
    });
  }

  context(invitationId: string, credential: Credential) {
    return this.readContext(invitationId, credential, this.config.settings());
  }

  async register(invitationId: string, input: Credential & { password: string }, guest: Guest, res: Response) {
    const settings = this.config.settings();
    await this.readContext(invitationId, input, settings);
    const passwordHash = await hashPassword(input.password);
    try {
      const created = await this.invitations.withRegistrationInvitation(invitationId, input.secret, async (tx, invitation) => {
        await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${guest.id} FOR UPDATE`;
        const session = await tx.session.findUnique({ where: { id: guest.id } });
        const now = new Date();
        if (!session || session.accountId !== null || session.expiresAt <= now) {
          throw new UnauthorizedException('Ricarica la sessione e riprova.');
        }
        this.checkProof(invitation, input, settings);
        const account = await tx.account.create({
          data: {
            name: 'Proprietario',
            email: invitation.recipientEmail,
            passwordHash,
            emailVerifiedAt: now,
            requiresEmailVerification: true,
          },
        });
        const nextSession = await this.sessions.create(tx, account.id, res, session);
        return { account, applyCookie: nextSession.applyCookie };
      });
      created.applyCookie();
      return { account: publicAccount(created.account) };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new GiftInvitationError('registration_unavailable');
      throw error;
    }
  }
}
