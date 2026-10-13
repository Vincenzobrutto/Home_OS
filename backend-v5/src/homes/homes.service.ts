import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateHomeDto } from '../dto';
import { digest, validMembership } from '../security';
import type { Home, HomeMembership } from '../../generated/client';
const permissions = { owner: ['read', 'edit', 'manage_members', 'export', 'sell'], member: ['read', 'edit', 'export'], viewer: ['read'] };
export function publicHome(home: Home, member: HomeMembership) { return { id: home.id, name: home.name, address: home.address, version: home.version, role: member.role, permissions: permissions[member.role] }; }
@Injectable()
export class HomesService {
  constructor(private readonly db: PrismaService) {}
  async list(accountId: string) {
    const now = new Date();
    const memberships = await this.db.homeMembership.findMany({ where: { accountId, revokedAt: null, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, include: { home: true }, orderBy: { validFrom: 'asc' } });
    return { items: memberships.map(m => publicHome(m.home, m)) };
  }
  async get(accountId: string, homeId: string) {
    const member = await this.db.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } }, include: { home: true } });
    if (!member || !validMembership(member)) throw new ForbiddenException('Non hai accesso a questa casa.');
    return { home: publicHome(member.home, member) };
  }
  async create(accountId: string, dto: CreateHomeDto, key: string | undefined) {
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new UnprocessableEntityException('Invia una Idempotency-Key valida.');
    const fingerprint = digest(JSON.stringify([dto.name, dto.address]));
    const prior = await this.db.homeRequest.findUnique({ where: { accountId_key: { accountId, key } } });
    if (prior) {
      if (prior.digest !== fingerprint) throw new ConflictException({ code: 'idempotency_conflict', message: 'Questa chiave è già usata con altri dati.' });
      return this.get(accountId, prior.homeId);
    }
    try {
      const home = await this.db.$transaction(async tx => {
        // Use the same millisecond clock as permission checks. PostgreSQL now()
        // has microsecond precision and can round forward when read as JS Date.
        const created = await tx.home.create({ data: { name: dto.name, address: dto.address, memberships: { create: { accountId, role: 'owner', validFrom: new Date() } } } });
        await tx.homeRequest.create({ data: { accountId, key, digest: fingerprint, homeId: created.id } });
        return created;
      });
      return this.get(accountId, home.id);
    } catch (e) {
      if ((e as { code?: string }).code !== 'P2002') throw e;
      const completed = await this.db.homeRequest.findUnique({ where: { accountId_key: { accountId, key } } });
      if (!completed || completed.digest !== fingerprint) throw new ConflictException({ code: 'idempotency_conflict', message: 'Richiesta concorrente non compatibile.' });
      return this.get(accountId, completed.homeId);
    }
  }
}
