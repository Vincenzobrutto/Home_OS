import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CodePointLength } from '../dto';
export class StartAnalysisDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique() @IsUUID('all', { each: true }) documentIds!: string[];
  @IsOptional() @IsUUID() targetAssetId?: string;
}
export class CreateAssetDto {
  @IsIn(['boiler']) type!: 'boiler';
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @CodePointLength(1, 80, 'Nome') name!: string;
}
export class ConfirmDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) decisions!: unknown[];
}
export class ManualDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) fields!: unknown[];
}
export class EmptyDto {}
