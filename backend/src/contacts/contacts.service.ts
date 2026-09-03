import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(userId: string, houseId: string, dto: CreateContactDto) {
    await this.ensureHouseAccess(userId, houseId);
    return this.prisma.contact.create({ data: { ...dto, houseId } });
  }

  async findAllForHouse(userId: string, houseId: string) {
    await this.ensureHouseAccess(userId, houseId);
    const contacts = await this.prisma.contact.findMany({
      where: { houseId },
      include: {
        _count: {
          select: {
            timelineEvents: { where: { interventionId: null } },
            interventions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return contacts.map(({ _count, ...contact }) => ({
      ...contact,
      // Le righe timeline già collegate a un Intervention sono una
      // proiezione legacy dello stesso fatto e non vanno ricontate.
      interventionsCount: _count.interventions + _count.timelineEvents,
    }));
  }

  async findOne(userId: string, id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        timelineEvents: {
          where: { interventionId: null },
          orderBy: { eventDate: 'desc' },
          include: {
            asset: { select: { id: true, name: true, code: true, type: true } },
          },
        },
        interventions: {
          orderBy: { occurredAt: 'desc' },
          include: {
            assets: {
              include: {
                asset: {
                  select: { id: true, name: true, code: true, type: true },
                },
              },
            },
          },
        },
      },
    });
    if (!contact) {
      throw new NotFoundException(`Contatto ${id} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, contact.houseId);
    const canonical = contact.interventions
      .filter((item) => item.assets.length > 0)
      .map((item) => ({
        id: item.id,
        sourceKind: 'INTERVENTION',
        sourceId: item.id,
        assetId: item.assets[0].assetId,
        eventDate: item.occurredAt,
        eventType: item.title,
        detail: item.description,
        contactId: item.contactId,
        asset: item.assets[0].asset,
        assets: item.assets.map((link) => link.asset),
        costAmount: item.costAmount === null ? null : Number(item.costAmount),
        currency: item.currency,
      }));
    const legacy = contact.timelineEvents.map((item) => ({
      ...item,
      sourceKind: 'LEGACY_EVENT',
      sourceId: item.id,
      assets: [item.asset],
      costAmount: null,
      currency: null,
    }));
    return {
      ...contact,
      interventions: undefined,
      timelineEvents: [...canonical, ...legacy].sort(
        (left, right) =>
          new Date(right.eventDate).getTime() -
          new Date(left.eventDate).getTime(),
      ),
    };
  }

  async update(userId: string, id: string, dto: UpdateContactDto) {
    await this.contactOrThrow(userId, id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.contactOrThrow(userId, id);
    // Gli interventi collegati non vengono cancellati: contact_id passa a
    // null (onDelete: SetNull nello schema) e restano nella cronologia
    // dell'asset, solo senza un contatto assegnato.
    await this.prisma.contact.delete({ where: { id } });
  }

  private async contactOrThrow(userId: string, id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contatto ${id} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, contact.houseId);
    return contact;
  }

  private async ensureHouseAccess(userId: string, houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new NotFoundException(`House ${houseId} non trovata`);
    }
    await this.accessControl.assertHouseAccess(userId, houseId);
  }
}
