export interface GwpEntry {
  refrigerant: string;
  gwp: number;
  family: 'ANNEX_I' | 'ANNEX_II_SECTION_1';
  source: string;
  verifiedAt: string;
}

// Registro minimo per i test del motore. L'estensione della tabella richiede
// la stessa verifica e tracciabilità delle regole, non valori ricordati a mano.
export const GWP_TABLE: readonly GwpEntry[] = [
  {
    refrigerant: 'R32',
    gwp: 675,
    family: 'ANNEX_I',
    source: 'Regolamento (UE) 2024/573, allegati',
    verifiedAt: '2026-09-03',
  },
];

export function findGwp(refrigerant: string) {
  return GWP_TABLE.find(
    (entry) => entry.refrigerant.toLowerCase() === refrigerant.toLowerCase(),
  );
}
