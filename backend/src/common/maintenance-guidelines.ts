import { AssetType, MaintenanceRecurrenceUnit } from '@prisma/client';
import { addCalendarMonths } from './maintenance';

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
    description:
      'Pulizia o sanificazione dei filtri per mantenere resa ed efficienza — intervallo tipico, verifica le indicazioni del produttore.',
    recurrenceUnit: 'MONTH',
    recurrenceInterval: 6,
    reminderDaysBefore: 14,
    isMandatory: false,
  },
  {
    code: 'clima-tecnica',
    assetType: 'CLIMA',
    title: 'Controllo tecnico e gas refrigerante',
    description:
      'Controllo consigliato di funzionamento e tenuta del circuito frigorifero — la periodicità obbligatoria dipende dal tipo e dalla carica di gas refrigerante.',
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 1,
    reminderDaysBefore: 30,
    isMandatory: false,
  },
  {
    code: 'caldaia-controllo',
    assetType: 'CALDAIA',
    title: 'Controllo fumi ed efficienza energetica',
    description:
      'Controllo periodico obbligatorio per legge — la cadenza esatta dipende da potenza, tipo di generatore e regione: verifica il libretto di impianto.',
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 1,
    reminderDaysBefore: 30,
    isMandatory: true,
  },
  {
    code: 'fotovoltaico-pulizia',
    assetType: 'FOTOVOLTAICO',
    title: 'Pulizia pannelli e controllo inverter',
    description:
      "Pulizia dei pannelli e controllo del funzionamento dell'inverter per mantenere la resa energetica.",
    recurrenceUnit: 'YEAR',
    recurrenceInterval: 1,
    reminderDaysBefore: 21,
    isMandatory: false,
  },
  {
    code: 'elettrico-verifica',
    assetType: 'ELETTRICO',
    title: 'Verifica periodica impianto elettrico',
    description:
      "Verifica dello stato dell'impianto — intervallo tipico per un impianto domestico; gli obblighi normativi variano per contesto (es. condominiale, luoghi con messa a terra soggetta a denuncia).",
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

  return MAINTENANCE_GUIDELINES.filter(
    (guideline) => guideline.assetType === params.assetType,
  )
    .filter(
      (guideline) => !existingTitles.has(guideline.title.trim().toLowerCase()),
    )
    .map((guideline) => ({
      ...guideline,
      suggestedNextDueAt: addInterval(
        basisDate,
        guideline.recurrenceUnit,
        guideline.recurrenceInterval,
      ),
      basedOn,
    }));
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
