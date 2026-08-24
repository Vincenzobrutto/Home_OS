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
      include: { _count: { select: { timelineEvents: true } } },
      orderBy: { name: 'asc' },
    });
    return contacts.map(({ _count, ...contact }) => ({
      ...contact,
      interventionsCount: _count.timelineEvents,
    }));
  }

  async findOne(userId: string, id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        timelineEvents: {
          orderBy: { eventDate: 'desc' },
          include: {
            asset: { select: { id: true, name: true, code: true, type: true } },
          },
        },
      },
    });
    if (!contact) {
      throw new NotFoundException(`Contatto ${id} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, contact.houseId);
    return contact;
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
