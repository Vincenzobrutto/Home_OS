import { IsOptional, IsUUID } from 'class-validator';

// Per ora l'unica cosa modificabile su un evento già esistente è il
// contatto collegato — data/tipo/dettaglio restano quelli originari
// (dell'intervento manuale o del documento che li ha generati).
export class UpdateTimelineEventDto {
  @IsOptional()
  @IsUUID()
  contactId?: string | null;
}
