import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EvidenceStatus, WarrantyKind } from '@prisma/client';

export class CreateWarrantyDto {
  @Type(() => Date)
  @IsDate()
  expiresAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @IsEnum(WarrantyKind)
  kind?: WarrantyKind;

  @IsOptional()
  @IsUUID()
  providerContactId?: string | null;

  @IsOptional()
  @IsUUID()
  proofDocumentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsEnum(EvidenceStatus)
  evidenceStatus?: EvidenceStatus;
}
