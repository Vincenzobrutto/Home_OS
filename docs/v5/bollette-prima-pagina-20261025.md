# Bollette: riepilogo della prima pagina — 25 ottobre 2026

## Perimetro e diagnosi

Lotto codex/bollette-prima-pagina-20261025, worktree dedicato dal consolidamento 49635d8 dopo fetch; registrazione 90b5c04 prima del codice, implementazione 4419b02. Nessuna sovrapposizione con i lotti Claude: soltanto lettura locale frontend e test. Il committente richiede di leggere la prima pagina, senza cercare dati nelle successive. Nessun backend, API, schema, dipendenza o contratto di conferma modificato.

Sul PDF fornito, letto localmente nella sola prima pagina, il lettore precedente trovava già il totale 93,93 EUR, la scadenza e il mese. Non trovava fornitore né emissione: il nome era visibile nel logo e nell'app clienti; email, sito e data erano frammentati nell'ordine dei token PDF. Il marchio non è stato recuperato dall'OCR del logo. L'OCR locale della stessa pagina riconosce invece la data di emissione con le soglie esistenti.

La prova offline non riproduce lo stato della bozza reale: non attribuiamo con certezza il campo importo vuoto a una race. Il percorso precedente leggeva tutte le pagine e confrontava globalmente i totali; valori etichettati diversi potevano rendere l'importo ambiguo. Questo percorso viene ora escluso per decisione del committente. La prova UI sintetica verifica separatamente che i valori del riepilogo arrivino alla scheda Spese e che le correzioni manuali restino passando avanti/indietro; nessuna modifica a HouseExpenseProposal necessaria.

## Regole implementate

- localBillPdf legge e renderizza/OCRizza soltanto pagina 1; le altre pagine non entrano nel testo o negli indizi spaziali. Restano hash/versione del documento e limiti già esistenti di byte, numero pagine, testo, pixel e tempo. Se un dato esiste solo nelle pagine successive resta da confermare manualmente.
- Fornitore: oltre alle regole esplicite precedenti, un nome osservato nell'app clienti può essere proposto quando concorda con il dominio di entrambi i contatti etichettati E-MAIL e WEB. Nessun catalogo di aziende e nessuna derivazione del nome da un URL isolato; spazi attorno a @ ammessi come confine dei token PDF, lettere/cifre mai corrette. Marchi, contatti o domini discordanti/multipli non producono il suggerimento. Un fornitore esplicito o un'intestazione legale mantengono precedenza.
- OCR locale anche quando manca la data di emissione o il fornitore pur essendoci la relativa etichetta. Le soglie di confidenza, i controlli spaziali e le validazioni monetarie non cambiano. Dati nativi e OCR sono confrontati, senza cancellare contraddizioni; la voce canone inclusa nel totale non viene sommata o sottratta.
- Un errore nell'arricchimento OCR non scarta fornitore/importo già leggibili nativamente. La cancellazione non restituisce risultati tardivi; scansioni prive di una proposta nativa conservano il precedente errore e fallback manuale. Nessuna scrittura o conferma durante la lettura.

Nella verifica locale della prima pagina il risultato corretto è: Sorgenia, 93,93 EUR, aprile 2026, emissione 20/05/2026 e scadenza 09/06/2026. Fornitore e importo sono stati confermati dal committente. PDF, screenshot, testo, recapiti e dati personali non sono aggiunti al repository; fixture e test versionati sono sintetici e usano altri nomi/importi.

## Verifiche

Prima esecuzione mirata nativa: 70/71; falliva una vecchia aspettativa che escludeva dal contesto OCR la tabella originariamente in seconda pagina. La fixture positiva è stata adattata al nuovo contratto prima-pagina, mantenendo tutti i valori attesi e l'asserzione sull'assenza del token della seconda pagina. Aggiunto un caso distinto che lascia vuoto il periodo disponibile soltanto dopo pagina 1. Successiva mirata 72/72, prima dell'ultimo caso UI e della protezione da errore di arricchimento.

Un tentativo nel sandbox si è fermato prima dei test per EPERM sulla rinomina della cache Vitest; gli stessi test sono stati eseguiti con il runner offline in ambiente depurato. Nessuna asserzione, gold, soglia OCR o timeout indebolito. Il precedente test che richiedeva il rifiuto di undici pagine OCR è diventato una verifica esplicita della sola lettura di pagina 1: le pagine successive non sono più candidate all'OCR; il rifiuto del PDF oltre il limite generale resta invariato.

