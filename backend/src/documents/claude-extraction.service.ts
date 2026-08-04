import { Injectable, InternalServerErrorException } from '@nestjs/common';

const MODEL = 'claude-sonnet-5';

// Stesse liste usate nel prototipo e in ai-test/extract.js — le chiavi
// corrispondono 1:1 ai valori degli enum Prisma AssetType/RoomType (uppercase).
const ASSET_TYPES = [
  'caldaia',
  'elettrico',
  'idraulico',
  'fotovoltaico',
  'clima',
  'tetto',
  'finestre',
  'elettrodomestico',
];
const ROOM_TYPES = ['cucina', 'soggiorno', 'camera', 'bagno'];

const SYSTEM_PROMPT = `Sei il motore di estrazione documentale di HomeOS, un'app che crea il "gemello digitale" di una casa: collega documenti (fatture, certificati, manuali) agli Asset a cui si riferiscono, e può anche leggere planimetrie per ricostruire la disposizione degli ambienti.

Analizza il documento e rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo. La forma dipende dal tipo di documento:

0) Se il documento è una BOLLETTA ELETTRICA (non gas o acqua):
{
  "kind": "utility_bill",
  "docType": "Bolletta elettrica",
  "supplier": "nome fornitore oppure null",
  "confidence": numero 0-100,
  "isHomeRelated": true,
  "periods": [{
    "periodStart": "data ISO YYYY-MM-DD",
    "periodEnd": "data ISO YYYY-MM-DD",
    "consumptionKwh": numero positivo (JSON number con punto decimale, es. 260.8 — mai come stringa, mai con la virgola italiana),
    "amount": numero positivo con punto decimale (JSON number, es. 95.48 — mai come stringa, mai con la virgola italiana) che rappresenta l'importo totale in euro del periodo, oppure null
  }],
  "fields": [["Etichetta campo", "Valore"], ...]
}
Cerca attivamente il periodo di fatturazione e il relativo consumo, che sulle bollette italiane sono quasi sempre etichettati esplicitamente (es. "Periodo di fatturazione", "Periodo di riferimento" + "Consumo totale del periodo fatturato", "Consumo fatturato") — sono il dato da usare per "periods", NON il "Consumo annuo"/"Consumo ultimi 12 mesi" (un riepilogo su base diversa, spesso riferito a un anno solare non coincidente con la bolletta: non usarlo mai come periodo, riportalo se vuoi solo in "fields"). Se la bolletta riporta consumi mensili distinti, crea un periodo per ogni mese. Se riporta solo un totale bimestrale/plurimensile, crea un unico periodo con le date reali: HomeOS lo mostrerà come ripartizione stimata, non inventare dettagli mensili. Non confondere potenza impegnata (kW) ed energia consumata (kWh). Non includere letture cumulative del contatore come consumo del periodo. L'importo deve essere il totale dovuto, non una singola componente tariffaria.
Esempio concreto, frequente sulle bollette italiane: il documento riporta testualmente "Periodo di fatturazione: Settembre 2025" e "Consumo totale del periodo fatturato: 260,8 kWh". Anche se non compaiono date nel formato GG/MM/AAAA, questo È un periodo con data di inizio e fine precise: il mese stesso ne definisce i confini. Il valore corretto da produrre è "periods": [{"periodStart": "2025-09-01", "periodEnd": "2025-09-30", "consumptionKwh": 260.8, "amount": <totale bolletta>}] — calcolare primo e ultimo giorno del mese indicato non è un'invenzione, è l'unico modo corretto di rappresentare quel dato nello schema richiesto. Non lasciare "periods" vuoto in un caso come questo. "periods" deve restare vuoto solo se il documento non riporta davvero nessun dato di consumo per nessun periodo.

1) Se il documento è una PLANIMETRIA (pianta/disegno che mostra la disposizione delle stanze di una casa):
{
  "kind": "floor_plan",
  "rooms": [
    {
      "name": "nome stanza come indicato nel disegno, es. Cucina",
      "suggestedType": "uno tra: ${ROOM_TYPES.join(', ')} — oppure null se non riconducibile a nessuno di questi",
      "x": numero 0-1 (posizione del bordo sinistro della stanza, relativa alla larghezza totale della planimetria),
      "y": numero 0-1 (posizione del bordo superiore della stanza, relativa all'altezza totale),
      "width": numero 0-1 (larghezza della stanza relativa alla larghezza totale),
      "height": numero 0-1 (altezza della stanza relativa all'altezza totale)
    }
  ]
}
Stima x/y/width/height dalla posizione e proporzione visibili nel disegno, anche approssimativamente — non serve precisione millimetrica, serve una disposizione relativa plausibile.

2) Per ogni altro documento (fattura, certificato, manuale, ecc.):
{
  "kind": "asset_document",
  "docType": "tipo di documento in italiano, es. Fattura, Certificato di conformità, Manuale",
  "suggestedAssetType": "uno tra: ${ASSET_TYPES.join(', ')} — oppure null se non riconducibile a nessuno di questi",
  "suggestedAssetName": "nome breve e specifico dell'oggetto/impianto a cui si riferisce il documento, es. 'Macchina del caffè', 'Forno a microonde', 'Climatizzatore soggiorno' — non la categoria generica (evita 'Elettrodomestico' da solo). Usa il prodotto/modello indicato nel documento; se non c'è abbastanza informazione per un nome specifico, descrivi comunque l'oggetto nel modo più concreto possibile invece di ripetere il tipo. Null solo se suggestedAssetType è null.",
  "quantity": numero di unità identiche a cui il documento si riferisce (es. "fornitura e posa di n.3 climatizzatori split", "3x lampada da esterno") — 1 se il documento descrive un singolo oggetto o non specifica una quantità. Ogni unità diventa un asset separato (stanze e dati possono differire tra un'unità e l'altra), quindi non aggregarle mai in un'unica riga se il documento le conta esplicitamente come più di una,
  "confidence": numero 0-100 che rappresenta quanto sei sicuro dell'estrazione (bassa se il documento è manoscritto, sfocato, o ambiguo),
  "isHomeRelated": booleano — true se il documento riguarda plausibilmente la casa o i suoi impianti/elettrodomestici/servizi (fatture e ricevute di acquisto, installazione, manutenzione, garanzia, assicurazione casa, bollette utenze, certificazioni edilizie/impiantistiche); false se è chiaramente estraneo alla gestione della casa (materiale didattico o professionale, dispute legali non condominiali, abbonamenti a servizi digitali/software, corrispondenza personale, loghi o immagini senza contenuto documentale, acquisti non legati alla casa),
  "maintenanceInterventions": [{
    "title": "attività di manutenzione già eseguita, es. Pulizia filtri",
    "completedAt": "data ISO YYYY-MM-DD oppure null",
    "quantity": "numero di asset interessati, 1 se non indicato",
    "notes": "dettagli utili dell'intervento oppure null"
  }],
  "fields": [["Etichetta campo", "Valore"], ...]
}

Regole per il caso 2:
- Nei "fields" includi solo dati realmente presenti nel documento: fornitore, date, importi, numeri di certificazione, modelli, garanzie. Non inventare mai un valore assente.
- Quando il documento permette di distinguere marca/produttore e modello (es. "De'Longhi Rivelia EXAM440.35.B"), riportali come due campi separati "Marca" e "Modello" invece di un'unica stringa combinata — servono a compilare due dati distinti dell'asset, non uno solo.
- Se il documento sembra riferirsi a un tipo di asset non nella lista, imposta "suggestedAssetType" a null e descrivi comunque i campi trovati.
- "confidence" deve riflettere onestamente la leggibilità del documento, non solo la sua completezza.
- "isHomeRelated" è indipendente da "suggestedAssetType": un documento può riguardare la casa nel suo insieme (es. APE, assicurazione casa) senza corrispondere a un tipo di asset specifico — in quel caso resta true con suggestedAssetType null. Nel dubbio, preferisci true (falsi negativi nascondono documenti utili, falsi positivi vengono comunque scartati da una revisione umana).
- "maintenanceInterventions" contiene solo lavori dichiarati come GIÀ ESEGUITI (fattura, ricevuta, rapporto d'intervento). Deve essere [] per preventivi, appuntamenti, manuali, acquisti senza manutenzione e documenti che non attestano un lavoro concluso. Non inventare la data se manca.`;

