import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, EvidenceStatus, Prisma } from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { ListInterventionsDto } from './dto/list-interventions.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

export const INTERVENTION_INCLUDE = {
  contact: { select: { id: true, name: true, role: true } },
  assets: {
    include: {
      asset: { select: { id: true, name: true, code: true, type: true } },
    },
  },
  documents: {
    include: {
      document: {
        select: { id: true, originalFilename: true, docType: true },
      },
    },
  },
  maintenanceOccurrences: {
    select: { id: true, maintenancePlanId: true },
  },
} as const;

type InterventionWithRelations = Prisma.InterventionGetPayload<{
  include: typeof INTERVENTION_INCLUDE;
}>;

@Injectable()
export class InterventionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(userId: string, houseId: string, dto: CreateInterventionDto) {
    await this.accessControl.assertHouseAccess(userId, houseId);
    const refs = await this.validateReferences(houseId, dto);
    const evidenceStatus = this.resolveEvidenceStatus(
      dto.evidenceStatus,
      refs.documentIds.length,
    );

    const created = await this.prisma.intervention.create({
      data: {
        houseId,
        occurredAt: dto.occurredAt,
        kind: dto.kind,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        contactId: dto.contactId || null,
        costAmount: dto.costAmount ?? null,
        currency:
          dto.costAmount === null || dto.costAmount === undefined
            ? null
            : (dto.currency ?? 'EUR'),
        evidenceStatus,
        createdByUserId: userId,
        assets: {
          create: refs.assetIds.map((assetId) => ({ assetId })),
        },
        documents: {
          create: (dto.documents ?? []).map((item) => ({
            documentId: item.documentId,
            role: item.role,
          })),
        },
      },
      include: INTERVENTION_INCLUDE,
    });
    return this.serialize(created);
  }

  async list(userId: string, houseId: string, query: ListInterventionsDto) {
    await this.accessControl.assertHouseAccess(userId, houseId);
    const rows = await this.prisma.intervention.findMany({
      where: {
        houseId,
        ...(query.assetId
          ? { assets: { some: { assetId: query.assetId } } }
          : {}),
        ...(query.contactId ? { contactId: query.contactId } : {}),
        ...(query.text
          ? {
              OR: [
                { title: { contains: query.text, mode: 'insensitive' } },
                { description: { contains: query.text, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.from || query.to
          ? {
              occurredAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      include: INTERVENTION_INCLUDE,
    });
    return rows.map((row) => this.serialize(row));
  }

  async findOne(userId: string, id: string) {
    const row = await this.interventionOrThrow(userId, id);
    return this.serialize(row);
  }

  async timelineForAsset(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { houseId: true },
    });
    if (!asset) throw new NotFoundException(`Asset ${assetId} non trovato`);
    await this.accessControl.assertHouseAccess(userId, asset.houseId);
    const [interventions, legacyEvents] = await Promise.all([
      this.prisma.intervention.findMany({
        where: { houseId: asset.houseId, assets: { some: { assetId } } },
        include: INTERVENTION_INCLUDE,
      }),
      this.prisma.assetTimelineEvent.findMany({
        where: { assetId, interventionId: null },
        include: {
          contact: { select: { id: true, name: true, role: true } },
          document: {
            select: { id: true, originalFilename: true, docType: true },
          },
        },
      }),
    ]);

    return [
      ...interventions.map((row) => this.toTimelineItem(row, assetId)),
      ...legacyEvents.map((row) => ({
        id: row.id,
        sourceKind: 'LEGACY_EVENT' as const,
        sourceId: row.id,
        assetId,
        eventDate: row.eventDate,
        eventType: row.eventType,
        detail: row.detail,
        contactId: row.contactId,
        contact: row.contact,
        documentId: row.documentId,
        kind: null,
        costAmount: null,
        currency: null,
        evidenceStatus: row.documentId
          ? EvidenceStatus.VERIFIED_PRESENT
          : EvidenceStatus.UNKNOWN,
        assets: [],
        documents: row.document ? [{ ...row.document, role: 'OTHER' }] : [],
      })),
    ].sort(
      (left, right) =>
        new Date(right.eventDate).getTime() -
        new Date(left.eventDate).getTime(),
    );
  }

  async update(userId: string, id: string, dto: UpdateInterventionDto) {
    const existing = await this.interventionOrThrow(userId, id);
    const referencePayload: CreateInterventionDto = {
      occurredAt: dto.occurredAt ?? existing.occurredAt,
      kind: dto.kind ?? existing.kind,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      assetIds: dto.assetIds ?? existing.assets.map((item) => item.assetId),
      contactId:
        dto.contactId === undefined ? existing.contactId : dto.contactId,
      costAmount:
        dto.costAmount === undefined
          ? existing.costAmount === null
            ? null
            : Number(existing.costAmount)
          : dto.costAmount,
      currency: dto.currency === undefined ? existing.currency : dto.currency,
      evidenceStatus: dto.evidenceStatus ?? existing.evidenceStatus,
      documents:
        dto.documents ??
        existing.documents.map((item) => ({
          documentId: item.documentId,
          role: item.role,
        })),
    };
    const refs = await this.validateReferences(
      existing.houseId,
      referencePayload,
    );
    const evidenceStatus = this.resolveEvidenceStatus(
      referencePayload.evidenceStatus,
      refs.documentIds.length,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.interventionAsset.deleteMany({ where: { interventionId: id } });
      await tx.interventionDocument.deleteMany({
        where: { interventionId: id },
      });
      return tx.intervention.update({
        where: { id },
        data: {
          occurredAt: referencePayload.occurredAt,
          kind: referencePayload.kind,
          title: referencePayload.title.trim(),
          description: referencePayload.description?.trim() || null,
          contactId: referencePayload.contactId || null,
          costAmount: referencePayload.costAmount ?? null,
          currency:
            referencePayload.costAmount === null ||
            referencePayload.costAmount === undefined
              ? null
              : (referencePayload.currency ?? 'EUR'),
          evidenceStatus,
          assets: {
            create: refs.assetIds.map((assetId) => ({ assetId })),
          },
          documents: {
            create: (referencePayload.documents ?? []).map((item) => ({
              documentId: item.documentId,
              role: item.role,
            })),
          },
        },
        include: INTERVENTION_INCLUDE,
      });
    });
    return this.serialize(updated);
  }

  async updateContact(userId: string, id: string, contactId: string | null) {
    const existing = await this.interventionOrThrow(userId, id);
    if (contactId) await this.validateContact(existing.houseId, contactId);
    const updated = await this.prisma.intervention.update({
      where: { id },
      data: { contactId },
      include: INTERVENTION_INCLUDE,
    });
    return this.toTimelineItem(updated, updated.assets[0]?.assetId ?? '');
  }

  toTimelineItem(row: InterventionWithRelations, assetId: string) {
    const serialized = this.serialize(row);
    return {
      id: row.id,
      sourceKind: 'INTERVENTION' as const,
      sourceId: row.id,
      assetId,
      eventDate: row.occurredAt,
      eventType: row.title,
      detail: row.description,
      contactId: row.contactId,
      contact: row.contact,
      documentId: row.documents[0]?.documentId ?? null,
      kind: row.kind,
      costAmount: serialized.costAmount,
      currency: row.currency,
      evidenceStatus: row.evidenceStatus,
      assets: serialized.assets,
      documents: serialized.documents,
    };
  }

  private async interventionOrThrow(userId: string, id: string) {
    const row = await this.prisma.intervention.findUnique({
      where: { id },
      include: INTERVENTION_INCLUDE,
    });
    if (!row) throw new NotFoundException(`Intervento ${id} non trovato`);
    await this.accessControl.assertHouseAccess(userId, row.houseId);
    return row;
  }

  private async validateReferences(
    houseId: string,
    dto: Pick<CreateInterventionDto, 'assetIds' | 'contactId' | 'documents'>,
  ) {
    const assetIds = [...new Set(dto.assetIds)];
    if (!assetIds.length)
      throw new BadRequestException('Seleziona almeno un Asset.');
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds }, houseId },
      select: { id: true },
    });
    if (assets.length !== assetIds.length)
      throw new BadRequestException(
        'Uno o più Asset non appartengono alla casa.',
      );
    if (dto.contactId) await this.validateContact(houseId, dto.contactId);

    const documentIds = [
      ...new Set((dto.documents ?? []).map((item) => item.documentId)),
    ];
    if (documentIds.length !== (dto.documents ?? []).length)
      throw new BadRequestException(
        'Ogni documento può essere collegato una sola volta.',
      );
    if (documentIds.length) {
      const documents = await this.prisma.document.findMany({
        where: {
          id: { in: documentIds },
          houseId,
          status: DocumentStatus.CONFIRMED,
        },
        select: { id: true },
      });
      if (documents.length !== documentIds.length)
        throw new BadRequestException(
          'Uno o più documenti non sono confermati o non appartengono alla casa.',
        );
    }
    return { assetIds, documentIds };
  }

  private async validateContact(houseId: string, contactId: string) {
    const count = await this.prisma.contact.count({
      where: { id: contactId, houseId },
    });
    if (!count)
      throw new BadRequestException('Il contatto non appartiene alla casa.');
  }

  private resolveEvidenceStatus(
    requested: EvidenceStatus | undefined,
    documentsCount: number,
  ) {
    if (documentsCount) return EvidenceStatus.VERIFIED_PRESENT;
    if (requested === EvidenceStatus.VERIFIED_PRESENT)
      throw new BadRequestException(
        'Un intervento è verificato solo se ha almeno un documento confermato.',
      );
    return requested ?? EvidenceStatus.UNKNOWN;
  }

  private serialize(row: InterventionWithRelations) {
    return {
      ...row,
      costAmount: row.costAmount === null ? null : Number(row.costAmount),
      assets: row.assets.map((item) => item.asset),
      documents: row.documents.map((item) => ({
        ...item.document,
        role: item.role,
      })),
    };
  }
}
