import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(userId: string, houseId: string, dto: CreateRoomDto) {
    await this.ensureHouseAccess(userId, houseId);
    const count = await this.prisma.room.count({ where: { houseId } });
    const code = `AMB-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.room.create({
      data: { ...dto, houseId, code },
    });
  }

  async findAllForHouse(userId: string, houseId: string) {
    await this.ensureHouseAccess(userId, houseId);
    return this.prisma.room.findMany({ where: { houseId } });
  }

  async update(userId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.roomOrThrow(id);
    await this.accessControl.assertHouseAccess(userId, room.houseId);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const room = await this.roomOrThrow(id);
    await this.accessControl.assertHouseAccess(userId, room.houseId);
    // Gli asset collegati non vengono cancellati: room_id passa a null
    // (onDelete: SetNull nello schema) e tornano "impianto di casa" — vedi
    // decisione di prodotto #1 in START_HERE.md, le stanze sono solo un
    // contenitore, gli asset restano il centro del sistema.
    await this.prisma.room.delete({ where: { id } });
  }

  private async roomOrThrow(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room ${id} non trovata`);
    }
    return room;
  }

  // A differenza di roomOrThrow, qui l'id è già una houseId (rotte
  // "houses/:houseId/rooms"): verificare che la casa esista e verificare
  // l'accesso sono la stessa chiamata, non due passaggi separati.
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
