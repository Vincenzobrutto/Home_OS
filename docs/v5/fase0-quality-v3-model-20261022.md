# Fase 0 qualità AI v3 — adattatore e ciclo progressivo, 22 ottobre 2026

Implementati sul branch `codex/fase0-ai-quality-v3`, dopo il checkpoint ledger `743e007`. Nessun invio AI/email o spesa; nessuna modifica a `.env`, quote, API o DB dell’app. Tutte le risposte HTTP sono simulate in memoria, senza socket verso Anthropic.

## Percorso dell’adattatore

`backend-v5/test/quality-v3-model.cjs` espone `createModelAdapter({transport, model, parser?})`. Il trasporto è obbligatorio: non esiste un default live e non vengono lette chiavi AI. Il corpus caricato è soltanto quello sintetico con hash versionati. L’adattatore riusa `ObjectOnboardingAnthropicProvider.prepare/decode`, `AnthropicTransport.prepareStructured/send`, validazione delle evidenze, `onboardingUsageCost`, `automaticPlan` e `progressiveComplete` del prodotto.

La prova HTTP sostituisce esclusivamente `fetchImpl` del trasporto con risposte in memoria per metadata del modello, `count_tokens` e `messages`; schema, caching, costruzione e parsing delle richieste rimangono reali. Il parser reale attraversa tutti i PDF testuali, scansioni e JPEG/PNG. Il ledger prenota prima di qualsiasi preparazione che possa trasmettere il documento. Callback di autorizzazione rivalidano membership, fonte privata, account/casa, versione/SHA e stato `sending` prima del conteggio, prima dell’invio e dopo la risposta.

Decoding e politica decidono l’esito: il chiamante non può sostituirli con un’etichetta automatica. I contatti non ricevono un nuovo opt-in di salvataggio. Le citazioni restano vincolate alle sole pagine effettivamente inviate. Per lo scorer si usano le pagine del contesto del parser reale, non pagine fornite dal chiamante.

Se usage/modello/costo non sono validabili, l’esito rimane incerto con riserva intera. Se il costo è noto ma decoding, citazione o stop reason sono invalidi, il costo viene liquidato e l’esito resta in revisione, con errore fisso e completezza falsa. La perdita dell’autorizzazione dopo una risposta conserva il costo noto e sopprime output e permesso automatico. Non si ritenta.

## Ciclo progressivo e persistenza

`runProgressiveCampaign({item,provider,ledger,signal?})` invia il prefisso **1…n** per ogni passaggio. Il nuovo prefisso è una nuova richiesta con prenotazione separata; un prefisso già liquidato non viene inviato di nuovo. I prefissi cumulativi mantengono un solo output coerente validato, senza fondere fatti di risposte diverse. Il costo delle pagine ripetute resta da misurare nella campagna: nessun risparmio è presunto.

Prima di avanzare si legge l’esito persistito: completezza raggiunta → arresto; risultato valido incompleto → prefisso successivo; risposta invalida, esito incerto, annullamento o tetto → arresto. L’esaurimento delle pagine resta distinto dalla completezza. Un crash prima di conoscere l’esito blocca anche le pagine successive alla ripresa. Due cicli concorrenti non ottengono due invii dello stesso prefisso. La risposta già in volo può liquidare il proprio costo, senza consentire un nuovo invio.

Il preparatore testuale aveva una lacuna: `progressive` selezionava tutte le pagine. Ora invia solo il prefisso richiesto e ne valida i limiti. La versione della lettura passa a **`onboarding-reading-v2`**, quella dell’adattatore è **`quality-v3-model-v1`**; prompt e schema restano v22. Versioni e protocollo entrano nel digest: non riutilizzare una campagna precedente per cambiare protocollo e non azzerarne il ledger.

