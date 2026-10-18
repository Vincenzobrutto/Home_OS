# Contratto API V5 — identity-v1

identity-v1.1: endpoint invariati, estensioni concordate in review Codex del ticket frontend V5-DEV-003. M1 verificata: 12 scenari API/PostgreSQL, 3 client/API, 18 dominio e 47 frontend mock; collaudo browser reale e regressione creazione superati. Documenti seguono documents-api-contract.md; proposte restano fuori da entrambi i contratti.

## Trasporto

Base `/api/v5`. Frontend usa URL relativi e `credentials: 'include'`; proxy Vite verso `http://127.0.0.1:3001`, host frontend `127.0.0.1:5174`, strictPort. Nessun fallback a API legacy o demo. Server usa cookie di sessione httpOnly; token non restituito al frontend, né loggato né salvato in localStorage. Cookie Secure in HTTPS di produzione. Tutte le scritture hanno controlli Origin/CSRF implementati sul server; client invia `X-CSRF-Token`, token ottenuto da GET session, per ogni mutazione, anche login/register.

JSON UTF-8, timestamp ISO UTC. UI italiana. Errori sempre `{ "error": { "code": "...", "message": "...", "fieldErrors": { "name": "..." }, "requestId": "..." } }`; fieldErrors facoltativo. 401 sessione assente/scaduta, 403 permesso negato, 409 conflitto, 422 form non valido, 429 limite, 503 servizio indisponibile. Risposta non-JSON o connessione rifiutata = errore rete/servizio, mai successo o dati demo.

## Tipi

```ts
type Account = { id: string; name: string; email: string };
type HomeRole = 'owner' | 'member' | 'viewer';
type Home = {
  id: string; name: string; address: string; version: number;
  role: HomeRole;
  permissions: Array<'read' | 'edit' | 'manage_members' | 'export' | 'sell'>;
};
type SessionResponse = {
  account: Account | null;
  csrfToken: string;
};
```

L'ID della casa è stabile. L'indirizzo non è identità né prova di proprietà. `account.id` e `home.id` non coincidono; non assumere una sola Home. Il server restituisce solo case attualmente autorizzate. Un diritto revocato/scaduto non torna valido creando una nuova Home.

## Endpoint prima verticale

| Metodo/percorso | Richiesta | Risposta |
|---|---|---|
| GET `/session` | Nessuna | 200 SessionResponse, anche anonima; token CSRF legato al contesto/sessione |
| POST `/auth/register` | `{name,email,password}` + CSRF | 201 `{account}` e cookie; 409 registrazione non completabile, senza dettaglio su account altrui |
| POST `/auth/login` | `{email,password}` + CSRF | 200 `{account}` e cookie; 401 stesso messaggio per credenziali errate |
| POST `/auth/logout` | CSRF, nessun body | 204; revoca sessione, client pulisce cache e richiede nuova sessione/CSRF |
| GET `/homes` | Sessione | 200 `{items: Home[]}`; elenco della prima verticale non paginato |
| POST `/homes` | `{name,address}` + CSRF + `Idempotency-Key` | 201 `{home: Home}`; stessa chiave/body ripetuti restituiscono stessa casa; chiave riusata con body diverso 409 |
| GET `/homes/:homeId` | Sessione | 200 `{home: Home}`; 403 se non autorizzata, nessun dettaglio privato |

Validazioni iniziali: name account 1–80 caratteri, nome casa 1–80, address 1–200, email valida fino a 254, password 12–128 caratteri; trim per nomi/indirizzo/email, mai trim silenzioso della password. Messaggi campo in italiano. Verifica email obbligatoria prima di utenti esterni; prima verticale solo account locali di sviluppo. Ruoli professionali arriveranno nel contratto successivo.

Le lunghezze sono code point Unicode, non unità UTF-16 o grafemi. Il backend usa un validatore esplicito coerente con il frontend; i selettori di presentazione contano come code point. Email normalizzata in minuscolo sul server.

Una mutazione login/register può ruotare la sessione: richiedere GET session dopo successo per il nuovo token CSRF. Se arriva 401 su una richiesta protetta, annullare richieste pendenti, pulire cache privata e tornare al login senza loop di retry. Un 403 non va trasformato in elenco vuoto.

## Selezione casa e cache

Il frontend seleziona la casa via URL `/home/:homeId/casa`; non serve endpoint server per un puntatore globale alla casa corrente. Zero case = onboarding; più case = scelta esplicita. Verificare sempre i diritti sul server; il routing frontend non autorizza operazioni. Cache privata con chiavi almeno `[accountId, homeId, resource]`. Preferenze UI non sensibili possono essere locali; niente credenziali/documenti/bozze private persistenti in localStorage.

