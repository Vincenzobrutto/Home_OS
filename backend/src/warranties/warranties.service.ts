import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  EvidenceStatus,
  Prisma,
  WarrantyKind,
} from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { recomputeAssetWarrantySummary } from '../common/warranty';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';

export const WARRANTY_INCLUDE = {
  providerContact: { select: { id: true, name: true, role: true } },
  proofDocument: {
    select: { id: true, originalFilename: true, docType: true },
  },
} as const;

type WarrantyWithRelations = Prisma.WarrantyGetPayload<{
  include: typeof WARRANTY_INCLUDE;
}>;

// Solo per la lista house-scoped (B49, ricerca unificata): serve sapere a
// quale Asset appartiene ogni garanzia senza una lookup separata lato
// frontend, cosa non necessaria nella lista per-Asset esistente.
const WARRANTY_HOUSE_INCLUDE = {
  ...WARRANTY_INCLUDE,
  asset: { select: { id: true, name: true, code: true } },
} as const;

type WarrantyWithHouseRelations = Prisma.WarrantyGetPayload<{
  include: typeof WARRANTY_HOUSE_INCLUDE;
}>;

@Injectable()
export class WarrantiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(userId: string, assetId: string, dto: CreateWarrantyDto) {
    const houseId = await this.houseIdForAsset(assetId);
    await this.accessControl.assertHouseAccess(userId, houseId);
    await this.validateReferences(houseId, dto);
    const evidenceStatus = this.resolveEvidenceStatus(
      dto.evidenceStatus,
      !!dto.proofDocumentId,
    );

    const created = await this.prisma.warranty.create({
      data: {
        assetId,
        expiresAt: dto.expiresAt,
        startsAt: dto.startsAt ?? null,
        kind: dto.kind ?? WarrantyKind.PURCHASE,
        providerContactId: dto.providerContactId || null,
        proofDocumentId: dto.proofDocumentId || null,
        notes: dto.notes?.trim() || null,
        evidenceStatus,
        confirmedByUserId: userId,
        confirmedAt: new Date(),
      },
      include: WARRANTY_INCLUDE,
    });
    await recomputeAssetWarrantySummary(this.prisma, assetId);
    return this.serialize(created);
  }

  async list(userId: string, assetId: string) {
    const houseId = await this.houseIdForAsset(assetId);
    await this.accessControl.assertHouseAccess(userId, houseId);
    const rows = await this.prisma.warranty.findMany({
      where: { assetId },
      orderBy: { expiresAt: 'desc' },
      include: WARRANTY_INCLUDE,
    });
    return rows.map((row) => this.serialize(row));
  }

  async listForHouse(userId: string, houseId: string) {
    await this.accessControl.assertHouseAccess(userId, houseId);
    const rows = await this.prisma.warranty.findMany({
      where: { asset: { houseId } },
      orderBy: { expiresAt: 'desc' },
      include: WARRANTY_HOUSE_INCLUDE,
    });
    return rows.map((row) => this.serializeWithAsset(row));
  }

  async update(userId: string, id: string, dto: UpdateWarrantyDto) {
    const existing = await this.warrantyOrThrow(userId, id);
    const houseId = await this.houseIdForAsset(existing.assetId);
    const merged: CreateWarrantyDto = {
      expiresAt: dto.expiresAt ?? existing.expiresAt,
      startsAt:
        dto.startsAt === undefined
          ? (existing.startsAt ?? undefined)
          : dto.startsAt,
      kind: dto.kind ?? existing.kind,
      providerContactId:
        dto.providerContactId === undefined
          ? existing.providerContactId
          : dto.providerContactId,
      proofDocumentId:
        dto.proofDocumentId === undefined
          ? existing.proofDocumentId
          : dto.proofDocumentId,
      notes: dto.notes === undefined ? existing.notes : dto.notes,
      evidenceStatus: dto.evidenceStatus ?? existing.evidenceStatus,
    };
    await this.validateReferences(houseId, merged);
    const evidenceStatus = this.resolveEvidenceStatus(
      merged.evidenceStatus,
      !!merged.proofDocumentId,
    );

    const updated = await this.prisma.warranty.update({
      where: { id },
      data: {
        expiresAt: merged.expiresAt,
        startsAt: merged.startsAt ?? null,
        kind: merged.kind ?? WarrantyKind.PURCHASE,
        providerContactId: merged.providerContactId || null,
        proofDocumentId: merged.proofDocumentId || null,
        notes: merged.notes?.trim() || null,
        evidenceStatus,
      },
      include: WARRANTY_INCLUDE,
    });
    await recomputeAssetWarrantySummary(this.prisma, existing.assetId);
    return this.serialize(updated);
  }

  // Usata da AssetsService per non duplicare una riga a ogni salvataggio del
  // campo legacy "garanzia" nel form Modifica asset: senza contatto/prova/
  // intervento d'origine, è "gestita dal campo semplice", non una garanzia
  // distinta dichiarata altrove — vedi decisions.md #47.
  async findLegacyManagedWarranty(assetId: string) {
    return this.prisma.warranty.findFirst({
      where: {
        assetId,
        kind: WarrantyKind.PURCHASE,
        providerContactId: null,
        proofDocumentId: null,
        originInterventionId: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async houseIdForAsset(assetId: string): Promise<string> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { houseId: true },
    });
    if (!asset) throw new NotFoundException(`Asset ${assetId} non trovato`);
    return asset.houseId;
  }

  private async warrantyOrThrow(userId: string, id: string) {
    const row = await this.prisma.warranty.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Garanzia ${id} non trovata`);
    const houseId = await this.houseIdForAsset(row.assetId);
    await this.accessControl.assertHouseAccess(userId, houseId);
    return row;
  }

  private async validateReferences(
    houseId: string,
    dto: Pick<CreateWarrantyDto, 'providerContactId' | 'proofDocumentId'>,
  ) {
    if (dto.providerContactId) {
      const count = await this.prisma.contact.count({
        where: { id: dto.providerContactId, houseId },
      });
      if (!count)
        throw new BadRequestException('Il contatto non appartiene alla casa.');
    }
    if (dto.proofDocumentId) {
      const count = await this.prisma.document.count({
        where: {
          id: dto.proofDocumentId,
          houseId,
          status: DocumentStatus.CONFIRMED,
        },
      });
      if (!count)
        throw new BadRequestException(
          'Il documento non è confermato o non appartiene alla casa.',
        );
    }
  }

  private resolveEvidenceStatus(
    requested: EvidenceStatus | undefined,
    hasProof: boolean,
  ) {
    if (hasProof) return EvidenceStatus.VERIFIED_PRESENT;
    if (requested === EvidenceStatus.VERIFIED_PRESENT)
      throw new BadRequestException(
        'Una garanzia è verificata solo se ha un documento di prova confermato.',
      );
    return requested ?? EvidenceStatus.UNKNOWN;
  }

  private serialize(row: WarrantyWithRelations) {
    return {
      ...row,
      contact: row.providerContact,
      document: row.proofDocument,
    };
  }

  private serializeWithAsset(row: WarrantyWithHouseRelations) {
    return {
      ...row,
      contact: row.providerContact,
      document: row.proofDocument,
    };
  }
}
