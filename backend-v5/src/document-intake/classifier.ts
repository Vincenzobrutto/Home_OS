import { DOCUMENT_KINDS, collectionsFor, classificationParts, type DocumentKind } from './domain';
/** Real, conservative local text matching. Not AI, OCR, semantic validation or a fixture lookup. */
export const LOCAL_CLASSIFIER = { provider: 'local_text_v1', label: 'Classificazione locale del testo', isSimulation: false, costUsd: '0.000000', externalTransmission: false } as const;
const rules: Array<[DocumentKind, RegExp, string]> = [
  ['ape', /attestato\s+di\s+prestazione\s+energetica/iu, 'APE'],
  ['energy_certificate', /certificat[oa]\s+energetic[oa]/iu, 'Certificato energetico'],
  ['cila', /\bCILA\b|comunicazione\s+(?:di\s+)?inizio\s+lavori\s+asseverata/iu, 'CILA'],
  ['scia', /\bSCIA\b|segnalazione\s+certificata\s+(?:di\s+)?inizio\s+attivit[àa]/iu, 'SCIA'],
  ['building_permit', /licenza\s+edilizia|permesso\s+di\s+costruire|concessione\s+edilizia/iu, 'Titolo edilizio'],
  ['habitability', /certificato\s+(?:di\s+)?abitabilit[àa]/iu, 'Abitabilità'],
  ['agibility', /(?:certificato|segnalazione\s+certificata)\s+(?:di\s+)?agibilit[àa]/iu, 'Agibilità'],
  ['system_diagram', /schema\s+(?:(?:dell[’']?|di)\s*)?(?:impianto|elettrico|idraulico|termico)/iu, 'Schema di impianto'],
  ['conformity_declaration', /dichiarazione\s+(?:di\s+)?conformit[àa]/iu, 'Dichiarazione di conformità'],
  ['system_booklet', /libretto\s+(?:di\s+)?impianto/iu, 'Libretto di impianto'],
  ['condominium_rules', /regolamento\s+(?:del\s+)?condomin(?:io|iale)/iu, 'Regolamento condominiale'],
  ['condominium_minutes', /verbale\s+(?:di\s+|dell[’']\s*)?assemblea/iu, 'Verbale di assemblea'],
  ['millesimal_tables', /tabell[ae]\s+millesimal[ei]/iu, 'Tabelle millesimali'],
  ['receipt', /scontrino|documento\s+commerciale|ricevuta\s+(?:di\s+acquisto|fiscale)/iu, 'Ricevuta'],
  ['invoice', /\bfattura\b/iu, 'Fattura'],
  ['warranty', /certificato\s+(?:di\s+)?garanzia|garanzia\s+convenzionale/iu, 'Garanzia'],
  ['manual', /manuale\s+(?:d[’']?uso|di\s+istruzioni|utente)/iu, 'Manuale d’uso'],
  ['utility_bill', /\bbolletta\b|fornitura\s+(?:di\s+)?(?:energia\s+elettrica|gas\s+naturale|acqua)/iu, 'Bolletta'],
];
export function classifyText(pages: string[]) {
  const matches = rules.flatMap(([kind, pattern, label]) => {
    for (let i = 0; i < pages.length; i++) {
      const match = pattern.exec(pages[i]);
      if (match) {
        const start = Math.max(0, match.index - 40), end = Math.min(pages[i].length, match.index + match[0].length + 100);
        return [{ kind, pageFrom: i + 1, pageTo: i + 1, label, excerpt: pages[i].slice(start, end) }];
      }
    }
    return [];
  });
  // Too many meanings, or no explicit signal: ask the user, never guess from filename.
  if (!matches.length || matches.length > 12) return null;
  const parts = classificationParts(matches.map(({ kind, pageFrom, pageTo }) => ({ kind, pageFrom, pageTo })), pages.length, 'extraction');
  const title = matches.slice(0, 3).map(m => m.label).join(' + ');
  return { title, parts, collections: collectionsFor(parts), sources: matches.map(m => ({ page: m.pageFrom, excerpt: m.excerpt })), method: LOCAL_CLASSIFIER.provider, note: 'Possibili tipi riconosciuti nel testo. Controlla l’originale: non è una verifica di validità o regolarità.' };
}
export const localKinds = Object.keys(DOCUMENT_KINDS);
