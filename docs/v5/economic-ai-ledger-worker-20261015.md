# Anthropic economico — contatore dedicato e worker

15 ottobre 2026. Codex backend; incarico frontend separato a Claude nel workspace `outputs/Dimora-V5-incarico-Claude-consenso-Anthropic-economia.md`. Nessuna sovrapposizione frontend, push o modifica a main.

## Stato corrente

Adapter offline ora registrato e collegato al worker dietro configurazione economica dedicata, senza abilitare il provider. Il report `economic-anthropic-offline-20261015.md` rimane evidenza dell'incremento precedente: il suo blocco «ancora necessario» relativo a ledger/worker è superato da questo documento. Consenso frontend reale e collaudo live restano aperti.

Nessun valore aggiunto al file .env reale. Nel runtime `ai_provider_disabled`; verifica DB dopo le prove: EconomicAiAttempt=0, EconomicAiCampaign=0, AiAttempt M4=8. Non è stata avviata alcuna campagna economica o chiamata Anthropic. I record dei test isolati sono stati rimossi dal relativo teardown.

## Budget separato

Migrazione additiva `20261015090000_economic_ai_budget`, applicata esclusivamente a `dimora_v5_product_dev` su 127.0.0.1:55432. Tabelle EconomicAiCampaign e EconomicAiAttempt con FK ai job economici, senza riutilizzare AiAttempt/AiCampaign della caldaia. Contatori in microUSD interi, modello/prezzi/prompt versionati nel tentativo.

La configurazione richiede esplicitamente ECONOMY_AI_ENABLED=true, chiave disponibile, ECONOMY_AI_MODEL ammesso, ECONOMY_AI_CAMPAIGN_ID con prefisso economic-, ECONOMY_AI_BUDGET_USD e ECONOMY_AI_MAX_CALLS validi. Nessuna eredità dal plafond M4. Limiti tecnici massimi 10 USD/50 chiamate non sono un'autorizzazione a spenderli. I valori effettivi dovranno essere approvati dal committente. .env.example contiene soltanto campi vuoti e flag false.

Riserva 0,25 USD per Messages, entro i limiti di token e le tariffe ammesse. Il modello non è accettato se il massimo teorico supera la riserva. La campagna persistita non viene ampliata tramite restart o aumento dei valori env: conta il minore dei due limiti. Riserva con advisory lock nel medesimo commit di creazione job/request; replay idempotente non duplica il tentativo. Le capabilities derivano anche dall'effettiva disponibilità di budget e numero chiamate.

Prima di abilitare: verificare il modello e le tariffe correnti della tabella MODEL_PRICES, ottenere budget/campagna/call cap dedicati e attendere l'integrazione del consenso frontend. Nessun modello di default viene scelto per l'economia.

## Invio e recupero

Avvio e retry Anthropic richiedono consenso esplicito nel body. Worker con lease più lunga del timeout complessivo, parser PDF originale e autorizzazione membership/fonte immediatamente prima di count_tokens e prima del dispatch Messages. Ordine di lock coerente con le operazioni economiche: Home/account/fonte, poi job. Nessuna transazione di autorizzazione tenuta aperta durante HTTP.

Transizione reserved→sending persistita prima dell'invio, un solo mittente. Risposta/uso effettivo/costo persistiti prima della validazione delle citazioni e prima della pubblicazione. Un risultato con fonti false resta contabilizzato ma non crea bozza. Nessun costo della casa prima della conferma utente.

Fallimento prima del dispatch: reserved→released, zero effettivo. Dopo il dispatch senza risposta verificabile: sending→uncertain, riserva conservata. Nessun retry automatico; il servizio rifiuta un nuovo retry pagato sullo stesso job se il tentativo precedente è sending/uncertain, anche se l'errore del job era timeout o indisponibilità. Il costo API non entra mai in HomeExpense o nei grafici della casa.

Recovery con risposta già persistita usa i byte locali e la risposta salvata, senza metadata/count/Messages; può completare la pubblicazione anche se il precedente deadline è trascorso. Un tentativo già sending senza risposta non viene reinviato. Pubblicazione soggetta a lease/fonte/membership correnti; dati della fonte revocata redatti dalle proiezioni.

Job e bozza espongono modello reale quando presente; billing rispetta il formato congelato già previsto (reserved/settled/uncertain, importi USD stringa). Nessun cambiamento ai tipi wire o nuovi endpoint.

## Prove eseguite

- Build/lint backend verdi.
- 96 test offline verdi (`outputs/Dimora-V5-economic-ai-offline-final.log` nel workspace).
- 21 test S1c/ledger DB/HTTP verdi (`outputs/Dimora-V5-economic-ai-ledger-test.log`), PostgreSQL dedicato e parser reali, HTTP Anthropic integralmente stub.
- Coperti consenso mancante, provider default disabilitato, concorrenza/idempotenza, limite chiamate distinto dal budget, limite persistito non ampliabile, job/modello/billing, costo solo alla conferma, revoca fra metadata e conteggio senza testo trasmesso, perdita risposta, retry incerto rifiutato, crash con risposta salvata oltre deadline, nessun secondo invio, evidenza falsa comunque contabilizzata e registro M4 invariato.
- Un'asserzione iniziale cercava invalid_request invece del codice pubblico validation_error: corretto il test, poi suite verde. Un import test inutilizzato corretto dopo lint. Nessuna regressione del prodotto dedotta da questi due errori di test.

API registrata riavviata autonomamente con launcher -Resume -Restart; /api/v5/session raggiungibile. Arrestata solo l'API registrata/verificata per rigenerare Prisma, PostgreSQL preservato. Nessun test browser del provider reale, nessuna chiamata live né modifica frontend da Codex in questo incremento.

## Prossimo passaggio

Raccogliere la consegna Claude sul consenso e stati billing/errori; integrare e verificare con trasporto simulato. Successivamente rendere concreta la campagna live limitata, chiedendo autorizzazione al budget finale. Nessun lavoro continuato in background dopo il turno.