Il JSON del tentativo usa `quality-v3-score-v2` per score e metadati minimi: completezza, decisione automatica, errore enumerato, modalità/versione/pagine fisiche inviate e usage aggregato. Nessuna risposta grezza, prompt, estratto o titolo viene conservato. `quality-v3-score-v1` resta leggibile per i precedenti test generici, senza inventare una completezza mancante. Il ledger verifica che il piano di lettura persistito corrisponda alla richiesta prenotata.

**Completezza non significa permesso di salvare.** Nelle prove una scansione classificata può completare la lettura; la politica reale mantiene `review` perché le evidenze visive non sono testo verificato.

## Verifiche

Verifica finale completata, exit code 0 per tutti i comandi da `backend-v5`:

```powershell
npm run lint
npm run test:quality-v3
npm run test:object-onboarding
npm run test:quality-v3-db -- -PgBin '<binari PostgreSQL locali>' -ScratchRoot '<cartella di lavoro esterna al repository>'
```

Lo script DB crea un cluster vuoto sulla porta 55433, applica soltanto lì le migrazioni esistenti, esegue ledger e adattatore, riavvia il cluster per provare la ripresa e lo spegne nel `finally`. Nessuna modifica a schema, DB o processo dell’app sulla 55432. Directory di collaudo conservata, nessun reset/clean o cancellazione.

| Verifica finale | Esito |
|---|---:|
| Build e lint backend | verdi |
| Corpus/parser/lettura/scorer/runner/adattatore | 24/24 |
| Ledger e adattatore/ciclo su PostgreSQL isolato | 23/23 |
| Ripresa dopo riavvio effettivo PostgreSQL | 2/2 |
| Regressioni onboarding | 148/148 |
| Matrice dei 52 originali con due ripetizioni | 104 liquidazioni simulate |
| HTTP di metadata/conteggio/analisi al replay della matrice | 0 |

La suite DB finale è unica e completa (72,06 s), seguita dai due test dopo riavvio (1,28 s). La suite offline finale dura 30,24 s. La prova concorrente aveva inizialmente segnalato che il controllo pre-invio veniva riutilizzato dopo la risposta: la ripresa concorrente marcava `uncertain` e impediva di completare l’unica risposta già in volo. Corretto distinguendo controllo prima di trasferimento e rivalidazione dopo ricezione, senza cambiare l’asserzione e senza consentire retry; l’intera suite è stata ripetuta da un cluster vuoto ed è verde.

Le suite generali backend 213/213 e frontend typecheck/lint + mock 822/822 restano le verifiche precedenti di `62b17c0`, non ripetute qui. Nessun file frontend modificato.

La matrice offline attraversa i **52 originali in due ripetizioni (104 richieste simulate)**, con parsing/preparazione/decoding/politica reali. Il replay deve produrre zero richieste HTTP, incluso il conteggio token. Le risposte conservative `unsupported/review` e l’usage di prova non misurano accuratezza o costi reali.

Le prove mirate coprono anche classificazione testuale corretta, rendering reale delle scansioni, arresto alla prima pagina completa, ripresa da nuovo processo del prefisso incompleto, crash durante `messages`, rifiuto di citazioni fuori prefisso, output invalido ma tariffabile, tetto monetario e di chiamate prima del successivo conteggio/invio, concorrenza, revoca/annullamento prima e dopo risposta, ripresa della completezza dopo riavvio PostgreSQL e assenza di creazioni di oggetti/spese/contatti.

## Cosa resta da autorizzare e misurare

L’adattatore e il ciclo sono **implementati e verificati offline** con il trasporto simulato. Accuratezza, stabilità AI e confronto del costo delle modalità rimangono da misurare su risposte effettive, con tetto sintetico proposto **12 USD/150 chiamate** e autorizzazione esplicita prima di spendere. Nessuna campagna AI è avviata da questo incarico. Fonte completa resta predefinita; non si adotta una modalità più economica sulla base delle risposte finte.

Il successivo invio dei 10–15 originali reali richiede selezione/gold confermati dal committente, consenso specifico e tetto separato. I circa 52 casi costituiscono un cancello per il pilota, non una stima di affidabilità generale.
