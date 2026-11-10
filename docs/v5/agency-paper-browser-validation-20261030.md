# A4 — collaudo persistente e browser, 30 ottobre 2026

## Esito
Completato il percorso di calibrazione su pratica isolata: account/sessione reali del collaudo, sorgente PNG sintetica realmente caricata e decodificata, worker e API reali, due risposte provider simulate, database PostgreSQL nuovo. Nessuna prova di accuratezza AI su nuovi documenti personali e nessun addebito esterno.

Il fixture interattivo predispone quattro vani e una sagoma lorda sintetica prima dell'apertura del browser. Non è stato fatto passare questo setup per caricamento o riconoscimento autonomo via UI. Dal browser: login, A4/1:100 predefinito, categorie principali/balcone/cantina, associazione di due vani al corpo principale, cantina al25% con motivazione, base lorda, salvataggio, confronto delle due viste, ricarica completa e valori identici. Le fasce murarie sono rimaste esplicitamente non confermate: due verifiche aperte (stima carta e muri), totale verificato null.

Passaggio a1:200 e nuovo salvataggio/ricarica: aree quadruplicate, geometrie immutate. Ripristino1:100 e ulteriore ricarica: valori originari conservati. Un nuovo client Prisma ha letto la sola pratica nominata del cluster posseduto: quattro vani, quattro vertici della sagoma, geometryRevision2, denominatore100 e confirmedfalse, totalM2null. Hash delle geometrie uguale nei due salvataggi; codice frontend/backend servito uguale al checkout per i moduli controllati. Audit e screenshot solo negli output privati Dimora-collaudo-A4.

## Mobile
Verifica browser a375×812: nessun overflow della pagina, tabella con scorrimento interno. Individuata prima colonna troppo stretta: aggiunti minimo120px, unità senza interruzioni, indicazione di scorrimento e focus da tastiera sul contenitore. Scorrimento verificato anche con frecce; viewport ripristinata. Non è un nuovo prodotto o fallback mock dell'app: solo una correzione della tabella condivisa.

## Test e ambienti
Nuovo profilo nominale test:agency-paper-db e file HTTP inclusi nell'aggregato DB protetto. Cluster dimora-offline-dgmcyE:18/18, compresi quattro casi nuovi di salvataggio/replay A4, GET+nuovo client, rifiuto conferma/dimensioni/CSRF alterati, passaggio esplicito a riferimento metrico. Riprova inoltre snapshot/proposte e worker esistenti. Arresto confermato da stop-postgres.log.

Trial distinto test:agency-paper-trial, escluso dagli aggregati e con scadenza fissa: cluster dimora-offline-0Qkpqs, un test interattivo concluso positivamente tramite il suo stopFile dopo il collaudo, frontend/API/cluster chiusi. Nessun servizio preesistente arrestato o DB riutilizzato. Primo avvio rifiutato perché la porta del trial precedente era ancora occupata; attesa la scadenza precedente e nuova esecuzione isolata. Nuovi alias npm aggiunti dopo che la guardia ha rilevato la loro assenza: assert invariati. Guardie finali13/13 fuori sandbox; precedente fallimento su listener nella sandbox distinto dai risultati prodotto.

Frontend finale58/58 in6file, build TypeScript/Vite e lint mirati verdi. Backend applicativo invariato rispetto al precedente incremento649/649: quell'intera regressione non è stata ripetuta e non va attribuita al nuovo turno. Qui eseguiti18DB/HTTP/worker e13guardie. Nessuna nuova migrazione o modifica alle guardie di isolamento.

## Limiti e prossimo passo
Restano le ipotesi sul foglio completo e sulla scala dichiarata: proporzioni compatibili non escludono un ritaglio. La nuova verifica prova persistenza, calcolo e interazione, non qualità del riconoscimento sui documenti degli agenti. Servono ulteriori planimetrie indipendenti e confronto con quote note/PDF originale; i limiti ingresso/vano comunicante e microvuoti delle scritte restano quelli già documentati. Nomi dei vani ancora da record esistenti, rinomina persistente e calibrazione salvabile senza tutte le classificazioni commerciali restano backlog. Demo Alessio invariata, nessuna AI pagata, main, merge o deploy. Ambiente di prova chiuso: gli screenshot sono permanenti, il link localhost del collaudo non è una pubblicazione.
