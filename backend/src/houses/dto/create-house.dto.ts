import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// Le 20 regioni italiane — elenco fisso perché region è confrontata come
// stringa esatta nel lookup regionale (vedi boiler-inspection-intervals.ts):
// un refuso qui romperebbe silenziosamente quel confronto.
export const ITALIAN_REGIONS = [
  'Abruzzo',
  'Basilicata',
  'Calabria',
  'Campania',
  'Emilia-Romagna',
  'Friuli-Venezia Giulia',
  'Lazio',
  'Liguria',
  'Lombardia',
  'Marche',
  'Molise',
  'Piemonte',
  'Puglia',
  'Sardegna',
  'Sicilia',
  'Toscana',
  'Trentino-Alto Adige',
  'Umbria',
  "Valle d'Aosta",
  'Veneto',
] as const;

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

  @IsOptional()
  @IsIn(ITALIAN_REGIONS)
  region?: string;
}
