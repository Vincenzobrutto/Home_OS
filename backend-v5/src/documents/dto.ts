import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CodePointLength } from '../dto';
export class UploadDocumentDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @CodePointLength(1, 160, 'Titolo') name!: string;
  @IsIn(['private', 'home']) visibility: 'private' | 'home' = 'private';
}
export class ListDocumentsDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsString() @CodePointLength(1, 512, 'Pagina') cursor?: string;
}
export class ExportDocumentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) documentIds!: string[];
}