Typecheck, lint e build superati; fixture 5/5, incluso worker/WASM/modello italiano reali su scansione sintetica senza rete. Prova locale del documento fornito tramite PDF.js e lo stesso adattatore Tesseract, esclusivamente pagina 1, con tutti i risultati sopra. Non è una prova nel browser dell'app reale. Mock completa della fonte 4419b02 **1175/1175 in 131 file**, zero fallimenti o test saltati, un worker e retry0; durata 903,20 secondi. Comprende 19 casi aggiuntivi e il gruppo pertinente completo 74/74, incluso trasferimento dei campi in Spese e conservazione della correzione manuale tornando indietro. Typecheck/lint/build rieseguiti sulla punta definitiva, verdi. Gli intermedi con testo/raster personali della diagnosi sono stati rimossi dal task, originale preservato.

## Consegna e limiti

Nessuna AI/email, lettura o scrittura di DB/API/storage reale, migrazione, modifica .env o riavvio. L'app resta sulla versione integrata 49635d8; nessun recupero automatico delle bozze già compilate o dei dati confermati. Il merge e l'aggiornamento applicativo richiedono la decisione del committente. Il seguito documentale della precedente attivazione PR #42 è importato sul branch proprio, conservando la nuova registrazione; unico conflitto documentale in project-status risolto mantenendo entrambe le righe aggiornate.

Evidenze locali del task: work/bill-first-focus-final.log, work/bill-first-checks.log, work/bill-first-fixtures.json/log, work/bill-first-full.json/log e diagnostica locale della prima pagina. Nessun cluster DB avviato. Nuovo collaudo con un'altra bolletta utile dopo l'integrazione; l'assenza di evidenze sufficienti deve continuare a lasciare i campi da confermare.

Pubblicazione: [PR #43](https://github.com/Vincenzobrutto/Home_OS/pull/43) verso il consolidamento, inizialmente in bozza durante il collaudo e pronta dopo il risultato completo verde. Commit successivi alla fonte 4419b02 solo documentali; push verificato con git ls-remote. App invariata: nessun merge o rilascio da questo lotto.

## Attivazione autorizzata — 25 ottobre, 18:04 UTC

Con «Vai procediamo» il committente approva merge e aggiornamento del solo frontend. PR #43 integrata con merge a 911b0fba29d56db6d4da1da54e241ab44e99af37, hash remoto verificato; main invariato. Le sezioni precedenti descrivono la fase offline e la consegna prima dell'approvazione.

Runtime dedicato Dimora-V5-runtime-bollette-prima-20261025 sulla fonte integrata: albero frontend 5d482edbf405a4aaf8c9908c0c89cebc1b93b33d identico a 4419b02, già verificato dalla mock completa. Backend c820d20f7d41320fae8558dfcee7298e3e395256 identico al runtime API dc58ada. Build del frontend integrato verde, 5,31 secondi. Sostituito soltanto PID16672 con PID10612, avvio 18:04:16.671637 UTC, sulla porta loopback5174.

API PID7036 su loopback3011 e PostgreSQL PID22924 su loopback55432 preservati, identità e tempi di avvio verificati prima e dopo: rispettivamente 25/10 15:09:52.927113 UTC e 24/10 11:35:27.728198 UTC. Nessun riavvio, migrazione o query SQL, modifica .env, nuova AI/email o salvataggio automatico. La sola API richiesta nel controllo è anonima e risponde 401 con X-Dimora-Collaudo roma-consolidata-dc58ada-no-ai; nessuna sessione, originale o dato della casa letto.

Controlli HTTP statici/anonimi 8/8: pagina, lettore prima pagina, helper fornitore e parser, menu tipo precedente, worker PDF/OCR e protezione API. Un primo controllo loopback è stato fermato dal sandbox con EACCES, prima della risposta; stesso controllo eseguito con permesso di rete locale, senza cambiare protezioni. Nessuna prova browser aggiunta. EnvDir frontend vuota, guardia di rete esistente e proxy verso la sola API loopback conservati.

Passaggio operativo nel task: work/roma-runtime.json e work/schede-app-frontend-runtime.json aggiornati; launcher corrente work/bill-first-release-start.cjs, configurazione work/bill-first-release-runtime.vite.config.mts e work/bill-first-release-runtime-proof.json. Evidenze work/bill-first-release-build.log e work/bill-first-release-runtime-http-proof.json. Non usare i precedenti launcher per ripristinare questo frontend. Per il collaudo ricaricare l'app e usare una nuova bolletta o una bozza ancora vuota: dati confermati e compilazioni salvate non vengono riscritti automaticamente.
