// BACKEND SIMULATO PER PROVE MANUALI E SCREENSHOT — NON È IL BACKEND V5.
// Espone in memoria identity-v1.1, documents-v1, review-v1, activities-v1, document-search-v1 ed expenses-v1 su 127.0.0.1:3101 (mai sulla
// porta 3001 del backend reale). Si ferma se la porta è occupata.
// Uso:
//   npm run mock-api -- --seed                      (account, case e documenti di prova)
//   DIMORA_API_TARGET=http://127.0.0.1:3101 npm run dev   (frontend verso il mock)
// I dati spariscono alla chiusura. Nessuna persistenza, nessun legame con DB legacy.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { FakeBackend, PNG_SIGNATURE } from '../src/test/fakeBackend.ts';

const REAL_API_PORT = 3001;
const PORT = Number(process.env.MOCK_API_PORT ?? 3101);
const COOKIE = 'v5_mock_session';

if (PORT === REAL_API_PORT) {
  console.error('La porta 3001 è riservata al backend V5 reale: il backend simulato non la usa.');
  process.exit(1);
}

const backend = new FakeBackend();

if (process.argv.includes('--seed')) {
  const a = backend.seedAccount('Giulia Prova', 'a@example.test', 'password-di-prova-A');
  const b = backend.seedAccount('Marco Prova', 'b@example.test', 'password-di-prova-B');
  const v = backend.seedAccount('Vera Prova', 'v@example.test', 'password-di-prova-V');
  const roma = backend.seedHome(a.id, 'Appartamento Roma', 'Via Roma 12, Torino');
  backend.seedHome(a.id, 'Casa al mare', 'Lungomare 3, Alassio', 'member');
  backend.seedHome(b.id, 'Casa di Marco', 'Via Verdi 8, Milano');
  backend.addMember(v.id, roma.id, 'viewer');
  await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'Rogito 2019', visibility: 'home' });
  await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'Libretto caldaia', visibility: 'home' });
  await backend.seedDocument({
    homeId: roma.id,
    uploaderId: a.id,
    name: 'Planimetria',
    mimeType: 'image/png',
    bytes: samplePng(),
    visibility: 'private',
  });
  // H2 (solo mock): titolo diverso dal nome file e caratteri letterali per provare la ricerca.
  const bolletta = await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'Bolletta gas gennaio', originalFilename: 'SCAN_0042.pdf' });
  await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'Sconto 50% condominio', visibility: 'home' });
  // PDF sintetici M3 con i loro byte reali: il provider di test li riconosce per hash.
  for (const [file, name] of [
    ['libretto-caldaia-demo.pdf', 'Esempio A — libretto caldaia'],
    ['scheda-tecnica-caldaia-demo.pdf', 'Esempio B — scheda tecnica'],
    ['rapporto-caldaia-demo-conflitto.pdf', 'Esempio C — rapporto in conflitto'],
  ] as const) {
    const bytes = new Uint8Array(readFileSync(new URL(`../public/m3-examples/${file}`, import.meta.url)));
    await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name, bytes, originalFilename: file, visibility: 'home' });
  }
  // Spese H3a di prova (solo mock): manuale, da documento, da caldaia e una dell'anno precedente.
  const caldaia = backend.review.seedBoiler(a.id, roma.id, 'Caldaia cucina');
  for (const body of [
    { title: 'Pulizia climatizzatore', amountCents: 10500, spentOn: '2026-08-05' },
    { title: 'Gas gennaio', amountCents: 8430, spentOn: '2026-01-31', documentId: bolletta.id },
    { title: 'Controllo fumi', amountCents: 12000, spentOn: '2026-06-07', assetId: caldaia.id, note: 'Tecnico di fiducia' },
    { title: 'Sostituzione guarnizione', amountCents: 4500, spentOn: '2025-11-12' },
  ]) {
    await backend.expenses.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, a.id, roma.id, 'expenses');
  }
  // G1 di prova (solo mock): ambienti condivisi, un oggetto multiambiente, uno da collocare, caldaia posizionata.
  const g1 = async (rest: string, body: Record<string, unknown>) =>
    (await backend.objects.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, a.id, roma.id, rest)).body as {
      room?: { id: string };
    };
  const cucina = (await g1('rooms', { name: 'Cucina', type: 'kitchen' })).room!.id;
  const soggiorno = (await g1('rooms', { name: 'Soggiorno', type: 'living' })).room!.id;
  const camera = (await g1('rooms', { name: 'Camera', type: 'bedroom' })).room!.id;
  await g1('rooms', { name: 'Bagno', type: 'bathroom' });
  await g1('rooms', { name: 'Bagno', type: 'bathroom', note: 'Bagno di servizio' });
  await g1('objects', { name: 'Termosifoni', type: 'heating', roomIds: [soggiorno, camera] });
  await g1('objects', { name: 'Lavastoviglie', type: 'appliance' });
  await g1(`objects/boiler/${caldaia.id}/position`, { expectedVersion: 0, roomIds: [cucina] });
  // Attività H1 di prova (solo mock), orologio del simulatore: 2026-10-13.
  for (const body of [
    { title: 'Spurgare i radiatori', dueDate: '2026-10-12' },
    { title: 'Chiamare il tecnico per la caldaia', dueDate: '2026-10-16', description: 'Chiedere un preventivo per il controllo annuale.' },
    { title: 'Cercare il libretto della lavatrice' },
  ]) {
    await backend.activities.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, a.id, roma.id, 'activities');
  }
  // economy-v1 S1a/b di prova (solo mock, dati sintetici): famiglie, lavoro e categorie sugli stessi costi H3a.
  if (process.argv.includes('--s1')) {
    backend.economy.enabled = true;
    const s1 = async (rest: string, body: Record<string, unknown>) =>
      (await backend.economy.handle({ method: 'POST', path: '', headers: { 'idempotency-key': crypto.randomUUID() }, body }, a.id, roma.id, rest)).body as { work?: { id: string } };
    const bagno = (await s1('works', { name: 'Rifacimento bagno', note: 'Lavoro di prova' })).work!.id;
    for (const body of [
      { title: 'Bolletta luce · settembre', amountCents: 7800, spentOn: '2026-09-30', category: 'electricity', supplier: 'Energia Demo' },
      { title: 'Internet · ottobre', amountCents: 2990, spentOn: '2026-10-01', category: 'internet_services' },
      { title: 'Rata mutuo · ottobre', amountCents: 45000, spentOn: '2026-10-05', category: 'financing' },
      { title: 'Polizza collegata al mutuo', amountCents: 12000, spentOn: '2026-10-02', category: 'financing' },
      { title: 'Polizza casa · premio annuale', amountCents: 18000, spentOn: '2026-10-02', category: 'insurance' },
      { title: 'Riparazione rubinetto', amountCents: 8500, spentOn: '2026-09-12', category: 'repairs_works', workId: bagno },
      { title: 'Piastrelle e posa', amountCents: 103500, spentOn: '2026-09-10', category: 'repairs_works', workId: bagno },
      { title: 'Gas · settembre 2025', amountCents: 7400, spentOn: '2025-09-30', category: 'gas' },
      { title: 'Rata mutuo · ottobre 2025', amountCents: 45000, spentOn: '2025-10-05', category: 'financing' },
    ]) {
      await s1('expenses', body);
    }
    console.log('economy-v1 SIMULATO attivo (--s1): dati sintetici, documentDrafts false.');
  }
  // S1c di prova (solo mock): bozze da documento con la sola fixture dichiarata su due PDF sintetici.
  if (process.argv.includes('--s1c')) {
    backend.economy.enabled = true;
    backend.economy.features.documentDrafts = true;
    const gas = await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'gas.pdf', visibility: 'private' });
    const invoice = await backend.seedDocument({ homeId: roma.id, uploaderId: a.id, name: 'invoice.pdf', visibility: 'private' });
    backend.economy.fixtureDocs.set(gas.id, 'gas');
    backend.economy.fixtureDocs.set(invoice.id, 'invoice');
    console.log('S1c SIMULATO attivo (--s1c): prova fixture su gas.pdf e invoice.pdf sintetici, nessun modello AI.');
  }
  console.log(
    'Account di prova (solo mock): a@example.test / password-di-prova-A, b@example.test / password-di-prova-B, ' +
      'v@example.test / password-di-prova-V (viewer di Appartamento Roma)',
  );
}

