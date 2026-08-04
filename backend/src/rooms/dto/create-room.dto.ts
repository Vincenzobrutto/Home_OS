import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AcquisitionSource, Prisma, RoomType } from '@prisma/client';

export class CreateRoomDto {
  @IsEnum(RoomType)
  type: RoomType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  planGeometry?: Prisma.InputJsonValue;

  // Usati solo dal flusso Genesis (conferma di un'Observation) — assenti
  // per una stanza creata a mano dal form Ambienti, che resta MANUAL/
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
