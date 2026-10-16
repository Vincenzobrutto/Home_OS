# personal-export-v1 — contratto per implementazione Fase 0

16 ottobre 2026. Specifica tecnica: endpoint NON implementato/attivo. Completa fase0-export-design-20261016.md senza modificare documents-v1 o introdurre cancellazione/trasferimento. Codex possiede implementazione e test; Claude valuta UX e corpus in parallelo, senza sorgenti runtime.

## Azione e confini

POST /api/v5/homes/:homeId/personal-export, body {} senza proprietà aggiuntive. Azione esplicita dell'utente, nessun mount/retry automatico. Sessione autenticata, Origin/CSRF, X-Account-Context obbligatorio uguale alla sessione, homeId UUID e membership attuale con permesso export (owner/member; viewer negato). Nessun accountId scelto nel body o query. Non richiede una nuova chiamata AI o email.

200 allegato JSON UTF-8, Content-Disposition attachment con nome generato sicuro dimora-casa-<UUID>-dati.json; Cache-Control no-store e X-Content-Type-Options nosniff. Nessun file generato in cartella pubblica, link permanente o job in background. Nessun originale binario: il download ZIP selettivo M2 resta separato, massimo50 documenti/100MiB, con i suoi controlli autorizzazione/integrità.

## Envelope e contenuti

Envelope: format='dimora-personal-home-export', formatVersion=1, generatedAt ISO UTC, scope={homeId,accountId}, account={id,name,email}, home={id,name,address}, data, limitations. I campi null restano null; date calendario YYYY-MM-DD invariate, istanti ISO UTC, importi interi in centesimi. Valuta EUR, come contratto economico corrente; nessuna conversione o previsione. Ordinamento stabile per id per gli insiemi, at/id per storia. Conteggi derivati solo dalle righe incluse.

Ogni sezione ha mapper allowlist esplicito; vietato spread/serializzazione di record Prisma o JSON di storia/provenienza senza selezione di campi. Campi sconosciuti non diventano esportabili automaticamente quando cresce lo schema.

| data | Inclusione e campi |
|---|---|
| documents | Solo uploader corrente, nella Home accessibile. id,name,visibility,createdAt e original={version,originalFilename,mimeType,byteSize,sha256}. Nessun storageKey/percorso; nessuna asserzione che il file sia ancora fisicamente disponibile, né che sia innocuo |
| objects | Solo account/home correnti: id,name,type,note,state,version,createdAt,updatedAt; inclusi archiviati |
| technicalAssets | Solo account/home correnti e accesso effettivo compatibile con ReviewService.asset/assetSources. id,name,version,createdAt, confirmed con soli campi del dominio corrente: fieldKey,value,revision,origin,note,confirmedAt e fonti ammesse. Nessuna proposta/risposta provider |
| rooms e positions | Soltanto stanze referenziate da posizioni dei soggetti inclusi: id,name,type,state; niente note di stanze comuni. Posizione: soggetto tipizzato object/boiler e roomIds limitati alle stanze incluse |
| activities | Solo account/home: id,title,description,dueDate,state,version,createdAt,updatedAt,completedAt,cancelledAt; assetId solo se soggetto incluso |
| expenses | Solo account/home, inclusi archiviati: id,title,amountCents,currency,spentOn,note,state,category,supplier,documentNumber,documentDate,competenceFrom,competenceTo,dueOn,amountOrigin,version,createdAt,updatedAt,archivedAt. documentId/assetId/workId solo per estremi inclusi; nessun analysisDraftId |
| works | Solo account/home, inclusi archiviati: id,name,note,state,version,createdAt,updatedAt,archivedAt; activityId soltanto se incluso |
| links | Solo account/home, soggetto e risorsa entrambi inclusi/leggibili: id, soggetto tipizzato, risorsa tipizzata, state,version,createdAt,updatedAt. Nessun collegamento capace di ricostruire identità di risorse escluse |
| history | Eventi significativi delle risorse incluse, account corrente quando presente: tipo risorsa/id,kind,at e snapshot before/after con la stessa allowlist della risorsa; fonti conferme con la medesima regola delle fonti. Nessun payload raw, token, identificativo job/provider o risposta idempotente |