/** PNG 2×2 valido, per l'anteprima immagine. */
function samplePng() {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGNgYGD4z8DAwMDAwMAAAAwAAf8uaWGbAAAAAElFTkSuQmCC';
  const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
  return PNG_SIGNATURE.every((x, i) => bytes[i] === x) ? bytes : PNG_SIGNATURE;
}

if (process.argv.includes('--anthropic-mock')) {
  // Anthropic SIMULATO: nessuna rete, nessuna chiave. Esiti fissi per le prove nel browser.
  backend.review.anthropic.configured = true;
  backend.review.anthropicScript.push(
    {
      kind: 'claims',
      costUsd: '0.0123',
      claims: [
        { field: 'brand', value: 'Termica Demo', documentIndex: 0, page: 1, excerpt: 'Marca: Termica Demo' },
        { field: 'model', value: 'TD-24', documentIndex: 0, page: 1, excerpt: 'Modello: TD-24' },
        { field: 'power', value: '24', documentIndex: 0, page: 1, excerpt: 'Potenza utile al riscaldamento: 24 kW', measurement: { value: '24', unit: 'kW', quantityCode: 'useful_heating', quantityLabel: 'Potenza utile al riscaldamento' } },
      ],
    },
    { kind: 'uncertain' },
  );
  console.log('Anthropic SIMULATO attivo (--anthropic-mock): nessuna chiamata reale.');
}

