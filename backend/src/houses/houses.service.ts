import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldSource, Prisma } from '@prisma/client';
import archiver, { type Archiver } from 'archiver';
import * as path from 'path';
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
import { FileStorageService } from '../file-storage/file-storage.service';

const PROPERTY_PROVENANCE_INCLUDE = {
  sourceDocument: { select: { originalFilename: true } },
  confirmedByUser: { select: { name: true, email: true } },
} as const;

@Injectable()
export class HousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly fileStorage: FileStorageService,
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

  async remove(userId: string, id: string): Promise<void> {
    await this.accessControl.assertHouseOwner(userId, id);
    const documents = await this.prisma.document.findMany({
      where: { houseId: id },
      select: { fileUrl: true },
    });
    await this.fileStorage.withFilesRemoved(
      documents.map((document) => document.fileUrl),
      () => this.prisma.house.delete({ where: { id } }),
    );
  }

  // Export portabile B62: un solo ZIP contiene il manifest JSON e ogni file
  // originale. fileUrl resta un dettaglio interno e viene sostituito nel
  // manifest dal percorso relativo dentro l'archivio.
  async exportArchive(
    userId: string,
    id: string,
  ): Promise<{ archive: Archiver; filename: string }> {
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
            fileUrl: true,
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

    const archiveDocuments = documents.map((document) => ({
      ...document,
      archivePath: `documents/${document.id}-${this.safeArchiveName(document.originalFilename)}`,
    }));
    const manifest = {
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
      documents: archiveDocuments.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omettiamo fileUrl dal manifest: è un dettaglio interno, non ha senso in un export.
        ({ fileUrl: _fileUrl, ...document }) => document,
      ),
      interventions,
      warranties,
      contacts,
    };

    // Verifica prima di iniziare lo streaming: un export parziale è peggio
    // di un errore esplicito, perché sembra un backup valido ma non lo è.
    const files = archiveDocuments.map((document) => ({
      path: this.fileStorage.resolveExisting(document.fileUrl),
      name: document.archivePath,
    }));
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.append(JSON.stringify(manifest, null, 2), {
      name: 'dimora-data.json',
    });
    for (const file of files) archive.file(file.path, { name: file.name });
    void archive.finalize();

    return {
      archive,
      filename: `dimora-${this.safeArchiveName(house.code)}-${new Date().toISOString().slice(0, 10)}.zip`,
    };
  }

  private safeArchiveName(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]+/g, '_');
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
