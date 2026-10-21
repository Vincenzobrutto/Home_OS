import {ARCHIVE_FAMILIES,LEGACY_FAMILIES} from './families';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CodePointLength } from '../dto';
import { normalizeSearchQuery } from './search';
import { DOCUMENT_COLLECTIONS, type DocumentCollection } from '../document-intake/domain';
export class UploadDocumentDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @CodePointLength(1, 160, 'Titolo') name!: string;
  @IsIn(['private', 'home']) visibility: 'private' | 'home' = 'private';
}
export class ListDocumentsDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsString() @CodePointLength(1, 512, 'Pagina') cursor?: string;
}
// H2 only: Review controllers continue to use the strict M2 ListDocumentsDto.
export class SearchDocumentsDto extends ListDocumentsDto {
  @IsOptional() @IsIn(['all','house','objects','archive']) view?:'all'|'house'|'objects'|'archive';
  @IsOptional() @IsIn(['all','house','objects']) related?:'all'|'house'|'objects';
  @IsOptional() @IsIn([...ARCHIVE_FAMILIES,...LEGACY_FAMILIES]) group?:typeof ARCHIVE_FAMILIES[number]|typeof LEGACY_FAMILIES[number];
  @IsOptional() @IsIn(['all','pending','completed','to_compile','review']) workflow?:'all'|'pending'|'completed'|'to_compile'|'review';
  @IsOptional() @IsString() @IsIn(['all', 'house', 'floor_plans', ...Object.keys(DOCUMENT_COLLECTIONS)]) collection?: 'all' | 'house' | 'floor_plans' | DocumentCollection;
  @Transform(({ value }: { value: unknown }) => value === undefined ? undefined : normalizeSearchQuery(value))
  @IsOptional() @IsString() @CodePointLength(0, 120, 'Ricerca') q?: string;
  @IsOptional() @IsString() @IsIn(['all', 'pdf', 'jpeg', 'png']) format?: 'all' | 'pdf' | 'jpeg' | 'png';
  @IsOptional() @IsString() @IsIn(['all', 'private', 'home']) visibility?: 'all' | 'private' | 'home';
}
export class ExportDocumentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) documentIds!: string[];
}
