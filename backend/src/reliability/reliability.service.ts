import { Injectable } from '@nestjs/common';
import { EvidenceStatus } from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { CORE_TRACKED_FIELDS } from '../common/field-provenance';
import { computeMemoryReliability } from '../common/memory-reliability';

const MEMORY_RELIABILITY_DISCLAIMER =
  'Un dato non ancora verificato non è un dato assente o sbagliato: significa solo che nessuno lo ha ancora confermato.';

@Injectable()
export class ReliabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async evaluateHouse(userId: string, houseId: string) {
    await this.accessControl.assertHouseAccess(userId, houseId);

    const [assets, interventions, warranties] = await Promise.all([
      this.prisma.asset.findMany({
        where: { houseId, dismissedAt: null },
        include: {
          _count: { select: { documents: true } },
          fieldProvenance: { select: { fieldName: true } },
        },
      }),
      this.prisma.intervention.findMany({
        where: { houseId },
        select: { evidenceStatus: true },
      }),
      this.prisma.warranty.findMany({
        where: { asset: { houseId } },
        select: { evidenceStatus: true },
      }),
    ]);

    const assetsWithDocuments = assets.filter(
      (a) => a._count.documents > 0,
    ).length;

    const fieldsCompleted = assets.reduce((sum, asset) => {
      const present = new Set(asset.fieldProvenance.map((f) => f.fieldName));
      return (
        sum + CORE_TRACKED_FIELDS.filter((field) => present.has(field)).length
      );
    }, 0);
    const fieldsTotal = assets.length * CORE_TRACKED_FIELDS.length;

    const facts = [...interventions, ...warranties];
    const factsKnown = facts.filter(
      (f) => f.evidenceStatus !== EvidenceStatus.UNKNOWN,
    ).length;

    const result = computeMemoryReliability({
      assetDocumentation: {
        completed: assetsWithDocuments,
        total: assets.length,
      },
      fieldCoverage: { completed: fieldsCompleted, total: fieldsTotal },
      factEvidence: { completed: factsKnown, total: facts.length },
    });

    return {
      ...result,
      calculatedAt: new Date(),
      disclaimer: MEMORY_RELIABILITY_DISCLAIMER,
    };
  }
}
