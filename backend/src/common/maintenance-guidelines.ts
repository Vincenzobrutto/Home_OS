import { AssetType, MaintenanceRecurrenceUnit } from '@prisma/client';
import { addCalendarMonths } from './maintenance';
import { lookupBoilerInterval } from './boiler-inspection-intervals';

// Linee guida generiche per tipo di Asset — non sostituiscono il libretto
// specifico del prodotto/impianto, sono un punto di partenza ragionevole
// (intervallo + descrizione) che l'utente vede e può sempre modificare prima
// di salvare. Coperti solo i tipi con una cadenza abbastanza nota e comune
// da essere utile; TETTO/FINESTRE/ELETTRODOMESTICO non hanno una cadenza
// generica sensata (troppo diversi caso per caso) e sono lasciati fuori
// deliberatamente invece di inventare un default che sarebbe solo rumore.
export interface MaintenanceGuideline {
  code: string;
  assetType: AssetType;
  title: string;
  description?: string;
  recurrenceUnit: Exclude<MaintenanceRecurrenceUnit, 'NONE'>;
  recurrenceInterval: number;
  reminderDaysBefore: number;
  isMandatory: boolean;
}

export const MAINTENANCE_GUIDELINES: MaintenanceGuideline[] = [
  {
    code: 'clima-filtri',
    assetType: 'CLIMA',
    title: 'Pulizia filtri',
    // Verificato via web search 2026-08-03. Non è una norma di legge: è
    // indicazione dei produttori. Daikin consiglia ogni 1-2 mesi durante
    // l'uso, Mitsubishi Electric almeno mensile; con uso intenso o allergie
    // le associazioni consumatori (Altroconsumo) consigliano ogni 2
    // settimane. "6 mesi" (valore originale, non verificato) era troppo
    // rado: 2 mesi è più vicino alla fascia bassa consigliata dai
    // produttori, restando un promemoria periodico e non una checklist
    // settimanale — l'uso intenso resta da valutare a mano dall'utente.
    description:
      "Pulizia o sanificazione dei filtri per mantenere resa ed efficienza. I produttori (es. Daikin, Mitsubishi Electric) consigliano ogni 1-2 mesi durante l'uso stagionale, più spesso con uso intenso o allergie — non è un obbligo di legge, regolati l'intervallo sulla tua situazione reale.",
    recurrenceUnit: 'MONTH',
    recurrenceInterval: 2,
    reminderDaysBefore: 7,
    isMandatory: false,
  },
  {
    code: 'clima-tecnica',
    assetType: 'CLIMA',
    title: 'Controllo tecnico e gas refrigerante',
    // Verificato via web search 2026-08-03. Il Regolamento UE F-Gas
    // 517/2014 impone il controllo periodico delle perdite solo sopra 5
    // tonnellate di CO2 equivalente (10 t se ermeticamente sigillata) — un
    // climatizzatore domestico con pochi kg di R32/R410A resta quasi
    // sempre ben sotto soglia. La descrizione precedente lasciava intendere
    // un obbligo quasi certo: corretto, per la maggior parte dei casi
    // domestici NON c'è alcun obbligo legale, è un controllo tecnico
    // consigliato.
    description:
      "Controllo tecnico consigliato di funzionamento e tenuta del circuito frigorifero. Per la maggior parte dei climatizzatori domestici NON c'è un obbligo legale di controllo periodico delle perdite (Regolamento UE F-Gas 517/2014 si applica solo sopra 5 tonnellate di CO2 equivalente, soglia raramente raggiunta da un impianto domestico) — qui è manutenzione preventiva, non un adempimento normativo.",
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 1,
    reminderDaysBefore: 30,
    isMandatory: false,
  },
  {
    code: 'caldaia-controllo',
    assetType: 'CALDAIA',
    title: 'Controllo fumi ed efficienza energetica',
    // Verificato via web search 2026-08-03 (Lombardia) e 2026-09-04 (Lazio,
    // fonte primaria: Regolamento regionale Lazio 23/12/2020 n. 30, art. 12
    // c.3, che recepisce l'Allegato A del DPR 74/2013). DPR 74/2013 rimanda
    // la cadenza esatta alle regioni, e i due esempi verificati DIVERGONO per
    // la stessa fascia di potenza tipica di una caldaia domestica: Lombardia
    // (DGR XI/3502/2020) 2 anni tra 5-35 kW, 1 anno da 35 kW in su; Lazio
    // 4 anni sopra 10 e sotto 100 kW, 2 anni da 100 kW. "2 anni" qui resta il
    // default più prudente (mai più frequente del vero in nessuno dei due
    // casi verificati), non un valore uguale ovunque — non esiste oggi un
    // singolo numero corretto per ogni regione, va sempre verificato o
    // corretto dall'utente (vedi frontend/src/components/Maintenance.tsx,
    // intervallo reso modificabile proprio per questo).
    description:
      'Controllo periodico obbligatorio per legge (DPR 74/2013, attuato a livello regionale). La cadenza varia per regione e potenza dell\'impianto anche per la stessa fascia domestica tipica: ad es. in Lombardia è ogni 2 anni sotto i 35 kW, nel Lazio ogni 4 anni tra 10-100 kW. "2 anni" qui è solo un default prudente — verifica il libretto di impianto e la normativa della tua regione, e correggi pure l\'intervallo qui sotto se conosci quello giusto.',
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 2,
    reminderDaysBefore: 45,
    isMandatory: true,
  },
  {
    code: 'fotovoltaico-pulizia',
    assetType: 'FOTOVOLTAICO',
    title: 'Pulizia pannelli e controllo inverter',
    // Verificato via web search 2026-08-03. Nessun obbligo di pulizia per
    // impianti residenziali; obbligo di legge (controllo interfaccia
    // inverter-rete, Delibera ARERA 78/2016) solo sopra 11,08 kW, taglia
    // superiore al tipico impianto domestico. "1 anno" per impianti piccoli
    // residenziali è coerente con le fonti consultate (consigliato, non
    // imposto) — in aree rurali/poco polverose può bastare meno spesso.
    description:
      "Pulizia dei pannelli e controllo del funzionamento dell'inverter per mantenere la resa energetica — consigliata circa una volta l'anno per un impianto residenziale di piccola taglia (meno spesso in zone rurali poco polverose). Non è un obbligo di legge sotto gli 11,08 kW; sopra quella soglia la Delibera ARERA 78/2016 impone il controllo dell'interfaccia con la rete.",
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 1,
    reminderDaysBefore: 21,
    isMandatory: false,
  },
  {
    code: 'elettrico-verifica',
    assetType: 'ELETTRICO',
    title: 'Verifica periodica impianto elettrico',
    // Verificato via web search 2026-08-03. Il DPR 462/2001 impone verifiche
    // periodiche (quinquennali, biennali in contesti a rischio) soprattutto
    // a datori di lavoro/luoghi di lavoro — non si applica automaticamente
    // a una comune abitazione privata. "5 anni" resta un default
    // ragionevole per i contesti in cui l'obbligo si applica davvero (o
    // come buona pratica generica), ma per la casa privata tipica non è
    // un adempimento di legge.
    description:
      "Verifica dello stato dell'impianto elettrico. Il DPR 462/2001 impone verifiche periodiche (ogni 5 anni, ogni 2 in contesti a rischio) principalmente a luoghi di lavoro e contesti specifici (es. impianti condominiali soggetti a denuncia di messa a terra) — per una comune abitazione privata di solito NON è un obbligo di legge, qui è buona pratica consigliata con lo stesso intervallo.",
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 5,
    reminderDaysBefore: 60,
    isMandatory: false,
  },
];

