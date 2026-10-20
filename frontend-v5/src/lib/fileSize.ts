const kilobytes = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const megabytes = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/** Decimal units for display only; byte-based validation keeps its exact limits. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${kilobytes.format(bytes / 1000)} KB`;
  return `${megabytes.format(bytes / 1_000_000)} MB`;
}
