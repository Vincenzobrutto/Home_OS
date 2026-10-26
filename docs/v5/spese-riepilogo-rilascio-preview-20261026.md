# Rilascio Riepilogo e preview convergente — 26 ottobre 2026

## Correzione attiva nell’app

PR #66 integrata su autorizzazione del committente nel consolidamento a **e4e24b322df1c58cf39ccda31f265baf4fd7770f**, hash remoto verificato. Main invariato a cdbb318ddb56e764ad4b111a71560e3e71c7a033. Il Riepilogo mostra ora Riparazioni e lavori come riga del proprio gruppo e non contiene la vecchia nota condizionata al collegamento a un lavoro.

Runtime frontend dedicato dalla punta integrata, albero identico al candidato 2682c8f verificato offline. Build ripetuta e superata, lock dipendenze identico, backend e cartella Prisma identici alla fonte API ccc8469. Nessuna migrazione, nuovo pacchetto o modifica .env. Test del candidato nel [report della correzione](spese-riepilogo-riparazioni-20261026.md):47/47 mock, typecheck/lint/build verdi.

All’inizio i tre servizi precedenti risultavano assenti, con porte libere. Ripristinati il cluster esistente e la precedente API protetta; il backend non è stato aggiornato. PostgreSQL ha completato il recupero ordinario del precedente arresto. Il launcher locale ha segnalato un errore dopo pg_ctl, ma log e listener confermavano il server pronto: verificati listener e comando del server, aggiornati i soli metadati di processo, senza ripetere l’avvio del cluster.

Servizi verificati: PostgreSQL 19804 su 127.0.0.1:55432, API 30836 su 3011 con guardia spese-gruppi-release-api-guard.cjs e fonte ccc8469, frontend 16756 su 5174 con fonte e4e24b3. Sette guardie dei worker e modalità interactive-manual-no-ai preservate. **35/35 controlli HTTP statici/anonimi verdi**, inclusa l’assenza della vecchia nota nel modulo servito, risorse PDF/OCR e API 401 con X-Dimora-Collaudo roma-consolidata-ccc8469-no-ai. Nessuna richiesta autenticata di scrittura, AI/email, lettura di originali o audit SQL dei dati personali. Non si dichiarano impronte dei dati reali confrontate.

## Preview convergente separata

Artefatti locali nel task, cartella `outputs/spese-convergente-20261026/`: index.html (selettore desktop/mobile), app.html/app.js, styles.css/convergent.css, modello sintetico e confronto.html. La vecchia preview Codex a due viste è preservata. Nessun file del prototipo è incluso nell’app reale o nel repository di prodotto.

Prototipo su loopback 5197, distinto da app 5174 e precedente preview 5196. Server statico senza proxy, GET/HEAD su lista chiusa di file; /api/v5/homes restituisce 404, POST 405. CSP connect-src none e form-action none. Dati inventati 2025/2026, nessun documento del committente, persistenza soltanto nella memoria della pagina. Ricaricare azzera le aggiunte.

Convergenza realizzata nella sola preview:

- Una pagina con Anno/Mese/Intervallo prima dei contenuti, totale filtrato ed elenco nello stesso contesto.
- Acquisti e Interventi affiancati al medesimo periodo dell’anno precedente, tramite righe sintetiche effettive; assenza di storia distinta da zero. I riquadri sono scorciatoie al filtro di gruppo; etichetta esplicita sul loro ambito prima della selezione di gruppo/categoria. Nessun risparmio o pagamento dedotto.
- Analisi richiudibile, aperta inizialmente su desktop e chiusa inizialmente a 390 px. Anello e legenda applicano filtri equivalenti; pulsanti testuali e chip consentono operazioni senza dipendere dai colori.
- Inserimento essenziale con categoria/fornitore e collegamenti opzionali; validazione di importo/data/mese fattura, aggiunta solo in memoria. Il periodo passa al mese della nuova spesa per renderla visibile, con messaggio esplicito di sola demo.
- Ricerca estesa e totali mensili sul dataset sintetico completo; nell’app reale non andranno ricostruiti dalle sole righe paginate. Eventuali contratti backend restano un lotto distinto. Nessun codice copiato dall’artifact Claude, non accessibile al lettore web: il mock riprende le scelte descritte dal committente.

## Verifiche e limiti della preview

Verificati dati e interazioni in JSDOM nei contesti dichiarati 1440 e 390 px, con matchMedia emulata e canvas sostituito da un doppio di test: periodo, cambio anno/mese/intervallo, date invalide, confronto omogeneo e bisestile, ricerca, gruppo/categoria, dettagli della bolletta, legenda, apertura dei dialoghi, validazioni, inserimento in memoria e collegamento simultaneo a oggetto/lavoro senza doppio conteggio. Fetch/XHR/WebSocket vietati nel test, zero tentativi di rete. Sintassi JavaScript verificata; **9/9 file statici HTTP 200**, API 404 e POST 405. Test e prove conservati nei file locali work/spese-convergente-*.

Queste sono verifiche funzionali DOM, **non una verifica visiva browser**, non misure reali di clic e non un collaudo su telefono. Nessuno screenshot nuovo prodotto. L’apertura nel browser integrato è stata richiesta ma restituita come queued; non si dichiara caricamento visivo riuscito. La guida locale confronto.html contiene gli stessi tre scenari per la prova manuale desktop/mobile.

## Consegna

Registrazione documentale prima del report a 0cc0f4e, branch proprio codex/rilascio-riepilogo-preview-20261026. Solo report/stato/roadmap/changelog in questa consegna; nessuna modifica a main, lotti Claude o dati reali. La correzione #66 è già approvata e attiva; il redesign è soltanto un prototipo, non attivato nel prodotto. Merge della documentazione al committente.

Attività del committente: verificare il Riepilogo nell’app, provare i tre scenari della preview in Desktop/Mobile e indicare gli aggiustamenti o l’approvazione del disegno prima di implementarlo. La sola PR documentale può essere integrata separatamente.
