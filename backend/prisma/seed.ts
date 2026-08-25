import {
  PrismaClient,
  RoomType,
  AssetType,
  FieldSource,
} from '@prisma/client';
import { computeAssetStatus } from '../src/common/asset-status';

const prisma = new PrismaClient();

// Ricalca 1:1 DEMO_HOUSE / initialRooms / initialAssets in
// prototipo/homeos_prototype.jsx, così l'API parte da uno stato coerente
// con la UI già validata — vedi "Prossimo passo naturale" in backend/README.md.
const DEMO_HOUSE = {
  code: 'CASA-0142',
  name: 'Via dei Glicini 14',
  city: 'Milano',
  surfaceSqm: 120,
  roomsCount: 4,
  buildYear: 2010,
};

const ROOMS = [
  { key: 'r1', code: 'AMB-001', type: RoomType.CUCINA, name: 'Cucina' },
  { key: 'r2', code: 'AMB-002', type: RoomType.SOGGIORNO, name: 'Soggiorno' },
  {
    key: 'r3',
    code: 'AMB-003',
    type: RoomType.CAMERA,
    name: 'Camera matrimoniale',
  },
  { key: 'r4', code: 'AMB-004', type: RoomType.BAGNO, name: 'Bagno' },
];

// dd/mm/yyyy (come nel prototipo) -> Date, oppure null ("—" = nessuna data)
function parseItDate(value: string | null): Date | null {
  if (!value || value === '—') return null;
  const [day, month, year] = value.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const ASSETS = [
  {
    code: 'AST-001',
    type: AssetType.CALDAIA,
    name: 'Caldaia a condensazione',
    roomKey: null,
    installedAt: '12/03/2022',
    warrantyUntil: '12/03/2027',
    customFields: [
      { label: 'Fornitore', value: 'Vaillant Group' },
      { label: 'Modello', value: 'ecoTEC plus' },
    ],
    timeline: [
      {
        date: '12/03/2022',
        eventType: 'Installazione',
        detail: 'Vaillant Group — €3.450',
      },
      {
        date: '02/11/2023',
        eventType: 'Manutenzione ordinaria',
        detail: 'Controllo combustione',
      },
    ],
  },
  {
    code: 'AST-002',
    type: AssetType.ELETTRICO,
    name: 'Impianto elettrico',
    roomKey: null,
    installedAt: null,
    warrantyUntil: null,
    customFields: [
      { label: 'Numero certificazione', value: 'IM/2019/00452' },
    ],
    timeline: [
      {
        date: '05/06/2019',
        eventType: 'Certificazione conformità',
        detail: 'Rifacimento parziale',
      },
    ],
  },
  {
    code: 'AST-003',
    type: AssetType.FOTOVOLTAICO,
    name: 'Impianto fotovoltaico',
    roomKey: null,
    installedAt: '18/07/2023',
    warrantyUntil: '18/07/2033',
    customFields: [
      { label: 'Fornitore', value: 'SolarEdge' },
      { label: 'Potenza', value: '4.8 kWp' },
    ],
    timeline: [
      {
        date: '18/07/2023',
        eventType: 'Installazione',
        detail: 'SolarEdge — 12 pannelli, 4.8kWp',
      },
    ],
  },
  {
    code: 'AST-004',
    type: AssetType.CLIMA,
    name: 'Climatizzatori (3 unità)',
    roomKey: null,
    installedAt: '20/05/2021',
    warrantyUntil: '20/05/2026',
    customFields: [],
    timeline: [
      {
        date: '20/05/2021',
        eventType: 'Installazione',
        detail: 'Daikin Perfera — 3 split',
      },
      {
        date: '15/06/2024',
        eventType: 'Manutenzione ordinaria',
        detail: 'Pulizia filtri e ricarica gas',
      },
    ],
  },
  {
    code: 'AST-005',
    type: AssetType.ELETTRODOMESTICO,
    name: 'Forno da incasso',
    roomKey: 'r1',
    installedAt: '10/09/2021',
    warrantyUntil: '10/09/2023',
    customFields: [],
    timeline: [
      {
        date: '10/09/2021',
        eventType: 'Installazione',
        detail: 'Sostituzione completa cucina',
      },
    ],
  },
  {
    code: 'AST-006',
    type: AssetType.ELETTRODOMESTICO,
    name: 'Piano cottura a induzione',
    roomKey: 'r1',
    installedAt: '10/09/2021',
    warrantyUntil: '10/09/2023',
    customFields: [],
    timeline: [
      {
        date: '10/09/2021',
        eventType: 'Installazione',
        detail: 'Sostituzione completa cucina',
      },
    ],
  },
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'bruttovincenzo@gmail.com' },
    update: {},
    create: { email: 'bruttovincenzo@gmail.com', name: 'Vincenzo' },
  });

  // Idempotente: se il seed è già stato eseguito, ricreo da zero la casa
  // demo (il cascade su rooms/assets/custom_fields/timeline è già nello
  // schema Prisma).
  const existing = await prisma.house.findUnique({
    where: { code: DEMO_HOUSE.code },
  });
  if (existing) {
    await prisma.house.delete({ where: { id: existing.id } });
  }

  const house = await prisma.house.create({
    data: { ...DEMO_HOUSE, ownerId: owner.id },
  });

  const roomIdByKey = new Map<string, string>();
  for (const room of ROOMS) {
    const created = await prisma.room.create({
      data: {
        houseId: house.id,
        code: room.code,
        type: room.type,
        name: room.name,
      },
    });
    roomIdByKey.set(room.key, created.id);
  }

  for (const asset of ASSETS) {
    const warrantyUntil = parseItDate(asset.warrantyUntil);
    const status = computeAssetStatus({ warrantyUntil, documentsCount: 0 });

    const created = await prisma.asset.create({
      data: {
        houseId: house.id,
        roomId: asset.roomKey ? roomIdByKey.get(asset.roomKey) : null,
        code: asset.code,
        type: asset.type,
        name: asset.name,
        installedAt: parseItDate(asset.installedAt),
        warrantyUntil,
        status,
        customFields: {
          create: asset.customFields.map((f) => ({
            label: f.label,
            value: f.value,
            source: FieldSource.DECLARED,
          })),
        },
        timelineEvents: {
          create: asset.timeline.map((t) => ({
            eventDate: parseItDate(t.date)!,
            eventType: t.eventType,
            detail: t.detail,
          })),
        },
      },
    });
    console.log(`Creato asset ${created.code} — ${created.name} (${created.status})`);
  }

  console.log(`\nCasa demo creata: ${house.code} — ${house.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
