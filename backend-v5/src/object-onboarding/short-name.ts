import { text } from '../review/domain';

/** Presentation only: the caller must validate the entire source name first. */
export function shortProductName(verifiedName: string): string {
  if ([...verifiedName].length <= 120) return text(verifiedName, 120);
  // Prefer a complete leading clause, otherwise the last complete word that fits.
  const clauses = [...verifiedName.matchAll(/\s[-–—|]\s|[,;]\s/gu)].map(match => verifiedName.slice(0, match.index).trim());
  const clause = clauses.find(value => [...value].length >= 8 && [...value].length <= 120);
  const prefix = [...verifiedName].slice(0, 121).join('');
  const boundary = prefix.lastIndexOf(' ');
  const result = clause ?? (boundary > 0 ? prefix.slice(0, boundary).trim() : '');
  // An unsplittable identifier is never cropped. It requires manual correction.
  return text(result, 120);
}
