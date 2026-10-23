import { ProviderFailure } from '../review/provider';

// Closed vocabulary only. No provider values, exception messages, IDs or excerpts.
const sections = ['root', 'document_info', 'item', 'item_fields', 'item_field', 'item_identity', 'item_type', 'item_quantity', 'item_price', 'purchase_total', 'house_expenses', 'invoice_coverage', 'contacts', 'source_region'] as const;
const fields = ['name', 'brand', 'model', 'reference', 'serialNumber', 'powerWatts', 'voltageVolts', 'frequencyHz', 'capacityLitres', 'orderDate', 'purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'] as const;
export type DecodeLocation = { section: typeof sections[number]; field?: string };
const diagnostics = new WeakMap<Error, DecodeLocation>();

export function locateDecodeFailure(error: unknown, location: DecodeLocation): ProviderFailure {
  const failure = error instanceof ProviderFailure ? error : new ProviderFailure('analysis_invalid_output');
  if (!diagnostics.has(failure)) diagnostics.set(failure, { ...location });
  return failure;
}

export function decodeDiagnostic(error: unknown): { validationSection?: string; validationField?: string } {
  const location = error instanceof Error ? diagnostics.get(error) : undefined;
  if (!location || !(sections as readonly string[]).includes(location.section)) return {};
  return { validationSection: location.section, ...(location.field && (fields as readonly string[]).includes(location.field) ? { validationField: location.field } : {}) };
}
