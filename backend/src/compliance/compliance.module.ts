import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { RuleRepository } from './rules/rule-repository';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, RuleRepository],
})
export class ComplianceModule {}
