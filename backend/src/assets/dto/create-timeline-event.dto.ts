import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { EvidenceStatus, InterventionKind } from '@prisma/client';

export class CreateTimelineEventDto {
  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsOptional()
  @IsEnum(InterventionKind)
  kind?: InterventionKind;

  @IsOptional()
  @IsString()
  detail?: string;

  // Chi ha eseguito l'intervento, se già in Rubrica — facoltativo, l'utente
  // può aggiungerlo anche in un secondo momento (vedi updateContact).
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
  @IsUUID('4', { each: true })
  additionalAssetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];
}
