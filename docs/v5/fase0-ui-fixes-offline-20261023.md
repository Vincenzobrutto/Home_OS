# Fase 0 — tre anomalie UI corrette e verificate offline, 23 ottobre 2026

## Esito e ambito

Corrette sincronizzazione dell’archiviazione manuale, acquisizione degli eventi dei campi data e ripresa durevole delle conferme parziali. Verifica con frontend/API veri e DB/storage nuovi su loopback, senza AI, email, `.env`, dati o servizi dell’app. Base `5ee6de8`, branch `codex/fase0-ai-quality-v3`. Nessun cambio di schema, migrazione o regola sui documenti d’esempio.

## Cause e correzioni

1. **Primo salvataggio**: riprodotto con ordine, oggetto e costo in due case temporanee. Diagnostica raccolta: HTTP 409 `batch_version_conflict`; il lotto avanzato dalla lettura locale del PDF aveva una versione diversa da quella usata dalla revisione. Il solo salvataggio documentale era riuscito. Nel workspace si rilegge ora il lotto prima di costruire la richiesta. Si confrontano identità casa/lotto/fonte, file, permessi, stato caricamento/revisione, organizzazione/versione, selezione e copia. Solo il contesto manuale invariato del documento selezionato può usare le versioni appena lette; fonte o decisioni cambiate fermano il salvataggio. Anche le versioni devono essere monotone. Il POST conserva CAS e tutti i controlli server di fonte/versione/SHA. Nessun reinvio automatico o nuova chiave dopo un esito incerto; un’ulteriore corsa tra GET e POST resta rifiutata dal server. Il messaggio conserva la spiegazione del rifiuto quando disponibile. Diagnostica temporanea rimossa.
2. **Data ordine intake**: il profilo ascoltava soltanto `change`; la riproduzione nel browser non trasferiva sempre il valore nativo della data al form React. Aggiunto `input`, mantenendo anche `change`, sullo stesso percorso di decisione manuale del campo. Test con solo evento `input`, modifica successiva del nome e conferma durevole: `orderDate` conservata, nessuna `purchaseDate`/garanzia/spesa dedotta. Nessuna data riscritta nei dati preesistenti.
3. **Conferma parziale**: il frontend salvava forme oggetto e richiesta pendente, ma non l’intero modulo economico; il server a conferma riuscita scartava la compilazione. Ora la richiesta pendente salva anche la compilazione e soltanto il comando esplicito Salva bozza ed esci chiude il workspace. L’intento di uscita è locale e mantenuto anche nel recupero della stessa richiesta; non viene aggiunto al payload API. Una conferma respinta salva gli input senza chiudere l’editor, verificata da regressione dedicata con HTTP 422. Dopo conferma restano i soli input degli elementi irrisolti e il loro contesto; i form risolti e la vecchia richiesta pendente vengono eliminati dalla revisione. Un costo rinviato rimane rinviato e mantiene titolo Acconto/Saldo e importo ancora vuoto; non diventa costo canonico. Selezioni, fonti e valori saranno rivalidati a ogni successiva conferma. Compilazioni legacy malformate non vengono ripristinate. Ledger e ricevute idempotenti non vengono cancellati.

## Percorso completo finale nel browser

Ambiente finale completamente nuovo: una casa e due stanze di collaudo, nessun documento/oggetto/costo iniziale. Frontend 5179, API 3109, DB `dimora_v5_quality_v3_test`/`quality_test` su 55433. Configurazione Vite con envDir vuoto; sola copia compilata adattata all’indirizzo DB temporaneo; guard del repository intatto, AI disabilitata e chiave provider rimossa dal processo. Seed limitato a account/casa/stanze, tutte le operazioni successive attraverso l’interfaccia. Originali reali anonimizzati già autorizzati, mai incorporati nel repository.

| Prova | Esito |
|---|---|
| Ordine caffè, dati inseriti manualmente | Primo Salva e continua riuscito, nessun secondo comando. Una scheda con marca/modello e data ordine 14 giugno 2026 inserita nell’intake; una spesa dichiarata di 499 EUR. |
| Scheda e stanza | Data ordine visibile nei dettagli senza reinserimento dalla scheda. Stanza Soggiorno collaudo scelta e salvata esplicitamente; nessuna collocazione dedotta. |
| Saldo prima dell’acconto | Tre schede dichiarate: due Sensira distinti e uno Stylish. Importo ambiguo rinviato e zero spese; successivo reload conserva Il saldo e Decidi più avanti. |
| Acconto successivo | Collegamento esplicito alle stesse tre schede; zero nuovi oggetti e zero nuove spese. Compilazione parziale salvata. |
| Ricaricamento dei tre originali, fatture invertite | Ordine già salvato con stesso costo; acconto riprende Un acconto e Decidi più avanti, zero schede da creare/collegare. Riconferma del rinvio senza nuovi oggetti o costi. |
| Scheda climatizzatore e Spese | Entrambe le fatture visibili sulla stessa scheda; nessun costo climatizzatori. Spese mostra 499 EUR, una registrazione, costo non pagamento. |
| SQL finale READ ONLY | 3 documenti, 4 oggetti, 1 spesa `user_declared`; ogni climatizzatore ha esattamente due fonti distinte, nessun collegamento duplicato. Profilo caffè: solo marca/modello/orderDate, nessuna data acquisto/consegna/garanzia. Zero job/tentativi AI. |

La prova è manuale, non OCR o misura della precompilazione AI. L’importo e la data contabile del costo sono dichiarazioni di collaudo, non attestazioni di pagamento. Nomi dei singoli esemplari e stanza sono scelte di prova. Durante il collaudo intermedio una scheda è stata riaperta dopo un timeout dello strumento. Il percorso è stato poi ripetuto interamente sul codice definitivo, usando Salva bozza ed esci prima di proseguire dall’archivio. Nessun aggiramento del controllo delle modifiche non salvate.

## Verifiche automatiche

- Backend build/lint, onboarding **276/276**, ordinari **214/214**.
- Frontend typecheck/lint; mirati **73/73** su onboarding, compilazione durevole, integrazione intake e organizzazione. Test della nuova ripresa corretto nel nome dell’intestazione attesa del percorso autonomo (Rivedi e organizza); nessuna asserzione di dati, privacy o idempotenza ridotta.
- DB temporaneo **84/84**: 82 controlli precedenti più ripresa durevole del costo rinviato in entrambi gli ordini; privacy tra owner, revoca, versione/SHA, concorrenza, replay da altro client, copie SHA, Q48 e formati generali. Nuovo cluster creato e fermato dal runner versionato `backend-v5/test/installment-offline.ps1`.
- Suite mock completa finale **842/842 (102 file)**, due worker e retry massimo 1 configurato, 499,09 secondi. Nessuna asserzione ridotta.
- Query finali nella sola istanza UI su 55433 in transazione READ ONLY. Servizi UI e cluster temporanei fermati, directory conservate. Le altre suite HTTP/DB non sono state ripetute.

## Vincoli e seguito

Nessun invio AI o email, consumo di budget, modifica a `.env`, DB/API/storage reale, main, gold, soglie, scorer, campagne o relativi ledger. I 104 StoredFile segnalati e i file sporchi estranei restano intatti. Nessun deploy. Non dichiarata maggiore accuratezza AI sui reali né promozione del gate. Prossimo passo: eventuale misura della precompilazione su documenti reali anonimizzati solo con consenso distinto, e ulteriori varianti offline senza regole per cliente.
