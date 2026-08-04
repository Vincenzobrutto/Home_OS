import { IsIn } from 'class-validator';

export class StartScanDto {
  // Solo GUIDED_MOCK è realmente supportato in questo MVP — PHOTO/VIDEO
  // esistono nel dominio/tipo per il provider futuro ma non hanno
  // un'implementazione reale, vedi house-scan-provider.interface.ts.
  @IsIn(['GUIDED_MOCK'])
  type: 'GUIDED_MOCK';
}
