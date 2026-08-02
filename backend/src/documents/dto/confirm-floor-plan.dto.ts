import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RoomType } from '@prisma/client';

// Una proposta per ambiente dalla planimetria caricata: l'utente decide,
// per ciascuna, se aggiornare un ambiente esistente, crearne uno nuovo, o
// scartarla — mai scrittura automatica, stesso principio "AI propone,
// utente conferma" già applicato ai documenti-asset.
export class FloorPlanDecisionDto {
  @IsIn(['create', 'update', 'skip'])
  action: 'create' | 'update' | 'skip';

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsIn(Object.values(RoomType))
  type?: RoomType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  width: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  height: number;
}

export class ConfirmFloorPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanDecisionDto)
  decisions: FloorPlanDecisionDto[];
}