export interface AssetDocumentResult {
  kind: 'asset_document';
  docType: string;
  suggestedAssetType: string | null;
  // Usato per precompilare il nome quando si propone di creare un nuovo
  // asset (categorie come "elettrodomestico" o "clima" comprendono più
  // oggetti distinti in una stessa casa — il tipo da solo non basta come
  // nome, vedi documents.controller confirm-document).
  suggestedAssetName: string | null;
  // Quando >1, il documento descrive più unità identiche (es. 3 climatizzatori):
  // il flusso di creazione asset in Inbox propone di crearne altrettante
  // separate invece di un'unica riga aggregata — vedi documents.service.ts.
  quantity: number;
  confidence: number;
  // Solo il flusso di scansione Gmail lo usa (per scartare candidati non
  // pertinenti prima di mostrarli): l'upload manuale in Inbox ignora questo
  // campo, dato che l'utente ha già scelto di caricare quel file.
  isHomeRelated: boolean;
  maintenanceInterventions?: Array<{
    title: string;
    completedAt: string | null;
    quantity: number;
    notes: string | null;
  }>;
  fields: [string, string][];
}

export interface FloorPlanRoomProposal {
  name: string;
  suggestedType: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlanResult {
  kind: 'floor_plan';
  rooms: FloorPlanRoomProposal[];
}

export interface UtilityBillResult {
  kind: 'utility_bill';
  docType: 'Bolletta elettrica';
  supplier: string | null;
  confidence: number;
  isHomeRelated: boolean;
  periods: Array<{
    periodStart: string;
    periodEnd: string;
    consumptionKwh: number;
    amount: number | null;
  }>;
  fields: [string, string][];
}

export type ExtractionResult =
  AssetDocumentResult | FloorPlanResult | UtilityBillResult;

// Input/output del solo arricchimento via ricerca online (pulsante "Cerca
// online" in Inbox, su richiesta esplicita dell'utente — vedi
// documents.service.ts searchOnline): sottoinsieme di AssetDocumentResult,
// niente confidence/isHomeRelated/quantity perché quei campi restano quelli
// della prima estrazione, non li tocca la ricerca web.
export interface EnrichmentInput {
  docType: string;
  suggestedAssetType: string | null;
  suggestedAssetName: string | null;
  fields: [string, string][];
}

export interface EnrichmentResult {
  docType: string;
  suggestedAssetType: string | null;
  suggestedAssetName: string | null;
  fields: [string, string][];
}

// Forma minima della risposta di POST /v1/messages che questo servizio usa
// davvero — non l'intero schema Anthropic, solo i campi letti sotto. Un
// blocco di contenuto può essere testo, una chiamata al tool di ricerca web
// o il suo risultato: qui interessa solo isolare quelli di tipo "text".
interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content: AnthropicContentBlock[];
  stop_reason: string | null;
}

