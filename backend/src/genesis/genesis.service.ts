import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetType,
  GenesisStatus,
  GenesisStep,
  RoomType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { AssetsService } from '../assets/assets.service';
import { SaveHouseInfoDto } from './dto/save-house-info.dto';
import { StartScanDto } from './dto/start-scan.dto';
import {
  GENESIS_DEMO_ASSETS,
  GENESIS_DEMO_ROOMS,
} from './scan/genesis-demo-dataset';
import { ConfirmObservationsDto } from './dto/confirm-observations.dto';
import { HOUSE_SCAN_PROVIDER } from './scan/house-scan-provider.token';
import type { HouseScanProvider } from './scan/house-scan-provider.interface';
import {
  computeHomeScore,
  type HomeScoreAssetInput,
  type ScoreResult,
} from '../common/home-score';
import {
  evaluateHomeDetectiveRules,
  type HomeDetectiveAssetInput,
  type IssueDraft,
} from '../common/home-detective';
import {
  findPossibleDuplicate,
  type DuplicateCandidate,
} from './genesis-duplicate';

// Orchestratore del percorso Genesis: non duplica logica di creazione già
// esistente in RoomsService/AssetsService (nextAssetCode, calcolo warranty,
// codice AMB-###...), la riusa passando i nuovi campi confidence/source/
// confirmed — vedi create-room.dto.ts e create-asset.dto.ts.
@Injectable()
export class GenesisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
    private readonly assetsService: AssetsService,
    @Inject(HOUSE_SCAN_PROVIDER)
    private readonly scanProvider: HouseScanProvider,
  ) {}

  async start(houseId: string) {
    const house = await this.ensureHouseExists(houseId);
    if (house.genesisStatus === GenesisStatus.NOT_STARTED) {
      await this.prisma.house.update({
        where: { id: houseId },
        data: {
          genesisStatus: GenesisStatus.IN_PROGRESS,
          genesisStep: GenesisStep.HOUSE_INFO,
        },
      });
      await this.addTimelineEvent(houseId, {
        type: 'genesis_started',
        title: 'Percorso Genesis avviato',
      });
    }
    return this.getState(houseId);
  }

  async saveHouseInfo(houseId: string, dto: SaveHouseInfoDto) {
    await this.ensureHouseExists(houseId);
    await this.prisma.house.update({
      where: { id: houseId },
      data: { ...dto, genesisStep: GenesisStep.DOCUMENTS },
    });
    return this.getState(houseId);
  }

  async startScan(houseId: string, dto: StartScanDto) {
    await this.ensureHouseExists(houseId);
    const session = await this.scanProvider.startScan({
      houseId,
      type: dto.type,
      roomNames: dto.roomNames,
      assetNames: dto.assetNames,
    });
    await this.prisma.house.update({
      where: { id: houseId },
      data: {
        genesisStatus: GenesisStatus.PROCESSING,
        genesisStep: GenesisStep.REVIEW,
      },
    });
    await this.addTimelineEvent(houseId, {
      type: 'scan_completed',
      title: 'Scansione guidata completata',
      description: `${session.type}, sessione ${session.id}`,
    });
    return session;
  }

  getDemoCatalog() {
    return { rooms: GENESIS_DEMO_ROOMS, assets: GENESIS_DEMO_ASSETS };
  }

  async saveStep(houseId: string, requestedStep: GenesisStep) {
    const house = await this.ensureHouseExists(houseId);
    const steps = Object.values(GenesisStep);
    const currentIndex = steps.indexOf(house.genesisStep);
    const requestedIndex = steps.indexOf(requestedStep);

    // Il client può tornare indietro liberamente, ma avanzare solo di uno
    // step. Le transizioni che producono dati (house info, scan, complete)
    // vengono invece persistite dai rispettivi comandi di dominio.
    if (requestedIndex > currentIndex + 1) {
      throw new BadRequestException('Cannot skip Genesis steps');
    }

    return this.prisma.house.update({
      where: { id: houseId },
      data: { genesisStep: requestedStep },
    });
  }

  async resume(houseId: string) {
    const house = await this.ensureHouseExists(houseId);
    if (house.genesisStep !== GenesisStep.REVIEW) {
      return { step: house.genesisStep, scanSession: null, observations: [] };
    }

    const scanSession = await this.prisma.scanSession.findFirst({
      where: { houseId },
      orderBy: { startedAt: 'desc' },
    });
    if (!scanSession) {
      const updated = await this.prisma.house.update({
        where: { id: houseId },
        data: { genesisStep: GenesisStep.SCAN },
      });
      return { step: updated.genesisStep, scanSession: null, observations: [] };
    }

    const observations = await this.getScanResults(houseId, scanSession.id);
    return { step: house.genesisStep, scanSession, observations };
  }

  // Arricchisce ogni Observation con un eventuale "possibleDuplicate": un
  // Room/Asset già confermato in casa con nome simile e stesso tipo — solo
  // per avvisare l'utente nello step di revisione (badge + default "Scarta"
  // lato frontend), mai per fondere automaticamente. Vedi genesis-duplicate.ts.
  async getScanResults(houseId: string, scanSessionId: string) {
    await this.ensureScanSessionBelongsToHouse(scanSessionId, houseId);
    const observations = await this.scanProvider.getResults(scanSessionId);

    const [existingRooms, existingAssets] = await Promise.all([
      this.prisma.room.findMany({ where: { houseId, confirmed: true } }),
      this.prisma.asset.findMany({
        where: { houseId, confirmed: true, dismissedAt: null },
      }),
    ]);

    return observations.map((o) => {
      let candidates: DuplicateCandidate[];
      if (o.entityType === 'ROOM') {
        candidates = existingRooms
          .filter((r) => r.type === o.proposedCategory)
          .map((r) => ({ id: r.id, name: r.name, code: r.code }));
      } else {
        candidates = existingAssets
          .filter((a) => a.type === o.proposedCategory)
          .map((a) => ({ id: a.id, name: a.name, code: a.code }));
      }
      return {
        ...o,
        possibleDuplicate: findPossibleDuplicate(o.proposedName, candidates),
      };
    });
  }

  // Converte le Observation confermate/modificate in Room/Asset reali,
  // riusando RoomsService/AssetsService. Le stanze vanno elaborate prima
  // degli asset nella stessa chiamata: un asset può referenziare (via
  // payload.roomName) una stanza confermata nello stesso batch, non ancora
  // in DB al momento in cui inizia la richiesta.
  async confirmObservations(
    houseId: string,
    scanSessionId: string,
    dto: ConfirmObservationsDto,
  ) {
    await this.ensureScanSessionBelongsToHouse(scanSessionId, houseId);

    const observations = await this.prisma.observation.findMany({
      where: { scanSessionId },
    });
    const observationById = new Map(observations.map((o) => [o.id, o]));

    const roomItems = dto.items.filter((item) => {
      const obs = observationById.get(item.observationId);
      return obs && obs.entityType === 'ROOM';
    });
    const assetItems = dto.items.filter((item) => {
      const obs = observationById.get(item.observationId);
      return obs && obs.entityType === 'ASSET';
    });

    // proposedName della Room -> id reale (appena creato in questo batch, O
    // di una Room già esistente trovata simile quando l'utente ha scartato
    // il duplicato proposto — vedi sotto) a cui gli Asset osservati nello
    // stesso giro devono collegarsi.
    const roomIdByProposedName = new Map<string, string>();
    const existingConfirmedRooms = await this.prisma.room.findMany({
      where: { houseId, confirmed: true },
    });

    for (const item of roomItems) {
      const obs = observationById.get(item.observationId);
      if (!obs) {
        throw new NotFoundException(
          `Observation ${item.observationId} non trovata`,
        );
      }
      if (item.action === 'reject') {
        await this.prisma.observation.update({
          where: { id: obs.id },
          data: { status: 'REJECTED' },
        });
        // Scartata perché duplicata di una Room reale già esistente (non
        // per un altro motivo): gli Asset che la referenziano per nome nello
        // stesso batch devono comunque collegarsi alla Room vera, non finire
        // orfani come "impianto di casa" solo perché quella proposta da
        // Genesis non è stata creata.
        const duplicate = findPossibleDuplicate(
          obs.proposedName,
          existingConfirmedRooms.filter((r) => r.type === obs.proposedCategory),
        );
        if (duplicate) {
          roomIdByProposedName.set(obs.proposedName, duplicate.id);
        }
        continue;
      }

      const roomType = this.resolveEnumValue(
        RoomType,
        item.type ?? obs.proposedCategory ?? undefined,
        'tipo ambiente',
      );
      const room = await this.roomsService.create(houseId, {
        type: roomType,
        name: item.name ?? obs.proposedName,
        confidence: obs.confidence,
        source: 'SCAN_MOCK',
        confirmed: true,
      });
      roomIdByProposedName.set(obs.proposedName, room.id);

      await this.prisma.observation.update({
        where: { id: obs.id },
        data: { status: item.action === 'edit' ? 'EDITED' : 'CONFIRMED' },
      });
    }

    for (const item of assetItems) {
      const obs = observationById.get(item.observationId);
      if (!obs) {
        throw new NotFoundException(
          `Observation ${item.observationId} non trovata`,
        );
      }
      if (item.action === 'reject') {
        await this.prisma.observation.update({
          where: { id: obs.id },
          data: { status: 'REJECTED' },
        });
        continue;
      }

      const payload = obs.payload as { roomName?: string | null };
      const roomId = await this.resolveAssetRoomId(
        houseId,
        item,
        payload.roomName ?? null,
        roomIdByProposedName,
      );

      const assetType = this.resolveEnumValue(
        AssetType,
        item.type ?? obs.proposedCategory ?? undefined,
        'tipo asset',
      );
      await this.assetsService.create(houseId, {
        roomId,
        type: assetType,
        name: item.name ?? obs.proposedName,
        confidence: obs.confidence,
        source: 'SCAN_MOCK',
        confirmed: true,
      });

      await this.prisma.observation.update({
        where: { id: obs.id },
        data: { status: item.action === 'edit' ? 'EDITED' : 'CONFIRMED' },
      });
    }

    return this.getScanResults(houseId, scanSessionId);
  }

  // Esegue Home Detective + Home Score sullo stato attuale della casa,
  // riconcilia le Issue/Recommendation (idempotente: riapre solo ciò che è
  // ancora valido, chiude ciò che non lo è più) e salva uno ScoreSnapshot.
  async completeGenesis(houseId: string) {
    await this.ensureHouseExists(houseId);
    const { score, drafts } = await this.evaluateCurrentHome(houseId);

    await this.reconcileIssues(houseId, drafts);

    await this.createScoreSnapshot(houseId, score);

    await this.prisma.house.update({
      where: { id: houseId },
      data: {
        genesisStatus: GenesisStatus.COMPLETED,
        genesisStep: GenesisStep.RESULTS,
      },
    });

    await this.addTimelineEvent(houseId, {
      type: 'genesis_completed',
      title: 'Percorso Genesis completato',
      description: `Home Score: ${score.overall}/100`,
    });

    return this.getResults(houseId);
  }

  async getScoreHistory(houseId: string) {
    await this.ensureHouseExists(houseId);
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    return this.prisma.scoreSnapshot.findMany({
      where: { houseId, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'asc' },
    });
  }

  async recalculateScore(houseId: string) {
    const house = await this.ensureHouseExists(houseId);
    if (house.genesisStatus !== GenesisStatus.COMPLETED) {
      throw new BadRequestException(
        'Complete Genesis before recalculating the Home Score',
      );
    }

    const { score, drafts } = await this.evaluateCurrentHome(houseId);
    await this.reconcileIssues(houseId, drafts);

    const latest = await this.prisma.scoreSnapshot.findFirst({
      where: { houseId },
      orderBy: { calculatedAt: 'desc' },
    });
    const values = [
      score.overall,
      score.dimensions.documentation,
      score.dimensions.maintenance,
      score.dimensions.safety,
      score.dimensions.efficiency,
      score.dimensions.completeness,
    ];
    const previousValues = latest
      ? [
          latest.overallScore,
          latest.documentationScore,
          latest.maintenanceScore,
          latest.safetyScore,
          latest.efficiencyScore,
          latest.completenessScore,
        ]
      : [];
    const snapshotCreated =
      !latest ||
      latest.calculationVersion !== score.version ||
      values.some((value, index) => value !== previousValues[index]);

    if (snapshotCreated) {
      await this.createScoreSnapshot(houseId, score);
      await this.addTimelineEvent(houseId, {
        type: 'home_score_updated',
        title: 'Home Score aggiornato',
        description: `Home Score: ${score.overall}/100`,
      });
    }

    return { ...(await this.getResults(houseId)), snapshotCreated };
  }

  async getResults(houseId: string) {
    const house = await this.ensureHouseExists(houseId);
    const [
      latestScore,
      issues,
      recommendations,
      confirmedRoomsCount,
      confirmedAssetsCount,
    ] = await Promise.all([
      this.prisma.scoreSnapshot.findFirst({
        where: { houseId },
        orderBy: { calculatedAt: 'desc' },
      }),
      this.prisma.issue.findMany({
        where: { houseId, status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.recommendation.findMany({
        where: { houseId, status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.room.count({ where: { houseId, confirmed: true } }),
      this.prisma.asset.count({
        where: { houseId, confirmed: true, dismissedAt: null },
      }),
    ]);

    return {
      genesisStatus: house.genesisStatus,
      score: latestScore,
      issues,
      recommendations,
      confirmedRoomsCount,
      confirmedAssetsCount,
    };
  }

  async getTimeline(houseId: string) {
    await this.ensureHouseExists(houseId);
    return this.prisma.houseTimelineEvent.findMany({
      where: { houseId },
      orderBy: { eventDate: 'desc' },
    });
  }

  // --- helper privati -------------------------------------------------

  private async evaluateCurrentHome(
    houseId: string,
  ): Promise<{ score: ScoreResult; drafts: IssueDraft[] }> {
    const [
      assets,
      houseDocumentsCount,
      confirmedRoomsCount,
      pendingObservationsCount,
    ] = await Promise.all([
      this.prisma.asset.findMany({
        where: { houseId },
        include: {
          _count: { select: { documents: true, maintenancePlans: true } },
        },
      }),
      this.prisma.document.count({ where: { houseId } }),
      this.prisma.room.count({ where: { houseId, confirmed: true } }),
      this.prisma.observation.count({
        where: { scanSession: { houseId }, status: 'PENDING' },
      }),
    ]);
    const houseHasAnyDocument = houseDocumentsCount > 0;
    const scoreAssets: HomeScoreAssetInput[] = assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      confirmed: asset.confirmed,
      dismissed: asset.dismissedAt !== null,
      hasDocument: asset._count.documents > 0,
      hasMaintenancePlan: asset._count.maintenancePlans > 0,
      estimatedReplacementYear: asset.estimatedReplacementYear,
    }));
    const detectiveAssets: HomeDetectiveAssetInput[] = assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      confirmed: asset.confirmed,
      dismissed: asset.dismissedAt !== null,
      hasDocument: asset._count.documents > 0,
      roomId: asset.roomId,
    }));

    return {
      score: computeHomeScore({
        currentYear: new Date().getFullYear(),
        houseHasAnyDocument,
        assets: scoreAssets,
        confirmedRoomsCount,
        genesisCompleted: true,
      }),
      drafts: evaluateHomeDetectiveRules({
        houseHasAnyDocument,
        genesisCompleted: true,
        assets: detectiveAssets,
        unconfirmedObservationsCount: pendingObservationsCount,
      }),
    };
  }

  private createScoreSnapshot(houseId: string, score: ScoreResult) {
    return this.prisma.scoreSnapshot.create({
      data: {
        houseId,
        overallScore: score.overall,
        documentationScore: score.dimensions.documentation,
        maintenanceScore: score.dimensions.maintenance,
        safetyScore: score.dimensions.safety,
        efficiencyScore: score.dimensions.efficiency,
        completenessScore: score.dimensions.completeness,
        calculationVersion: score.version,
      },
    });
  }

  private async resolveAssetRoomId(
    houseId: string,
    item: { roomId?: string | null },
    proposedRoomName: string | null,
    roomIdByProposedName: Map<string, string>,
  ): Promise<string | null> {
    // Override esplicito dell'utente (anche null = impianto di casa).
    if (item.roomId !== undefined) {
      if (item.roomId !== null) {
        const room = await this.prisma.room.findUnique({
          where: { id: item.roomId },
        });
        if (!room || room.houseId !== houseId) {
          throw new BadRequestException(
            `Room ${item.roomId} non appartiene alla casa ${houseId}`,
          );
        }
      }
      return item.roomId;
    }

    if (!proposedRoomName) {
      return null;
    }

    const inBatch = roomIdByProposedName.get(proposedRoomName);
    if (inBatch) {
      return inBatch;
    }

    // La Room osservata potrebbe essere stata confermata in una chiamata
    // precedente (conferme parziali della Review), non solo nello stesso
    // batch — prima un match esatto case-insensitive (es. "Cucina" proposta
    // vs "cucina" già in casa), poi la stessa euristica di somiglianza usata
    // per il badge duplicati, per non perdere il collegamento anche quando
    // il nome non coincide esattamente (es. "Bagno" vs "bagno_1").
    const exact = await this.prisma.room.findFirst({
      where: {
        houseId,
        confirmed: true,
        name: { equals: proposedRoomName, mode: 'insensitive' },
      },
    });
    if (exact) {
      return exact.id;
    }
    const candidateRooms = await this.prisma.room.findMany({
      where: { houseId, confirmed: true },
    });
    const similar = findPossibleDuplicate(proposedRoomName, candidateRooms);
    return similar?.id ?? null;
  }

  // Crea le nuove Issue non ancora aperte, risolve quelle non più valide,
  // e genera/chiude le Recommendation 1:1 collegate — idempotente: chiamate
  // ripetute con lo stesso stato producono lo stesso risultato finale.
  private async reconcileIssues(
    houseId: string,
    drafts: {
      ruleCode: string;
      assetId: string | null;
      category: string;
      severity: string;
      title: string;
      description: string;
      resolutionHint: string;
    }[],
  ) {
    const openIssues = await this.prisma.issue.findMany({
      where: { houseId, status: 'OPEN' },
      include: { recommendations: true },
    });

    const draftKey = (d: { ruleCode: string; assetId: string | null }) =>
      `${d.ruleCode}:${d.assetId ?? ''}`;
    const openKey = (i: { ruleCode: string; assetId: string | null }) =>
      `${i.ruleCode}:${i.assetId ?? ''}`;

    const draftsByKey = new Map(drafts.map((d) => [draftKey(d), d]));
    const openByKey = new Map(openIssues.map((i) => [openKey(i), i]));

    // Issue non più valide: risolvile, e chiudi le raccomandazioni collegate.
    for (const issue of openIssues) {
      if (!draftsByKey.has(openKey(issue))) {
        await this.prisma.issue.update({
          where: { id: issue.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        for (const rec of issue.recommendations) {
          if (rec.status === 'OPEN') {
            await this.prisma.recommendation.update({
              where: { id: rec.id },
              data: { status: 'DONE' },
            });
          }
        }
      }
    }

    // Issue nuove: crea la riga + la Recommendation collegata.
    for (const draft of drafts) {
      if (openByKey.has(draftKey(draft))) {
        continue;
      }
      const issue = await this.prisma.issue.create({
        data: {
          houseId,
          assetId: draft.assetId,
          category: draft.category,
          severity: draft.severity as never,
          title: draft.title,
          description: draft.description,
          resolutionHint: draft.resolutionHint,
          ruleCode: draft.ruleCode,
        },
      });
      await this.prisma.recommendation.create({
        data: {
          houseId,
          issueId: issue.id,
          category: draft.category,
          title: draft.title,
          description: draft.resolutionHint,
          priority: draft.severity as never,
        },
      });
    }
  }

  private resolveEnumValue<T extends Record<string, string>>(
    enumObj: T,
    value: string | undefined,
    label: string,
  ): T[keyof T] {
    const values = Object.values(enumObj);
    if (!value || !values.includes(value)) {
      throw new BadRequestException(
        `${label} non valido: "${value ?? ''}" (atteso uno tra ${values.join(', ')})`,
      );
    }
    return value as T[keyof T];
  }

  private async addTimelineEvent(
    houseId: string,
    data: { type: string; title: string; description?: string },
  ) {
    await this.prisma.houseTimelineEvent.create({
      data: { houseId, ...data },
    });
  }

  private async getState(houseId: string) {
    return this.ensureHouseExists(houseId);
  }

  private async ensureHouseExists(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
    });
    if (!house) {
      throw new NotFoundException(`House ${houseId} non trovata`);
    }
    return house;
  }

  private async ensureScanSessionBelongsToHouse(
    scanSessionId: string,
    houseId: string,
  ) {
    const session = await this.prisma.scanSession.findUnique({
      where: { id: scanSessionId },
    });
    if (!session || session.houseId !== houseId) {
      throw new NotFoundException(
        `Sessione di scansione ${scanSessionId} non trovata per questa casa`,
      );
    }
    return session;
  }
}
