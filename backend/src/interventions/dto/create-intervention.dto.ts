import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EvidenceStatus,
  InterventionDocumentRole,
  InterventionKind,
} from '@prisma/client';

export class InterventionDocumentInputDto {
  @IsUUID()
  documentId: string;

  @IsEnum(InterventionDocumentRole)
  role: InterventionDocumentRole = InterventionDocumentRole.OTHER;
}

export class CreateInterventionDto {
  @Type(() => Date)
  @IsDate()
  occurredAt: Date;

  @IsEnum(InterventionKind)
  kind: InterventionKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  assetIds: string[];

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmount?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string | null;

  @IsOptional()
  @IsEnum(EvidenceStatus)
  evidenceStatus?: EvidenceStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterventionDocumentInputDto)
  documents?: InterventionDocumentInputDto[];
}
