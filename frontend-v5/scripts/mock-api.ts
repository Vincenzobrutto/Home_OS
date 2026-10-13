// BACKEND SIMULATO PER PROVE MANUALI E SCREENSHOT — NON È IL BACKEND V5.
// Espone il contratto identity-v1 in memoria su 127.0.0.1:3001 (stessa porta del
// backend reale, che quindi non deve essere attivo). Si ferma se la porta è occupata.
// Uso: npm run mock-api            (vuoto)
//      npm run mock-api -- --seed  (account di prova A/B con case)
// I dati spariscono alla chiusura. Nessuna persistenza, nessun legame con DB legacy.
import { createServer } from 'node:http';
import { FakeBackend } from '../src/test/fakeBackend.ts';

const PORT = Number(process.env.MOCK_API_PORT ?? 3001);
const COOKIE = 'v5_mock_session';
const backend = new FakeBackend();

if (process.argv.includes('--seed')) {
  const a = backend.seedAccount('Giulia Prova', 'a@example.test', 'password-di-prova-A');
  const b = backend.seedAccount('Marco Prova', 'b@example.test', 'password-di-prova-B');
  backend.seedHome(a.id, 'Appartamento Roma', 'Via Roma 12, Torino');
  backend.seedHome(a.id, 'Casa al mare', 'Lungomare 3, Alassio', 'member');
  backend.seedHome(b.id, 'Casa di Marco', 'Via Verdi 8, Milano');
  console.log('Account di prova (solo mock): a@example.test / password-di-prova-A, b@example.test / password-di-prova-B');
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
  req.on('end', () => {
    let body: unknown;
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = undefined;
    }
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    const out = backend.handle({
      method: req.method ?? 'GET',
      path: url.pathname.replace(/^\/api\/v5/, ''),
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
    console.log(`[mock] ${req.method} ${url.pathname} → ${out.status}`);
    if (out.status === 204) {
      res.writeHead(204, resHeaders).end();
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
