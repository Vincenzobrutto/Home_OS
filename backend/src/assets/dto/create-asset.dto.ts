import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  // null = impianto di casa, non legato a una stanza specifica
  @IsOptional()
  @IsUUID()
  roomId?: string | null;

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
}
