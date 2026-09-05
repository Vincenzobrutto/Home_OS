import type { Asset } from './types';

// Stesso principio di ROOM_NAME_SUGGESTIONS in Modals.tsx (decisions.md
// #63/#64): un nome comune copre già il tipo più probabile, categorizzare
// a parte è un passo in più quasi sempre superfluo — un clic compila nome
// e tipo insieme, resta comunque possibile digitare un nome libero.
export const ASSET_NAME_SUGGESTIONS: { name: string; type: string }[] = [
  { name: 'Caldaia', type: 'CALDAIA' },
  { name: 'Climatizzatore', type: 'CLIMA' },
  { name: 'Impianto elettrico', type: 'ELETTRICO' },
  { name: 'Impianto idraulico', type: 'IDRAULICO' },
  { name: 'Scaldabagno', type: 'IDRAULICO' },
  { name: 'Impianto fotovoltaico', type: 'FOTOVOLTAICO' },
  { name: 'Frigorifero', type: 'ELETTRODOMESTICO' },
  { name: 'Lavatrice', type: 'ELETTRODOMESTICO' },
  { name: 'Lavastoviglie', type: 'ELETTRODOMESTICO' },
  { name: 'Forno', type: 'ELETTRODOMESTICO' },
  { name: 'Macchina del caffè', type: 'ELETTRODOMESTICO' },
  { name: 'Finestre', type: 'FINESTRE' },
  { name: 'Tetto', type: 'TETTO' },
];

// Asset.code (non Asset.name) è l'unico campo univoco nello schema — stessa
// logica di nextAvailableRoomName (Modals.tsx), applicata agli asset.
export function nextAvailableAssetName(base: string, existingAssets: Asset[]): string {
  const trimmed = base.trim();
  if (!trimmed) return trimmed;
  const names = new Set(existingAssets.map((a) => a.name));
  if (!names.has(trimmed)) return trimmed;
  let n = 2;
  while (names.has(`${trimmed} ${n}`)) n++;
  return `${trimmed} ${n}`;
}
