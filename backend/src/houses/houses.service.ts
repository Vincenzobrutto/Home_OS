import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';
import { UpdatePropertyProfileDto } from './dto/update-property-profile.dto';
import {
  changedPropertyFields,
  propertyProfileCompleteness,
  propertyProvenanceUpsert,
} from '../common/property-profile';

const PROPERTY_PROVENANCE_INCLUDE = {
  sourceDocument: { select: { originalFilename: true } },
  confirmedByUser: { select: { name: true, email: true } },
} as const;

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
      include: {
        rooms: true,
        assets: true,
        fieldProvenance: { include: PROPERTY_PROVENANCE_INCLUDE },
      },
    });
    if (!house) {
      throw new NotFoundException(`House ${id} non trovata`);
    }
    return {
      ...house,
      propertyProfileCompleteness: propertyProfileCompleteness(house),
    };
  }

  async update(userId: string, id: string, dto: UpdateHouseDto) {
    await this.findOne(userId, id);
    return this.prisma.house.update({ where: { id }, data: dto });
  }

  // Nessuna pulizia preliminare necessaria: ogni tabella collegata a House
  // (17 con houseId diretto, più le relazioni di secondo livello) ha già
  // onDelete Cascade/SetNull a livello di schema — vedi decisions.md #53.
  async remove(userId: string, id: string): Promise<void> {
    await this.accessControl.assertHouseOwner(userId, id);
    await this.prisma.house.delete({ where: { id } });
  }

  // Export minimo per la portabilità dei dati (B51/B54, mvp-v1.md §8): un
  // JSON scaricabile con tutto ciò che l'utente ha inserito o confermato per
  // questa casa. Solo metadati dei documenti (mai il contenuto del file: non
  // è un backup binario, e fileUrl è un dettaglio implementativo interno che
  // non ha senso in un export). Diverso dal PDF "libretto casa" (B23), che è
  // un output di presentazione, non un formato dati riutilizzabile altrove.
  async exportData(userId: string, id: string) {
    await this.accessControl.assertHouseAccess(userId, id);
    const house = await this.prisma.house.findUnique({ where: { id } });
    if (!house) throw new NotFoundException(`House ${id} non trovata`);

    const [rooms, assets, documents, interventions, warranties, contacts] =
      await Promise.all([
        this.prisma.room.findMany({
          where: { houseId: id },
          select: { id: true, type: true, name: true, code: true },
        }),
        this.prisma.asset.findMany({
          where: { houseId: id },
          include: { customFields: true },
        }),
        this.prisma.document.findMany({
          where: {
            houseId: id,
            ignoredAt: null,
            // Stesso filtro di DocumentsService.listForHouse: i candidati
            // Gmail/Drive non ancora importati non sono ancora "dati della
            // casa" a tutti gli effetti, vivono solo nella vista candidati.
            NOT: { source: { in: ['GMAIL', 'DRIVE'] }, importedAt: null },
          },
          select: {
            id: true,
            assetId: true,
            originalFilename: true,
            docType: true,
            status: true,
            houseLevel: true,
            uploadedAt: true,
            confirmedAt: true,
          },
        }),
        this.prisma.intervention.findMany({
          where: { houseId: id },
          include: {
            contact: { select: { id: true, name: true } },
            assets: {
              include: { asset: { select: { id: true, name: true } } },
            },
          },
        }),
        this.prisma.warranty.findMany({
          where: { asset: { houseId: id } },
          include: {
            asset: { select: { id: true, name: true } },
            providerContact: { select: { id: true, name: true } },
          },
        }),
        this.prisma.contact.findMany({ where: { houseId: id } }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      house: {
        id: house.id,
        code: house.code,
        name: house.name,
        city: house.city,
        surfaceSqm: house.surfaceSqm,
        roomsCount: house.roomsCount,
        buildYear: house.buildYear,
      },
      rooms,
      assets,
      documents,
      interventions,
      warranties,
      contacts,
    };
  }

  async updatePropertyProfile(
    userId: string,
    id: string,
    dto: UpdatePropertyProfileDto,
  ) {
    await this.accessControl.assertHouseAccess(userId, id);
    const existing = await this.prisma.house.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`House ${id} non trovata`);

    const changed = changedPropertyFields(dto, existing);
    const data: Prisma.HouseUpdateInput = { ...dto };
    await this.prisma.$transaction([
      this.prisma.house.update({ where: { id }, data }),
      ...changed.map((fieldName) =>
        this.prisma.houseFieldProvenance.upsert(
          propertyProvenanceUpsert(fieldName, id, userId, FieldSource.DECLARED),
        ),
      ),
    ]);
    return this.findOne(userId, id);
  }
}