function readCookie(header: string | undefined) {
  const match = header?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : undefined;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith('/api/v5/')) {
    res.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks);
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    const contentType = headers['content-type'] ?? '';
    let body: unknown;
    try {
      if (contentType.startsWith('multipart/form-data')) {
        // Parsing multipart con il Request standard di Node.
        body = await new Request(url, { method: 'POST', headers: { 'content-type': contentType }, body: raw }).formData();
      } else if (raw.length) {
        body = JSON.parse(raw.toString('utf8'));
      }
    } catch {
      body = undefined;
    }
    const out = await backend.handle({
      method: req.method ?? 'GET',
      path: url.pathname.replace(/^\/api\/v5/, '') + url.search,
      headers,
      body,
      cookie: readCookie(req.headers.cookie),
    });
    const resHeaders: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Dimora-Mock': '1' };
    if (out.setCookie !== undefined) {
      resHeaders['Set-Cookie'] =
        out.setCookie === null
          ? `${COOKIE}=; Path=/api/v5; HttpOnly; SameSite=Lax; Max-Age=0`
          : `${COOKIE}=${encodeURIComponent(out.setCookie)}; Path=/api/v5; HttpOnly; SameSite=Lax`;
    }
    console.log(`[mock] ${req.method} ${url.pathname}${url.search} → ${out.status}`);
    if (out.status === 204) {
      res.writeHead(204, resHeaders).end();
      return;
    }
    if (out.binary) {
      resHeaders['Content-Type'] = out.binary.contentType;
      resHeaders['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(out.binary.filename)}`;
      res.writeHead(out.status, resHeaders).end(Buffer.from(out.binary.bytes));
      return;
    }
    resHeaders['Content-Type'] = 'application/json; charset=utf-8';
    res.writeHead(out.status, resHeaders).end(JSON.stringify(out.body));
  });
});

server.on('error', (err) => {
  console.error(`Backend simulato non avviato su 127.0.0.1:${PORT}: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`BACKEND SIMULATO (mock) attivo su http://127.0.0.1:${PORT}/api/v5 — non è il backend V5 reale.`);
});
