import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateHouseDto {
  @IsUUID()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  surfaceSqm?: number;

  @IsOptional()
  @IsInt()
  roomsCount?: number;

  @IsOptional()
  @IsInt()
  buildYear?: number;

  // Rotazione corrente (0/90/180/270) della vista mappa — vedi schema.prisma.
  @IsOptional()
  @IsInt()
  floorPlanRotation?: number;
}
