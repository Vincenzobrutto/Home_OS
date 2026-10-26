# Spese a pagina unica — 27 ottobre 2026

## Incarico e perimetro

Il committente approva il layout della preview convergente, basato sullo screenshot Claude: periodo compatto in alto, elenco a sinistra, totale e grafico a destra; su mobile totale compatto e analisi espandibile dopo l’elenco. Chiede implementazione in un lotto separato, test offline e PR, senza AI o modifiche ai dati reali.

Base remota dopo `git fetch origin`: `e4e24b322df1c58cf39ccda31f265baf4fd7770f`. Branch `codex/spese-pagina-unica-20261027`, worktree dedicato `Dimora-V5-spese-pagina-unica-20261027`. Lotto registrato prima del codice con `07394fb`. Verificati AGENTS.md, istruzioni frontend e tabella dei lotti: nessuna modifica ai file Cestino/Claude o al checkout Home_OS.

Solo frontend e documentazione: nessun backend, client API, schema, migrazione, dato reale, `.env`, dipendenza o quota modificati. Nessun aggiornamento dell’app in uso, main o consolidamento. I dati della preview non sono importati nell’app.

## Comportamento implementato

- Anno, Mese e Intervallo sono il primo comando della pagina. Il mese diventa un intervallo sul contratto esistente: mese completo per il passato, fino al giorno corrente del servizio per il mese in corso. Anno bisestile e anni con zeri iniziali verificati. Nessuna deduzione del mese fattura dal periodo dei servizi.
- L’indicazione UI `mese=AAAA-MM` accompagna `dal/al`, viene mantenuta nei filtri e nel ritorno dal dettaglio solo se coincide con l’intervallo. Non è inviata al backend. Ricerca privata nello stato account/casa, mai nell’URL, come prima.
- `vista=elenco` e i vecchi indirizzi `vista=panoramica` conducono allo stesso spazio di lavoro. Nessuna scelta di vista salvata in sessionStorage viene più applicata al nuovo ingresso. Per oggetto, per lavoro e tabella riepilogativa restano disponibili nelle opzioni progressive e nei link esistenti.
- Elenco keyset invariato, 20 righe per pagina e caricamento esplicito delle successive. Ritorno dal dettaglio con numero pagine, posizione e focus preservati. Righe compatte senza rimuovere le etichette di mese fattura, emissione, scadenza e collegamenti.
- Totale, distribuzione e confronto complessivo provengono dal riepilogo server dell’intero insieme filtrato, mai dalla pagina corrente. Gli importi restano stringhe di centesimi/BigInt nei componenti canonici.
- Acquisti e Interventi usano al massimo due ulteriori `GET summary` filtrate sui rispettivi gruppi; riusano cache e chiavi scoped account/casa. Categoria, origine, ricerca, oggetto, ambiente, lavoro e documento vengono mantenuti anche nel confronto storico. Gruppi incompatibili con famiglia/categoria scelte non sono mostrati né interrogati. Le schede filtrano o rimuovono il proprio gruppo.
- Storico assente o errore di servizio non sono presentati come risparmio o zero certo. Un 403 del confronto applica lo stesso percorso di pulizia/rilettura della casa del riepilogo canonico.
- Lo stato delle archiviate non è supportato dai riepiloghi server, che contano le attive: quando l’elenco comprende archiviate nascondiamo riepiloghi/confronti e mostriamo una spiegazione. Anche il vecchio link alla tabella riepilogativa rispetta questa distinzione.
- Su desktop il pannello analisi è aperto a destra; su mobile è un `details` nativo, chiuso inizialmente e dopo l’elenco, con riepilogo compatto prima dei filtri. La scelta resta mentre cambiano filtri/periodo; al cambio di fascia responsive viene applicata la disposizione adatta.

## Audit incorporato e differenze dalla preview

Elenco prima dell’analisi nel percorso principale; ambito dei filtri unico e dichiarato; campi di input e relativa validazione riusano `EconomyExpenseForm` senza copiarne il codice; il dettaglio rimane una pagina canonica, non una nuova finestra. Il suo ritorno ripristina il focus sulla riga. Le correzioni di errori e focus della preview non introducono un secondo editor nell’app.

