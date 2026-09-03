import { Injectable } from '@nestjs/common';
import { RegulatoryRuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  listExecutableCandidates(asOf: Date) {
    return this.prisma.regulatoryRule.findMany({
      where: {
        status: RegulatoryRuleStatus.ACTIVE,
        validFrom: { lte: asOf },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
      include: { territory: true },
      orderBy: [{ stableCode: 'asc' }, { version: 'desc' }],
    });
  }
}
