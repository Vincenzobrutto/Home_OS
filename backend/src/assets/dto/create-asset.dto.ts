import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AcquisitionSource, AssetType } from '@prisma/client';

export class CreateAssetDto {
  // null = impianto di casa, non legato a una stanza specifica
  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @IsOptional()
  @IsUUID()
  thermalSystemId?: string | null;

  @IsEnum(AssetType)
  type: AssetType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  installedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  warrantyUntil?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchasedAt?: Date;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  refrigerant?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refrigerantChargeKg?: number;

  // Significativa solo per CALDAIA (calcolo automatico dell'intervallo di
  // controllo regionale), ma universale su Asset come refrigerantChargeKg.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  powerKw?: number;

  @IsOptional()
  @IsBoolean()
  hermeticallySealed?: boolean;

  @IsOptional()
  @IsBoolean()
  sealedLabelPresent?: boolean;

  @IsOptional()
  @IsBoolean()
  leakDetectionSystem?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  planPosX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  planPosY?: number;

  // Niente campo "status": è calcolato dal server, non impostabile
  // dall'utente — vedi decisione di prodotto in START_HERE.md.

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  estimatedReplacementYear?: number;

  // Usati solo dal flusso Genesis (conferma di un'Observation) — assenti
  // per un asset creato a mano dal form Asset, che resta MANUAL/
  // confirmed=true come sempre, senza bisogno di specificarlo esplicitamente.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsEnum(AcquisitionSource)
  source?: AcquisitionSource;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
