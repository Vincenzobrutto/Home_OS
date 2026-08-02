import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHouseDto) {
    const count = await this.prisma.house.count();
    const code = `CASA-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.house.create({
      data: { ...dto, code },
    });
  }

  findAllForOwner(ownerId: string) {
    return this.prisma.house.findMany({ where: { ownerId } });
  }

  async findOne(id: string) {
    const house = await this.prisma.house.findUnique({
      where: { id },
      include: { rooms: true, assets: true },
    });
    if (!house) {
      throw new NotFoundException(`House ${id} non trovata`);
    }
    return house;
  }

  async update(id: string, dto: UpdateHouseDto) {
    await this.findOne(id);
    return this.prisma.house.update({ where: { id }, data: dto });
  }
}
