# Contratto M2 — documents-v1

13 ottobre 2026. Contratto fissato da Codex per V5-DEV-004/005. Le API documentali descritte qui **non sono ancora implementate**. Claude può sviluppare contro il contratto con mock esclusivamente nei test. L'accettazione finale richiede API, PostgreSQL e file reali. identity-v1.1 continua a valere.

## Scopo

Originali PDF/JPEG/PNG, lista, dettaglio, download e ZIP selettivo. Nessuna estrazione AI, classificazione automatica, conferma dati, invito, sostituzione versione, cancellazione, pagamento o condivisione mediante link. Le funzioni successive non devono apparire operative. Non importare dati o codice dal prototipo.

Limite tecnico iniziale: 20 MiB per file, un file per richiesta; nessun file vuoto. È un limite locale di implementazione, non la quota commerciale Free/Pro. ZIP: 1–50 documenti, somma originali al massimo 100 MiB. Il backend verifica byte e formato: nome/estensione/MIME dichiarato non bastano. Formati non supportati rifiutati. Hardening antimalware prima del pilota, nessuna promessa di scansione in questo incremento locale.

## Identità e riservatezza

Ogni documento appartiene a una Home identificata da UUID. Nessun accesso tramite indirizzo, nome, email o URL di storage. Permessi Home e validità della membership verificati dal server su upload, elenco, dettaglio, file ed export.

- Caricamento: permesso Home `edit` (owner/member).
- `visibility: private`, default: originale e metadati accessibili soltanto all'account che l'ha caricato, purché abbia ancora accesso alla casa. Il ruolo owner non concede lettura dei documenti privati di altri account.
- `visibility: home`: accessibile ai membri con permesso `read` valido. Scelta esplicita durante upload, con testo «Visibile alle persone che hanno accesso a questa casa». Default UI «Solo io».
- Download singolo: `read` Home più accesso al documento. ZIP: `export` Home più accesso a **ogni** documento selezionato. Se uno manca o è vietato, rifiutare l'intero ZIP senza esportare un sottoinsieme silenzioso.
- In questo incremento la visibilità non è modificabile dopo upload. Nessuna condivisione esterna. Uscire/vendere/scadere/revocare il diritto impedisce anche accesso al documento privato caricato in precedenza.

Documenti vietati assenti dall'elenco. ID valido inesistente, altrui o di altra casa: 403 generico, senza metadati. UUID invalido: 422. Originale conservato byte per byte; download non certifica contenuti, proprietà o validità tecnica.

## Trasporto e tipi

Base `/api/v5`. Credenziali cookie incluse; tutte le richieste mandano `X-Account-Context` catturato dal contesto del form/query. Tutti i POST richiedono Origin/CSRF. Niente token di autenticazione in URL. Cache HTTP `no-store`; cache frontend almeno accountId/homeId/documentId; abort e pulizia al logout/cambio account. Blob URL locali revocati al cambio contesto e allo smontaggio. Niente file/metadati/bozze private in localStorage.

```ts
type DocumentVisibility = 'private' | 'home';
type DocumentSummary = {
  id: string; homeId: string; name: string; originalFilename: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  byteSize: number; createdAt: string; version: 1;
  source: 'manual_upload'; status: 'stored'; visibility: DocumentVisibility;
  permissions: Array<'read' | 'export'>;
};
type DocumentDetail = DocumentSummary & { sha256: string };
type DocumentsPage = { items: DocumentSummary[]; nextCursor: string | null };
```

UUID per id, date ISO UTC, SHA-256 esadecimale minuscolo di 64 caratteri. `name` titolo scelto dall'utente, trim, 1–160 code point; default UI nome del file selezionato senza rimuovere l'estensione. `originalFilename` nome sicuro per visualizzazione/download, mai percorso. Nessun campo `confirmed`, nessuna deduzione di scadenze o schede impianti. Stato italiano «Originale caricato»; fonte «Caricato da te» solo se il backend lo identifica, altrimenti «Caricamento manuale».

## Endpoint

| Metodo / percorso | Input | Risposta |
|---|---|---|
| GET `/homes/:homeId/documents` | `limit` 1–50, default 20; `cursor` facoltativo | 200 DocumentsPage, ordine createdAt desc + id desc |
| POST `/homes/:homeId/documents` | multipart: `file`, `name`, `visibility`; header Idempotency-Key | 201 `{document: DocumentDetail}` |
| GET `/homes/:homeId/documents/:documentId` | Nessuno | 200 `{document: DocumentDetail}` |
| GET `/homes/:homeId/documents/:documentId/file` | Nessuno | 200 byte originali, Content-Type verificato, Content-Disposition attachment con nome sicuro |
| POST `/homes/:homeId/documents/export` | JSON `{documentIds: string[]}` | 200 application/zip, Content-Disposition attachment |