export type MaintenanceSuggestionBasis =
  'installedAt' | 'purchasedAt' | 'createdAt';

export interface MaintenanceSuggestion extends MaintenanceGuideline {
  suggestedNextDueAt: Date;
  basedOn: MaintenanceSuggestionBasis;
  // true solo per guideline che hanno una tabella di lookup regionale
  // disponibile (oggi solo caldaia-controllo) — segnala al frontend che
  // può proporre l'inserimento di regione/potenza per calcolare
  // l'intervallo corretto invece del default generico.
  regionalLookupAvailable?: boolean;
  // Presente solo quando regione+potenza erano note e il lookup ha
  // trovato una regola: intervallo e descrizione sono già quelli
  // calcolati, non il default.
  resolvedIntervalSource?: { title: string; url: string } | null;
}

// Confronto solo per titolo: stesso approccio "buono ma non perfetto" già
// usato per il matching documento→asset (vedi decisions.md #7) — se
// l'utente rinomina il piano dopo averlo aggiunto, la stessa proposta
// potrebbe ripresentarsi. Accettabile: non blocca nulla, l'utente la ignora.
export function computeMaintenanceSuggestions(params: {
  assetType: AssetType;
  installedAt: Date | null;
  purchasedAt: Date | null;
  createdAt: Date;
  existingPlanTitles: string[];
  dismissedGuidelineCodes?: string[];
  region?: string | null;
  powerKw?: number | null;
}): MaintenanceSuggestion[] {
  const basisDate =
    params.installedAt ?? params.purchasedAt ?? params.createdAt;
  const basedOn: MaintenanceSuggestionBasis = params.installedAt
    ? 'installedAt'
    : params.purchasedAt
      ? 'purchasedAt'
      : 'createdAt';
  const existingTitles = new Set(
    params.existingPlanTitles.map((title) => title.trim().toLowerCase()),
  );
  const dismissedCodes = new Set(params.dismissedGuidelineCodes ?? []);

  return MAINTENANCE_GUIDELINES.filter(
    (guideline) => guideline.assetType === params.assetType,
  )
    .filter(
      (guideline) => !existingTitles.has(guideline.title.trim().toLowerCase()),
    )
    .filter((guideline) => !dismissedCodes.has(guideline.code))
    .map((guideline) => {
      const isBoilerControl = guideline.code === 'caldaia-controllo';
      const resolved = isBoilerControl
        ? lookupBoilerInterval(params.region, params.powerKw)
        : null;
      const recurrenceInterval = resolved
        ? resolved.years
        : guideline.recurrenceInterval;

      return {
        ...guideline,
        recurrenceInterval,
        suggestedNextDueAt: addInterval(
          basisDate,
          guideline.recurrenceUnit,
          recurrenceInterval,
        ),
        basedOn,
        regionalLookupAvailable: isBoilerControl,
        resolvedIntervalSource: resolved ? resolved.source : null,
      };
    });
}

function addInterval(
  date: Date,
  unit: Exclude<MaintenanceRecurrenceUnit, 'NONE'>,
  interval: number,
): Date {
  if (unit === 'DAY') {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + interval);
    return result;
  }
  const months = unit === 'MONTH' ? interval : interval * 12;
  return addCalendarMonths(date, months);
}
