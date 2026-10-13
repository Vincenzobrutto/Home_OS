import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { SessionsService, validMembership } from '../security';
import type { HomeMembership, Document, Prisma } from '../../generated/client';
export type DocumentRequest = Request & { documentAccountId: string };
export function canReadDocument(doc: Pick<Document, 'uploaderId' | 'visibility'>, accountId: string) { return doc.visibility === 'home' || doc.uploaderId === accountId; }
export function canExport(member: HomeMembership) { return member.role !== 'viewer'; }
@Injectable()
export class DocumentPolicy {
  constructor(private readonly db: PrismaService) {}
  async require(accountId: string, homeId: string, action: 'read' | 'edit' | 'export' = 'read', store: Pick<Prisma.TransactionClient, 'homeMembership'> = this.db) {
    const membership = await store.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } } });
    if (!membership || !validMembership(membership) || (action !== 'read' && membership.role === 'viewer')) throw new ForbiddenException('Accesso non consentito.');
    return membership;
  }
  async requireLocked(tx: Prisma.TransactionClient, accountId: string, homeId: string) {
    await tx.$queryRaw`SELECT id FROM "HomeMembership" WHERE "accountId"=${accountId} AND "homeId"=${homeId} FOR SHARE`;
    return this.require(accountId, homeId, 'read', tx);
  }
}
@Injectable()
export class DocumentAccessGuard implements CanActivate {
  constructor(private readonly sessions: SessionsService, private readonly policy: DocumentPolicy) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<DocumentRequest>();
    const accountId = (await this.sessions.require(req, req.method === 'POST')).accountId;
    const homeId = String(req.params.homeId);
    if (!isUUID(homeId)) throw new UnprocessableEntityException({ code: 'validation_error', message: 'Casa non valida.' });
    await this.policy.require(accountId, homeId, req.method === 'POST' ? (req.path.endsWith('/export') ? 'export' : 'edit') : 'read');
    req.documentAccountId = accountId;
    return true;
  }
}