function isTextBlock(
  block: AnthropicContentBlock,
): block is AnthropicContentBlock & { text: string } {
  return block.type === 'text' && typeof block.text === 'string';
}

// Il modello a volte commenta attorno al JSON nonostante le istruzioni
// ("solo JSON") — soprattutto con la ricerca web, ma capita anche in
// estrazioni normali. Isola l'oggetto JSON dal resto del testo invece di
// richiedere che l'intero blocco sia JSON puro, altrimenti basta una frase
// di troppo a far fallire un'estrazione che ha comunque funzionato.
function parseJsonResponse<T>(text: string): T {
  const withoutFences = text.replace(/```json|```/g, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new InternalServerErrorException(
      'Risposta del modello non era JSON valido.',
    );
  }
  try {
    // Confine di fiducia esplicito: il resto del file tipizza tutto quello
    // che arriva da Claude, ma il contenuto del JSON stesso non è validato
    // a runtime — se il modello si discosta dallo schema richiesto nel
    // prompt, l'errore emerge più a valle (es. un campo mancante), non qui.
    return JSON.parse(withoutFences.slice(start, end + 1)) as T;
  } catch {
    throw new InternalServerErrorException(
      'Risposta del modello non era JSON valido.',
    );
  }
}

function mediaTypeFor(filename: string): {
  kind: 'document' | 'image';
  mediaType: string;
} {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf') return { kind: 'document', mediaType: 'application/pdf' };
  if (ext === 'png') return { kind: 'image', mediaType: 'image/png' };
  if (ext === 'jpg' || ext === 'jpeg')
    return { kind: 'image', mediaType: 'image/jpeg' };
  if (ext === 'webp') return { kind: 'image', mediaType: 'image/webp' };
  throw new Error(`Formato non supportato: .${ext}. Usa PDF, PNG, JPG o WEBP.`);
}

