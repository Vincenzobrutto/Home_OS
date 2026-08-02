import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, FieldSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeExtractionService } from './claude-extraction.service';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ConfirmFloorPlanDto } from './dto/confirm-floor-plan.dto';
import { computeAssetStatus } from '../common/asset-status';
import { parseFlexibleDate } from '../common/parse-date';
import { computeDefaultWarrantyUntil } from '../common/warranty';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

// Stesse euristiche già validate nel prototipo (applyFieldsToAsset): il
// mapping per parole chiave è trasparente e non richiede training — vedi
// architettura §5, nota pratica.
const INSTALL_DATE_HINTS = ['installazione', 'intervento'];
const WARRANTY_HINTS = ['garanzia', 'scadenza'];
const PURCHASE_DATE_HINTS = [
  'data acquisto',
  'data ordine',
  'ordine effettuato',
  'acquistato il',
  'data fattura',
];
const SERIAL_HINTS = ['numero seriale', 'matricola', 'serial'];
const MANUFACTURER_HINTS = ['marca', 'produttore', 'manufacturer', 'brand'];
const MODEL_HINTS = ['modello', 'model'];
const SUPPLIER_HINTS = ['fornitore', 'venduto da', 'rivenditore'];

// Scoperta di prodotto in architettura §5bis: documenti diversi (fattura,
// dichiarazione di conformità, relazione...) spesso riguardano lo stesso
// intervento. Correlazione euristica, non ML: stesso tipo di asset
// suggerito è condizione necessaria, più fornitore uguale o date vicine.
const CORRELATION_DATE_WINDOW_DAYS = 30;

function extractSupplier(fields: [string, string][]): string | null {
  const match = fields.find(([label]) =>
    label.toLowerCase().includes('fornitore'),
  );
  return match ? match[1].trim().toLowerCase() : null;
}

function extractDates(fields: [string, string][]): Date[] {
  return fields
    .filter(([label]) => label.toLowerCase().includes('data'))
    .map(([, value]) => parseFlexibleDate(value))
    .filter((d): d is Date => d !== null);
}

// Parole troppo generiche per contare come "stesso oggetto" da sole (es.
// "elettrico", "casa", "impianto" compaiono in nomi di elettrodomestici
// completamente diversi) — servono almeno una parola significativa in comune.
const NAME_STOPWORDS = new Set([
  'con',
  'per',
  'del',
  'della',
  'dello',
  'nel',
  'nella',
  'casa',
  'impianto',
]);

// "elettrodomestico"/"clima" ecc. sono categorie ampie che raggruppano
// oggetti fisici diversi in una stessa casa (un forno e un frigo sono
// entrambi "elettrodomestico") — il tipo da solo non basta a dire che due
// documenti riguardano lo STESSO oggetto, serve anche che il nome
// suggerito si somigli (bug osservato: forno + frigo dello stesso
// fornitore scambiati per lo stesso intervento e fusi in un unico asset).
function haveSimilarSuggestedName(
  nameA: string | null,
  nameB: string | null,
): boolean {
  if (!nameA || !nameB) return false;
  const wordsOf = (name: string) =>
    new Set(
      name
        .toLowerCase()
        .split(/[^a-zà-ÿ0-9]+/)
        .filter((w) => w.length > 2 && !NAME_STOPWORDS.has(w)),
    );
  const wordsA = wordsOf(nameA);
  const wordsB = wordsOf(nameB);
  for (const w of wordsA) {
    if (wordsB.has(w)) return true;
  }
  return false;
}