## Chiarimenti identity-v1.1 dalla review

- Le richieste UI protette inviano `X-Account-Context` con l'account catturato dalla relativa query o form. Il server confronta il valore con la sessione prima delle operazioni: mismatch = 401 `account_context_changed`, senza dati né scritture. Header aggiuntivo facoltativo a livello di trasporto per compatibilità con la suite v1; il frontend V5 lo invia sempre per homes. Il controllo non concede diritti: la membership resta necessaria. La sessione si rilegge sempre al focus e una mutazione tardiva non ripopola la cache di un account diverso.
- CSRF/Origin errati: 403 `csrf_invalid`. Nessun retry automatico delle mutazioni; il client conserva la chiave idempotente e mostra il messaggio del server. Rinnovo automatico e retry di scritture non sono richiesti in questo incremento.
- Chiave di creazione riusata con dati diversi: 409 `idempotency_conflict`. Non trattare altri 409 futuri come conflitto di idempotenza. Formato 16–100 caratteri ASCII alfanumerici, `_` o `-`; UUID v4 ammesso; ambito per account, non sessione. Record mantenuto finché esiste account/casa nel database di sviluppo; nessuna scadenza temporale silenziosa. Concorrenti con stessa chiave/payload convergono sulla stessa casa; revoca successiva impedisce il retry di consultazione.
- ID casa inesistente e ID altrui: 403 generico; UUID sintatticamente invalido: 422. Nessuna esposizione di dati del proprietario.
- 429: messaggio italiano con indicazione di attesa; Retry-After non ancora previsto. Prima del pilota sostituire rate limit in memoria con protezione adeguata all'ambiente ospitato.
- Origin/proxy/cookie sono quelli sopra. Nessun Domain sul cookie; Path `/api/v5`.
- Logout di sessione già scaduta: 204 idempotente con Origin corretto, cookie rimosso; GET session successivo crea un contesto anonimo con CSRF nuovo. Sessione ancora valida richiede CSRF corretto.

## Scenari di accettazione

1. Anonimo: sessione 200 account null, GET homes 401; login errato 401 generico.
2. Account A con due Home: scelta, URL diretto e reload mantengono il contesto corretto.
3. Account B: GET Home A 403 senza contenuti; cache di A non visibile dopo logout/login B.
4. Creazione ripetuta con stessa Idempotency-Key non duplica; retry con nuovo body esplicita il conflitto.
5. Backend spento: errore comprensibile e retry manuale; nessun fallback a dati sintetici.
6. Frontend mock nei test può verificare contratto/rendering; etichettare test con mock e integrazione reale separatamente.

## Collaudo reale del 13 ottobre — aggiornamento finale
11 scenari API/PostgreSQL e 3 frontend/API superati nei log delle 16:22. Collaudo browser reale eseguito: due account, case persistenti, logout/login, URL altrui negato, mobile 320/390 e sezioni future esplicite. M1-UI-001: seconda casa salvata ma risposta 403 intermittente; assegnato validFrom con Date applicativo per evitare arrotondamento futuro del default DB. Regressione di dominio superata, 18 test backend e 47 frontend mock passano, build/lint passano. Nuovo scenario reale con dieci creazioni consecutive pronto, ancora da eseguire dopo riavvio API. M1 non chiusa. Evidenze: outputs/Dimora-V5-collaudo-prima-app-reale.md. Nessun main o database legacy alterato.


## Estensione V11 — 18 ottobre 2026

Contratto additivo di onboarding descritto in [report V11](document-understanding-v11-report-20261018.md#contratto-e-persistenza). documentInfo e reviewWarnings opzionali; soggetti impianto con subjectKind/proposedType. Conferma document_only limitata a conformità e documentOnly=true esteso alla chiusura delle proposte aperte senza nuove risorse quando esiste organizzazione personale sulla stessa versione/SHA. Rifiuta choices, houseExpenses e totale manuale; contatti ammessi soltanto nel preesistente caso documentInfo senza articoli/spese, per compatibilità. Le altre proposte contatto sono escluse. Restano ricevute, membership, versione/SHA e idempotenza. Vedi [correzioni UX](document-ux-fixes-20261018.md). Nessun nuovo endpoint.


## V12 — soggetti e costo complessivo (18 ottobre 2026)

Estensione additiva: item.subjectKind product/system; houseExpenses.documentKind simple_invoice oltre a utility_bill. Categoria manutenzione/lavori/acquisti ammessa per fatture; bollette restano forniture. Un’unica conferma choices+houseExpenses; document_only anche per fatture con costo complessivo. Limiti, esclusioni e condizioni nel [report V12](document-understanding-v12-report-20261018.md).