La forma definitiva dei mapper di storia deve essere verificata contro i record reali dei servizi prima dell'attivazione. Un tipo di evento non riconosciuto non viene esportato come JSON grezzo; si mantiene solo metadato tipizzato dell'evento se autorizzato, indicando in limitations che gli snapshot di alcuni eventi non sono disponibili nel formato1. Non si presenta l'export come copia integrale dell'account.

## Privacy di fonti e riferimenti

La proprietà dell'asset non basta: mantenere i controlli sulle sue fonti. Una scheda che l'API di dominio non consente di leggere non può riapparire attraverso l'export. Fonti di documenti caricati da altri, anche se leggibili, non entrano nel pacchetto personale: omettere id/nome/SHA/pagina/estratto e indicare solo che alcuni riferimenti sono esclusi. Valori confermati propri restano distinguibili dalla provenienza omessa, quando la scheda è ancora autorizzata.

Per gli altri collegamenti si conserva la risorsa propria leggibile e si azzera il riferimento vietato; nessun nome alternativo, conteggio dei dati altrui, UUID o nota ricostruita dalla risorsa esclusa. Il testo libero scritto dall'utente nei propri dati è esportato come tale, senza promettere una classificazione automatica dei dati personali contenuti nel testo.

Esclusi dal formato1: operazioni C1/condivisioni (token, comparisonCode, claim, destinatari), dati ricevuti, proposte e bozze AI, log tecnici/costi provider, chiavi API, password hash, sessioni, challenge, throttle, richieste idempotenti. La presenza di contenuto nella Home non equivale a proprietà o diritto perpetuo. Uscita/vendita e revoca seguono le decisioni di ciclo di vita esistenti.

## Coerenza, risorse e autorizzazione finale

Letture in transazione RepeatableRead, timeout15s/maxWait15s. Massimo2 costruzioni contemporanee per processo, slot rilasciato anche dopo errore. Massimo10000 righe complessive candidate (incluse storie/collegamenti); ogni query limitata al budget residuo+1, senza caricamento illimitato prima del controllo. Massimo10MiB UTF-8 di risposta; nessun troncamento silenzioso o successo parziale se superato.

Dopo la costruzione e fuori dallo snapshot, ricontrollare sessione corrente/context e membership/export con lettura fresca prima dell'invio. Una rilettura dentro lo stesso snapshot non dimostra che una revoca appena committata sia stata osservata. Il collaudo deve controllare esplicitamente questa finestra; nessuna pretesa di ritirare byte già consegnati. Non accettare errori di autorizzazione come semplici sezioni vuote.

Errori: identity-v1.1 per401/403/422; 413 personal_export_too_large per budget righe/byte, 503 personal_export_busy per concorrenza, 503 personal_export_unavailable per costruzione/DB falliti. Nessun contenuto parziale, stack, campo sensibile o percorso negli errori. Il formato non promette importazione/reimport, cancellazione né adempimento legale.

## Prove richieste prima dell'attivazione

1. Mapper allowlist: proprietà inattese, dati di sicurezza e JSON storici non riconosciuti mai propagati; null/date/importi identici.
2. Account A/B nella stessa Home e seconda Home: nessun dato privato incrociato, ruolo owner non supera privacy; viewer/contesto assente o cambiato/CSRF negati.
3. Asset e fonti: scheda propria con fonte altrui ora vietata non esportabile; fonte altrui leggibile senza estratto/identificativi nel pacchetto personale.
4. Oggetti/attività/spese/lavori archiviati inclusi quando autorizzati; estremi vietati omessi senza nome, UUID o residui nella storia.
5. Snapshot coerente e revoca/logout durante costruzione: controllo finale su lettura fresca, niente consegna dopo revoca rilevata.
6. Budget righe/byte e due slot: errore intero, memoria limitata e slot liberati al retry. Nessun test di saturazione del DB reale.
7. HTTP su sole fixture sintetiche: allegato JSON/versione/header corretti, nessuna scrittura dei dati esportati; ZIP M2 e controlli upload invariati. Nessuna chiamata provider o email.

Prima della prova personale restano distinti: custodia chiave backup fuori PC, politica cloud Defender, limiti di conservazione e accuratezza AI. Nessuna attivazione implicita di provider per completare l'export.
