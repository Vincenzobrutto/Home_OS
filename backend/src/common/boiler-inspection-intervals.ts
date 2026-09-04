// Tabella di lookup regione+potenza → intervallo di controllo caldaia,
// verificata su fonte primaria/specializzata (vedi `source` per ogni
// regione), NON su un motore normativo generico. Copre solo le regioni
// verificate finora: aggiungere una nuova regione richiede prima una
// verifica dedicata (fonte primaria quando disponibile), mai un valore
// inventato o estrapolato da altre regioni.
//
// Deliberatamente NESSUN fattore età: verificato (2026-09-04, fonte
// primaria Bosetti & Gatti, testo DPR 74/2013 Allegato A) che per i
// generatori a gas la cadenza ordinaria dipende solo da combustibile e
// potenza. L'unico riferimento all'anzianità (art. 9 c.9 lett. b,
// "anzianità superiore a 15 anni") è un criterio di priorità per le
// ispezioni straordinarie delle autorità, non una regola che cambia la
// cadenza che il proprietario deve rispettare.
export interface BoilerIntervalBand {
  minKw: number;
  minInclusive?: boolean;
  maxKw: number | null;
  years: number;
}

export interface RegionalBoilerRule {
  region: string;
  source: { title: string; url: string };
  bands: BoilerIntervalBand[];
}

export const BOILER_INSPECTION_INTERVALS: RegionalBoilerRule[] = [
  {
    region: 'Lazio',
    source: {
      title:
        'Regolamento regionale Lazio 23/12/2020, n. 30, art. 12 c.3 (recepisce Allegato A DPR 74/2013)',
      url: 'https://www.regione.lazio.it/regolamenti-regionali-testo-coordinato/regolamento-regionale-23-dicembre-2020-n-30/14052021',
    },
    bands: [
      { minKw: 10, minInclusive: false, maxKw: 100, years: 4 },
      { minKw: 100, maxKw: null, years: 2 },
    ],
  },
  {
    region: 'Lombardia',
    source: {
      title: 'DGR Lombardia XI/3502/2020 (cadenze per fascia di potenza)',
      url: 'https://www.curit.it/documents/22402/34357/DGR+XI-3502+del+5+agosto+2020.pdf',
    },
    bands: [
      { minKw: 5, maxKw: 35, years: 2 },
      { minKw: 35, maxKw: 350, years: 1 },
      { minKw: 350, maxKw: null, years: 1 },
    ],
  },
];

export function lookupBoilerInterval(
  region: string | null | undefined,
  powerKw: number | null | undefined,
): { years: number; source: { title: string; url: string } } | null {
  if (!region || powerKw == null) return null;
  const rule = BOILER_INSPECTION_INTERVALS.find((r) => r.region === region);
  if (!rule) return null;
  const band = rule.bands.find(
    (b) =>
      (b.minInclusive === false ? powerKw > b.minKw : powerKw >= b.minKw) &&
      (b.maxKw === null || powerKw < b.maxKw),
  );
  return band ? { years: band.years, source: rule.source } : null;
}
