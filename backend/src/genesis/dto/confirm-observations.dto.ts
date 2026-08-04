import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ConfirmObservationItemDto {
  @IsUUID()
  observationId: string;

  @IsIn(['confirm', 'reject', 'edit'])
  action: 'confirm' | 'reject' | 'edit';

  // Solo per action = "edit": sovrascrivono la proposta prima di creare la
  // Room/Asset reale. Se assenti, si usa il valore proposto dall'osservazione.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  // Solo per osservazioni ASSET: forza l'associazione a una Room reale
  // (già esistente) invece di far matchare payload.roomName a una Room
  // appena confermata nello stesso giro. `null` esplicito = impianto di
  // casa, coerente con Asset.roomId.
  @IsOptional()
  @IsUUID()
  roomId?: string | null;
}

export class ConfirmObservationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmObservationItemDto)
  items: ConfirmObservationItemDto[];
}
