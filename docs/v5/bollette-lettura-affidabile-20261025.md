# Bollette: lettura locale affidabile — 25 ottobre 2026

## Incarico e perimetro

Segnalazione del committente dopo l'attivazione della PR #26: un PDF di servizio telefonico resta senza tipo e senza proposte nella compilazione manuale. Branch `codex/bollette-lettura-affidabile-20261025`, nuovo worktree dalla punta consolidata `69d9f00`; lotto registrato con `45e797a` prima del codice. Solo frontend, nessun file cestino o backend modificato.

L'originale fornito contiene dati personali: letto e renderizzato soltanto sul PC, senza copiarlo nel repository, nei test, nei commenti GitHub o a fornitori. Diagnostica privata locale fuori Git. Nessuna AI, DB/API/storage reale, `.env`, migrazione, caricamento o conferma effettuati da questo lotto.

## Diagnosi

Tre problemi distinti: il vocabolario dei servizi non copriva la descrizione generale di telecomunicazione; l'ordine testuale del PDF non coincideva con la posizione dell'intestazione legale e della colonna Periodo; una pagina ricca di testo conteneva comunque una scadenza grafica, ma la selezione OCR considerava solo la scarsità di testo. Il titolo mensile della fattura non è prova del periodo fatturato.

## Correzioni

- Riconoscimento del servizio di telecomunicazione nelle due forme linguistiche, senza elenco di marchi o nomi file. Restano necessari identità di fatturazione e servizio; preventivi, contratti e negazioni restano esclusi.
- Date numeriche e con mese italiano completo/abbreviato, sempre validate sul calendario. L'anno abbreviato è ammesso soltanto nei periodi espliciti e solo se coerente con l'anno completo di emissione; emissione/scadenza non prendono l'anno dall'orologio.
- Indizi geometrici nativi limitati a intestazione legale univoca con contesto societario, esclusi ruoli del destinatario, e intervalli nella colonna Periodo. Contraddizioni con le etichette esplicite restano ambigue.
- OCR anche per pagine ibride con importo/scadenza etichettati ma non leggibili nel testo nativo. Le evidenze native restano: l'OCR non può cancellare un valore contrastante.
- Calendario grafico associato alla propria etichetta e al proprio anno esplicito solo se spazialmente univoco. L'anno può essere un glifo nativo del PDF mentre giorno/mese sono grafici: coordinate native riportate nella stessa scala raster, sulla stessa pagina, senza assegnare loro una finta confidenza OCR. Anni lontani o contrastanti, altra etichetta data interposta e cifre OCR incerte non producono una scadenza.

Soglie OCR invariate (riga 85, parole 80, cifre 90), stessi limiti di pagine/pixel/tempo, SHA e distruzione risorse. Nessuna correzione di cifre, totalizzazione, inferenza del pagamento o modifica del payload canonico. Applicazione delle proposte ed eleggibilità dei form restano quelle già collaudate; nessuna sovrascrittura di compilazioni salvate.

## Verifiche

Verifiche finali: **85/85 mirati**, **1002/1002 mock completa** su 116 file, **5/5 fixture** con motore OCR reale; nessun test saltato, retry0 e un worker. Typecheck, lint e build superati. I due nuovi file aggiungono 33 prove sintetiche, mantenendo invariate le asserzioni precedenti. Tutti i test usano ambiente depurato, guardia offline ed envDir vuota. Nessun test contro servizi reali.

Riscontro privato sul PDF: tutti e sette i campi attesi (servizio, fornitore, totale, emissione, due estremi del periodo e scadenza) confrontati con la visualizzazione locale dell'originale. Sei pagine, OCR sulle pagine 1/3/6, motore reale Tesseract/WASM e asset locali, 10–30 secondi nelle ripetizioni locali. Il primo riscontro OCR lasciava la scadenza vuota: giorno/mese avevano confidenza 96 ma l'anno grafico non superava le soglie; il glifo nativo dell'anno era già leggibile nella medesima zona. Il riscontro finale usa quel dato esplicito senza ricostruire cifre. Emulazione locale Node del raster/worker, non prova browser o fisica mobile. Originale e diagnostica personale restano fuori Git.

Una prima suite completa è stata interrotta volontariamente prima dell'esito per aggiungere il rifiuto della data OCR completa che contraddice l'anno nativo vicino. Nuovo avvio sul prodotto finale ee21cb9; nessuna asserzione o timeout precedente modificati. Anche il riscontro privato e le fixture sono stati ripetuti dopo quella correzione.

Invocazioni Vitest nell'ambiente depurato unit del runner esistente (guardia offline ed envDir vuota): `vitest run --project mock --maxWorkers=1 --retry=0` e `vitest run --project fixtures --maxWorkers=1 --retry=0`. Controlli statici: tsc -b --noEmit, eslint e build Vite sul worktree. Nessuna suite del progetto integration reale eseguita.

## Limiti e consegna

Intestazioni spezzate o senza ruolo legale, colonne ambigue, documenti ruotati e anni assenti possono richiedere conferma manuale. Questa correzione non promette la lettura di qualunque layout. Attivazione dopo approvazione descritta sotto; la bozza reale non è stata modificata. Rimangono separati i limiti e la prova browser della PR #26.

[PR #33](https://github.com/Vincenzobrutto/Home_OS/pull/33) verso il consolidamento, prodotto verificato ee21cb9 e documentazione c7f5b3f; push confrontato con git ls-remote, seguito soltanto documentale. Successivamente integrata su approvazione del committente come descritto sotto; le compilazioni già salvate continuano a essere preservate.


## Integrazione e attivazione approvate — 25 ottobre 2026

PR #33 unita nel consolidamento a `730b93dd76be560fd9530005c532cadd9974e2f3`, verificato con git ls-remote; origin/main invariato a cdbb318. Il worktree proprio è stato avanzato senza reset/rebase. Albero frontend `59614cf38da67d8b9b16c19803a63917b909d453`, identico alla punta d2d5f5f già verificata (1002 mock, 85 mirati, 5 fixture, typecheck/lint/build); backend invariato rispetto al precedente consolidamento 69d9f00. Nessuna ripetizione superflua della suite su sorgenti identiche.

Riavviato esclusivamente il frontend identificato sulla porta 5174: nuovo PID32656, sorgente integrata, envDir vuota, guardia di rete e target API3011 invariati. HTTP200 per HTML, parser bollette, lettore PDF, associazione delle date, worker OCR protetto e HEAD della lingua italiana. Nessuna richiesta API o autenticata durante la verifica. API PID10540 e PostgreSQL PID22924 hanno mantenuto processi e porte; nessun avvio/stop del DB, migrazione, AI o scrittura dati. Metadati runtime locali aggiornati.

La prova interattiva resta al committente: ricaricare la pagina, aprire Compila manualmente e attendere la lettura locale prima di verificare le proposte. Nessun caricamento, apertura autenticata o salvataggio eseguito da Codex; le bozze già salvate restano escluse dalla sovrascrittura automatica.