Multipart: il browser imposta boundary/Content-Type; non usare automaticamente application/json. Header Idempotency-Key come identity-v1.1: 16–100 ASCII alfanumerici/_/-, UUID ammesso; ambito account+home. Impronta comprende nome, visibilità, nome originale normalizzato e hash byte. Stessa chiave/payload ritorna lo stesso documento, anche dopo perdita della risposta; chiave con payload diverso 409 `idempotency_conflict`. Retry conserva file e chiave; edit del payload dopo invio ambiguo richiede nuova operazione esplicita. Mai retry automatico POST; doppio click disabilitato.

GET file: il client effettua fetch autenticato con Account-Context e tratta gli errori JSON prima di creare il Blob. Anteprima PDF/immagine usa i byte ricevuti; se il browser non supporta PDF, mostra download. Non aprire direttamente URL API privati senza header di contesto. Export avviato esplicitamente, non auto-avviato al mount. ZIP contiene file con nomi univoci sicuri e `manifest.json` con documentId, version, originalFilename, byteSize, sha256 e visibility; niente percorsi filesystem o dati non autorizzati. Export non modifica i documenti.

Le risposte d'errore seguono identity-v1.1. Codici aggiuntivi:

| HTTP / code | Significato |
|---|---|
| 413 / file_too_large | File oltre 20 MiB |
| 415 / unsupported_file_type | Formato non supportato o byte incompatibili |
| 422 / validation_error | Campo/file mancante o vuoto, lista export vuota/duplicata/oltre 50, cursor/UUID/limit invalido |
| 413 / export_too_large | Somma originali ZIP oltre 100 MiB |
| 503 / storage_unavailable | Scrittura/lettura/file ZIP non disponibile; niente errore contenente percorsi |

Altri codici identity-v1.1 invariati: csrf_invalid, account_context_changed, idempotency_conflict. 401 porta al login e pulisce dati; 403 blocca senza fallback. `fieldErrors` multipart può contenere file/name/visibility, export documentIds. Il frontend non trasforma un errore di storage in archivio vuoto o upload riuscito.

## Persistenza e accettazione Codex

Storage filesystem dedicato privato, mai sotto frontend/public. File UUID, nessun percorso scelto dal client. Staging, commit DB e finalizzazione coordinati: un upload fallito non produce un documento leggibile senza originale; cleanup controllato di staging/orfani. DB/file V5 soltanto. Non modificare schema o storage legacy.

Test di uscita: PDF/JPEG/PNG reali sintetici, hash e dimensioni identici dopo download; due Home di A e Home B isolate; private di A non visibile a member/owner diverso; home visibile solo con diritto valido; upload viewer negato; revoca blocca lista/dettaglio/file/export; idempotenza e doppio invio; file troppo grande/vuoto/spoof; nomi con traversal normalizzati senza uscire dallo storage; errori di scrittura senza documenti incompleti; ZIP selettivo autorizzato e integro; ricarica/login persistenti. UI verificata sul backend reale, anche a 320/390 pixel e su interruzione/errori.

## Confini del prossimo incremento

M2 non produce dati AI né schede «Da rivedere». M3 introdurrà proposte/campi/conferme/storia con contratto distinto. Nuove versioni, cestino, ricerca estesa, quote commerciali e link esterni seguono ticket dedicati. Le specifiche complete guidano il prodotto ma non rendono già operative queste funzioni.

## Stato implementazione backend
Codice M2 implementato da Codex con migrazione pronta e 31 test locali; runtime e 11 scenari API documentali da attivare con launcher -Documents -Test. Le forme di endpoint/tipi sopra sono invariate; frontend Claude procede sul contratto, niente dichiarazione di integrazione reale prima del collaudo.

## Accettazione M2
Backend e frontend integrati: 23 scenari API/DB/file e 6 frontend/API passano, collaudo browser completato il 13 ottobre 2026. Contratto documents-v1 attivo in locale. Dettagli nel report outputs/Dimora-V5-M2-esito-consolidato.md del workspace del committente.
