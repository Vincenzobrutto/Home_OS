import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceRecurrenceUnit,
  MaintenanceSubjectType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
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
import { CompleteDocumentMaintenanceDto } from './dto/complete-document-maintenance.dto';

const PLAN_INCLUDE = {
  preferredContact: { select: { id: true, name: true, role: true } },
  _count: { select: { occurrences: true } },
} as const;

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async completeFromDocument(
    userId: string,
    documentId: string,
    dto: CompleteDocumentMaintenanceDto,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document)
      throw new NotFoundException(`Documento ${documentId} non trovato`);
    await this.accessControl.assertHouseAccess(userId, document.houseId);
    const uniquePlanIds = new Set(
      dto.items.map((item) => item.maintenancePlanId),
    );
    if (uniquePlanIds.size !== dto.items.length)
      throw new BadRequestException(
        'Ogni piano può essere completato una sola volta per conferma.',
      );
    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        id: { in: [...uniquePlanIds] },
        subjectType: MaintenanceSubjectType.ASSET,
      },
      include: { asset: { select: { houseId: true } } },
    });
    if (
      plans.length !== dto.items.length ||
      plans.some(
        (plan) => !plan.asset || plan.asset.houseId !== document.houseId,
      )
    )
      throw new BadRequestException(
        'Uno o più piani non appartengono alla casa del documento.',
      );
    for (const item of dto.items) {
      const plan = plans.find(
        (candidate) => candidate.id === item.maintenancePlanId,
      )!;
      if (!plan.assetId)
        throw new BadRequestException('Il piano non riguarda un Asset.');
      if (plan.pausedAt || plan.completedAt)
        throw new BadRequestException(`Il piano "${plan.title}" non è attivo.`);
      await this.ensureContactBelongsToHouse(item.contactId, document.houseId);
    }
    const duplicates = await this.prisma.maintenanceOccurrence.findMany({
      where: {
        documentId,
        OR: dto.items.map((item) => ({
          maintenancePlanId: item.maintenancePlanId,
          completedAt: item.completedAt,
        })),
      },
      select: { maintenancePlanId: true },
    });
    if (duplicates.length)
      throw new BadRequestException(
        'Una o più manutenzioni risultano già completate con questo documento.',
      );
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const plan = plans.find(
          (candidate) => candidate.id === item.maintenancePlanId,
        )!;
        if (!plan.assetId)
          throw new BadRequestException('Il piano non riguarda un Asset.');
        const nextDueAt = nextMaintenanceDueAt({
          scheduledFor: plan.nextDueAt,
          completedAt: item.completedAt,
          recurrenceUnit: plan.recurrenceUnit,
          recurrenceInterval: plan.recurrenceInterval,
        });
        await tx.maintenanceOccurrence.create({
          data: {
            maintenancePlanId: plan.id,
            assetId: plan.assetId,
            scheduledFor: plan.nextDueAt,
            completedAt: item.completedAt,
            contactId: item.contactId ?? null,
            documentId,
            notes: item.notes,
          },
        });
        await tx.assetTimelineEvent.create({
          data: {
            assetId: plan.assetId,
            eventDate: item.completedAt,
            eventType: plan.title,
            detail:
              item.notes?.trim() || 'Manutenzione completata da documento',
            contactId: item.contactId ?? null,
            documentId,
          },
        });
        await tx.maintenancePlan.update({
          where: { id: plan.id },
          data: {
            lastCompletedAt: item.completedAt,
            nextDueAt: nextDueAt ?? plan.nextDueAt,
            completedAt:
              plan.recurrenceUnit === MaintenanceRecurrenceUnit.NONE
                ? item.completedAt
                : null,
          },
        });
      }
    });
    return { completed: dto.items.length };
  }

  async create(userId: string, assetId: string, dto: CreateMaintenancePlanDto) {
    const asset = await this.assetOrThrow(userId, assetId);
    this.validateRecurrence(dto.recurrenceUnit, dto.recurrenceInterval);
    await this.ensureContactBelongsToHouse(
      dto.preferredContactId,
      asset.houseId,
    );
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        ...dto,
        houseId: asset.houseId,
        assetId,
        subjectType: MaintenanceSubjectType.ASSET,
      },
      include: PLAN_INCLUDE,
    });
    return this.withStatus(plan);
  }

  async listForAsset(userId: string, assetId: string) {
    await this.assetOrThrow(userId, assetId);
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

  async suggestionsForAsset(userId: string, assetId: string) {
    const asset = await this.assetOrThrow(userId, assetId);
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
  async dismissSuggestion(
    userId: string,
    assetId: string,
    guidelineCode: string,
  ) {
    await this.assetOrThrow(userId, assetId);
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

  async remindersForHouse(userId: string, houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) throw new NotFoundException(`House ${houseId} non trovata`);
    await this.accessControl.assertHouseAccess(userId, houseId);
    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        pausedAt: null,
        completedAt: null,
        subjectType: MaintenanceSubjectType.ASSET,
        asset: { houseId, dismissedAt: null },
      },
      include: {
        ...PLAN_INCLUDE,
        asset: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
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

  async update(userId: string, id: string, dto: UpdateMaintenancePlanDto) {
    const plan = await this.planOrThrow(userId, id);
    const unit = dto.recurrenceUnit ?? plan.recurrenceUnit;
    const interval = dto.recurrenceInterval ?? plan.recurrenceInterval;
    this.validateRecurrence(unit, interval);
    await this.ensureContactBelongsToHouse(
      dto.preferredContactId,
      plan.houseId,
    );
    const updated = await this.prisma.maintenancePlan.update({
      where: { id },
      data: dto,
      include: PLAN_INCLUDE,
    });
    return this.withStatus(updated);
  }

  async complete(userId: string, id: string, dto: CompleteMaintenancePlanDto) {
    const plan = await this.planOrThrow(userId, id);
    if (plan.pausedAt) {
      throw new BadRequestException('Riattiva il piano prima di completarlo.');
    }
    if (plan.completedAt) {
      throw new BadRequestException('Il piano una tantum è già completato.');
    }
    await this.ensureContactBelongsToHouse(dto.contactId, plan.houseId);
    await this.ensureDocumentBelongsToHouse(dto.documentId, plan.houseId);

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

  async pause(userId: string, id: string) {
    const existing = await this.planOrThrow(userId, id);
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

  async reactivate(
    userId: string,
    id: string,
    dto: ReactivateMaintenancePlanDto,
  ) {
    const existing = await this.planOrThrow(userId, id);
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

  async occurrences(userId: string, id: string) {
    await this.planOrThrow(userId, id);
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

  async remove(userId: string, id: string) {
    const plan = await this.planOrThrow(userId, id);
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

  private async assetOrThrow(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} non trovato`);
    await this.accessControl.assertHouseAccess(userId, asset.houseId);
    return asset;
  }

  private async planOrThrow(userId: string, id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        asset: { select: { houseId: true } },
        _count: { select: { occurrences: true } },
      },
    });
    if (!plan) throw new NotFoundException(`Piano ${id} non trovato`);
    await this.accessControl.assertHouseAccess(userId, plan.houseId);
    if (
      plan.subjectType !== MaintenanceSubjectType.ASSET ||
      !plan.assetId ||
      !plan.asset
    ) {
      throw new BadRequestException(
        'Questa operazione è disponibile solo per piani riferiti a un Asset.',
      );
    }
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
