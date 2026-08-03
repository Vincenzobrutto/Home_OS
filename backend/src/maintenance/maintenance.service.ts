import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MaintenanceRecurrenceUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeMaintenanceStatus,
  nextMaintenanceDueAt,
} from '../common/maintenance';
import {
  computeMaintenanceSuggestions,
  MAINTENANCE_GUIDELINES,
} from '../common/maintenance-guidelines';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { CompleteMaintenancePlanDto } from './dto/complete-maintenance-plan.dto';
import { ReactivateMaintenancePlanDto } from './dto/reactivate-maintenance-plan.dto';

const PLAN_INCLUDE = {
  preferredContact: { select: { id: true, name: true, role: true } },
  _count: { select: { occurrences: true } },
} as const;

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(assetId: string, dto: CreateMaintenancePlanDto) {
    const asset = await this.assetOrThrow(assetId);
    this.validateRecurrence(dto.recurrenceUnit, dto.recurrenceInterval);
    await this.ensureContactBelongsToHouse(
      dto.preferredContactId,
      asset.houseId,
    );
    const plan = await this.prisma.maintenancePlan.create({
      data: { ...dto, assetId },
      include: PLAN_INCLUDE,
    });
    return this.withStatus(plan);
  }

  async listForAsset(assetId: string) {
    await this.assetOrThrow(assetId);
    const plans = await this.prisma.maintenancePlan.findMany({
      where: { assetId },
      include: PLAN_INCLUDE,
      orderBy: { nextDueAt: 'asc' },
    });
    const statusOrder = {
      OVERDUE: 0,
      UPCOMING: 1,
      SCHEDULED: 2,
      COMPLETED: 3,
      PAUSED: 4,
    };
    return plans
      .map((plan) => this.withStatus(plan))
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }

  async suggestionsForAsset(assetId: string) {
    const asset = await this.assetOrThrow(assetId);
    if (asset.dismissedAt) return [];
    const [existingPlans, dismissed] = await Promise.all([
      this.prisma.maintenancePlan.findMany({
        where: { assetId },
        select: { title: true },
      }),
      this.prisma.dismissedMaintenanceSuggestion.findMany({
        where: { assetId },
        select: { guidelineCode: true },
      }),
    ]);
    return computeMaintenanceSuggestions({
      assetType: asset.type,
      installedAt: asset.installedAt,
      purchasedAt: asset.purchasedAt,
      createdAt: asset.createdAt,
      existingPlanTitles: existingPlans.map((plan) => plan.title),
      dismissedGuidelineCodes: dismissed.map((d) => d.guidelineCode),
    });
  }

  // Persistito per non riproporre lo stesso suggerimento ad ogni apertura
  // della scheda Asset (vedi decisions.md #22, correzione di #19). Nessuna
  // UI di "ripristina" per ora — "Ignora" è definitivo finché non emerge un
  // bisogno reale di tornare indietro (stesso principio MVP di decisions.md
  // #19: non costruire in anticipo quello che non è ancora richiesto).
  async dismissSuggestion(assetId: string, guidelineCode: string) {
    await this.assetOrThrow(assetId);
    if (!MAINTENANCE_GUIDELINES.some((g) => g.code === guidelineCode)) {
      throw new NotFoundException(
        `Linea guida di manutenzione "${guidelineCode}" non trovata`,
      );
    }
    await this.prisma.dismissedMaintenanceSuggestion.upsert({
      where: { assetId_guidelineCode: { assetId, guidelineCode } },
      create: { assetId, guidelineCode },
      update: {},
    });
  }

  async remindersForHouse(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) throw new NotFoundException(`House ${houseId} non trovata`);
    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        pausedAt: null,
        completedAt: null,
        asset: { houseId, dismissedAt: null },
      },
      include: {
        ...PLAN_INCLUDE,
        asset: {
          select: {
            id: true,
            name: true,
            code: true,
            room: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { nextDueAt: 'asc' },
    });
    return plans
      .map((plan) => this.withStatus(plan))
      .filter((plan) => plan.status !== 'SCHEDULED');
  }

  async update(id: string, dto: UpdateMaintenancePlanDto) {
    const plan = await this.planOrThrow(id);
    const unit = dto.recurrenceUnit ?? plan.recurrenceUnit;
    const interval = dto.recurrenceInterval ?? plan.recurrenceInterval;
    this.validateRecurrence(unit, interval);
    await this.ensureContactBelongsToHouse(
      dto.preferredContactId,
      plan.asset.houseId,
    );
    const updated = await this.prisma.maintenancePlan.update({
      where: { id },
      data: dto,
      include: PLAN_INCLUDE,
    });
    return this.withStatus(updated);
  }

  async complete(id: string, dto: CompleteMaintenancePlanDto) {
    const plan = await this.planOrThrow(id);
    if (plan.pausedAt) {
      throw new BadRequestException('Riattiva il piano prima di completarlo.');
    }
    if (plan.completedAt) {
      throw new BadRequestException('Il piano una tantum è già completato.');
    }
    await this.ensureContactBelongsToHouse(dto.contactId, plan.asset.houseId);
    await this.ensureDocumentBelongsToHouse(dto.documentId, plan.asset.houseId);

    const nextDueAt = nextMaintenanceDueAt({
      scheduledFor: plan.nextDueAt,
      completedAt: dto.completedAt,
      recurrenceUnit: plan.recurrenceUnit,
      recurrenceInterval: plan.recurrenceInterval,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceOccurrence.create({
        data: {
          maintenancePlanId: plan.id,
          assetId: plan.assetId,
          scheduledFor: plan.nextDueAt,
          completedAt: dto.completedAt,
          contactId: dto.contactId ?? null,
          documentId: dto.documentId ?? null,
          notes: dto.notes,
        },
      });
      await tx.assetTimelineEvent.create({
        data: {
          assetId: plan.assetId,
          eventDate: dto.completedAt,
          eventType: plan.title,
          detail: dto.notes?.trim() || 'Manutenzione completata',
          contactId: dto.contactId ?? null,
          documentId: dto.documentId ?? null,
        },
      });
      await tx.maintenancePlan.update({
        where: { id },
        data: {
          lastCompletedAt: dto.completedAt,
          nextDueAt: nextDueAt ?? plan.nextDueAt,
          completedAt:
            plan.recurrenceUnit === MaintenanceRecurrenceUnit.NONE
              ? dto.completedAt
              : null,
        },
      });
    });
    return this.findOne(id);
  }

  async pause(id: string) {
    const existing = await this.planOrThrow(id);
    if (existing.completedAt) {
      throw new BadRequestException(
        'Un piano una tantum completato non può essere sospeso.',
      );
    }
    const plan = await this.prisma.maintenancePlan.update({
      where: { id },
      data: { pausedAt: new Date() },
      include: PLAN_INCLUDE,
    });
    return this.withStatus(plan);
  }

  async reactivate(id: string, dto: ReactivateMaintenancePlanDto) {
    const existing = await this.planOrThrow(id);
    if (existing.completedAt) {
      throw new BadRequestException(
        'Un piano una tantum completato non può essere riattivato.',
      );
    }
    const plan = await this.prisma.maintenancePlan.update({
      where: { id },
      data: { pausedAt: null, nextDueAt: dto.nextDueAt },
      include: PLAN_INCLUDE,
    });
    return this.withStatus(plan);
  }

  async occurrences(id: string) {
    await this.planOrThrow(id);
    return this.prisma.maintenanceOccurrence.findMany({
      where: { maintenancePlanId: id },
      include: {
        contact: { select: { id: true, name: true, role: true } },
        document: {
          select: { id: true, originalFilename: true, docType: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async remove(id: string) {
    const plan = await this.planOrThrow(id);
    if (plan._count.occurrences > 0) {
      throw new BadRequestException(
        'Il piano ha uno storico: sospendilo invece di eliminarlo.',
      );
    }
    await this.prisma.maintenancePlan.delete({ where: { id } });
  }

  private async findOne(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException(`Piano ${id} non trovato`);
    return this.withStatus(plan);
  }

  private withStatus<
    T extends {
      nextDueAt: Date;
      reminderDaysBefore: number;
      pausedAt: Date | null;
      completedAt: Date | null;
    },
  >(plan: T) {
    return { ...plan, status: computeMaintenanceStatus(plan) };
  }

  private validateRecurrence(
    unit: MaintenanceRecurrenceUnit,
    interval: number,
  ) {
    const max =
      unit === MaintenanceRecurrenceUnit.DAY
        ? 365
        : unit === MaintenanceRecurrenceUnit.MONTH
          ? 60
          : unit === MaintenanceRecurrenceUnit.YEAR
            ? 20
            : 1;
    if (unit === MaintenanceRecurrenceUnit.NONE && interval !== 1) {
      throw new BadRequestException(
        'Una manutenzione una tantum deve avere intervallo 1.',
      );
    }
    if (interval < 1 || interval > max) {
      throw new BadRequestException(
        `Intervallo non valido per la ricorrenza ${unit}.`,
      );
    }
  }

  private async assetOrThrow(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} non trovato`);
    return asset;
  }

  private async planOrThrow(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        asset: { select: { houseId: true } },
        _count: { select: { occurrences: true } },
      },
    });
    if (!plan) throw new NotFoundException(`Piano ${id} non trovato`);
    return plan;
  }

  private async ensureContactBelongsToHouse(
    contactId: string | null | undefined,
    houseId: string,
  ) {
    if (!contactId) return;
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact || contact.houseId !== houseId) {
      throw new BadRequestException(
        `Contatto ${contactId} non appartiene alla casa ${houseId}.`,
      );
    }
  }

  private async ensureDocumentBelongsToHouse(
    documentId: string | null | undefined,
    houseId: string,
  ) {
    if (!documentId) return;
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.houseId !== houseId) {
      throw new BadRequestException(
        `Documento ${documentId} non appartiene alla casa ${houseId}.`,
      );
    }
  }
}
