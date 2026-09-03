import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FieldSource,
  InterventionDocumentRole,
  InterventionKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';
import { computeAssetStatus } from '../common/asset-status';
import { computeDefaultWarrantyUntil } from '../common/warranty';
import { recordDeclaredFields } from '../common/field-provenance';
import { InterventionsService } from '../interventions/interventions.service';
import { WarrantiesService } from '../warranties/warranties.service';

// Riusato sia per AssetCustomField che per AssetFieldProvenance: stessa
// forma di relazione (sourceDocument/confirmedByUser) su entrambi — vedi
// ProvenanceBadge nel frontend, che ne ha bisogno per il tooltip.
const PROVENANCE_INCLUDE = {
  sourceDocument: { select: { originalFilename: true } },
  confirmedByUser: { select: { name: true, email: true } },
} as const;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly interventions: InterventionsService,
    private readonly warranties: WarrantiesService,
  ) {}

  async create(userId: string, houseId: string, dto: CreateAssetDto) {
    await this.ensureHouseAccess(userId, houseId);
    if (dto.roomId) {
      await this.ensureRoomBelongsToHouse(dto.roomId, houseId);
    }
    if (dto.thermalSystemId) {
      await this.ensureThermalSystemBelongsToHouse(
        dto.thermalSystemId,
        houseId,
      );
    }

    const code = await this.nextAssetCode();
    const status = computeAssetStatus({
      warrantyUntil: null,
      documentsCount: 0,
    });

    // warrantyUntil non è mai scritto qui: diventa una Warranty più sotto
    // (Prisma ignora un campo `undefined` in create/update, vedi decisions.md #47).
    const created = await this.prisma.asset.create({
      data: { ...dto, warrantyUntil: undefined, houseId, code, status },
    });

    // Garanzia esplicita o acquisto noto (default 24 mesi, vedi
    // common/warranty.ts): registrata come Warranty, mai come scrittura
    // diretta su Asset.warrantyUntil — vedi decisions.md #47.
    if (dto.warrantyUntil || dto.purchasedAt) {
      await this.warranties.create(userId, created.id, {
        expiresAt:
          dto.warrantyUntil ?? computeDefaultWarrantyUntil(dto.purchasedAt!),
        startsAt: dto.purchasedAt,
      });
      return this.prisma.asset.findUniqueOrThrow({ where: { id: created.id } });
    }
    return created;
  }

  // "code" è unico globalmente (non per casa, vedi schema.prisma), quindi il
  // prossimo numero si calcola dal massimo esistente su tutta la tabella —
  // mai da un conteggio: un asset eliminato lascia un "buco" nella
  // numerazione che un conteggio rigenererebbe, causando un conflitto di
  // unicità sul primo codice riusato (bug osservato in pratica).
  private async nextAssetCode(): Promise<string> {
    const last = await this.prisma.asset.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNumber = last ? parseInt(last.code.replace('AST-', ''), 10) : 0;
    return `AST-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  async findAllForHouse(userId: string, houseId: string) {
    await this.ensureHouseAccess(userId, houseId);
    return this.prisma.asset.findMany({
      where: { houseId },
      include: {
        customFields: { include: PROVENANCE_INCLUDE },
        fieldProvenance: { include: PROVENANCE_INCLUDE },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Asset ${id} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, existing.houseId);
    if (dto.roomId) {
      await this.ensureRoomBelongsToHouse(dto.roomId, existing.houseId);
    }
    if (dto.thermalSystemId) {
      await this.ensureThermalSystemBelongsToHouse(
        dto.thermalSystemId,
        existing.houseId,
      );
    }

    // warrantyUntil non è mai scritto qui: la sua gestione passa da Warranty
    // più sotto (Prisma ignora un campo `undefined`, vedi decisions.md #47).
    await this.prisma.asset.update({
      where: { id },
      data: { ...dto, warrantyUntil: undefined },
    });

    const effectivePurchasedAt =
      dto.purchasedAt !== undefined ? dto.purchasedAt : existing.purchasedAt;
    const newWarrantyUntil = dto.warrantyUntil;
    if (
      newWarrantyUntil !== undefined &&
      newWarrantyUntil.getTime() !== existing.warrantyUntil?.getTime()
    ) {
      // Correzione di un valore già dichiarato da questo stesso campo: se
      // esiste già una Warranty "gestita da qui" (nessun contatto/documento/
      // intervento d'origine) la aggiorna, altrimenti ne dichiara una nuova —
      // evita una riga nuova a ogni salvataggio del form Modifica asset,
      // stessa classe di bug già risolta in B38 per AssetFieldProvenance.
      const legacyWarranty =
        await this.warranties.findLegacyManagedWarranty(id);
      if (legacyWarranty) {
        await this.warranties.update(userId, legacyWarranty.id, {
          expiresAt: newWarrantyUntil,
        });
      } else {
        await this.warranties.create(userId, id, {
          expiresAt: newWarrantyUntil,
        });
      }
    } else if (!existing.warrantyUntil && effectivePurchasedAt) {
      // Stessa regola di default di create(): se ancora non c'è una garanzia
      // esplicita ma ora è nota la data di acquisto, applicala automaticamente.
      await this.warranties.create(userId, id, {
        expiresAt: computeDefaultWarrantyUntil(effectivePurchasedAt),
        startsAt: effectivePurchasedAt,
      });
    }

    // Provenienza (B38): solo per i campi il cui valore è davvero cambiato,
    // non per il default di garanzia calcolato sopra — vedi field-provenance.ts
    // (il form di modifica rimanda sempre tutti i campi, anche quelli
    // invariati, quindi "presente nel body" da solo non basta).
    await recordDeclaredFields(this.prisma, id, userId, dto, existing);
    return this.prisma.asset.findUniqueOrThrow({ where: { id } });
  }

  async addCustomField(
    userId: string,
    assetId: string,
    dto: CreateCustomFieldDto,
  ) {
    await this.assetOrThrow(userId, assetId);
    // Sempre DECLARED: i campi con origine EXTRACTED vengono scritti solo
    // dal flusso /documents/:id/confirm (vedi architettura §5), mai da qui.
    return this.prisma.assetCustomField.create({
      data: {
        ...dto,
        assetId,
        source: FieldSource.DECLARED,
        confirmedByUserId: userId,
        confirmedAt: new Date(),
      },
    });
  }

  async updateCustomField(
    userId: string,
    customFieldId: string,
    dto: UpdateCustomFieldDto,
  ) {
    const field = await this.customFieldOrThrow(userId, customFieldId);
    return this.prisma.assetCustomField.update({
      where: { id: field.id },
      data: dto,
    });
  }

  async removeCustomField(userId: string, customFieldId: string) {
    const field = await this.customFieldOrThrow(userId, customFieldId);
    await this.prisma.assetCustomField.delete({ where: { id: field.id } });
  }

  async getTimeline(userId: string, assetId: string) {
    await this.assetOrThrow(userId, assetId);
    return this.interventions.timelineForAsset(userId, assetId);
  }

  // Intervento aggiunto a mano dall'utente, senza un documento a
  // giustificarlo (es. una chiamata al tecnico senza fattura ancora
  // ricevuta) — a differenza degli eventi generati da /documents/:id/confirm,
  // qui il contatto lo sceglie subito l'utente, non c'è nulla da "confermare".
  async addTimelineEvent(
    userId: string,
    assetId: string,
    dto: CreateTimelineEventDto,
  ) {
    const asset = await this.assetOrThrow(userId, assetId);
    const created = await this.interventions.create(userId, asset.houseId, {
      occurredAt: dto.eventDate,
      kind: dto.kind ?? InterventionKind.OTHER,
      title: dto.eventType,
      description: dto.detail,
      assetIds: [assetId, ...(dto.additionalAssetIds ?? [])],
      contactId: dto.contactId,
      costAmount: dto.costAmount,
      currency: dto.currency,
      evidenceStatus: dto.evidenceStatus,
      documents: (dto.documentIds ?? []).map((documentId) => ({
        documentId,
        role: InterventionDocumentRole.OTHER,
      })),
    });
    return {
      id: created.id,
      sourceKind: 'INTERVENTION',
      sourceId: created.id,
      assetId,
      eventDate: created.occurredAt,
      eventType: created.title,
      detail: created.description,
      contactId: created.contactId,
      contact: created.contact,
      documentId: created.documents[0]?.id ?? null,
      kind: created.kind,
      costAmount: created.costAmount,
      currency: created.currency,
      evidenceStatus: created.evidenceStatus,
      assets: created.assets,
      documents: created.documents,
    };
  }

  async updateTimelineEventContact(
    userId: string,
    eventId: string,
    dto: UpdateTimelineEventDto,
  ) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (intervention) {
      return this.interventions.updateContact(
        userId,
        eventId,
        dto.contactId ?? null,
      );
    }
    const event = await this.prisma.assetTimelineEvent.findUnique({
      where: { id: eventId },
      include: { asset: { select: { houseId: true } } },
    });
    if (!event) {
      throw new NotFoundException(`Evento ${eventId} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, event.asset.houseId);
    if (dto.contactId) {
      await this.ensureContactBelongsToHouse(
        dto.contactId,
        event.asset.houseId,
      );
    }

    const updated = await this.prisma.assetTimelineEvent.update({
      where: { id: eventId },
      data: { contactId: dto.contactId ?? null },
      include: { contact: { select: { id: true, name: true, role: true } } },
    });
    return {
      ...updated,
      sourceKind: 'LEGACY_EVENT',
      sourceId: updated.id,
      kind: null,
      costAmount: null,
      currency: null,
      evidenceStatus: updated.documentId ? 'VERIFIED_PRESENT' : 'UNKNOWN',
      documents: [],
      assets: [],
    };
  }

  async remove(userId: string, id: string) {
    await this.assetOrThrow(userId, id);
    // AssetCustomField e AssetTimelineEvent hanno onDelete: Cascade e vengono
    // rimossi con l'asset. I Document collegati hanno onDelete: SetNull:
    // restano nello storico documenti, solo scollegati dall'asset.
    await this.prisma.asset.delete({ where: { id } });
  }

  async dismiss(userId: string, id: string) {
    await this.assetOrThrow(userId, id);
    return this.prisma.asset.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });
  }

  async reactivate(userId: string, id: string) {
    await this.assetOrThrow(userId, id);
    return this.prisma.asset.update({
      where: { id },
      data: { dismissedAt: null },
    });
  }

  private async assetOrThrow(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, asset.houseId);
    return asset;
  }

  private async customFieldOrThrow(userId: string, customFieldId: string) {
    const field = await this.prisma.assetCustomField.findUnique({
      where: { id: customFieldId },
      include: { asset: { select: { houseId: true } } },
    });
    if (!field) {
      throw new NotFoundException(`Custom field ${customFieldId} non trovato`);
    }
    await this.accessControl.assertHouseAccess(userId, field.asset.houseId);
    return field;
  }

  private async ensureHouseAccess(userId: string, houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new NotFoundException(`House ${houseId} non trovata`);
    }
    await this.accessControl.assertHouseAccess(userId, houseId);
  }

  private async ensureRoomBelongsToHouse(roomId: string, houseId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.houseId !== houseId) {
      throw new BadRequestException(
        `Room ${roomId} non appartiene alla casa ${houseId}`,
      );
    }
  }

  private async ensureThermalSystemBelongsToHouse(
    thermalSystemId: string,
    houseId: string,
  ) {
    const system = await this.prisma.thermalSystem.findUnique({
      where: { id: thermalSystemId },
      select: { houseId: true },
    });
    if (!system || system.houseId !== houseId) {
      throw new BadRequestException(
        `Impianto termico ${thermalSystemId} non appartiene alla casa ${houseId}.`,
      );
    }
  }

  private async ensureContactBelongsToHouse(
    contactId: string,
    houseId: string,
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact || contact.houseId !== houseId) {
      throw new BadRequestException(
        `Contatto ${contactId} non appartiene alla casa ${houseId}`,
      );
    }
  }
}
