import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Verifica di autorizzazione condivisa da ogni servizio che tocca dati di
// una casa: centralizzata qui invece che duplicata in ogni controller, così
// il criterio (HouseMembership, non solo House.ownerId) è uno solo e vale
// anche per la futura condivisione multi-utente (B12) senza altre modifiche
// backend quando arriverà l'UI di invito.
@Injectable()
export class AccessControlService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // Le case create prima di questa modifica non hanno ancora una riga
  // HouseMembership (la tabella è sempre stata predisposta ma mai popolata,
  // vedi domain-model.md) — senza questo backfill l'owner reale perderebbe
  // l'accesso ai propri dati al primo avvio con l'autorizzazione attiva.
  // Idempotente: agisce solo sulle case senza nessuna membership.
  async onModuleInit() {
    const orphanHouses = await this.prisma.house.findMany({
      where: { memberships: { none: {} } },
      select: { id: true, ownerId: true },
    });
    for (const house of orphanHouses) {
      await this.prisma.houseMembership.create({
        data: { houseId: house.id, userId: house.ownerId, role: 'OWNER' },
      });
    }
  }

  async assertHouseAccess(userId: string, houseId: string): Promise<void> {
    const membership = await this.prisma.houseMembership.findUnique({
      where: { houseId_userId: { houseId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Non hai accesso a questa casa.');
    }
  }
}
