import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface UserResponseBody {
  email: string;
  passwordHash?: string;
}
interface HouseResponseBody {
  id: string;
  code: string;
}
interface DocumentResponseBody {
  id: string;
  status: string;
  assetId?: string | null;
}
interface AssetResponseBody {
  name: string;
}

// Copre il percorso principale della private alpha (mvp-v1.md §4): login →
// crea casa → carica documento → conferma su un asset → l'asset compare tra
// i dati della casa (proxy della ricerca, che è client-side — vedi
// frontend/src/search.ts, non testabile da un e2e backend). Usa la
// classificazione manuale (B57) invece dell'analisi AI per restare
// deterministico e non dipendere da ANTHROPIC_API_KEY in ambiente di test.
//
// Gira contro il database configurato in .env (nessun DB di test separato,
// debito accettato — vedi decisions.md): ogni utente creato qui è usa-e-getta
// con email univoca per esecuzione e viene ripulito in afterAll tramite
// DELETE /auth/me (B53), che cancella in cascata casa/asset/documenti — mai
// tocca dati preesistenti.
describe('Percorso principale (e2e)', () => {
  let app: INestApplication<App>;
  let primaryCookie: string;
  let secondaryCookie: string | undefined;
  let houseId: string;
  const runId = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (secondaryCookie) {
      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Cookie', secondaryCookie);
    }
    if (primaryCookie) {
      await request(app.getHttpServer())
        .delete('/auth/me')
        .set('Cookie', primaryCookie);
    }
    await app.close();
  });

  function firstCookie(res: request.Response): string {
    const raw = res.headers['set-cookie'] as unknown as string[];
    return raw[0].split(';')[0];
  }

  it('registra un utente e riceve un cookie di sessione', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-main-${runId}@example.com`,
        password: 'e2e-test-password-1',
        name: 'E2E Main Flow',
      })
      .expect(201);

    primaryCookie = firstCookie(res);
    const body = res.body as UserResponseBody;
    expect(body.email).toBe(`e2e-main-${runId}@example.com`);
    expect(body.passwordHash).toBeUndefined();
  });

  it("crea una casa per l'utente registrato", async () => {
    const res = await request(app.getHttpServer())
      .post('/houses')
      .set('Cookie', primaryCookie)
      .send({ name: 'Casa E2E', city: 'Test' })
      .expect(201);

    const body = res.body as HouseResponseBody;
    houseId = body.id;
    expect(body.code).toMatch(/^CASA-\d+$/);
  });

  it("carica un documento nell'Inbox della casa", async () => {
    const res = await request(app.getHttpServer())
      .post(`/houses/${houseId}/documents`)
      .set('Cookie', primaryCookie)
      .attach(
        'file',
        Buffer.from('%PDF-1.4 contenuto fittizio e2e'),
        'fattura-caldaia.pdf',
      )
      .expect(201);

    expect((res.body as DocumentResponseBody).status).toBe('PENDING');
  });

  it('respinge un upload di tipo non supportato', async () => {
    await request(app.getHttpServer())
      .post(`/houses/${houseId}/documents`)
      .set('Cookie', primaryCookie)
      .attach('file', Buffer.from('non un documento'), 'note.txt')
      .expect(400);
  });

  it('classifica il documento manualmente creando un nuovo asset (B57)', async () => {
    const docsRes = await request(app.getHttpServer())
      .get(`/houses/${houseId}/documents`)
      .set('Cookie', primaryCookie)
      .expect(200);
    const pendingDoc = (docsRes.body as DocumentResponseBody[]).find(
      (d) => d.status === 'PENDING',
    );
    expect(pendingDoc).toBeDefined();

    const confirmRes = await request(app.getHttpServer())
      .post(`/documents/${pendingDoc!.id}/confirm`)
      .set('Cookie', primaryCookie)
      .send({
        createAssetType: 'CALDAIA',
        assetName: 'Caldaia E2E',
        applyFields: false,
      })
      .expect(201);

    const confirmed = confirmRes.body as DocumentResponseBody;
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.assetId).toBeTruthy();
  });

  it("l'asset confermato è ritrovabile tra i dati della casa (proxy della ricerca)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/houses/${houseId}/assets`)
      .set('Cookie', primaryCookie)
      .expect(200);

    expect(
      (res.body as AssetResponseBody[]).some((a) => a.name === 'Caldaia E2E'),
    ).toBe(true);
  });

  it('isola i dati tra case diverse: un secondo utente non accede alla casa del primo', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-secondary-${runId}@example.com`,
        password: 'e2e-test-password-2',
      })
      .expect(201);
    secondaryCookie = firstCookie(registerRes);

    await request(app.getHttpServer())
      .get(`/houses/${houseId}`)
      .set('Cookie', secondaryCookie)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/houses/${houseId}`)
      .set('Cookie', secondaryCookie)
      .expect(403);
  });
});
