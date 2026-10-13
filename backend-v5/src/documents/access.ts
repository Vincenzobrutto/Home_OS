import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { SessionsService, validMembership } from '../security';
import type { HomeMembership, Document } from '../../generated/client';
export type DocumentRequest = Request & { documentAccountId: string };
export function canReadDocument(doc: Pick<Document, 'uploaderId' | 'visibility'>, accountId: string) { return doc.visibility === 'home' || doc.uploaderId === accountId; }
export function canExport(member: HomeMembership) { return member.role !== 'viewer'; }
@Injectable()
export class DocumentPolicy {
  constructor(private readonly db: PrismaService) {}
  async require(accountId: string, homeId: string, action: 'read' | 'edit' | 'export' = 'read') {
    const membership = await this.db.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } } });
    if (!membership || !validMembership(membership) || (action !== 'read' && membership.role === 'viewer')) throw new ForbiddenException('Accesso non consentito.');
    return membership;
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
