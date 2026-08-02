import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AssetType } from '@prisma/client';

export class ConfirmDocumentDto {
  // Esattamente uno tra assetId (asset esistente), createAssetType (crea un
  // asset nuovo del tipo suggerito) e linkToHouse (collega alla casa, non a
  // un asset) deve essere presente — vedi decisione di prodotto #4 in
  // START_HERE.md: l'app propone di creare l'asset mancante, non forza
  // un'associazione sbagliata. linkToHouse copre i documenti che non
  // corrispondono a nessun impianto fisico (es. APE, certificazione
  // energetica generale).
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsEnum(AssetType)
  createAssetType?: AssetType;

  // Solo con createAssetType: nome specifico dato dall'utente al nuovo asset
  // (es. "Macchina del caffè") invece dell'etichetta generica del tipo — la
  // UI lo precompila con il suggerimento AI, ma l'utente conferma o modifica
  // prima della creazione (mai un asset creato senza revisione, vedi
  // START_HERE.md "l'AI propone, l'utente conferma").
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  assetName?: string;

  // Solo con createAssetType: ambiente da assegnare al nuovo asset già in
  // fase di creazione — se omesso resta senza ambiente ("impianto di casa",
  // vedi Documenti casa) e va assegnato a mano dopo, da cui la richiesta di
  // poterlo scegliere subito qui invece. Con quantity > 1 si applica a tutte
  // le unità create insieme (l'utente le smista poi singolarmente se vanno
  // in stanze diverse).
  @IsOptional()
  @IsUUID()
  roomId?: string;

  // Solo con createAssetType: quando il documento descrive più unità
  // identiche (es. 3 climatizzatori), crea altrettanti asset separati
  // invece di uno solo — servono ambienti e dati indipendenti per unità,
  // vedi documents.service.ts confirm(). 1 = comportamento normale.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  linkToHouse?: boolean;

  @IsBoolean()
  applyFields: boolean;
}
