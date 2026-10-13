# Contratto API V5 — identity-v1

Versione congelata per il ticket frontend V5-DEV-003. Il backend viene implementato da Codex: questi endpoint non sono ancora attivi. Modifiche solo concordate tramite Codex. Documenti/proposte fuori da questo contratto iniziale, seguiranno in un contratto successivo.

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

Una mutazione login/register può ruotare la sessione: richiedere GET session dopo successo per il nuovo token CSRF. Se arriva 401 su una richiesta protetta, annullare richieste pendenti, pulire cache privata e tornare al login senza loop di retry. Un 403 non va trasformato in elenco vuoto.

## Selezione casa e cache

Il frontend seleziona la casa via URL `/home/:homeId/casa`; non serve endpoint server per un puntatore globale alla casa corrente. Zero case = onboarding; più case = scelta esplicita. Verificare sempre i diritti sul server; il routing frontend non autorizza operazioni. Cache privata con chiavi almeno `[accountId, homeId, resource]`. Preferenze UI non sensibili possono essere locali; niente credenziali/documenti/bozze private persistenti in localStorage.

## Scenari di accettazione

1. Anonimo: sessione 200 account null, GET homes 401; login errato 401 generico.
2. Account A con due Home: scelta, URL diretto e reload mantengono il contesto corretto.
3. Account B: GET Home A 403 senza contenuti; cache di A non visibile dopo logout/login B.
4. Creazione ripetuta con stessa Idempotency-Key non duplica; retry con nuovo body esplicita il conflitto.
5. Backend spento: errore comprensibile e retry manuale; nessun fallback a dati sintetici.
6. Frontend mock nei test può verificare contratto/rendering; etichettare test con mock e integrazione reale separatamente.
