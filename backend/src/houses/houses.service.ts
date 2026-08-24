import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';

@Injectable()
export class HousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(ownerId: string, dto: CreateHouseDto) {
    const count = await this.prisma.house.count();
    const code = `CASA-${String(count + 1).padStart(4, '0')}`;

    // Casa e membership OWNER nascono insieme: senza la seconda, il
    // creatore non avrebbe accesso alla propria casa appena fatta (vedi
    // AccessControlService.assertHouseAccess).
    return this.prisma.$transaction(async (tx) => {
      const house = await tx.house.create({
        data: { ...dto, ownerId, code },
      });
      await tx.houseMembership.create({
        data: { houseId: house.id, userId: ownerId, role: 'OWNER' },
      });
      return house;
    });
  }

  // Non solo le case possedute: anche quelle condivise in futuro (B12),
  // dato che l'autorizzazione già oggi passa da HouseMembership e non da
  // House.ownerId — vedi AccessControlService.
  findAllForUser(userId: string) {
    return this.prisma.house.findMany({
      where: { memberships: { some: { userId } } },
    });
  }

  async findOne(userId: string, id: string) {
    await this.accessControl.assertHouseAccess(userId, id);
    const house = await this.prisma.house.findUnique({
      where: { id },
      include: { rooms: true, assets: true },
    });
    if (!house) {
      throw new NotFoundException(`House ${id} non trovata`);
    }
    return house;
  }

  async update(userId: string, id: string, dto: UpdateHouseDto) {
    await this.findOne(userId, id);
    return this.prisma.house.update({ where: { id }, data: dto });
  }
}
