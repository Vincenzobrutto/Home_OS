import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// ownerId non è più un campo del body: il proprietario è sempre l'utente
// della sessione corrente (vedi houses.controller.ts) — prima si fidava di
// un valore mandato dal client, chiunque poteva creare una casa intestata a
// un altro userId.
export class CreateHouseDto {
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
