# Bollette fase 1 — collaudo conclusivo offline

## Ambito e fonte

Lotto `codex/bollette-chiusura-fase1-20261025`, dal consolidamento remoto `56e6eec9793877d1a750c7bc7ba0c6b62669e939`. Registrazione `dbe92e0` prima dei test; fonte dei controlli aggiuntivi `d021838d618d0d4efd381bda4c8ac50b52195994`. Nessuna modifica al codice prodotto: generalizzazione e traccia delle PR #46/#48 già integrate restano identiche.

La fase 1 mantiene un solo totale per bolletta, senza ripartire voci, dedurre pagamenti o usare il mese della fattura come periodo di consumo. Il collaudo richiesto comprende i PDF già forniti, il percorso mock e la suite mock completa. Nessun accesso al DB/API/storage reale, AI/email, `.env`, migrazione, aggiornamento app o salvataggio automatico. Nessun file del lotto Claude o checkout legacy modificato.

## Documenti già forniti: prova sui byte

Eseguito il vero `localBillPdf` della fonte corrente, comprensivo di hash, parsing nativo/geometrico, OCR e traccia, in un adattatore Node locale. PDF.js usa la build legacy della medesima dipendenza bloccata; canvas locale e adattatore Worker eseguono il worker/WASM/modello italiano già inclusi nel progetto. Risorse OCR in memoria; processo con ambiente ripulito e guardia di rete offline. Non è una prova del browser dell'app.

Sei file bolletta corrispondono a cinque fatture distinte di due fornitori: due TIM già forniti, una Sorgenia originale già fornita e tre Sorgenia anonimizzate già fornite. Originale e copia anonimizzata di una fattura non vengono conteggiati come evidenze indipendenti. Altri quattro file sono controlli negativi: ordine macchina da caffè, ordine Samsung, acconto e saldo climatizzatori. Non sono stati esplorati altri originali della cartella.

Le prime pagine delle sei bollette sono state renderizzate localmente e confrontate visivamente con gli esiti del lettore; niente valori attesi ricavati soltanto dal parser. Originali, immagini, testo e risultati per documento rimangono fuori Git. Nel repository si riportano solo aggregati e limiti, senza importi/date, SHA o nominativi del cliente.

- **6/6 file bolletta riconosciuti**, un totale per ciascuno; tutti con lettura della sola prima pagina.
- **28/28 campi proposti coerenti** con la lettura visiva del documento. Totali, date e categoria non richiedono nuove regole sul nome del fornitore o sul filename.
- **8 campi lasciati da confermare**: periodo nelle due TIM, fornitore e periodo nelle tre copie anonimizzate Sorgenia. Il mese fattura non dimostra il periodo; le copie anonimizzate oscurano parte dell'etichetta del periodo e dei riferimenti di contatto. Il logo leggibile a vista non autorizza un catalogo di marchi o un nome inventato. La traccia distingue non individuato/non utilizzabile e i campi restano modificabili.
- **4/4 controlli negativi senza proposta di bolletta**: il lettore termina con `local_ocr_unreliable`, senza trasformare ordini o rate di acquisto in utenze. Non si tratta di una verifica della loro compilazione acquisti.
- Hash degli stessi dieci file ricontrollati dopo l'esecuzione: originali invariati. Questo controllo non riguarda dati del database, che non sono stati letti.

Queste prove non dimostrano riconoscimento universale: due fornitori e due famiglie di servizio, con layout ricorrenti. Acqua/gas e varianti linguistiche/layout hanno copertura sintetica nei test preesistenti, non nuovi documenti reali indipendenti. Le soglie OCR e tutte le validazioni restano invariate.

## Percorso mock e regressioni

Esteso `StandaloneBillCompletion.test.tsx` conservando ogni asserzione precedente: il mock del lettore emette ora anche una traccia legata allo SHA. Nei sette scenari già esistenti si apre il pannello, si verifica la visibilità e l'assenza di nuove conferme/organizzazioni/job AI. La traccia non entra né nella review né nel payload finale, che conserva gli stessi valori attesi.

Scenari: pagina unica e schede, conferma, conflitto di classificazione, risposta persa, accesso revocato, salvataggio della sola bozza e importi discordanti. Dopo le conferme riuscite, nuova navigazione al filtro documenti da completare: documento assente e una sola conferma. Il recupero della risposta persa riusa corpo e chiave di idempotenza; conflitto/revoca/ambiguità non confermano. La bozza resta da completare. Sono comportamenti del mock: nessuna scrittura reale viene eseguita o dedotta da queste asserzioni.

Restano incluse le prove preesistenti su correzioni manuali, letture tardive, cambio account/casa/documento, SHA diverso, aborto e fallback OCR. Non sono stati modificati asserzioni precedenti, gold, timeout, retry o controlli di privacy/idempotenza.

## Verifiche

Gruppo mirato definitivo: **339/339 in 12 file**, 45,97 secondi, un worker, retry zero. Prima estensione mirata anch'essa verde, 339/339; la ripetizione finale aggiunge le asserzioni sul filtro dopo conferma.

**Suite mock completa: 1397/1397 in 136 file**, 1256,16 secondi, un worker, retry zero, zero fallimenti, saltati o todo. Eseguita una volta sulla fonte definitiva d021838, senza modificare il codice/test durante la lettura della suite. Nessun altro collaudo DB avviato. Typecheck, lint e build verdi sulla stessa fonte; build6,53 secondi. Fixture PDF/OCR **5/5 in 2 file**, 1,79 secondi, zero saltati o retry. Non sono stati eseguiti profili HTTP/DB reali per chiudere questo report.

Evidenze locali del task: `work/bill-closure-focus-final.log`, `bill-closure-focus.json`, `bill-closure-full.log/json`, `bill-closure-pdf.log`, `bill-closure-pdf-validation.json`; risultati personali in `bill-closure-pdf-private.json` e immagini `bill-closure-page-*.png`, fuori dal repository. Harness locale `bill-closure-run.cjs` e adattatore/validatore PDF nella stessa directory esterna.

## Chiusura e limiti

**Verifiche offline della fase 1 concluse**, nel perimetro documentato, con suite completa e statici verdi. Nessun difetto di prodotto dimostrato in questo lotto: non si aggiungono regole ad hoc per riempire campi cancellati dall'anonimizzazione. Nessuna nuova pubblicazione runtime necessaria per questi soli test/documenti.

Il pannello resta una traccia temporanea della lettura iniziale, non uno storico persistente e non una certificazione. Le compilazioni già salvate non vengono rilette o sovrascritte. Prova visiva autenticata dell'app e telefono fisico non eseguiti da questo lotto; il blocco precedente del browser mock non viene aggirato. La prova DOM nel mock e l'ispezione visiva dei PDF sono evidenze distinte dalla verifica grafica del browser. L'accettazione finale del committente e ulteriori layout indipendenti restano da distinguere dal collaudo offline concluso.

Dettaglio economico/consumi/tariffe, avvisi avanzati e ledger durevole non sono requisiti implementati della fase 1. [PR #50](https://github.com/Vincenzobrutto/Home_OS/pull/50) verso il consolidamento; merge al committente. Consolidamento ancora56e6eec e main invariato a cdbb318, verificati dopo i test con fetch/ls-remote. Consegna del lotto tramite commit/push verificato sul solo branch proprio; niente merge o attivazione da questo lotto.
