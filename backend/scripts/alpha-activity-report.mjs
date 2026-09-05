// Report di sola lettura per il test alpha con amici (nessuna scrittura sul
// DB): quanti si sono registrati e quanto ha usato l'app ciascuno. Pensato
// per essere rieseguito più volte durante il test, non per restare come
// funzionalità del prodotto (nessun endpoint, nessuna UI).
//
// Uso: node scripts/alpha-activity-report.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function fmt(date) {
  return date ? new Date(date).toISOString().replace('T', ' ').slice(0, 16) : '—';
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      createdAt: true,
      consentedAt: true,
      ownedHouses: {
        select: {
          id: true,
          code: true,
          _count: { select: { rooms: true, assets: true } },
        },
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const houseIds = users.flatMap((u) => u.ownedHouses.map((h) => h.id));
  const [documentsByHouse, confirmedByHouse] = await Promise.all([
    prisma.document.groupBy({
      by: ['houseId'],
      where: { houseId: { in: houseIds } },
      _count: { _all: true },
    }),
    prisma.document.groupBy({
      by: ['houseId'],
      where: { houseId: { in: houseIds }, status: 'CONFIRMED' },
      _count: { _all: true },
    }),
  ]);
  const docsMap = Object.fromEntries(documentsByHouse.map((d) => [d.houseId, d._count._all]));
  const confirmedMap = Object.fromEntries(confirmedByHouse.map((d) => [d.houseId, d._count._all]));

  console.log(`\nUtenti registrati: ${users.length}\n`);
  console.log(
    'email'.padEnd(32),
    'registrato'.padEnd(17),
    'consenso'.padEnd(9),
    'ultimo accesso'.padEnd(17),
    'case'.padEnd(5),
    'asset'.padEnd(6),
    'doc'.padEnd(4),
    'doc conf.',
  );
  console.log('-'.repeat(110));

  let usersWithActivity = 0;
  for (const u of users) {
    const assets = u.ownedHouses.reduce((sum, h) => sum + h._count.assets, 0);
    const docs = u.ownedHouses.reduce((sum, h) => sum + (docsMap[h.id] ?? 0), 0);
    const confirmed = u.ownedHouses.reduce((sum, h) => sum + (confirmedMap[h.id] ?? 0), 0);
    const lastLogin = u.sessions[0]?.createdAt ?? null;
    if (u.ownedHouses.length > 0 || docs > 0) usersWithActivity += 1;

    console.log(
      u.email.padEnd(32),
      fmt(u.createdAt).padEnd(17),
      (u.consentedAt ? 'sì' : 'no').padEnd(9),
      fmt(lastLogin).padEnd(17),
      String(u.ownedHouses.length).padEnd(5),
      String(assets).padEnd(6),
      String(docs).padEnd(4),
      String(confirmed),
    );
  }

  console.log('-'.repeat(110));
  console.log(
    `\n${usersWithActivity}/${users.length} utenti hanno creato almeno una casa o caricato almeno un documento.\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
