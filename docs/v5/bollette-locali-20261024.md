# Bollette: riconoscimento e precompilazione locale — 24 ottobre 2026

Consegna: [PR #24](https://github.com/Vincenzobrutto/Home_OS/pull/24) verso il consolidamento, commit prodotto `5c615be7f90e2cb2fda1ca3843c60ebe9ef18b17` pubblicato e verificato con `git ls-remote`. Nessun merge eseguito; l’app corrente non è stata aggiornata.

## Ambito e origine

Lotto `codex/bollette-locali-20261024`, worktree dedicato dal consolidamento remoto `e8ac99fca531f42b57d1b70b67cf63de9c34014c`. Registrazione prima del codice nel commit `3edcd75`. Verificati i file dei branch Claude cestino backend e frontend: il servizio onboarding backend è occupato, quindi non è stato modificato. Questo lotto cambia esclusivamente moduli/test frontend di compilazione e documentazione condivisa. Nessuna dipendenza aggiunta.

Il percorso manuale precedente riconosceva una bolletta soltanto se il tipo era già nell’organizzazione. Il classificatore intake locale individua alcuni tipi ma non alimenta i campi economici della bozza manuale. Senza proposte di spesa la compilazione inizializzava «Conserva solo il documento». L’anteprima PDF non equivale a una lettura dei suoi dati.

## Comportamento implementato

- Il browser legge i byte tramite il download originale già autorizzato, senza API nuove. Soltanto bozze manuali aperte e vuote di PDF non classificati o bollette; nessuna sostituzione di compilazioni salvate, conferme, proposte esistenti o bozze AI. Il nome del file non è un segnale.
- Prima della lettura confronta SHA-256 dei byte e snapshot. Chiave temporanea scoped account/casa/documento/versione/SHA, `gcTime:0`; testo non scritto in storage o repository. Errori di accesso 401/403 interrompono la visualizzazione. Nessun canale esterno.
- PDF.js già presente, worker e risorse locali: massimo 10 MiB, 20 pagine, 100.000 caratteri e 10 secondi di parsing; distruzione del documento al termine, su errore o annullamento. Non viene eseguito OCR.
- Regole generali: segnale di fatturazione, intestazione coerente e servizio elettrico/gas/idrico/telefonico; escluse offerte/esempi e negazioni. Niente cataloghi di fornitori o condizioni speciali per gli esempi del committente. Informazioni commerciali nel fondo di una vera bolletta non la rendono un preventivo.
- Tipo proposto Bolletta, percorso già esistente senza oggetti e con scheda Spese. Allineamento della sola bozza tramite endpoint `document-kind` preesistente; non è una conferma di documento, spesa, oggetto o contatto.
- Proposte modificabili: fornitore con ruolo esplicito o intestazione legale iniziale univoca; totale positivo con etichetta esplicita; emissione e scadenza distinte; periodo con estremi espliciti o mese civile. Totali/date/fornitori/periodi discordanti restano vuoti, nessuna somma o ripartizione; due numeri fattura distinti impediscono la proposta unica.
- Una categoria mista non viene scelta arbitrariamente. Non si deducono pagamento, consegna, promemoria o oggetti. Gli importi sono nei form manuali, non candidati server né evidenze AI inventate. Stesso serializzatore canonico, controllo doppioni, validazioni, versioni e idempotenza della conferma.
- Schede e pagina unica usano lo stesso risultato. Ritorni e ricontrolli non smontano un modulo già compilato dopo un precedente errore della lettura locale.

## Verifiche

Test mirati finali: **37/37** (regole generali, limiti/annullamento/errori PDF, impronta, due viste UI con payload completo dei valori della spesa). La suite manuale precedente mantiene tutte le asserzioni; aggiunti soltanto mock del lettore PDF per il fallback e preload della rotta lazy prima dei test, senza cambiare timeout o aspettative.

Typecheck, lint e build superati. **Suite mock completa 947/947, 111 file**, nessun test saltato e retry zero, due worker; durata 666.86 secondi. Build Vite 16,27 secondi. Runner con ambiente depurato e preload di rete offline, envDir vuota e backend simulato in memoria. Nessun collaudo sul browser o sull’app reale dichiarato.

I flussi UI usano esclusivamente backend in memoria: nessuna conferma prima dell’azione di salvataggio, nessun endpoint AI chiamato, zero oggetti nel payload e spesa soltanto al click finale. I test PDF verificano SHA errato senza apertura del parser, dimensioni/pagine/testo e assenza di testo, distruzione su errore e annullamento prima dell’avvio. Nessun DB utilizzato, quindi nessun collaudo DB dichiarato.

## Limiti e prova sul materiale già fornito

Una verifica separata in memoria sulla copia anonimizzata della bolletta già fornita ha restituito `pdf_text_unavailable` con il lettore locale preesistente. Non prova che il documento attualmente caricato nell’app contenga lo stesso testo: DB, API e storage reali non sono stati letti. Non si dichiara riuscita la precompilazione di quel file. Non sono stati aggiunti originali personali, estratti o risposte AI al repository.

Scansioni, fotografie e anonimizzazioni rasterizzate richiedono OCR; ora il percorso segnala esplicitamente l’assenza di testo estraibile. Layout a colonne, loghi senza testo, etichette non riconosciute e importi con formati non italiani possono lasciare campi vuoti. Le proposte locali non sono una certificazione. OCR locale e prova sul file effettivo sono passi distinti ancora aperti.

Nessuna AI/email, DB/API/storage reale, migrazione, `.env`, ledger, file orfani o servizio dell’app modificati. Nessun merge, force push, reset, clean o rimozione worktree. La PR richiede revisione e merge del committente prima dell’eventuale aggiornamento dell’app.

I primi giri mirati hanno individuato un prop mancante nella scheda Spese e un ricontrollo fallito che poteva smontare i form: corretti nel prodotto. Corrette inoltre le fixture del nuovo test (newline e label), il reset dei mock e il preload della rotta lazy; nessuna asserzione precedente indebolita né timeout aumentato. Primo tentativo fermato prima dei test da EPERM sulla cache Windows, rieseguito con le stesse guardie offline.

## Merge approvato e aggiornamento dell’app — 24 ottobre 2026

Il committente ha approvato l’integrazione della PR #24 e l’aggiornamento dell’app. Merge `2ab757034e268498819fa8d530cf59f2aab00984` confermato da GitHub e `git ls-remote`; main resta `cdbb318ddb56e764ad4b111a71560e3e71c7a033`. Nessuna modifica backend nel merge. Frontend integrato e frontend del lotto hanno tree identico `4858a60c316d321db8d25e33fc85d45cbbb0fce9`: riutilizzata la build già verificata, nessuna variazione al prodotto dopo i 947/947 mock.

Aggiornato il solo launcher frontend di collaudo per il worktree di questo lotto e riavviato il solo processo Vite identificato: precedente PID37612, nuovo PID27220, loopback5174. API10540 su3011 e PostgreSQL22924 restano attivi con gli stessi orari di avvio. Guardie di rete e modalità interactive-manual-no-ai preservate; nessun .env modificato.

Verifiche READ ONLY senza sessione: root200; moduli OnboardingPage/localBill serviti con il nuovo collegamento; proxy /api/v5/homes401 e header interactive-manual-no-ai/roma-consolidata-112ad05-no-ai. Questi controlli confermano la versione servita, non una precompilazione riuscita sul documento reale. Nessun browser autenticato, query SQL, caricamento, apertura di bozze, conferma, migrazione o AI eseguiti. Il limite OCR resta aperto.

Questa registrazione successiva al merge è documentazione sul branch del lotto; non è un secondo aggiornamento del prodotto nel consolidamento.
