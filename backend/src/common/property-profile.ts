import { FieldSource, Prisma } from '@prisma/client';

export const TRACKED_PROPERTY_FIELDS = [
  'address',
  'postalCode',
  'city',
  'province',
  'country',
  'propertyType',
  'surfaceSqm',
  'buildYear',
  'renovationYear',
  'floorsCount',
  'usableSurfaceSqm',
  'heatedSurfaceSqm',
  'cadastralMunicipality',
  'cadastralMunicipalityCode',
  'cadastralSection',
  'cadastralSheet',
  'cadastralParcel',
  'cadastralSubaltern',
  'cadastralCategory',
  'cadastralClass',
  'cadastralConsistency',
  'cadastralSurfaceSqm',
  'cadastralIncome',
  'apeCode',
  'apeIssuedAt',
  'apeExpiresAt',
  'energyClass',
  'epglNren',
  'epglRen',
  'co2Emissions',
  'climateZone',
  'energyUseCategory',
  'habitabilityStatus',
  'habitabilityDate',
  'habitabilityProtocol',
] as const;

export type TrackedPropertyField = (typeof TRACKED_PROPERTY_FIELDS)[number];

// Campi che descrivono se il profilo è già utile; i dettagli tecnici più
// avanzati restano visibili ma non penalizzano la percentuale iniziale.
export const PROPERTY_COMPLETENESS_FIELDS: TrackedPropertyField[] = [
  'address',
  'city',
  'province',
  'postalCode',
  'propertyType',
  'surfaceSqm',
  'buildYear',
  'cadastralMunicipality',
  'cadastralSheet',
  'cadastralParcel',
  'cadastralSubaltern',
  'cadastralCategory',
  'apeCode',
  'energyClass',
  'apeIssuedAt',
  'apeExpiresAt',
];

export function propertyProfileCompleteness(
  house: Partial<Record<TrackedPropertyField, unknown>>,
): number {
  const present = PROPERTY_COMPLETENESS_FIELDS.filter((field) => {
    const value = house[field];
    return value !== null && value !== undefined && value !== '';
  }).length;
  return Math.round((present / PROPERTY_COMPLETENESS_FIELDS.length) * 100);
}

function normalized(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return `${value}`;
  return JSON.stringify(value) ?? null;
}

export function changedPropertyFields(
  dto: Partial<Record<TrackedPropertyField, unknown>>,
  existing: Partial<Record<TrackedPropertyField, unknown>>,
): TrackedPropertyField[] {
  return TRACKED_PROPERTY_FIELDS.filter(
    (field) =>
      dto[field] !== undefined &&
      normalized(dto[field]) !== normalized(existing[field]),
  );
}

export function propertyProvenanceUpsert(
  fieldName: TrackedPropertyField,
  houseId: string,
  userId: string,
  origin: FieldSource,
  sourceDocumentId?: string,
): Prisma.HouseFieldProvenanceUpsertArgs {
  const data = {
    origin,
    sourceDocumentId: sourceDocumentId ?? null,
    confirmedByUserId: userId,
    confirmedAt: new Date(),
  };
  return {
    where: { houseId_fieldName: { houseId, fieldName } },
    create: { houseId, fieldName, ...data },
    update: data,
  };
}
