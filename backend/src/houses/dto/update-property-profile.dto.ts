import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePropertyProfileDto {
  @IsOptional() @IsString() @MaxLength(200) address?: string | null;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(120) city?: string | null;
  @IsOptional() @IsString() @MaxLength(80) province?: string | null;
  @IsOptional() @IsString() @MaxLength(80) country?: string | null;
  @IsOptional() @IsString() @MaxLength(80) propertyType?: string | null;
  @IsOptional() @IsNumber() @Min(0) surfaceSqm?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(9999) buildYear?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(9999) renovationYear?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(100) floorsCount?: number | null;
  @IsOptional() @IsNumber() @Min(0) usableSurfaceSqm?: number | null;
  @IsOptional() @IsNumber() @Min(0) heatedSurfaceSqm?: number | null;

  @IsOptional() @IsString() @MaxLength(120) cadastralMunicipality?:
    string | null;
  @IsOptional() @IsString() @MaxLength(20) cadastralMunicipalityCode?:
    string | null;
  @IsOptional() @IsString() @MaxLength(20) cadastralSection?: string | null;
  @IsOptional() @IsString() @MaxLength(20) cadastralSheet?: string | null;
  @IsOptional() @IsString() @MaxLength(40) cadastralParcel?: string | null;
  @IsOptional() @IsString() @MaxLength(40) cadastralSubaltern?: string | null;
  @IsOptional() @IsString() @MaxLength(20) cadastralCategory?: string | null;
  @IsOptional() @IsString() @MaxLength(20) cadastralClass?: string | null;
  @IsOptional() @IsString() @MaxLength(80) cadastralConsistency?: string | null;
  @IsOptional() @IsNumber() @Min(0) cadastralSurfaceSqm?: number | null;
  @IsOptional() @IsNumber() @Min(0) cadastralIncome?: number | null;

  @IsOptional() @IsString() @MaxLength(120) apeCode?: string | null;
  @IsOptional() @IsDateString() apeIssuedAt?: string | null;
  @IsOptional() @IsDateString() apeExpiresAt?: string | null;
  @IsOptional() @IsString() @MaxLength(10) energyClass?: string | null;
  @IsOptional() @IsNumber() @Min(0) epglNren?: number | null;
  @IsOptional() @IsNumber() @Min(0) epglRen?: number | null;
  @IsOptional() @IsNumber() @Min(0) co2Emissions?: number | null;
  @IsOptional() @IsString() @MaxLength(10) climateZone?: string | null;
  @IsOptional() @IsString() @MaxLength(40) energyUseCategory?: string | null;

  @IsOptional() @IsString() @MaxLength(40) habitabilityStatus?: string | null;
  @IsOptional() @IsDateString() habitabilityDate?: string | null;
  @IsOptional() @IsString() @MaxLength(120) habitabilityProtocol?:
    string | null;
}
