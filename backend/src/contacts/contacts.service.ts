import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(houseId: string, dto: CreateContactDto) {
    await this.ensureHouseExists(houseId);
    return this.prisma.contact.create({ data: { ...dto, houseId } });
  }

  async findAllForHouse(houseId: string) {
    await this.ensureHouseExists(houseId);
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

  async findOne(id: string) {
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
    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.ensureContactExists(id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureContactExists(id);
    // Gli interventi collegati non vengono cancellati: contact_id passa a
    // null (onDelete: SetNull nello schema) e restano nella cronologia
    // dell'asset, solo senza un contatto assegnato.
    await this.prisma.contact.delete({ where: { id } });
  }

  private async ensureContactExists(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contatto ${id} non trovato`);
    }
  }

  private async ensureHouseExists(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new NotFoundException(`House ${houseId} non trovata`);
    }
  }
}
