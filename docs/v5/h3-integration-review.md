# H3a — backend verificato, frontend in lavorazione

14 ottobre 2026. Base contratto/frontend Claude 076d5a9, master dev/dimora-v5-local-20261013. Il committente ha avviato Claude per frontend-v5 nel checkout separato. Codex mantiene backend/schema/test e docs condivisi. H3 non ancora chiusa: nessun frontend/browser reale delle spese dichiarato.

## Completato backend
- Migrazione additiva 202610140001_expenses nel solo dimora_v5_product_dev 127.0.0.1:55432, con controllo assertDevelopmentDatabase. Nessun reset o DB legacy/reale. Ferma soltanto API registrata, Prisma 6.19.3 genera e deploya; API riavviata direttamente, senza interventi del committente.
- Nove endpoint expenses-v1: capabilities, lista/dettaglio/creazione/aggiornamenti/archiviazione/ripristino/storia/riepilogo.
- EUR in centesimi interi, data sostenuta non futura dal giorno Roma; proprietà personale e totali annuali manual/document separati. Nessuna AI, pagamento, categoria o stima finta.
- Advisory lock account/Home e membership condivisa riletta, idempotenza persistente e CAS per versioni. No-op senza nuova storia; archive/restore conserva le note e i documenti originali.
- Riferimenti documentali/caldera autorizzati in scrittura e redatti nelle letture, storia e replay. Replay ricostruisce la proiezione dello snapshot originario con i diritti attuali, senza esporre vecchi nomi/ID divenuti vietati. Origine document resta dichiarata anche se fonte unavailable.
- Paging keyset sul DB (data, creazione, ID), limite+1, cursor vincolato account/Home/risorsa/filtri, indipendente dal limite. Somme aggregate nel DB prima della proiezione; solo account corrente. Nessuna nuova dipendenza.

## Prove realmente eseguite
- Build TypeScript e lint verdi; 77 test offline e 89 backend integrazione verdi. Conteggi Node includono i contenitori. H3: quattro test dominio, otto scenari DB più contenitore e quattro HTTP più contenitore.
- Suite HTTP usa controller Nest/sessioni/CSRF/AccountContext/PostgreSQL/upload/file reali su harness effimero senza worker/provider. Dopo Restart, ripetuta con V5_EXPENSES_API=1 contro processo 3001: cinque test verdi.
- Private altrui e conteggi, viewer, revoca/scadenza, input/query stretti, doppia creazione concorrente/replay, versioni concorrenti, archivia/ripristina/no-op, redazione riferimenti/storia/replay, 25 record/timestamp identici e cambio limite, cursor filtri/account diversi.
- Somma 10+20 centesimi =30; totale grande oltre Int32 verificato in suite DB. Originale scaricato byte-identico prima/dopo; versione/conferme caldaia e ledger AI invariati. Cleanup soltanto delle proprie fixture sintetiche, con rimozione file HTTP dopo verificata eliminazione dei riferimenti.
- Due problemi del primo run di test corretti: validazione cursor restituiva errore sincrono anziché Promise respinta, interfaccia uniformata async; il test iniziale di revoca avviava più Promise senza attaccare subito handler, corretto con Promise.all. Paging reale non aveva duplicati. Non conteggiare i run falliti come verdi.

Log outputs/Dimora-V5-H3-backend-offline.log, Dimora-V5-H3-backend-integrazione.log, Dimora-V5-H3-API-reale.log. Nessuna chiamata Anthropic effettuata; suite AI live disabilitate.

## Ancora aperto
Consegna frontend Claude su base076d5a9, commit sync da escludere (cacc8fc). Revisione e integrazione soltanto dopo tracciati finiti; preservare untracked backend-status.md. Test mock/fixtures/build/lint della consegna, client/API non-live in gruppo dedicato entro auth15/min, browser 320/390/desktop/tastiera e moduli/riprova/riassunti reali. I dati del mock non provano disponibilità backend. H3b stime/ricorrenti/export ciclo di vita restano fuori H3a.
