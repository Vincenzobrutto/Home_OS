import { FieldSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// I 7 campi strutturati "universali" di Asset che oggi vengono scritti sia
// a mano (AssetsService.update) sia dall'estrazione documentale
// (DocumentsService.applyFieldsToAsset) senza lasciare traccia di chi/da
// dove — vedi decisions.md B38. Elencati qui una sola volta: chi chiama
// upsertAssetFieldProvenance non deve reinventare l'elenco.
export const TRACKED_ASSET_FIELDS = [
  'installedAt',
  'warrantyUntil',
  'purchasedAt',
  'serialNumber',
  'manufacturer',
  'model',
  'supplier',
] as const;

export type TrackedAssetField = (typeof TRACKED_ASSET_FIELDS)[number];

interface UpsertAssetFieldProvenanceParams {
  assetId: string;
  fieldName: TrackedAssetField;
  origin: FieldSource;
  confirmedByUserId: string;
  sourceDocumentId?: string | null;
}

// Un solo record per (assetId, fieldName): v1 traccia solo la provenienza
// dell'ultimo valore scritto, non uno storico delle versioni precedenti —
// scope deliberato, vedi decisions.md B38.
export function upsertAssetFieldProvenance(
  prisma: PrismaService,
  {
    assetId,
    fieldName,
    origin,
    confirmedByUserId,
    sourceDocumentId,
  }: UpsertAssetFieldProvenanceParams,
) {
  const confirmedAt = new Date();
  return prisma.assetFieldProvenance.upsert({
    where: { assetId_fieldName: { assetId, fieldName } },
    create: {
      assetId,
      fieldName,
      origin,
      confirmedByUserId,
      sourceDocumentId: sourceDocumentId ?? null,
      confirmedAt,
    },
    update: {
      origin,
      confirmedByUserId,
      sourceDocumentId: sourceDocumentId ?? null,
      confirmedAt,
    },
  });
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    const aTime = a instanceof Date ? a.getTime() : a ? new Date(a as string).getTime() : null;
    const bTime = b instanceof Date ? b.getTime() : b ? new Date(b as string).getTime() : null;
    return aTime === bTime;
  }
  return a === b;
}

// Scrive un record DECLARED solo per i campi il cui valore è davvero
// cambiato rispetto a quello esistente — non basta che il campo compaia nel
// body: il form di modifica in frontend rimanda sempre tutti i 7 campi,
// anche quelli che l'utente non ha toccato (vedi Modals.tsx EditAssetModal),
// altrimenti si ri-etichetterebbe come "appena dichiarato da te" un valore
// magari arrivato da un documento anni fa e mai realmente ritoccato (bug
// osservato in pratica durante la verifica di B38). Non tocca nemmeno i
// default calcolati (es. la garanzia automatica a 24 mesi) perché quelli
// non li ha dichiarati l'utente, li ha dedotti il sistema.
export async function recordDeclaredFields(
  prisma: PrismaService,
  assetId: string,
  userId: string,
  dto: Partial<Record<TrackedAssetField, unknown>>,
  existing: Partial<Record<TrackedAssetField, unknown>>,
): Promise<void> {
  for (const fieldName of TRACKED_ASSET_FIELDS) {
    if (dto[fieldName] === undefined) continue;
    if (valuesEqual(dto[fieldName], existing[fieldName])) continue;
    await upsertAssetFieldProvenance(prisma, {
      assetId,
      fieldName,
      origin: FieldSource.DECLARED,
      confirmedByUserId: userId,
    });
  }
}
