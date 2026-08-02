import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(houseId: string, dto: CreateRoomDto) {
    await this.ensureHouseExists(houseId);
    const count = await this.prisma.room.count({ where: { houseId } });
    const code = `AMB-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.room.create({
      data: { ...dto, houseId, code },
    });
  }

  async findAllForHouse(houseId: string) {
    await this.ensureHouseExists(houseId);
    return this.prisma.room.findMany({ where: { houseId } });
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room ${id} non trovata`);
    }
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room ${id} non trovata`);
    }
    // Gli asset collegati non vengono cancellati: room_id passa a null
    // (onDelete: SetNull nello schema) e tornano "impianto di casa" — vedi
    // decisione di prodotto #1 in START_HERE.md, le stanze sono solo un
    // contenitore, gli asset restano il centro del sistema.
    await this.prisma.room.delete({ where: { id } });
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
