import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTimelineEventDto {
  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsOptional()
  @IsString()
  detail?: string;

  // Chi ha eseguito l'intervento, se già in Rubrica — facoltativo, l'utente
  // può aggiungerlo anche in un secondo momento (vedi updateContact).
  @IsOptional()
  @IsUUID()
  contactId?: string | null;
}