function areDocumentsCorrelated(
  a: {
    suggestedAssetType: string | null;
    suggestedAssetName: string | null;
    fields: [string, string][];
  },
  b: {
    suggestedAssetType: string | null;
    suggestedAssetName: string | null;
    fields: [string, string][];
  },
): boolean {
  if (!a.suggestedAssetType || a.suggestedAssetType !== b.suggestedAssetType) {
    return false;
  }
  if (!haveSimilarSuggestedName(a.suggestedAssetName, b.suggestedAssetName)) {
    return false;
  }
  const supplierA = extractSupplier(a.fields);
  const supplierB = extractSupplier(b.fields);
  if (supplierA && supplierB && supplierA === supplierB) return true;

  const datesA = extractDates(a.fields);
  const datesB = extractDates(b.fields);
  const windowMs = CORRELATION_DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return datesA.some((da) =>
    datesB.some((db) => Math.abs(da.getTime() - db.getTime()) <= windowMs),
  );
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeExtractionService,
  ) {}

  async upload(houseId: string, file: Express.Multer.File) {
    await this.ensureHouseExists(houseId);
    const fileUrl = this.storeFile(file);

    return this.prisma.document.create({
      data: {
        houseId,
        fileUrl,
        originalFilename: file.originalname,
        status: DocumentStatus.PENDING,
      },
    });
  }

  // Carica un file direttamente come sfondo di riferimento della
  // planimetria, senza passare dalla pipeline AI (analyze/confirm): con il
  // disegno manuale delle stanze, lo sfondo serve solo da traccia visiva,
  // non deve per forza essere analizzato — permette anche di ricaricarlo
  // subito se un file precedente (es. un PDF) non si riesce a visualizzare.
  async uploadFloorPlanBackground(houseId: string, file: Express.Multer.File) {
    await this.ensureHouseExists(houseId);
    const fileUrl = this.storeFile(file);

    return this.prisma.document.create({
      data: {
        houseId,
        fileUrl,
        originalFilename: file.originalname,
        docType: 'Planimetria',
        status: DocumentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  }

  private storeFile(file: Express.Multer.File): string {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const storedName = `${randomUUID()}-${file.originalname}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), file.buffer);
    return `uploads/${storedName}`;
  }

  async listForHouse(houseId: string) {
    await this.ensureHouseExists(houseId);
    const documents = await this.prisma.document.findMany({
      where: {
        houseId,
        // Scartato dall'utente (vedi ignoreDocument): resta in DB solo per
        // non riproporlo, non deve comparire in nessuna vista.
        ignoredAt: null,
        // I candidati Gmail/Drive non ancora importati vivono solo nella
        // relativa vista di revisione (vedi gmail.service.ts, drive.service.ts)
        // finché l'utente non li approva uno a uno — non devono comparire
        // nell'Inbox normale.
        NOT: { source: { in: ['GMAIL', 'DRIVE'] }, importedAt: null },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Calcolata al volo, non salvata: evita che due documenti carichi in
    // momenti diversi restino correlati "a metà" (solo sul secondo, non sul
    // primo) come accadrebbe salvando il risultato al momento dell'analisi.
    const analyzable = documents
      .map((d) => ({ doc: d, fields: this.assetDocumentFieldsOf(d) }))
      .filter(
        (
          x,
        ): x is {
          doc: (typeof documents)[number];
          fields: NonNullable<ReturnType<typeof this.assetDocumentFieldsOf>>;
        } => x.doc.status === DocumentStatus.ANALYZED && x.fields !== null,
      );

    return documents.map((doc) => {
      if (doc.status !== DocumentStatus.ANALYZED) return doc;
      const self = analyzable.find((x) => x.doc.id === doc.id);
      if (!self) return doc;
      const relatedDocumentIds = analyzable
        .filter(
          (other) =>
            other.doc.id !== doc.id &&
            areDocumentsCorrelated(self.fields, other.fields),
        )
        .map((other) => other.doc.id);
      return { ...doc, relatedDocumentIds };
    });
  }

  // --- Candidati Gmail (vedi gmail.service.ts) --------------------------

  async findGmailCandidates(houseId: string) {
    await this.ensureHouseExists(houseId);
    return this.prisma.document.findMany({
      where: { houseId, source: 'GMAIL', importedAt: null, ignoredAt: null },
      orderBy: { emailDate: 'desc' },
    });
  }

  // Il file arriva già scaricato dall'allegato Gmail: a differenza di
  // upload(), qui creazione e analisi sono un solo passo, perché il
  // candidato deve comparire nella vista di revisione già pronto da
  // approvare — non deve passare per lo stato PENDING dell'Inbox.
  // Se Claude giudica il documento non pertinente alla casa (isHomeRelated
  // false), il record viene comunque creato ma con ignoredAt già valorizzato:
  // resta invisibile nella revisione (findGmailCandidates filtra ignoredAt
  // null) ma il gmailMessageId risulta "già visto" — senza questo, lo stesso
  // messaggio verrebbe riclassificato (e ripagato a Claude) a ogni scansione
  // successiva, perché gmailMessageIdsAlreadySeen legge solo i Document
  // effettivamente salvati.
  async createGmailCandidate(params: {
    houseId: string;
    buffer: Buffer;
    filename: string;
    gmailMessageId: string;
    emailFrom: string;
    emailSubject: string;
    emailDate: Date;
  }) {
    const { isHomeRelated, data } = await this.classifyBuffer(
      params.buffer,
      params.filename,
      params.houseId,
    );
    const fileUrl = this.storeFile({
      buffer: params.buffer,
      originalname: params.filename,
    } as Express.Multer.File);

    return this.prisma.document.create({
      data: {
        houseId: params.houseId,
        fileUrl,
        originalFilename: params.filename,
        source: 'GMAIL',
        gmailMessageId: params.gmailMessageId,
        emailFrom: params.emailFrom,
        emailSubject: params.emailSubject,
        emailDate: params.emailDate,
        ignoredAt: isHomeRelated ? null : new Date(),
        ...data,
      },
    });
  }

  async gmailMessageIdsAlreadySeen(houseId: string): Promise<Set<string>> {
    const rows = await this.prisma.document.findMany({
      where: { houseId, source: 'GMAIL', gmailMessageId: { not: null } },
      select: { gmailMessageId: true },
    });
    return new Set(rows.map((r) => r.gmailMessageId!));
  }

  // --- Candidati Drive (vedi drive.service.ts) ---------------------------

  async findDriveCandidates(houseId: string) {
    await this.ensureHouseExists(houseId);
    return this.prisma.document.findMany({
      where: { houseId, source: 'DRIVE', importedAt: null, ignoredAt: null },
      orderBy: { driveModifiedAt: 'desc' },
    });
  }

  // Stessa logica di createGmailCandidate: classifica, scarta in silenzio
  // (ignoredAt subito valorizzato) se non pertinente alla casa, altrimenti
  // crea il candidato pronto per la revisione.
  async createDriveCandidate(params: {
    houseId: string;
    buffer: Buffer;
    filename: string;
    driveFileId: string;
    driveModifiedAt: Date;
  }) {
    const { isHomeRelated, data } = await this.classifyBuffer(
      params.buffer,
      params.filename,
      params.houseId,
    );
    const fileUrl = this.storeFile({
      buffer: params.buffer,
      originalname: params.filename,
    } as Express.Multer.File);

    return this.prisma.document.create({
      data: {
        houseId: params.houseId,
        fileUrl,
        originalFilename: params.filename,
        source: 'DRIVE',
        driveFileId: params.driveFileId,
        driveModifiedAt: params.driveModifiedAt,
        ignoredAt: isHomeRelated ? null : new Date(),
        ...data,
      },
    });
  }

  async driveFileIdsAlreadySeen(houseId: string): Promise<Set<string>> {
    const rows = await this.prisma.document.findMany({
      where: { houseId, source: 'DRIVE', driveFileId: { not: null } },
      select: { driveFileId: true },
    });
    return new Set(rows.map((r) => r.driveFileId!));
  }

  // --- Import candidati (Gmail o Drive) -----------------------------------

  async importCandidate(id: string) {
    const doc = await this.getDocumentOrThrow(id);
    if ((doc.source !== 'GMAIL' && doc.source !== 'DRIVE') || doc.importedAt) {
      throw new BadRequestException(
        `Document ${id} non è un candidato in attesa`,
      );
    }
    return this.prisma.document.update({
      where: { id },
      data: { importedAt: new Date() },
    });
  }

  // Scarta un documento non ancora confermato — sia un candidato Gmail/Drive
  // in fase di revisione, sia un documento già in Inbox (caricato a mano o
  // già importato) di cui l'utente si accorge non essere riconducibile a
  // nessun asset della casa. Una volta CONFIRMED va rimosso dalla scheda
  // asset (Elimina), non scartato da qui: sono azioni con conseguenze diverse.
  async ignoreDocument(id: string) {
    const doc = await this.getDocumentOrThrow(id);
    if (doc.status === DocumentStatus.CONFIRMED) {
      throw new BadRequestException(
        `Document ${id} è già confermato — rimuovilo dalla scheda asset invece di scartarlo.`,
      );
    }
    return this.prisma.document.update({
      where: { id },
      data: { ignoredAt: new Date() },
    });
  }

  // Arricchimento su richiesta esplicita dell'utente (pulsante "Cerca
  // online" in Inbox, dopo l'analisi AI di una foto o di un documento): a
  // differenza di analyze(), non riparte dal file ma dai campi già
  // estratti, e usa la ricerca web di Claude per completarli — mai
  // sovrascrive un campo già noto, solo ne aggiunge di nuovi (stessa logica
  // "riempi solo i vuoti" del resto della pipeline).
  async searchOnline(id: string) {
    const doc = await this.getDocumentOrThrow(id);
    if (doc.status !== DocumentStatus.ANALYZED) {
      throw new BadRequestException(
        `Document ${id} non è stato ancora analizzato: analizzalo prima di cercare informazioni online.`,
      );
    }
    const current = doc.extractedFields as unknown as {
      kind: string;
      docType: string;
      fields: [string, string][];
      suggestedAssetType: string | null;
      suggestedAssetId: string | null;
      suggestedAssetName: string | null;
      quantity: number;
    } | null;
    if (!current || current.kind !== 'asset_document') {
      throw new BadRequestException(
        `Document ${id} non è un documento di tipo asset.`,
      );
    }

    const enriched = await this.claude.searchOnline({
      docType: current.docType,
      suggestedAssetType: current.suggestedAssetType,
      suggestedAssetName: current.suggestedAssetName,
      fields: current.fields,
    });

    const existingLabels = new Set(
      current.fields.map(([label]) => label.trim().toLowerCase()),
    );
    const newFields = enriched.fields.filter(
      ([label]) => !existingLabels.has(label.trim().toLowerCase()),
    );

    const updatedExtractedFields = {
      ...current,
      docType: current.docType || enriched.docType,
      suggestedAssetType:
        current.suggestedAssetType ?? enriched.suggestedAssetType,
      suggestedAssetName:
        current.suggestedAssetName ?? enriched.suggestedAssetName,
      fields: [...current.fields, ...newFields],
    };

    return this.prisma.document.update({
      where: { id },
      data: { extractedFields: updatedExtractedFields },
    });
  }

  // Riclassifica un documento già confermato su un asset come "documento
  // casa" (es. l'utente si accorge dopo il fatto che un documento di un
  // impianto senza ambiente specifico, come "Impianto elettrico", riguarda
  // in realtà la casa nel suo insieme) — scollega dall'asset e sparisce
  // dalla sua scheda, non compare in nessun'altra scheda: da qui in poi vive
  // solo in "Documenti casa". Diverso da confirm({linkToHouse}) che parte da
  // un documento non ancora confermato.
  async moveToHouse(id: string) {
    const doc = await this.getDocumentOrThrow(id);
    if (doc.status !== DocumentStatus.CONFIRMED) {
      throw new BadRequestException(
        `Document ${id} non è confermato: non è collegato a nessun asset da cui spostarlo.`,
      );
    }
    if (!doc.assetId) {
      throw new BadRequestException(`Document ${id} è già un documento casa.`);
    }
    const previousAssetId = doc.assetId;
    const updated = await this.prisma.document.update({
      where: { id },
      data: { assetId: null, houseLevel: true },
    });
    await this.recomputeAssetStatus(previousAssetId);
    return updated;
  }

  async getFile(id: string) {
    const document = await this.getDocumentOrThrow(id);
    const buffer = fs.readFileSync(path.join(process.cwd(), document.fileUrl));
    const ext = document.originalFilename.toLowerCase().split('.').pop() ?? '';
    return {
      buffer,
      mediaType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
      filename: document.originalFilename,
    };
  }

  async analyze(documentId: string) {
    const document = await this.getDocumentOrThrow(documentId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ANALYZING },
    });

    // Se la classificazione fallisce (es. errore Claude API, risposta non
    // valida) il documento non deve restare bloccato su ANALYZING per
    // sempre: torna a PENDING così "Analizza con AI" ricompare e l'utente
    // può riprovare, invece di un documento orfano senza più azioni possibili.
    try {
      const fileBuffer = fs.readFileSync(
        path.join(process.cwd(), document.fileUrl),
      );
      // isHomeRelated non è rilevante qui: l'utente ha già scelto di caricare
      // questo file in Inbox, quindi va sempre mostrato per la conferma.
      const { data } = await this.classifyBuffer(
        fileBuffer,
        document.originalFilename,
        document.houseId,
      );

      return await this.prisma.document.update({
        where: { id: documentId },
        data,
      });
    } catch (err) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PENDING },
      });
      throw err;
    }
  }

  // Estratta da analyze() così la pipeline di classificazione (chiamata
  // Claude + matching asset per tipo) si può riusare identica per i
  // candidati Gmail (gmail.service.ts), che vengono creati già classificati
  // invece di passare per lo stato PENDING → analyze separato.
  //
  // "data" ha volutamente un'interfaccia semplice con valori scalari (non
  // Prisma.DocumentUpdateInput): quel tipo usa i wrapper "Field Update
  // Operations" di Prisma, che non sono assegnabili a DocumentCreateInput
  // quando lo spread finisce dentro createGmailCandidate().
  async classifyBuffer(
    fileBuffer: Buffer,
    filename: string,
    houseId: string,
  ): Promise<{
    isHomeRelated: boolean;
    data: {
      status: DocumentStatus;
      docType: string;
      aiConfidence?: number;
      extractedFields: Prisma.InputJsonValue;
    };
  }> {
    const result = await this.claude.extract(fileBuffer, filename);

    if (result.kind === 'floor_plan') {
      return {
        isHomeRelated: true,
        data: {
          status: DocumentStatus.ANALYZED,
          docType: 'Planimetria',
          extractedFields: {
            kind: 'floor_plan',
            rooms: result.rooms,
          } as unknown as Prisma.InputJsonValue,
        },
      };
    }

    // Matching per tipo + nome (architettura §5 punto 4): il tipo da solo
    // non basta a scegliere QUALE asset suggerire — "elettrodomestico" da
    // solo raggruppa forno, frigo, microonde, friggitrice ad aria ecc. nella
    // stessa casa, quindi prendere semplicemente il primo trovato finiva
    // per suggerire sempre lo stesso asset (es. sempre "Piano cottura a
    // induzione") a qualunque documento di quel tipo, anche palesemente
    // sbagliato. Suggerisce solo un asset il cui nome condivide almeno una
    // parola significativa col nome estratto dal documento — altrimenti
    // niente (proposta vuota, l'utente sceglie "Crea nuovo asset"), non un
    // suggerimento a caso.
    const suggestedType = result.suggestedAssetType?.toUpperCase() ?? null;
    let suggestedAsset: { id: string; name: string } | null = null;
    if (suggestedType) {
      const candidates = await this.prisma.asset.findMany({
        where: { houseId, type: suggestedType as never, dismissedAt: null },
        select: { id: true, name: true },
      });
      suggestedAsset =
        candidates.find((c) =>
          haveSimilarSuggestedName(c.name, result.suggestedAssetName ?? null),
        ) ?? null;
    }

    return {
      isHomeRelated: result.isHomeRelated,
      data: {
        status: DocumentStatus.ANALYZED,
        docType: result.docType,
        aiConfidence: result.confidence,
        extractedFields: {
          kind: 'asset_document',
          docType: result.docType,
          fields: result.fields,
          suggestedAssetType: suggestedType,
          suggestedAssetId: suggestedAsset?.id ?? null,
          suggestedAssetName: result.suggestedAssetName ?? null,
          quantity:
            result.quantity && result.quantity > 1 ? result.quantity : 1,
        },
      },
    };
  }

  async confirm(documentId: string, dto: ConfirmDocumentDto) {
    const document = await this.getDocumentOrThrow(documentId);
    if (this.kindOf(document) === 'floor_plan') {
      throw new BadRequestException(
        'Questo documento è stato riconosciuto come planimetria: usa /documents/:id/confirm-floorplan.',
      );
    }
    if (!dto.assetId && !dto.createAssetType && !dto.linkToHouse) {
      throw new BadRequestException(
        'Serve assetId (asset esistente), createAssetType (crea un asset nuovo) oppure linkToHouse (collega alla casa, non a un asset).',
      );
    }
    if (dto.linkToHouse && (dto.assetId || dto.createAssetType)) {
      throw new BadRequestException(
        'linkToHouse non può essere combinato con assetId o createAssetType.',
      );
    }

    if (dto.linkToHouse) {
      return this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.CONFIRMED,
          confirmedAt: new Date(),
          houseLevel: true,
        },
      });
    }

    let assetId = dto.assetId;
    // Asset creati in più copie (documento con quantity > 1, es. "n.3
    // climatizzatori"): il Document ha un solo assetId (schema attuale, vedi
    // schema.prisma), quindi si collega solo al primo — gli altri ricevono
    // comunque gli stessi dati di partenza e un evento in cronologia che
    // referenzia il documento, così restano tracciabili anche se non
    // compaiono nella sezione "Documenti" dedicata di quell'asset.
    let siblingAssetIds: string[] = [];
    if (assetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });
      if (!asset || asset.houseId !== document.houseId) {
        throw new BadRequestException(
          `Asset ${assetId} non appartiene alla casa ${document.houseId}`,
        );
      }
    } else if (dto.createAssetType) {
      if (dto.roomId) {
        const room = await this.prisma.room.findUnique({
          where: { id: dto.roomId },
        });
        if (!room || room.houseId !== document.houseId) {
          throw new BadRequestException(
            `Room ${dto.roomId} non appartiene alla casa ${document.houseId}`,
          );
        }
      }

      const quantity = dto.quantity && dto.quantity > 1 ? dto.quantity : 1;
      const baseName =
        dto.assetName?.trim() || this.labelForAssetType(dto.createAssetType);

      // Sequenziale (non Promise.all): nextAssetCode legge il massimo
      // codice esistente ad ogni chiamata, un'esecuzione in parallelo
      // genererebbe lo stesso codice più volte.
      const createdIds: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const created = await this.prisma.asset.create({
          data: {
            houseId: document.houseId,
            roomId: dto.roomId ?? null,
            type: dto.createAssetType,
            name: quantity > 1 ? `${baseName} ${i + 1}` : baseName,
            code: await this.nextAssetCode(),
            status: computeAssetStatus({
              warrantyUntil: null,
              documentsCount: 0,
            }),
          },
        });
        createdIds.push(created.id);
      }
      assetId = createdIds[0];
      siblingAssetIds = createdIds.slice(1);
    }

    // "Riempi solo i vuoti": ogni documento collegato (fondativo o
    // successivo) può completare un campo ancora mancante, ma non
    // sovrascrive mai un valore già presente — vedi applyFieldsToAsset.
    // Così una fattura di riparazione arrivata dopo non può cancellare i
    // dati della fattura d'acquisto originale, ma può comunque aggiungere
    // (es.) il numero seriale se all'epoca non era ancora noto. Ogni unità
    // creata insieme parte dagli stessi dati; l'utente li corregge poi
    // individualmente se le unità differiscono (es. seriali diversi).
    const fields = this.extractedFieldsOf(document);
    const fieldsApplied =
      dto.applyFields &&
      fields.length > 0 &&
      (await this.applyFieldsToAsset(assetId!, fields));
    for (const siblingId of siblingAssetIds) {
      if (dto.applyFields && fields.length > 0) {
        await this.applyFieldsToAsset(siblingId, fields);
      }
      await this.prisma.assetTimelineEvent.create({
        data: {
          assetId: siblingId,
          eventDate: new Date(),
          eventType: 'Creato da documento condiviso',
          detail: document.originalFilename,
          documentId,
        },
      });
      await this.recomputeAssetStatus(siblingId);
    }

    const [, , updatedDocument] = await this.prisma.$transaction([
      this.prisma.document.update({
        where: { id: documentId },
        data: {
          assetId,
          status: DocumentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      }),
      this.prisma.assetTimelineEvent.create({
        data: {
          assetId: assetId!,
          eventDate: new Date(),
          eventType: fieldsApplied
            ? 'Documento collegato e dati aggiornati'
            : 'Documento collegato',
          detail: document.originalFilename,
          documentId,
        },
      }),
      this.prisma.document.findUnique({ where: { id: documentId } }),
    ]);

    await this.recomputeAssetStatus(assetId!);
    return updatedDocument;
  }

  async confirmFloorPlan(documentId: string, dto: ConfirmFloorPlanDto) {
    const document = await this.getDocumentOrThrow(documentId);
    if (this.kindOf(document) !== 'floor_plan') {
      throw new BadRequestException(
        'Questo documento non è stato riconosciuto come planimetria.',
      );
    }

    for (const decision of dto.decisions) {
      if (decision.action === 'skip') continue;

      const geometry = {
        x: decision.x,
        y: decision.y,
        width: decision.width,
        height: decision.height,
      };

      if (decision.action === 'update') {
        if (!decision.roomId) {
          throw new BadRequestException('roomId richiesto per action "update"');
        }
        const room = await this.prisma.room.findUnique({
          where: { id: decision.roomId },
        });
        if (!room || room.houseId !== document.houseId) {
          throw new BadRequestException(
            `Room ${decision.roomId} non appartiene alla casa ${document.houseId}`,
          );
        }
        await this.prisma.room.update({
          where: { id: decision.roomId },
          data: { planGeometry: geometry },
        });
      } else {
        if (!decision.type || !decision.name) {
          throw new BadRequestException(
            'type e name richiesti per action "create"',
          );
        }
        const count = await this.prisma.room.count({
          where: { houseId: document.houseId },
        });
        await this.prisma.room.create({
          data: {
            houseId: document.houseId,
            type: decision.type,
            name: decision.name,
            code: `AMB-${String(count + 1).padStart(3, '0')}`,
            planGeometry: geometry,
          },
        });
      }
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.CONFIRMED, confirmedAt: new Date() },
    });
  }

  private kindOf(document: { extractedFields: unknown }): string | null {
    const parsed = document.extractedFields as { kind?: string } | null;
    return parsed?.kind ?? null;
  }

  private assetDocumentFieldsOf(document: { extractedFields: unknown }): {
    suggestedAssetType: string | null;
    suggestedAssetName: string | null;
    fields: [string, string][];
  } | null {
    const parsed = document.extractedFields as {
      kind?: string;
      suggestedAssetType?: string | null;
      suggestedAssetName?: string | null;
      fields?: [string, string][];
    } | null;
    if (!parsed || parsed.kind !== 'asset_document') return null;
    return {
      suggestedAssetType: parsed.suggestedAssetType ?? null,
      suggestedAssetName: parsed.suggestedAssetName ?? null,
      fields: parsed.fields ?? [],
    };
  }

  // "Riempi solo i vuoti": ogni campo strutturato viene impostato solo se
  // l'asset non ne ha già uno, e ogni custom field viene creato solo se
  // l'etichetta non esiste già — mai un aggiornamento che sovrascriva un
  // valore presente. Un documento arrivato dopo può così completare dati
  // mancanti (es. il seriale non ancora noto al momento dell'acquisto) ma
  // non può mai corrompere quelli già confermati da un documento precedente.
  // Ritorna true solo se qualcosa è stato effettivamente riempito, per la
  // cronologia (vedi confirm()).
  private async applyFieldsToAsset(
    assetId: string,
    fields: [string, string][],
  ): Promise<boolean> {
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
    });
    const existingFields = await this.prisma.assetCustomField.findMany({
      where: { assetId },
    });
    const patch: {
      installedAt?: Date;
      warrantyUntil?: Date;
      purchasedAt?: Date;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      supplier?: string;
    } = {};
    let customFieldCreated = false;

    for (const [label, value] of fields) {
      const lower = label.toLowerCase();
      if (lower === 'tipo documento') continue;
      const trimmedValue = value.trim();
      if (!trimmedValue) continue;

      // Ogni categoria qui sotto va sempre "consumata" (mai un fallback a
      // custom field) quando l'etichetta corrisponde, anche se il campo
      // strutturato è già valorizzato e quindi non viene toccato — altrimenti
      // un documento successivo non correlato (es. il frigo dopo il forno)
      // finirebbe per creare un custom field duplicato chiamato "Marca" o
      // "Modello" con il dato dell'oggetto sbagliato (bug osservato in
      // pratica), invece di essere semplicemente ignorato su quel campo.
      if (INSTALL_DATE_HINTS.some((h) => lower.includes(h))) {
        if (!asset.installedAt && !patch.installedAt) {
          const parsed = parseFlexibleDate(value);
          if (parsed) patch.installedAt = parsed;
        }
        continue;
      }
      if (WARRANTY_HINTS.some((h) => lower.includes(h))) {
        if (!asset.warrantyUntil && !patch.warrantyUntil) {
          const parsed = parseFlexibleDate(value);
          if (parsed) patch.warrantyUntil = parsed;
        }
        continue;
      }
      if (PURCHASE_DATE_HINTS.some((h) => lower.includes(h))) {
        if (!asset.purchasedAt && !patch.purchasedAt) {
          const parsed = parseFlexibleDate(value);
          if (parsed) patch.purchasedAt = parsed;
        }
        continue;
      }
      if (SERIAL_HINTS.some((h) => lower.includes(h))) {
        if (!asset.serialNumber && !patch.serialNumber)
          patch.serialNumber = trimmedValue;
        continue;
      }
      if (MANUFACTURER_HINTS.some((h) => lower.includes(h))) {
        if (!asset.manufacturer && !patch.manufacturer)
          patch.manufacturer = trimmedValue;
        continue;
      }
      if (MODEL_HINTS.some((h) => lower.includes(h))) {
        if (!asset.model && !patch.model) patch.model = trimmedValue;
        continue;
      }
      if (SUPPLIER_HINTS.some((h) => lower.includes(h))) {
        if (!asset.supplier && !patch.supplier) patch.supplier = trimmedValue;
        continue;
      }

      const existing = existingFields.find(
        (f) => f.label.toLowerCase() === lower,
      );
      if (!existing) {
        await this.prisma.assetCustomField.create({
          data: { assetId, label, value, source: FieldSource.AI_EXTRACTED },
        });
        customFieldCreated = true;
      }
    }

    // Nessun documento ha mai indicato una data di garanzia esplicita, ma è
    // nota la data di acquisto: applica la regola di default (24 mesi),
    // sempre modificabile a mano dopo per prodotti con garanzia più lunga o
    // più corta — vedi common/warranty.ts.
    const effectivePurchasedAt = patch.purchasedAt ?? asset.purchasedAt;
    if (!asset.warrantyUntil && !patch.warrantyUntil && effectivePurchasedAt) {
      patch.warrantyUntil = computeDefaultWarrantyUntil(effectivePurchasedAt);
    }

    if (Object.keys(patch).length > 0) {
      await this.prisma.asset.update({ where: { id: assetId }, data: patch });
    }
    return Object.keys(patch).length > 0 || customFieldCreated;
  }

  private async recomputeAssetStatus(assetId: string) {
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { _count: { select: { documents: true } } },
    });
    const status = computeAssetStatus({
      warrantyUntil: asset.warrantyUntil,
      documentsCount: asset._count.documents,
    });
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status },
    });
  }

  private extractedFieldsOf(document: {
    extractedFields: unknown;
  }): [string, string][] {
    const parsed = document.extractedFields as {
      fields?: [string, string][];
    } | null;
    return parsed?.fields ?? [];
  }

  // "code" è unico globalmente (non per casa, vedi schema.prisma), quindi il
  // prossimo numero si calcola dal massimo esistente su tutta la tabella —
  // mai da un conteggio: un asset eliminato lascia un "buco" nella
  // numerazione che un conteggio rigenererebbe, causando un conflitto di
  // unicità sul primo codice riusato (bug osservato in pratica, stessa
  // logica duplicata in assets.service.ts).
  private async nextAssetCode(): Promise<string> {
    const last = await this.prisma.asset.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNumber = last ? parseInt(last.code.replace('AST-', ''), 10) : 0;
    return `AST-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  private labelForAssetType(type: string): string {
    const labels: Record<string, string> = {
      CALDAIA: 'Caldaia',
      ELETTRICO: 'Impianto elettrico',
      IDRAULICO: 'Impianto idraulico',
      FOTOVOLTAICO: 'Impianto fotovoltaico',
      CLIMA: 'Climatizzazione',
      TETTO: 'Tetto',
      FINESTRE: 'Finestre',
      ELETTRODOMESTICO: 'Elettrodomestico',
    };
    return labels[type] ?? type;
  }

  private async getDocumentOrThrow(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document ${id} non trovato`);
    }
    return document;
  }

  private async ensureHouseExists(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new NotFoundException(`House ${houseId} non trovata`);
    }
  }
}
