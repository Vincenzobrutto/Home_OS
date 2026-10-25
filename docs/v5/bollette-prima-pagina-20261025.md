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

Typecheck, lint e build superati; fixture 5/5, incluso worker/WASM/modello italiano reali su scansione sintetica senza rete. Prova locale del documento fornito tramite PDF.js e lo stesso adattatore Tesseract, esclusivamente pagina 1, con tutti i risultati sopra. Non è una prova nel browser dell'app reale. Suite mock completa della fonte 4419b02 in corso al momento di questa registrazione; esito finale da riportare prima della consegna.

## Consegna e limiti

Nessuna AI/email, lettura o scrittura di DB/API/storage reale, migrazione, modifica .env o riavvio. L'app resta sulla versione integrata 49635d8; nessun recupero automatico delle bozze già compilate o dei dati confermati. Il merge e l'aggiornamento applicativo richiedono la decisione del committente. Il seguito documentale della precedente attivazione PR #42 è importato sul branch proprio, conservando la nuova registrazione; unico conflitto documentale in project-status risolto mantenendo entrambe le righe aggiornate.

Evidenze locali del task: work/bill-first-focus-final.log, work/bill-first-checks.log, work/bill-first-fixtures.json/log, work/bill-first-full.json/log e diagnostica locale della prima pagina. Nessun cluster DB avviato. Nuovo collaudo con un'altra bolletta utile dopo l'integrazione; l'assenza di evidenze sufficienti deve continuare a lasciare i campi da confermare.
