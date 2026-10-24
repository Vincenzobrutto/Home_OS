# Samsung v30 — diagnosi offline, 24 ottobre 2026

## Esito

**Causa specifica del rifiuto HTTP400 non accertata. Nessuna correzione di prodotto dichiarata.** Il secondo invio Samsung, autorizzato separatamente, ha ricevuto due preflight HTTP200 e Messages HTTP400; il codice applicativo è `provider_request_rejected`, lo stato del tentativo è `uncertain`, senza bozza. Non esiste una risposta di estrazione da confrontare con il documento. Il corpo dell'errore non è stato letto o salvato, quindi questa diagnosi non può ricostruirlo retroattivamente.

Base del lotto: `origin/codex/dimora-v5-consolidata-20261023` a `112ad051aa3c291ab56a88149af1d0beae0d0a63`, dopo fetch. Worktree separato `Dimora-V5-diagnosi-protocollo-20261024`, branch `codex/diagnosi-protocollo-20261024`; registrazione nel commit `f560e6f`, prima dei test. Nessun file del lotto Claude modificato. In questa sessione nessuna AI, preflight remoto, connessione DB, modifica di runtime, dato, ledger, migrazione o `.env`.

## Fatti verificati e limiti

Ricostruita localmente la preparazione dei due PDF già autorizzati, verificando i byte con il manifesto e l'hash del PDF incorporato nel payload. Parser e trasporto di prodotto reali, `fetchImpl` fittizio per metadata/conteggio, guardie offline di rete e costruzione Prisma attive con ambiente ripulito; nessuna chiamata Messages, nemmeno simulata, durante la ricostruzione sui PDF. I conteggi token fittizi non sono misure dei token reali. Originali, testo e payload non sono stati esportati nel repository o nei risultati: soltanto aggregati e schema di prodotto pubblico.

| Proprietà della preparazione | Caffè | Samsung |
| --- | --- | --- |
| Pagine fisiche inviate | 1 | 2 |
| Schema serializzato | 4.625 byte | 5.321 byte |
| Intera richiesta serializzata | 293.091 byte | 358.547 byte |
| Proprietà nello schema espanso | 53 | 80 |
| Parametri opzionali / unioni nello schema espanso | 0 / 0 | 0 / 0 |
| Riferimenti locali espansi | 0 | 3 |
| Prefill / tool / citazioni native API | assenti | assenti |
| Cache sistema / max_tokens | 5 minuti / 4.096 | 5 minuti / 4.096 |

La copertura per pagina resta presente. I riferimenti condivisi riducono la serializzazione; espandendoli Samsung conserva le 80 proprietà del contratto originale. Non è una misura della grammatica interna compilata dal provider, né esiste in questa diagnosi una soglia dimostrata di 80 proprietà.

Il conteggio token implementato dal trasporto invia `model`, `system` e `messages`, **non** `output_config`. Inoltre la documentazione descrive il token counting come privo di compilazione della grammatica. Un suo successo non prova la validità o accettazione remota dello schema. Il test riproduce il limite con uno schema sintetico non supportato: preflight simulati riusciti e successivo 400, senza leggere il corpo o ritentare.

La [documentazione ufficiale Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), consultata il 24 ottobre, supporta riferimenti locali e oggetti chiusi; indica limiti espliciti su parametri opzionali e unioni, più limiti interni non ricavabili dai soli byte. Non sono emersi nel sottoinsieme esaminato riferimenti esterni/irrisolti/ricorsivi, oggetti aperti, keyword non auditate o superamenti dei limiti espliciti. Questo esclude soltanto tali errori nel controllo locale, non incompatibilità interne o problemi del documento lato provider. Nessuna conclusione sulla qualità di lettura o sugli importi Samsung deriva dal 400.

## Verifica ripetibile e protezioni

Il nuovo helper `backend-v5/test/protocol-audit.cjs` opera solo nei test: visita il sottoinsieme usato dagli schemi di prodotto e restituisce numeri e codici prefissati, senza nomi di proprietà, stringhe enum, percorsi o contenuti passati in input. Non è un compilatore remoto, un validatore JSON Schema completo o un gate per autorizzare invii; gli indici espansi non vanno assunti come il metodo di conteggio interno del provider. Non è importato dal prodotto.

Tre gruppi aggiunti al profilo onboarding esistente, senza modificare il runner:

- audit degli schemi testo/immagine/PDF singolo e di tutte le selezioni contigue da 1 a 20 pagine, mantenendo esplicito `remoteAcceptance: not_proven`;
- controesempi sintetici per strutture aperte, riferimenti esterni/assenti/ricorsivi, constraint non auditati, minItems non supportato, enum complessi, required incoerente e superamento dei limiti opzionali/unioni; l'output non contiene le stringhe private dei controesempi;
- trasporto di prodotto con risposte fittizie: due preflight riusciti, Messages 400, diagnostica status/endpoint/request-id, zero letture del corpo dell'errore, nessun retry e stesso `provider_request_rejected`.

`npm run test:object-onboarding`: **316/316**, build inclusa, guardie offline attive. `npm run lint`: superato. Le asserzioni precedenti di privacy, copertura Q48, importi, fonti e idempotenza non sono cambiate. Nessun test DB o frontend rieseguito: nessun file runtime, schema di prodotto, API, decoder, gold o frontend modificato. I 498/498 DB della PR #20 restano un esito storico, non una verifica eseguita in questo lotto.

## Costi e prossimo passo

Dal ricontrollo del ledger precedente a questa sessione: 0,037809 USD settled per caffè e due prenotazioni Samsung incerte da 0,25 USD; impegno Roma prudenziale 0,537809 USD. In questa diagnosi il ledger non è stato collegato, resettato o modificato; costo AI aggiuntivo zero. La bozza caffè e le protezioni del browser restano quelle già predisposte.

Non procedere con altre semplificazioni speculative o altri invii. È disponibile localmente uno schema di riproduzione privo di dati personali da associare, se richiesto, al request-id già registrato per il provider; nessun contatto al supporto è stato effettuato. Un successivo lotto di diagnostica deve definire prima un metodo che restituisca una causa verificabile, preservando il divieto di leggere/loggare corpi che possono contenere documenti. Un nuovo invio o un contatto esterno richiedono incarico pertinente. La compatibilità remota rimane aperta; niente merge automatico.

Log e aggregati del task: `protocol-diagnosis-onboarding.log`, `protocol-diagnosis-lint.log`, `protocol-diagnosis-local.log`; consegna `Diagnosi-protocollo-offline-20261024.json` e schema pubblico locale. Nessun originale, ID di casa/account, credenziale o risposta personale inserito nella PR.