Il prototipo mostra subtotali mensili e ricerca estesa sul suo dataset completo inventato. Il contratto reale non offre quegli aggregati e la ricerca corrente riguarda descrizione/fornitore: non li simuliamo sommando le pagine caricate né ampliamo il significato dei filtri. Roadmap separata per subtotali mensili completi, aggregato per oggetto, ricerca estesa, bollette senza mese e confronto per gruppo in risposta unica.

## Verifiche

Test esclusivamente con FakeBackend in memoria. Il runner locale fuori dal repository ripulisce l’ambiente con `cleanEnvironment(..., 'unit')` e carica le guardie rete/Prisma: nessuna credenziale o destinazione reale. Un worker, retry 0, nessuna modifica a timeout, gold o asserzioni di privacy/idempotenza.

### Primi tentativi e diagnosi

1. Primo avvio sandbox: errore EPERM nella rinomina della cache temporanea Vitest; nessun test eseguito. Il controllo statico iniziale passa. Ripartenza con temporanei del task e guardie offline, fuori dal sandbox.
2. Primo gruppo: 19/27. Tre errori di import del worker PDF dovuti alla junction delle dipendenze, come già documentato nei lotti precedenti; usato override Vite esterno con il percorso fisico del worker, senza cambiare prodotto o validazioni. Le altre attese riguardavano nomi/pagina Panoramica eliminata; preservate somme, dati, privacy e paginazione, aggiornando solo il percorso UI.
3. Secondo gruppo: 44/45. Nuovi confronti rendevano ambiguo un selettore sullo storico assente: circoscritto alla sezione del confronto totale. Successivamente rilevato un riferimento DOM obsoleto al cambio periodo: il test rilegge ora la sezione a ogni attesa, stessa asserzione. Riproduzione mirata verde.
4. Prima completa interrotta dopo l’unico caso rosso sopra, per ripartire dalle correzioni. Non è dichiarata completa o verde. Nessuna suite DB/API reale eseguita.

### Esiti finali

- Suite mock completa: **1569/1569**, **151 file**, 947,12 secondi, un worker e retry 0; nessun caso saltato o todo. Log locale work/spese-implementation-mock-final.log.
- Nuovi casi del lotto: **19/19** (5 percorsi UI e 14 sul periodo), anche nella ripetizione mirata finale; log work/spese-implementation-new-final.log.
- Fixture locali: **5/5**, inclusi worker/WASM/modello italiano su scansione sintetica, senza rete.
- Typecheck, lint e build frontend superati. Ultima build confermata dopo le sole rifiniture CSS tablet; nessuna build attivata nell’app in uso.
- Diff controllato: solo frontend e documentazione; nessun backend, API, schema, migrazione, dipendenza o dato reale.

Comandi logici: npx vitest run --project mock --maxWorkers=1 --retry=0; npx vitest run --project fixtures --maxWorkers=1 --retry=0; tsc -b --noEmit; eslint .; vite build. Eseguiti attraverso il runner locale esterno con ambiente ripulito e guardie offline. Per la junction delle dipendenze usato solo l’override Vite esterno già descritto. Nessuna asserzione, gold, timeout o validazione indeboliti.

### Browser del candidato

Harness esterno al repository, compilato dagli stessi componenti dell’app e collegato al solo FakeBackend in memoria; origine consentita `http://127.0.0.1:5197/implementation/`. Playwright soddisfa le richieste statiche dai file locali della build; qualsiasi altra origine, percorso o metodo di rete viene bloccato. Nessun server API o database viene avviato. Login e dati sono sintetici; dopo l’apertura i percorsi provati non eseguono scritture, neppure verso il simulatore.

Desktop 1440×1024, mobile 390×844/320×844 e tablet 873×805: disposizione, densità e apertura analisi osservate con screenshot salvati e ispezionati. Mese settembre → Bollette → Internet restituisce una registrazione da 32,90 euro, con emissione e scadenza separate. Corretta una riga di date che invadeva la colonna laterale, poi ricatturata. Gli artefatti interni `outputs/spese-implementazione-20261027/` contengono immagini e misure, senza documenti del cliente.

Non è una prova dell’app reale, né di Safari/iPhone fisico o screen reader. Nessuna dichiarazione di conformità completa all’accessibilità. Nessun salvataggio reale o invio AI.

## Consegna e prossimi passi

Merge e successivo aggiornamento dell’app restano al committente. Dopo approvazione: attivazione del solo frontend candidato e verifica manuale nella casa scelta; nessuna migrazione necessaria. Il normale inserimento richiede sempre l’azione esplicita dell’utente.