@Injectable()
export class ClaudeExtractionService {
  async extract(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<ExtractionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY non configurata sul backend (vedi backend/.env).',
      );
    }

    const { kind, mediaType } = mediaTypeFor(filename);
    const base64Data = fileBuffer.toString('base64');
    const contentBlock =
      kind === 'document'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          }
        : {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        // Documenti densi di dati (es. APE/certificazioni energetiche, con
        // decine di campi tecnici da riportare) possono superare un limite
        // basso e troncare il JSON a metà — 1536 si è rivelato insufficiente
        // in pratica.
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: 'Estrai i dati da questo documento secondo le istruzioni.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(
        `Errore Claude API (${response.status}): ${errText}`,
      );
    }

    const data = (await response.json()) as AnthropicMessagesResponse;
    const textBlock = data.content.find(isTextBlock);
    if (!textBlock) {
      throw new InternalServerErrorException(
        `Nessuna risposta testuale ricevuta dal modello (stop_reason: ${data.stop_reason}, content: ${JSON.stringify(data.content)}).`,
      );
    }
    if (data.stop_reason === 'max_tokens') {
      throw new InternalServerErrorException(
        "Il documento ha troppi dati da estrarre in un'unica risposta (risposta troncata): riprova, o segnala il caso se persiste.",
      );
    }

    return parseJsonResponse(textBlock.text);
  }

  // Riparte dai campi già estratti (non dal file) e usa la ricerca web di
  // Claude per completare marca/modello con specifiche che un'etichetta da
  // sola non mostra (es. categoria prodotto, garanzia standard del
  // produttore). Chiamato solo su richiesta esplicita dell'utente: ogni
  // chiamata comporta ricerche web reali, quindi costo/tempo non
  // trascurabili — non va invocato automaticamente ad ogni estrazione.
  async searchOnline(current: EnrichmentInput): Promise<EnrichmentResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY non configurata sul backend (vedi backend/.env).',
      );
    }

    const knownFieldsText =
      current.fields.map(([k, v]) => `${k}: ${v}`).join('\n') ||
      '(nessun campo noto)';
    const prompt = `Questi sono i dati già estratti da un'etichetta o documento per un oggetto della casa:
Tipo documento: ${current.docType}
Oggetto suggerito: ${current.suggestedAssetName ?? '(sconosciuto)'}
Categoria: ${current.suggestedAssetType ?? '(sconosciuta)'}
Campi noti:
${knownFieldsText}

Usa la ricerca web per trovare informazioni aggiuntive su questo prodotto specifico, basandoti su marca e modello se presenti nei campi noti — es. categoria/tipo prodotto, scheda tecnica, garanzia standard del produttore, anno di produzione o commercializzazione. Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, di questa forma:
{
  "docType": "${current.docType}",
  "suggestedAssetType": "uno tra: ${ASSET_TYPES.join(', ')} — oppure null",
  "suggestedAssetName": "nome breve e specifico del prodotto",
  "fields": [["Etichetta campo", "Valore"], ...]
}
Nei "fields" includi TUTTI i campi già noti sopra elencati, invariati, più eventuali nuovi campi trovati con la ricerca online. Non inventare mai un valore: se la ricerca non trova nulla di affidabile su questo prodotto specifico, restituisci solo i campi già noti senza aggiungerne altri.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3072,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
        ],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new InternalServerErrorException(
        `Errore Claude API (${response.status}): ${errText}`,
      );
    }

    const data = (await response.json()) as AnthropicMessagesResponse;
    // Con la ricerca web la risposta contiene più blocchi (testo, chiamate
    // al tool, risultati) intervallati: il JSON finale è nell'ULTIMO blocco
    // di testo, non nel primo (che spesso è solo "Cerco informazioni...").
    const textBlocks = data.content.filter(isTextBlock);
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText) {
      throw new InternalServerErrorException(
        `Nessuna risposta testuale ricevuta dal modello (stop_reason: ${data.stop_reason}).`,
      );
    }

    return parseJsonResponse(lastText.text);
  }
}
