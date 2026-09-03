import { Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceStatus } from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateApeState } from './ape/ape-state';
import { evidenceOrUnknown } from './evidence/evidence-state';
import { evaluateFGas, type FGasPolicy } from './fgas/fgas';
import { findGwp } from './fgas/gwp-table';
import { RuleRepository } from './rules/rule-repository';

const ORIENTATIVE_COPY =
  'In base alle informazioni disponibili e alle regole attualmente censite per la tua zona, questo adempimento potrebbe applicarsi. Verifica con il manutentore o con l’autorità competente.';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly rules: RuleRepository,
  ) {}

  async evaluateHouse(userId: string, houseId: string) {
    await this.accessControl.assertHouseAccess(userId, houseId);
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
      include: {
        thermalSystems: {
          include: {
            assets: true,
            plantBooklets: { orderBy: { activeFrom: 'desc' } },
            efficiencyControlReports: {
              orderBy: { controlDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!house) throw new NotFoundException(`House ${houseId} non trovata`);

    const evaluatedAt = new Date();
    const rules = await this.rules.listExecutableCandidates(evaluatedAt);
    const apeRule = rules.find((rule) => rule.family === 'APE');
    const fgasRule = rules.find((rule) => rule.family === 'FGAS');
    const apeEffect = apeRule?.effect as
      { maxValidityYears?: unknown } | undefined;
    const maxValidityYears =
      typeof apeEffect?.maxValidityYears === 'number'
        ? apeEffect.maxValidityYears
        : null;
    const fgasPolicy = this.asFGasPolicy(fgasRule?.effect);
    const bookletStatuses = house.thermalSystems.map((system) =>
      evidenceOrUnknown(system.plantBooklets[0]?.evidenceStatus),
    );
    const bookletStatus = bookletStatuses.includes(
      EvidenceStatus.DECLARED_ABSENT,
    )
      ? EvidenceStatus.DECLARED_ABSENT
      : bookletStatuses.length > 0 &&
          bookletStatuses.every(
            (status) =>
              status === EvidenceStatus.VERIFIED_PRESENT ||
              status === EvidenceStatus.DECLARED_PRESENT ||
              status === EvidenceStatus.NOT_APPLICABLE,
          )
        ? EvidenceStatus.DECLARED_PRESENT
        : EvidenceStatus.UNKNOWN;

    const checks: Array<Record<string, unknown>> = [
      {
        code: 'APE_STATE',
        subjectType: 'HOUSE',
        subjectId: house.id,
        status: evaluateApeState({
          issuedAt: house.apeIssuedAt,
          explicitExpiresAt: house.apeExpiresAt,
          asOf: evaluatedAt,
          maxValidityYears,
          bookletStatus,
          firstMissedEfficiencyDueAt: null,
          interventionImpactKnown: null,
          hasThermalSystem: house.thermalSystems.length > 0,
        }),
        evidenceStatus:
          house.apeIssuedAt || house.apeExpiresAt
            ? EvidenceStatus.DECLARED_PRESENT
            : EvidenceStatus.UNKNOWN,
      },
      ...house.thermalSystems.flatMap((system) => {
        const activeBooklet = system.plantBooklets.find(
          (booklet) => booklet.activeTo === null,
        );
        const systemChecks: Array<Record<string, unknown>> = [
          {
            code: 'PLANT_BOOKLET',
            subjectType: 'THERMAL_SYSTEM',
            subjectId: system.id,
            status: evidenceOrUnknown(activeBooklet?.evidenceStatus),
          },
          {
            code: 'EFFICIENCY_CONTROL',
            subjectType: 'THERMAL_SYSTEM',
            subjectId: system.id,
            status: rules.some((rule) => rule.family === 'EFFICIENCY_CONTROL')
              ? (system.efficiencyControlReports[0]?.evidenceStatus ??
                EvidenceStatus.UNKNOWN)
              : 'UNKNOWN',
          },
        ];
        for (const asset of system.assets) {
          if (!asset.refrigerant) continue;
          const gwp = findGwp(asset.refrigerant);
          const result = evaluateFGas({
            family: gwp?.family ?? null,
            chargeKg:
              asset.refrigerantChargeKg === null
                ? null
                : Number(asset.refrigerantChargeKg),
            gwp: gwp?.gwp ?? null,
            hermeticallySealed: asset.hermeticallySealed,
            sealedLabelPresent: asset.sealedLabelPresent,
            residentialUse: true,
            leakDetectionSystem: asset.leakDetectionSystem,
            policy: fgasPolicy,
          });
          systemChecks.push({
            code: 'FGAS_LEAK_CHECK',
            subjectType: 'ASSET',
            subjectId: asset.id,
            ...result,
          });
        }
        return systemChecks;
      }),
    ];

    const known = checks.filter(
      (check) => check.status !== 'UNKNOWN' && check.status !== undefined,
    ).length;
    return {
      evaluatedAt,
      coverage: { completed: known, total: checks.length },
      checks,
      sources: rules.map((rule) => ({
        stableCode: rule.stableCode,
        version: rule.version,
        title: rule.sourceTitle,
        url: rule.sourceUrl,
        verifiedAt: rule.verifiedAt,
      })),
      disclaimer: ORIENTATIVE_COPY,
    };
  }

  private asFGasPolicy(value: unknown): FGasPolicy | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    const candidate = value as Partial<FGasPolicy>;
    if (
      (candidate.thresholdMetric !== 'T_CO2_EQ' &&
        candidate.thresholdMetric !== 'CHARGE_KG') ||
      !Array.isArray(candidate.bands) ||
      candidate.bands.length === 0 ||
      candidate.bands.some(
        (band) =>
          typeof band?.minimum !== 'number' ||
          typeof band?.intervalMonths !== 'number',
      )
    ) {
      return null;
    }
    return candidate as FGasPolicy;
  }
}
