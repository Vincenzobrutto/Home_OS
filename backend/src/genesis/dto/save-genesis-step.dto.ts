import { IsIn } from 'class-validator';
import { GenesisStep } from '@prisma/client';

export class SaveGenesisStepDto {
  @IsIn(Object.values(GenesisStep))
  step: GenesisStep;
}
