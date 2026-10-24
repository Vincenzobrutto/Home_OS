## 24 ottobre 2026 — Schede di compilazione come il prototipo

Una scheda per passaggio con domanda e spiegazione, barra con spunte e passaggi futuri disabilitati, scelte del contenuto a pastiglie, riepilogo a blocchi con «Modifica», originale affiancato nella rotta autonoma, piede fisso su telefono. Solo presentazione: flusso, convalide e payload invariati. [Report](v5/schede-presentazione-report-20261024.md).

## 24 ottobre 2026 — Bollette testuali, proposte locali senza AI

La compilazione manuale riconosce una possibile bolletta dal testo PDF e propone tipo, categoria, fornitore, totale, periodo, emissione e scadenza quando univoci. Stessa scheda Spese e conferma canonica nelle due viste, nessun oggetto o pagamento dedotto. Compilazioni salvate preservate; importi discordanti non sommati. SHA verificato e limiti locali; scansioni senza testo richiedono OCR e sono segnalate. [Report e limiti](v5/bollette-locali-20261024.md). Mock completa 947/947 in 111 file, nessun test saltato/retry0, typecheck/lint/build verdi. Lotto separato, nessuna modifica a backend/cestino Claude o dati reali; aggiornamento dell’app subordinato al merge.

## 24 ottobre 2026 — Schede predefinite, pagina unica disponibile

Su incarico esplicito dopo la demo manuale, la compilazione apre le schede senza parametro di vista. «Torna alla pagina unica» conserva il confronto tramite `vista-compilazione=unica`; cambio e ritorno mantengono campi locali, documento, bozza e modalità senza salvare. Nessuna modifica a conferma, validazioni o payload; quattro confronti integrali con la pagina unica. Typecheck/lint/build e mock completa 910/910 in 108 file verdi, nessun test saltato e retry0. [Report corrente](v5/compilazione-schede-default-20261024.md). Nessuna AI o accesso al DB/API reale; PR #23 approvata dal committente per il merge nel consolidamento; registrazione finale soltanto documentale, prodotto e test invariati.

### Cronologia del collaudo precedente

## 24 ottobre 2026 — Compilazione a schede in prova

Demo manuale multi-articolo completata e checklist confermata dal committente: ritorni e dati conservati, esclusione accessorio con due oggetti proposti/nessuna spesa, PDF e comandi usabili a finestra stretta. Raccomandata promozione futura a default con ritorno alla pagina unica; nessun cambio di default o merge eseguiti. [Esito](v5/compilazione-schede-pdf-fix-20261024.md).

Corretto l’originale PDF della compilazione standalone riusando PdfPreview locale: nessuna dipendenza dal visualizzatore nativo, stesso accesso ai byte e un solo download. Due regressioni su autorizzazione/assenza di scritture, mirati71/71, typecheck/lint/build e mock completa900/900 in 108 file verdi, nessun test saltato e retry0. PDF osservato su mobile con zoom/rotazione; prova visiva mock multi-articolo ancora negata dal browser5186. [Report finale della correzione](v5/compilazione-schede-pdf-fix-20261024.md), nessuna nuova AI o salvataggio sul reale.

Collaudo successivo: mobile emulato390px e320px sul caffè, ritorni e dati conservati; test mirati multi-articolo77/77. Anteprima PDF vuota riprodotta anche nella pagina unica; nessuna bozza multi-articolo preesistente per il giro visivo senza scritture. Dati/ledger/migrazioni invariati. [Esito e raccomandazione](v5/compilazione-schede-collaudo-mobile-20261024.md): mantenere opt-in e pagina attuale, nessun merge o nuova AI.

Ripristino successivamente autorizzato: cluster esistente e API protetta disponibili, sette worker disabilitati e sole letture/login/logout consentiti. Bozza caffè open e impronte di dati, ledger e migrazioni invariate; predisposta apertura con vista a schede, rendering ancora da verificare dal committente. Nessuna nuova AI, migrazione o salvataggio automatico.

Su successivo incarico, predisposto e avviato soltanto il frontend del collaudo applicativo5174 con le schede opt-in già implementate e proxy fisso all'API protetta3011. API e database non in ascolto: nessuna prova applicativa end-to-end dichiarata. Nessun cambio di renderer predefinito, merge, nuova AI o dato salvato; perimetro e blocco nel report.

Implementato il percorso sequenziale frontend con scelta opt-in, conservando la pagina attuale predefinita. Stato, conferma, payload e recuperi restano nel proprietario corrente. Schede visitate conservate, controlli per passo, riepilogo modificabile, nessun salvataggio sulla navigazione. Harness browser esteso con proposte sintetiche e replay solo in memoria; typecheck/lint/build e mock completa 898/898 in 108 file superati, quattro confronti integrali del body verdi; limiti nel [report](v5/compilazione-schede-report-20261024.md). La sostituzione della pagina unica e il merge restano al committente dopo il collaudo visivo. Nessuna AI, DB/API/storage reale o modifica a backend/schema/lotti Claude.

## 24 ottobre 2026 — Protocollo multi-pagina, verifica offline

La struttura di spesa viene definita una sola volta e riusata negli slot fisici tramite riferimenti locali, conservando esattamente lo schema espanso e le validazioni. Nessuna fusione di importi o modifica ai decoder. Identificatore v30; nuovo test del rifiuto HTTP400 con ledger incerto, privacy e replay senza ulteriori invii. La riduzione del payload è verificata offline; l'accettazione Anthropic resta non verificata e Samsung non viene ritentato. Nessuna AI, DB reale, modifica al lotto Claude o deploy. [Report](v5/protocollo-multipagina-offline-20261024.md).

## 23 ottobre 2026 — Catalogo apparati e ambienti tipici

Il confronto tra alias avviene sulla singola occorrenza: un apparato specifico non nasconde più un altro oggetto nominato separatamente. I tipi stanza dichiarati prevalgono sui riferimenti ad altri ambienti nei nomi, mantenendo le sottocategorie esplicite dei tipi generali. Aggiunte le varianti generiche «macchina da caffè» e «forno microonde» al vocabolario derivato V4. Typecheck/lint/build e mock completa 870/870 superati. Nessuna scelta o salvataggio automatici; [collaudo e limiti](v5/oggetti-stanze-20261023.md).

## 23 ottobre 2026 — Prezzi e date: collaudo offline

Corrette le evidenze di acquisto/ordine che potevano accettare date dichiarate non disponibili, condizionali o riferite a un'altra occorrenza. Restano ammesse note neutre; calendario, fonti e ruoli economici mantengono i controlli esistenti. Cinque nuovi gruppi generalizzati; build/lint, 311/311 onboarding, 233/233 ordinari e 18/18 guardie superati. Nessuna AI, DB, modifica al lotto Claude o salvataggio canonico; merge soggetto al committente. [Report](v5/prezzi-date-20261023.md).

## 23 ottobre 2026 — Classificazione locale di ricevute e negazioni

Riconosciute le forme «ricevuta d'acquisto» con apostrofi e spazi diversi. Le menzioni esplicitamente negate e i riferimenti negativi all'obbligo di emissione non attribuiscono un tipo al documento; una vera fattura nello stesso PDF rimane riconoscibile. Build/lint e 233/233 test ordinari offline superati. Correzione verificata senza AI, accesso DB o modifica al lotto Cestino; integrazione approvata descritta sotto. [Report](v5/ricevute-negazioni-20261023.md).

Successiva integrazione approvata: PR #12 unita a `b74efe9`, API del collaudo isolato ricompilata e riavviata con AI/worker/salvataggi bloccati. Bozza caffè 499 EUR e nessuna spesa; audit dati prima/dopo identici. Nessun DB reale, main o lotto Claude modificato.

## 23 ottobre 2026 — Ordini confermati: proposte di costo e acquisto

Ordine confermato come data di acquisto proposta e totale come costo del singolo prodotto, spedizione inclusa. Nessun pagamento, consegna o garanzia dedotti; spesa soltanto dopo scelta e conferma. Ripresa bozze senza nuova AI. Backend 306 onboarding, 224 ordinari, 24 qualità, 18 guardie e 88 DB; frontend mock completa 864/864. PR #8 verso il consolidamento, senza merge o deploy. [Report e verifica offline](v5/ordini-acquisto-20261023.md).

## 23 ottobre 2026 — Flusso delle evolutive fra agenti

Il consolidamento diventa la base delle evolutive: un branch e una PR per lotto, prefisso dell'agente, tabella «Lotti in corso» nello [stato corrente](project-status.md), regole in [AGENTS.md](../AGENTS.md). Riportati il commit di registrazione del branch e il [progetto dell'eliminazione dati](v5/fase0-deletion-design-20261022.md) (solo documentazione, nessun codice).

## 23 ottobre 2026 — Branch di consolidamento verificato

Creato su GitHub codex/dimora-v5-consolidata-20261023 dal commit verificato fef9d96, con hash remoto identico. Main, checkout locale e file sporchi preservati; nessun codice o dato modificato. [Registrazione e confini](v5/dimora-v5-consolidation-branch-20261023.md).

**Tranche autonoma verificata:** [editor/presentazione R03](v5/fase0-editor-write-presentation-refactor-20261023.md), mock finale 860/860 e backend 496/496 HTTP/DB sintetici. [Chiusura, misure e opportunità residue](v5/fase0-refactor-closure-20261023.md): nessuna promozione del gate AI o nuovo branch impliciti.

**R05 verificato sui candidati:** [317 → 170 statement per 50 candidati](v5/fase0-candidate-query-batching-20261023.md), stessi filtri e lock; 496/496 HTTP/DB sintetici. Altri percorsi restano opportunità distinte da misurare, nessuna cache fra account.

**R10 completato:** [domini API separati, un solo trasporto](v5/fase0-api-client-domains-refactor-20261023.md), 860/860 mock e 581 confronti offline; entry +7.214 byte, nessun beneficio di velocità dichiarato.

## 23 ottobre 2026 — R06/R09, ingressi correnti e storico

Roadmap e architettura correnti separate dagli archivi integrali con blob verificati; componenti senza ingresso produttivo censiti e conservati. Nessuna modifica UX o test rimossi. [Report](v5/fase0-maintenance-boundaries-20261023.md).

## 23 ottobre 2026 — R08, protocollo provider separato

Schema, decoder compatto e istruzioni in moduli distinti; export compatibili, prompt e schema identici, autorizzazione e diagnostica invariate. Freeze dei nuovi moduli verificato, nessuna AI o revisione semantica. [Report](v5/fase0-provider-protocol-refactor-20261023.md).

## 23 ottobre 2026 — R04, conferma backend per fasi

Controlli, oggetti, spese e contatti separati dietro la stessa conferma idempotente/transazione. Blocchi operativi e finalizzazione invariati, nessun nuovo criterio o errore. Build/lint, 300 onboarding e 495 HTTP/DB sintetici superati. [Report](v5/fase0-confirmation-orchestration-refactor-20261023.md).

## 23 ottobre 2026 — R04, quantità e prezzi separati dal dominio

Estratti i validatori di quantità, prezzo articolo e totale documento mantenendo criteri, errori, fonti e ordine degli avvisi. Recuperi dalla riga verificata, fingerprint e controlli tra articoli restano nel dominio; nessuna ripartizione del totale. Equivalenza su 20.672 casi, 300/300 onboarding e 495/495 HTTP/DB sintetici, inclusi privacy, replay e riavvio del ledger. Nuovo sorgente vincolato nelle future autorizzazioni, zero AI o DB reale. [Report](v5/fase0-backend-purchase-validation-refactor-20261023.md).

## 23 ottobre 2026 — R07, ingresso unico dei test offline

Alias test backend e sette wrapper passano da un runner con build, allowlist di profili/DB, ambiente ridotto e guardie Node/Prisma. Cluster nuovo 55439/API3119; API separata dai test di code, risorse possedute arrestate anche su errore. Aggiornate due fixture obsolete senza ridurre privacy/idempotenza. Verificati 224 ordinari, 295 onboarding e 495 HTTP/DB, compreso riavvio del ledger; zero AI/DB reale. [Report](v5/fase0-offline-test-harness-20261023.md) e [comandi](../backend-v5/test/OFFLINE.md).

## 23 ottobre 2026 — R04, validazione per campo backend separata

Estratto il validatore dei campi degli oggetti, conservando criteri, ordine, errori, diagnostica e revisione dei dati facoltativi. Equivalenza su 8.316 casi, onboarding 295/295, ordinari 214/214 e guardie qualità 25/25; nuovo file vincolato nelle future autorizzazioni. Nessun AI, DB o cambio delle conferme. [Report e limiti](v5/fase0-backend-field-validation-refactor-20261023.md).

## 23 ottobre 2026 — R03, responsabilità della revisione spese separate

Estratte proiezione pura di regole/payload/riepilogo e checklist con focus, conservando stato, query e conferme nel componente. Centralizzati anche [ripristino e snapshot della compilazione](v5/fase0-editor-compilation-refactor-20261023.md), preservando scelte salvate, rinvii e separazione dalle richieste pendenti. Nessuna modifica di comportamento, API o validazioni; regressioni su importi ambigui, acconto/saldo, risorse non disponibili e input conservati. [Report R03](v5/fase0-editor-review-refactor-20261023.md).

## 23 ottobre 2026 — Manutenzione del caricamento V5 e peso iniziale frontend

Separati ingresso rotta e contenuto intake per eliminare il ciclo con il workspace. Riga spesa del riepilogo Casa separata dai form: entry JS di produzione da 507.951 a 479.496 byte, gzip da 156.490 a 147.622. Stato corrente separato dai 98 checkpoint storici conservati integralmente. Stesse props/export, markup e logiche operative; nessun cambiamento a API, dati o validazioni. [Audit e verifiche](v5/fase0-code-audit-refactor-20261023.md).

## Fase 0: nome breve senza perdere la descrizione documentale — 23 ottobre 2026

Proposta entro 120 caratteri dopo verifica del nome esteso, conservato e visibile con modello/varianti e fonte. Abbreviazione sempre da controllare; nessuna conferma automatica, identità o attribuzione di prezzo dal solo prefisso. [Report e limiti](v5/fase0-short-product-name-offline-20261023.md).

## Fase 0: diagnostica dei rifiuti visuali, offline — 23 ottobre 2026

Il decoder localizza gli errori con sezioni e campi ammessi, senza valori o contenuti privati nei log. Codici, limiti e validazioni invariati. Causa della precedente risposta caffè non recuperabile senza il risultato grezzo, nessuna nuova chiamata AI. [Report e verifiche](v5/fase0-coffee-rejection-offline-20261023.md).

## Fase 0: tre anomalie UI risolte offline — 23 ottobre 2026

Archiviazione manuale sincronizzata prima dell’invio, preservando CAS e fonte; date dei profili acquisite anche dall’evento input nativo. La conferma parziale conserva costo rinviato ed etichette Acconto/Saldo nella compilazione durevole, senza vecchie richieste pendenti o nuove spese. Percorso browser completo ripetuto su ambiente nuovo e isolato. [Report e limiti](v5/fase0-ui-fixes-offline-20261023.md).

## Fase 0: regole generali dei documenti, offline — 23 ottobre 2026

Rimossi vincoli su poche diciture e ordine fisso delle colonne per gli acquisti: ruoli condivisi, sinonimi e colonne riordinabili con valuta e prezzo stampati. Rafforzata attribuzione della riga e distinzione data fattura/acquisto; dati ambigui richiedono revisione. Nessuna regola per nomi/prezzi del committente, AI o modifica ai dati reali. [Audit e verifiche](v5/fase0-general-rules-offline-20261023.md).

## Fase 0: ordini Samsung/caffè, verifica offline — 23 ottobre 2026

Separati ordine, acquisto e consegna; la data dell’ordine non propone garanzia o spesa automatica. Spedizione esplicita come dato documentale, totale ordine distinto dal prezzo oggetto; prodotti ripetuti tra pagine richiedono revisione. Prompt candidato v28, nessuna AI o modifica ai dati reali. [Report e verifiche](v5/fase0-orders-offline-20261023.md).

## Fase 0: piano attuato offline, UI fatture e proposte da catalogo — 23 ottobre 2026

Q48 mostra pagine coperte/pendenti e pagina di ogni fattura, con importi separati e revisione parziale esplicita. Prompt v27 e regressioni Q20/Q29/Q30 preservano titoli/date letterali e tutti i validatori. Catalogo generico di 91 apparati: proposte locali di tipo e ambienti compatibili, salvate solo con scelta esplicita; posizioni confermate protette. Matrice proposta dei 147 documenti, nessun cambio automatico delle famiglie. Test backend/HTTP/DB isolati verdi e frontend mock **834/834 (102 file)**; nessuna AI, migrazione o modifica ai dati dell’app. [Report e limiti](v5/fase0-night-plan-offline-20261023.md).

## Fase 0: piano ampliato con catalogo apparati v4 — 23 ottobre 2026

Aggiornato il solo [piano proposto di 5–8 ore](v5/fase0-next-hours-plan-20261023.md) dal workbook v4 letto senza modifiche: 147 tipi documentali e 91 apparati. Aggiunta matrice oggetto/impianto e suggerimenti di ambienti tipici alternativi, da confermare, con prove sintetiche previste di privacy e idempotenza. Conteggi e riferimenti controllati; nessuna implementazione runtime, import, test di prodotto nuovo o chiamata AI. Report e gate storici invariati.

## Fase 0: Q48, copertura per pagina e revisione incompleta esplicita — 23 ottobre 2026

Schema v26 con uno slot per pagina fisica; fatture da 122/244 EUR separate, nessun totale globale. Copertura server e metadati durevoli senza contenuti: la prima fattura non chiude il file se resta pagina 2, neppure tramite documentOnly. Build/lint, onboarding 195/195, qualità 24/24, guard 11/11, backend 213/213 e DB sintetico 38/38 verdi. Nessuna AI, gold o campagna ricalcolati. [Report](v5/fase0-q48-coverage-offline-20261023.md). [Piano proposto per le prossime ore](v5/fase0-next-hours-plan-20261023.md), con riferimento Excel in sola lettura alle famiglie già presenti.

## Fase 0: Q22, prezzi e data per riga dalla fonte verificata — 23 ottobre 2026

Supportata la tabella testuale Importo con quantità esplicite: 300 e 500 EUR, data d’acquisto comune 18/09/2026, senza dividere gli 800 EUR. Fonti, identità e costi distinti per riga; deduplica tra copie e verifica finale prezzo/data nell’automatico, rollback e replay durevole. Prompt v25; nessuna AI, modifica gold/validazioni o migrazione. Build/lint, onboarding 188/188, qualità 24/24, guard 11/11, backend 213/213, DB isolato Q22/Q15/Q48 30/30. Gate storico ancora non superato. [Report e limiti](v5/fase0-q22-lines-offline-20261023.md).

## Fase 0: Q15 split payment, revisione obbligatoria dal testo verificato — 23 ottobre 2026

Controllo locale su tutte le pagine, anche escluse dal prefisso AI: totale corretto senza saldo proposto non autorizza più l’automatico. Policy legata a documento/versione/SHA, verifica finale transazionale anche per i contatti; bozze finanziarie precedenti prive del controllo richiedono conferma esplicita. Manuale da 244 EUR conservato. Build/lint, onboarding 181/181, qualità 24/24, guard 11/11, backend 213/213 e DB isolato Q15/Q48 20/20 verdi. Nessuna AI, modifica gold o ricalcolo della campagna; gate ancora non superato. [Report](v5/fase0-q15-payment-offline-20261023.md).

## Fase 0: nuova campagna sintetica v24 conclusa — 23 ottobre 2026

Eseguita l’autorizzazione sui soli 52 sintetici: 148 Messages, 3,562652 USD, zero incerti/retry, nuovo ledger isolato. Baseline 101/104 output validi, etichette 16/16 e importi 64/70, ma **gate non superato**: due esiti automatici contrari al gold su Q15 split payment, soglie importi/date/stabilità non raggiunte e copertura Q48 ancora 1/2 per campo. Ricevuta con protocollo/piano/codice congelati, confronto con v22 e verifica dopo riavvio/replay a rete disabilitata senza nuove richieste. Nessuna risorsa canonica o dato reale trasferito; gold e campagna precedente invariati. [Esiti, costi e blocchi](v5/fase0-quality-v24-campaign-20261023.md).

## Fase 0: Q48, fatture separate per pagina — 22 ottobre 2026

Supportate offline due fatture complete in uno stesso originale, con segmenti SHA/pagina, ancoraggi e conferme distinte. Q48 conserva 122 e 244 EUR senza un totale aggregato; nessun automatico, contatto o soggetto implicito. Provenienza e deduplica per segmento, replay e copie protetti, rollback dell’intera richiesta. Prompt v24; nessuna migrazione o chiamata AI. Build/lint, onboarding 174/174, backend 213/213, DB sintetico 11/11; gate live e gold invariati. [Report e limiti](v5/fase0-q48-invoices-offline-20261022.md).

## Fase 0: correzioni offline di evidenze visive e importi — 22 ottobre 2026

Corretti falsi rifiuti dei titoli stampati delle targhette e dei totali con dicitura `documento corrente`; citazioni, ruolo/valuta, regioni e revisione visiva ancora obbligatori. Prompt `document-understanding-v23-evidence` e diagnostica del rifiuto titolo senza contenuti. Build/lint, onboarding 166/166 (18 nuove regressioni), qualità 24/24, guard 10/10 e backend 213/213 verdi. Gold e risultati live invariati, nessuna nuova chiamata AI o accesso DB; gate ancora non superato. [Report e residuo delle due fatture Q48](v5/fase0-evidence-amounts-offline-20261022.md).

## Fase 0: campagna qualità AI sintetica conclusa — 22 ottobre 2026

Eseguito il protocollo congelato sui soli 52 sintetici autorizzati: 146 Messages, costo calcolato 3,545746 USD, zero esiti incerti/retry, entro 12 USD/150 chiamate. Runner live con ricevuta vincolata agli hash, consenso sintetico e ledger persistente isolato; diagnostiche e misure per campo senza risposte grezze. Gate qualità **non superato** (81/104 output baseline validi); nessun cambio alle modalità predefinite o promozione del pilota. Build/lint, 24/24 test qualità e 10/10 guard verdi; verifiche ledger dopo riavvio e replay a rete disabilitata senza nuovi tentativi. Nessuna risorsa canonica creata, nessun reale inviato o `.env` modificato. [Report e limiti](v5/fase0-quality-v3-campaign-20261022.md).

## Fase 0: generatore e primi 30 casi qualità AI — 22 ottobre 2026

Generatore offline HTML/PDF, scansioni e targhette simulate, corpus iniziale con gold versionato e hash, audit e parser di produzione. Taratura locale autorizzata su sole statistiche aggregate di 34 originali, senza invii o scritture sui dati reali. [Consegna e limiti](v5/fase0-quality-v3-stage1-20261022.md).

## Integrazione release Home nel branch V5 — 22 ottobre 2026

Integrati BL-01/02/03/04/10b da `claude/bl02-garanzia` nel branch `dev/dimora-v5-local-20261013`, con fast-forward e API locale riavviata. Stabilizzati tre file di test frontend: precaricamento dei moduli lazy nei casi ricevuta/costo da oggetto e attesa esplicita del ripristino delle 24 righe prima del focus nella ricerca; conservate tutte le asserzioni di privacy, idempotenza e comportamento. [Esiti e limiti delle verifiche](project-status.md).

## Documenti: professionista collegato a spesa e oggetto (BL-10b) — 22 ottobre 2026

Con la conferma unica del documento il professionista confermato viene collegato anche alla spesa e agli oggetti salvati, così compare sulla scheda dell'oggetto. Il resto di BL-10b (estrazione del professionista, riconciliazione per P.IVA, scarto, oggetto dell'intervento proposto dal documento) era già presente. [Analisi e verifiche](v5/bl10b-document-professional-object-20261022.md).

## Documenti: scatta una foto (BL-04) — 22 ottobre 2026

«Scatta una foto» accanto a «Scegli file»: fotocamera posteriore sul telefono, nomi leggibili, archiviazione Solo io, HEIC rifiutato con istruzioni, nessuna analisi automatica sulle immagini. Provato sul computer; prova su telefono reale ancora da fare. [Dettagli](v5/photo-capture-bl04-20261022.md).

## Attività: prossimo promemoria (BL-01) — 22 ottobre 2026

Dopo il completamento di un promemoria Dimora propone il successivo tra 6, 12 o 24 mesi dal giorno del completamento, o a una data scelta; nulla viene creato senza conferma, un solo successivo per attività, legame visibile su entrambe. Migrazione additiva con backup verificato. [Dettagli e verifiche](v5/activity-follow-up-bl01-20261022.md).

## Casa: storia essenziale (BL-03) — 22 ottobre 2026

Nuova pagina «Storia della casa» da Casa: eventi inseriti a mano con data anche solo per anno o mese, lavori datati con le spese, promemoria completati e oggetti aggiunti a Dimora, filtro per anno, «Aggiungi alla storia» dal documento. Migrazione additiva con backup verificato. [Dettagli e verifiche](v5/home-history-bl03-20261022.md).

## Oggetti: garanzia manuale (BL-02) — 22 ottobre 2026

Scheda oggetto con garanzia «fino al» o «scaduta il» e provenienza; modifica per data o mesi, scorciatoia esplicita dei 24 mesi, documento di supporto tra quelli collegati, «Crea promemoria» precompilato. L'onboarding non presume più la scadenza di 24 mesi. [Dettagli e verifiche](v5/warranty-bl02-20261022.md).

## Documenti: archivio unico e dieci famiglie — 21 ottobre 2026

Eliminate le tre macroviste dal nuovo ingresso; documenti personali autorizzati organizzati in famiglie con conteggi server e paginazione. Info accessibili, filtro Collegamento, ricerca globale e famiglie nelle righe. Conservati originali, spese, riferimenti e scelte pregresse. [Regole e verifiche](v5/document-unified-archive-20261021.md). La famiglia acquisti è ora «Acquisti, garanzie e manuali», con Info esplicita su fatture e scontrini degli elettrodomestici; chiave e dati invariati.

## Documenti: Cambia famiglia — 21 ottobre 2026

Menu a tendina direttamente nell’elenco della casa, conferma esplicita e apertura del gruppo scelto. Famiglia personale/versionata distinta dal tipo; costi e riferimenti condivisi conservati. [Regole e verifiche](v5/document-house-family-20261021.md).

## Oggetti: conserva documenti nella casa — 21 ottobre 2026

Corretta la gestione delle fatture condivise: archivia soltanto la scheda scelta, conserva gli altri oggetti e tutti i loro collegamenti. Appartenenza esplicita personale alla vista casa, senza copie o rimozione dei riferimenti al videocitofono. Migrazione additiva e riepilogo “Collegamenti che rimangono”. [Verifiche e limiti](v5/house-documents-from-object-20261021.md).

## Documenti: consultazione e correzione del tipo — 21 ottobre 2026

Accesso diretto all’originale, visualizzatore PDF locale e singola azione di modifica nel dettaglio. Stato personale anche nel GET dettaglio; correzione esplicita da Altri, esempi nascosti nell’app reale. [Verifiche e limiti](v5/document-original-classification-20261021.md).

## Documenti: ritorno dalla ricerca e risultati nelle altre viste — 21 ottobre 2026

Ricerca globale con origine temporanea per account/casa, ripristino alla cancellazione e rimandi dai risultati vuoti senza azzerare i filtri. [Verifiche e limiti](v5/document-search-context-20261021.md).

## Documenti: riferimenti e dati salvati nelle righe — 21 ottobre 2026

Oggetti e impianti collegati apribili direttamente; fatture distinguibili tramite le spese personali già salvate, senza rinominare o duplicare record. [Ambito e verifiche](v5/document-row-context-20261021.md).

## Documenti: meno scelte prima dell’archivio — 21 ottobre 2026

Apertura su tutti gli stati, stato nel pannello Filtri, avviso pendenti condizionale, testata mobile compatta e barra ricerca persistente. Terminologia e messaggi vuoti più chiari; Vedi dettagli conserva il contesto all anche dall’ingresso senza parametri. [Verifiche](v5/document-archive-entry-20261021.md).

## Documenti: tre viste nello stesso archivio — 21 ottobre 2026

Tutti i documenti, Documenti della casa e Documenti di oggetti e impianti; tipologie della casa, conteggi completi e paginazione dedicata, ricerca globale e ripristino dal dettaglio. Allineato il CHECK di persistenza per Contratti, già accettati dal dominio. [Verifiche e limiti](v5/document-views-20261021.md).

## AI: case autorizzate sulla stessa campagna — 21 ottobre 2026

Configurazione opzionale per ulteriori case dello stesso account, con tetto monetario e chiamate condivisi. Disponibilità e worker rispettano lo stesso perimetro; nessuna modifica al ledger o ai consensi. [Verifiche](v5/shared-ai-campaign-20261021.md).

## Documenti: collegamento diretto e compilazione più breve — 21 ottobre 2026

Riferimento esistente selezionabile senza nuovo oggetto, anche nel fallback manuale; scelta conservata nella bozza e validata alla conferma. Titoli iniziali distinguibili, categoria proposta da precedenti concordi e mai sopra una scelta esplicita. Nuovi gruppi numerati nell’ordine dei file e anteprima PDF ruotabile. [Comportamento e verifiche](v5/document-flow-simplification-20261021.md).

## Modulo unico fatture e originali dell’intervento — 21 ottobre 2026

Riferimento facoltativo compatto, proposta unica precompilata senza scritture, campi secondari ripristinabili, azione guidata sui dati mancanti e riepilogo senza totali ripetuti. I documenti delle spese attribuite compaiono nella scheda dell’oggetto e si aprono anche dalla riga del costo, senza copie o migrazioni. Percorso tecnico da casa vuota e collaudo desktop/mobile su cinque originali. [Verifiche e limiti](v5/invoice-single-flow-20261021.md).

## Fatture successive: proposta dell’oggetto esistente — 21 ottobre 2026

Ricerca in sola lettura dei riferimenti già presenti, motivazione e scelta esplicita senza creare nuove schede. Riuso delle spese già attribuite, protezione nella modalità automatica e nessun nuovo invio AI. [Comportamento, verifiche e limiti](v5/object-suggestions-20261021.md).

## Fatture: collegamento all’impianto e acconto/saldo — 21 ottobre 2026

Il costo complessivo di una fattura può riferirsi a un oggetto o impianto esistente, senza creare una scheda o copiare il totale sugli altri componenti. Etichette acconto/saldo nel titolo, selettore nei moduli, riepilogo e ripristino della scelta. [Causa, verifiche e limiti](v5/expense-installments-object-20261021.md).

## Dettaglio Ambiente compatto — 21 ottobre 2026

Modifica in alto, Archivia nel menu, nota visibile, schede degli oggetti e dettagli/storia compatti su desktop/mobile. Conteggi personali e paginazione preservati. [Comportamento e verifiche](v5/room-detail-20261021.md).

## Ambienti a schede — 21 ottobre 2026

Schede desktop/mobile coerenti con Oggetti, ricerca per nome e filtro unico con Attivi/Archiviati/Tutti e Con/Senza oggetti. Dettagli e azioni esistenti conservati. [Comportamento e verifiche](v5/room-cards-20261021.md).

## Rubrica: ricerca durante lo scorrimento — 21 ottobre 2026

Ricerca e filtro restano visibili scorrendo i contatti, anche su mobile. [Verifiche e ambito](v5/contact-search-sticky-20261021.md): solo CSS, 8 test mirati e controlli frontend, collaudo desktop/mobile con dati fittizi.

## Attività: ricerca e compattezza; paginazione stabile — 21 ottobre 2026

Ricerca per titolo su tutte le pagine, Mostra/Scadenza compatti e righe sintetiche. Mostra altri conserva il punto di lettura in Attività e Rubrica, con focus sul primo risultato aggiunto. [Comportamento, verifiche e limiti](v5/activities-search-pagination-20261021.md). 37 test frontend e 6 backend offline, build/lint e browser desktop/mobile con 80 attività e 100 contatti fittizi; dati reali intatti.

## Filtri stanza compatti — 21 ottobre 2026

Oggetti: selettore Stanza sempre visibile, prima le stanze con oggetti, conteggi server e accesso a tutte le altre. Ambienti: elenco compatto con lo stesso ordine e conteggi personali. Ricerca e ritorno conservati. [Comportamento, verifiche e limiti](v5/room-filters-compact-20261021.md). 24 test mirati, build/lint e browser desktop/mobile; dati reali intatti.

## Elenco Documenti compatto — 21 ottobre 2026

Titolo/tipo/visibilità, stato e azione principale in evidenza; metadati nei dettagli richiudibili e originale nel menu secondario. Ricerca, filtri, selezioni e ritorno conservati, inclusi i dettagli già aperti. [Comportamento, verifiche e attività residue](v5/document-list-compact-20261021.md). 72 test mirati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Documento–spesa: ritorno e azioni esplicite — 21 ottobre 2026

Ritorno al documento di provenienza, “Registra un’altra spesa” distinto dalla consultazione e data della proposta etichettata Emissione. Annullamento della spesa aggiuntiva torna al documento; provenienza preservata anche dopo il salvataggio esplicito. [Comportamento, verifiche e attività residue](v5/document-expense-navigation-20261021.md). 86 test simulati, build/lint e browser desktop/mobile; dati reali intatti.

## Dettagli spese e bollette: riepilogo iniziale — 21 ottobre 2026

Completata la priorità concordata: importo, fornitore e periodo insieme in testa alla spesa; emissione e scadenza distinte. Stesso riepilogo nei documenti collegati, con dati mancanti espliciti e nessuna duplicazione dei record. [Comportamento e verifiche](v5/expense-detail-overview-20261021.md). 75 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Riepilogo, filtri Spese e dettaglio oggetto — 21 ottobre 2026

Riepilogo dei valori da salvare con periodo/emissione/scadenza distinti; filtri Spese unificati e richiudibili con indicatori rimovibili; collocazione oggetto evidente e dati secondari richiudibili. Campi della spesa conservati al cambio solo-documento. [Comportamento, verifiche e limiti](v5/ux-summary-filters-object-20261021.md). 131 test simulati, controlli frontend e browser desktop/mobile; dati reali intatti.

## Recupero bozze e collegamento Ambienti — 21 ottobre 2026

Avviso e Riprova salvataggio nella barra sempre visibile, focus sull’errore e recupero idempotente preservato. Gestisci ambienti non si sposta al focus e apre al primo clic. [Comportamento e verifiche](v5/ux-recovery-fixes-20261021.md). Frontend soltanto; dati reali intatti.

## Documenti: Salva bozza ed esci — 21 ottobre 2026

Bozza esplicita anche incompleta, ripresa dalla stessa scheda, nessuna spesa/oggetto/contatto creato e nessun invio AI. Errori e risposte perse conservano il modulo; altre uscite mantengono l’avviso. [Comportamento, verifiche e limiti](v5/compilation-draft-20261021.md). Sostituisce il rinvio delle bozze nei resoconti precedenti; nessun autosalvataggio.

## Rubrica: archiviazione e collegamenti distinti — 21 ottobre 2026

Nel dettaglio, spiegazioni separate per Archivia contatto e Rimuovi collegamento, con indicazione dei dati conservati e messaggio dopo l’esito riuscito. Azioni dirette, elenco e ritorno invariati. [Comportamento e verifiche](v5/contact-actions-20261021.md). Collaudo su contatti fittizi; dati reali intatti. Bozze rimandate.

## Testi tecnici più semplici — 21 ottobre 2026

Documenti ricevuti sostituisce Consegne ricevute; dimensioni in KB/MB con conversione decimale e limiti approssimati leggibili, controlli esatti in byte invariati. [Comportamento e verifiche](v5/plain-language-20261021.md). Nessuna modifica ai dati reali; bozze rimandate.

## Ricerca Documenti unificata — 21 ottobre 2026

Ricerca automatica nell’intero archivio della casa, stato unico Tutti/Da fare/Completati, filtri in pannello desktop/mobile e indicatori rimovibili. Nuova ricerca senza restrizioni nascoste; testo, filtri, pagine, focus e posizione conservati dal dettaglio. [Comportamento, verifiche e limiti](v5/document-search-unified-20261021.md). Dati reali intatti; bozze rinviate.

## Rubrica compatta e ritorno all’elenco — 21 ottobre 2026

Elenco desktop/mobile approvato, ricerca durante la digitazione, azioni Chiama/Email e pagine aggiunte. Ricerca, filtro, pagine, focus e posizione preservati dal dettaglio e con Indietro. [Comportamento, verifiche e limiti](v5/contacts-catalog-20261021.md). Dati reali intatti; bozze rinviate.

## Analisi AI riuscite: nessuna rianalisi — 21 ottobre 2026

Risultati estratti riutilizzati anche prima della conferma; esclusione dalla selezione multipla e blocco server dei nuovi invii sullo stesso snapshot. Correzione manuale e recupero idempotente preservati. [Regola e verifiche](v5/ai-success-reuse-20261021.md). Nessuna modifica ai dati reali; bozze rinviate.

## Accesso diretto a Oggetti e Ambienti — 21 ottobre 2026

Menu laterale desktop con sette sezioni; Menu mobile completo con barra inferiore a cinque voci preservata. Sezione attiva precisa, focus e chiusura gestiti, ritorno Rubrica mantenuto. [Comportamento e verifiche](v5/section-navigation-20261021.md). Nessuna modifica dei dati reali.

## Casa e Documenti: testi chiari e primo utilizzo — 20 ottobre 2026

Documenti da controllare e Dati da confermare distinguono le due code; casa senza documenti con invito iniziale, casa completata con messaggio distinto. Versioni e impronta nei dettagli tecnici richiudibili. [Comportamento e verifiche](v5/casa-document-copy-20261020.md). Bozze escluse dall’intervento.

## Compila diretto e uscita esplicita — 20 ottobre 2026

Compila apre direttamente il modulo, recupera la bozza esistente e non avvia AI; Precompila con AI resta nel modulo con consenso separato. Riprendi più tardi sostituito da Esci senza salvare con spiegazione di ciò che resta disponibile. [Comportamento e verifica](v5/direct-compilation-20261020.md).

## Bollette: modulo e linguaggio semplificati — 20 ottobre 2026

Scelta esclusiva Un mese/Un intervallo con bozze locali conservate al cambio; emissione e scadenza separate. Precompila con AI, Registra spesa e Salva documento espliciti; riepilogo confermato descritto come già salvato. API e dati reali invariati. [Comportamento e verifiche](v5/bill-form-language-20261020.md).

## Compilazione: avviso coerente sulle modifiche non salvate — 20 ottobre 2026

Menu e cronologia Indietro protetti come cambio documento e ritorno; Annulla conserva i campi, salvataggio riuscito prosegue senza doppio avviso. Verifica su dati simulati, dati reali intatti. [Comportamento e limiti](v5/document-unsaved-guard-20261020.md).

## Selezione AI riservata ai documenti non completati — 20 ottobre 2026

Completati esclusi da caselle e selezione totale anche in Tutti e ricerca; rianalisi dal dettaglio da decidere. Dati reali preservati. [Regola e verifiche](v5/ux-audit-followup-20261020.md#selezione-ai-esclusione-dei-completati).

## Correzioni dopo audit browser — 20 ottobre 2026

Competenza nelle spese collegate, titolo leggibile dalla spesa, tipologia precisa dei documenti e contrasto dei campi migliorati. Dati reali preservati; selezione AI sui completati da decidere. [Comportamento e verifiche](v5/ux-audit-followup-20261020.md).

## Correzioni UX Documenti e Rubrica — 20 ottobre 2026

Tipologie casa leggibili su mobile, ambito di ricerca coerente con la vista e ricerca globale preservata, selezione AI esplicita e ritorno della Rubrica alla provenienza. Nessuna modifica ai dati reali. [Comportamento, verifica e limiti](v5/ux-confirmed-fixes-20261020.md).

## Dettaglio oggetto compatto — 19 ottobre 2026

Implementata anteprima desktop/mobile: sintesi, menu modifica, dati essenziali compatti, documenti/manuali raggruppati, costi e attività laterali, contatti/storia richiudibili. Funzioni e fonti preservate; nessun dato reale modificato. [Comportamento, verifica e limiti](v5/object-detail-layout-20261019.md).

## Audit UX Casa applicato — 19 ottobre 2026

Stati vuoti più discreti, Esplora mobile uniforme, Condivisioni richiudibile senza nascondere avvisi, anno vicino al totale e Storico Attività separato. Nessuna modifica ai dati reali. [Comportamento e verifica](v5/casa-layout-20261019.md#audit-ux-applicato--19-ottobre-2026).

## Casa più compatta — 19 ottobre 2026

Scadenze e Da completare con tre conteggi affiancati. Da completare dopo Esplora e Spese; rimosso il riepilogo duplicato ambienti/oggetti/tecnica, dettagli casa e ruolo più discreti. Dati e collegamenti canonici preservati. [Comportamento e verifica](v5/casa-layout-20261019.md#casa-più-compatta--19-ottobre-2026).

## Collocazione oggetto dal dettaglio — 19 ottobre 2026

Menu Stanza nel box Dettagli, salvataggio esplicito, Da collocare e Più ambienti mantenuti. Stanze disponibili reali, stato vuoto e caricamento pagine; nessuna assegnazione reale automatica. [Verifica e comportamento](v5/object-catalog-layout-20261019.md#scelta-stanza-nel-dettaglio--19-ottobre-2026).

## Oggetti e impianti — 19 ottobre 2026

Implementati schede compatte desktop/mobile, Elenco, ricerca server nome/marca/modello, chip ambiente con conteggi completi e ordinamento. Ritorno dal dettaglio con vista, filtri, pagine, focus e posizione. Dati reali e icone, nessuna foto inventata. [Comportamento, API, verifiche e limiti](v5/object-catalog-layout-20261019.md).

## Ambienti dalla planimetria — 19 ottobre 2026

Implementati punti numerati coerenti con le schede, proposte AI da rivedere, elenco modificabile, bozza persistente e conferma atomica con collegamento agli ambienti già presenti. Desktop/mobile verificati; analisi reale autorizzata con 8 proposte lasciate in bozza e nessun ambiente reale creato. [Comportamento, contratto e limiti](v5/floor-plan-rooms-20261019.md).

## Documenti della casa e Rubrica — 19 ottobre 2026

Esplora la casa con tre accessi: Oggetti e impianti, Ambienti, Documenti della casa. Rubrica sotto Spese; archivio unico con filtri Planimetrie/Pratiche/APE/Contratti/Impianti. [Dettagli](v5/house-document-navigation-20261019.md).

## Bollette: periodo di riferimento — 19 ottobre 2026

Completati raggruppamento mensile, filtri e totali per competenza, con emissione e scadenza separate. SORGENIA corretta sulla registrazione esistente. [Regole, verifica e limiti](v5/bill-reference-period-20261019.md).

## Spese: layout desktop/mobile e distribuzione — 19 ottobre 2026

Totale e ricerca anticipati, Registrazioni/Riepilogo, grafico mantenuto anche accanto/sotto l’elenco su richiesta esplicita. Ritorno dal dettaglio con ricerca privata, filtri, pagine e posizione. [Comportamento, verifica e limiti](v5/spese-layout-20261019.md).

## Attività: layout approvato e ritorno al contesto — 19 ottobre 2026

Scadenze con filtri e conteggi server, Analisi e verifiche in vista distinta, strumenti secondari richiudibili. Desktop/mobile senza selezione multipla. Il ritorno dal dettaglio conserva filtro, pagine e posizione; supportato anche Indietro. [Comportamento, verifica e limiti](v5/activity-layout-20261019.md).

## Casa: scadenze compatte e filtri collegati — 19 ottobre 2026

Tre righe con conteggi server delle attività aperte: Scadute, Oggi e In programma (tutte le date future). Ogni riga apre il filtro corrispondente in Attività; i filtri sono conservati nell’URL. Accesso alle attività senza data mantenuto quando presenti. Verificati desktop e mobile a 390 px, senza scorrimento orizzontale. Nessun cambiamento API o dati.

## Casa: Da completare compatto con conteggi — 19 ottobre 2026

Tre righe per documenti da compilare, proposte e verifiche; conteggi completi dal servizio e gruppi cliccabili. [Contratto, verifica e limiti](v5/casa-counts-20261019.md).

## Casa: scadenze in box autonomo — 19 ottobre 2026

Le tue scadenze ora ha un box autonomo sopra Da completare, che mantiene documenti, proposte e verifiche. Separazione strutturale valida per desktop, mobile e ordine di lettura. Nessuna modifica ai dati.

## Casa: scadenze prima dei documenti — 19 ottobre 2026

Le scadenze aprono il blocco Da completare su desktop e mobile, con maggiore evidenza del titolo e sfondo leggero. Seguono documenti e verifiche. Dati e logica dei promemoria invariati.

## Casa: layout approvato e scadenze — 19 ottobre 2026

Implementati riepilogo operativo, fonti pendenti reali, scadenze personali, accessi alla casa e spese sintetiche su desktop/mobile. [Verifica e limiti](v5/casa-layout-20261019.md).

## Ricerca visibile e viste mobile Documenti — 18 ottobre 2026

Implementata la fase approvata: ricerca globale con ambito esplicito, filtri separati, alternanza Compila/Originale senza smontare i pannelli e intestazioni Fattura/Ricevuta corrette. [Comportamento, verifica e limiti](v5/document-search-mobile-20261018.md).

## Etichette della spesa da documento — 18 ottobre 2026

«Nessun oggetto» sostituito da «costo non attribuito a un oggetto», con spiegazione che gli oggetti collegati al documento non ricevono automaticamente il costo. Riepilogo ora «Data della spesa», coerente con il campo inserito. Solo testi, nessuna variazione ai collegamenti o ai dati.

## Collaudo browser Fattura/Ricevuta — 18 ottobre 2026

Verificati upload, spesa sola, nuovo oggetto facoltativo, collegamento esistente, Completati e costi unici. Corretto azzeramento dei campi spesa dopo aggiunta articolo. [Evidenze e osservazioni UX](v5/manual-purchase-flow-20261018.md#collaudo-browser-e-correzione-successiva).

## Fattura e Ricevuta: spesa diretta, oggetti facoltativi — 18 ottobre 2026

Implementato il percorso approvato: importo/data/fornitore/categoria senza oggetto obbligatorio; aggiunta o collegamento facoltativi, costo unico e solo documento conservati. [Comportamento, motivazione e verifiche](v5/manual-purchase-flow-20261018.md).

## 18 ottobre 2026 — Bolletta manuale: campi spesa diretti

Scelta Bolletta collegata alla struttura della bozza manuale, senza Articolo 1 o creazione oggetti. Importo subito editabile, data, fornitore e categoria; conservazione del solo documento ancora disponibile. Cambio versionato e idempotente con protezione dei dati salvati. [Report](v5/manual-bill-flow-20261018.md).

## 18 ottobre 2026 — Compilazione documentale in uno spazio unico

Coda Da fare, modulo condiviso manuale/AI e anteprima PDF locale richiudibile; caricamento riuscito apre la prima scheda. Sezioni separate per metadati, costi, oggetti e contatti, controlli esistenti conservati. Salva e passa al successivo soltanto dopo conferma. Avviso sui campi locali non salvati. [Verifica](v5/document-editor-workspace-20261018.md).

## 18 ottobre 2026 — Documento solo, salvataggio e ritorno coerenti

Scelta esplicita fra solo documento e revisione di oggetti/spese/contatti; nel manuale il default evita articoli fittizi. Tipo e titolo salvati prima della conferma; la revisione rimane montata fino alla chiusura della bozza. Esito visibile e collegamento ai Completati. Checklist dei dati mancanti per articolo, metadati e spesa; ritorno dai dettagli conserva vista e filtri. Recupero delle conferme pendenti conserva corpo e chiave originali. [Verifica](v5/document-ux-fixes-20261018.md).

## 18 ottobre 2026 — Stati leggibili nella pagina Documenti

Ingresso Da fare e vista Completati sullo stesso archivio. Righe con Da compilare, In analisi, Da rivedere, Analisi da verificare o Completato; Compila, Rivedi proposta, Apri documento o Vedi dettagli secondo stato. Eliminazione sotto Altre azioni; selezione multipla attivabile e recupero della coda conservato. Stato personale e versione/SHA calcolati dal server; nessuna migrazione, nuovo invio AI o modifica delle regole di conferma.

## 18 ottobre 2026 — Consolidamento e consegna della sessione

Documentazione soltanto: AGENTS abbreviato, stato V5 verificabile, ingresso architettura distinto dal legacy, indice decisioni e priorità di ripartenza. Consolidate anche le note documentali preesistenti non committate; preservate ed escluse le modifiche funzionali legacy. Baseline funzionale 4742bd4 (schede «Rivedi proposta»). Nessuna nuova analisi AI, modifica DB o funzione introdotta.

## 2026-10-18 — Rivedi proposta sulla singola scheda

Le schede con bozza AI aperta mostrano «Rivedi proposta» e aprono la bozza esistente, anche per documenti della casa. Durante la compilazione multipla ogni proposta pronta aggiorna subito la relativa scheda. Bozze manuali ed esiti confermati restano distinti. Verifica: 17 test frontend mirati, build frontend/backend e lint dei file modificati; controllo browser su tre proposte già disponibili. Nessuna nuova analisi AI.

## 18 ottobre 2026 — Salvataggio schemi impianto e AI sui selezionati

Corretto il mapping di Schema di impianto e altri tipi documentali nel salvataggio. Tipo, titolo e consenso a sostituire metadati già salvati sono nella revisione unica; nessun secondo dialogo richiesto per il tipo mancante. In Documenti: checkbox individuali/Seleziona tutti, consenso sui selezionati, preparazione AI persistente e riapertura delle proposte nella stessa pagina. Il nuovo avvio multiplo non crea automaticamente entità e rispetta budget/riserve esistenti.

## 18 ottobre 2026 — Pagina unica Documenti V5

Aggiunta inline, elenco canonico permanente, originale/manuale/AI/Elimina su ogni scheda. Revisione riutilizzata nella stessa pagina; rimossi elenco lotti e riepilogo del caricamento da questo ingresso. Filtri Tutti/Da completare/Completati sul server; ricerca e raccolte sotto «Cerca e filtra». Upload parziale recuperabile con stesso manifest e invio dei soli file mancanti. Eliminazione degli originali non ancora utilizzati con controllo dipendenze e conferma esplicita. Consenso e budget AI invariati.

## 18 ottobre 2026 — Da completare in Documenti

Nuovo accesso vicino a Carica documenti per riprendere subito i lotti aperti nella revisione esistente. Lista filtrata lato server, vuoti/completati esclusi, account/casa rispettati. Nessuna analisi avviata dalla navigazione.

## 18 ottobre 2026 — Caricamento documenti più chiaro

Pulsante Scegli file evidente, elenco con nome/dimensione e Rimuovi, avvio upload/AI soltanto dopo conferma della lista. La stessa scelta file è usata per aggiungere a un lotto. Rimuovi con conferma anche per file già acquisiti prima dell’AI; copie conservano l’originale, documenti elaborati/collegati protetti. Test sintetici HTTP e UI, verifica browser390/320; nessuna analisi a pagamento.

## 18 ottobre 2026 — Compilazione della rubrica dai documenti

La stessa analisi AI propone installatore/professionista con recapiti e IVA/CF presenti nell’originale. Revisione unica precompilata, possibilità di escludere il contatto, riconoscimento dei contatti esistenti e completamento dei soli campi vuoti. Nuovo consenso per la creazione automatica anche dei contatti nei caricamenti delegati. Quattro analisi reali per 0,127216 USD hanno isolato e corretto citazioni visive incomplete: V19 riconosce nome, telefono e IVA dalla conformità; fattura riconciliata per IVA senza duplicati. Email non presente lasciata vuota. Test e limiti nel report contact-extraction-v19-20261018.md.

## 18 ottobre 2026 — Mini rubrica personale della casa

Rubrica operativa da Casa: contatti, ricerca, modifica, archivio/ripristino, telefono/email; collegamenti privati da documenti, oggetti, spese, lavori e attività, creazione inline atomica e controllo doppioni/versioni/retry. Proposta installatore da conformità già estratta, solo su conferma; export personale esteso. Migrazione additiva V5; nessuna nuova AI. [Report e contratto](v5/mini-rubrica-20261018.md).

## 18 ottobre 2026 — Revisione unica: campi e costo verificati

Completati i tre blocchi autonomi offline. Proiezione bolletta non impone scelta per arretrati zero; proposta di costo con prezzo/data verificati può sopravvivere alle sole omissioni opzionali di consegna/garanzia, senza ignorare incertezza del provider. Una conferma, controlli duplicati/esclusioni e campi salvati verificati su DB sintetico. Report: [esiti e limiti](v5/unified-review-autonomous-final-20261018.md).

## 18 ottobre 2026 — Importi ausiliari e ruoli economici V16

Zeri stampati di IVA/voci accessorie conservati senza bloccare una bolletta valida; arretrati zero non richiedono scelta importo. Totali correnti, saldi, subtotali e imposte distinti con prova valutaria attribuita al singolo numero. Nessuna spesa zero, somma o ripartizione automatica.27nuovi test/83offline e48DBHTTP verdi; replay in lettura della bolletta e fattura reali senza perdita degli importi validati. NessunaAI o modifica dati/budget. [V16](v5/house-amount-evidence-v16-20261018.md).

## 18 ottobre 2026 — Conformità archiviata nella casa, V15

Su correzione del committente, la conformità propone classificazione/originale e metadati opzionali, senza digitalizzare dettagli tecnici o creare impianti. Revisione unica semplificata anche per bozze precedenti; nessun nuovo contatto. Policy automatica document-only con guard costi. ProviderV15 non-live; test backend/DB/FE e browser desktop/mobile verdi, dati e budget invariati. [Report](v5/conformity-document-only-20261018.md).

## 18 ottobre 2026 — Evidenze conformità V14, verifica offline

Date brevi della dichiarazione recuperano soltanto la propria etichetta contigua nella pagina verificata. Alias italiani espliciti del tipo impianto sono normalizzati alla tassonomia, senza inferire acquisto/garanzia. Prompt V14 più preciso sulle citazioni visuali.16 nuovi test,34 regressioni understanding,28 DB verdi; budget e contenuti invariati. [Report](v5/conformity-evidence-v14-20261018.md).

## 18 ottobre 2026 — Estrazione documenti V13 verificata sugli originali

Corrette quantità opzionali e tabelle descrizione/quantità/prezzo/totale; planimetrie visive senza intestazione proposte come documenti della casa da rivedere. Diagnostica per fase senza testo personale. Otto analisi su sette originali: costo 0,258852 USD, saldo 2,416046 USD, 39/40 chiamate. Caffè e robot con identità/prezzo/data; conformità ancora parziale. Dati canonici 9/5/5 e nove SHA invariati. Test offline e DB/HTTP verdi. Dettagli: [report V13](v5/document-extraction-v13-20261018.md).

## 2026-10-18 — Organizzazione automatica dei caricamenti V5

Consenso unico per invio AI e creazione delegata dei casi chiari, coda durevole, recupero dopo chiusura pagina, estrazioni già disponibili riusate senza costo. Riepilogo e sole eccezioni al posto della revisione di tutte le righe; percorso manuale mantenuto. Doppioni/source/versioni/budget preservati; nessun nuovo invio dopo errore o incertezza. Fatture con prezzi di riga verificati, bollette senza oggetto e documenti casa coperti dai test sintetici. Nessuna nuova analisi personale o modifica budget. Report docs/v5/automatic-intake-20261018.md.

## 2026-10-18 — Demo Roma ricostruita dagli originali

Su consenso delegato: backup/reset scoped e ricaricamento9originali,5oggetti,5spese3012.17EUR; planimetria solo casa e4documenti sullo stesso quadro. Verifica browser desktop/mobile;6richieste AI0.209122USD,2completamenti assistiti da fonti verificate. Budget residuo2.674898USD e9chiamate. Problemi residui tracciati in backlog. Nessuna modifica software/configurazione. Report operativo outputs/Dimora-V5-Roma-rebuild-20261018.md nel workspace.

## 2026-10-18 — V12 collaudata su due documenti reali

Con consenso delegato: fattura lavori con quadro/monitor e1537.20EUR; acquisto caffè con nome/marca/modello EXAM440.35.B/499EUR/data2026-06-14. Due analisi riuscite,0.067026USD totali,nessuna conferma canonica. Default locale tipo citofono elettrico e titolo lavori da descrizione verificata;2testFE/build/typecheck/lint verdi. Report V12 aggiornato.

## 2026-10-18 — V12: fatture lavori e revisione combinata

Spese della casa anche per lavori/servizi, soggetti product/system e un solo Salva e organizza. Costi opzionali non verificati non scartano identità valide; avvisi e limiti economici server/UI. Fonte/costi/doppioni/replay protetti. 92BEoffline,28DB,54FE verdi e browser mobile sintetico; nessuna AI live. Report V12 in docs/v5.

## 2026-10-18 — V11: valuta tra parentesi nel totale fattura

Accettati totali espliciti come TOTALE 1.537,20 (EUR), mantenendo verifica importo e rifiuto IVA/subtotali/valute diverse. Diagnosi job evidence_unverified purchaseTotal/total; 37 test offline verdi, nessun nuovo invio AI o mutazione della bozza personale.

## 2026-10-18 — V5 comprensione documentale V11, prima tranche

Conformità impianto, fattura, bolletta ed etichetta nella revisione unica; metadati/fatti con fonti, omissioni opzionali motivate, scelta conformità solo casa, ingresso archivio unificato. Test sintetici e browser mobile verdi; nessuna AI live o consumo budget. Report: docs/v5/document-understanding-v11-report-20261018.md.

## 2026-10-18 — Revisione unica Documenti V4

Compilazione per file con tutti gli articoli inline e una conferma finale; righe estranee escluse anche dai costi. Estrazione opzionale dei prezzi per riga con citazioni, controllo doppioni per articolo, recupero idempotente e bollette della casa conservati. Specifica v5/document-review-unified-v4.md; prove e limiti nel rapporto della sessione.

## 2026-10-17 — prima integrazione onboarding UX V3

Specifica approvata consolidata e prima UI reale con lista compatta, revisione mobile dedicata, campi diretti, conferma unica, selezione/versioni e recupero invariati. 57 casi distinti mirati verdi attraverso più esecuzioni, build/lint verdi; browser API reale sintetico senza scritture o AI. Estensioni sostituzione dati confermati, quote multiarticolo e vocabolario ordini ancora separate. Dettagli `docs/v5/onboarding-v3-implementation-20261017.md`.

## 2026-10-17 — verifica autonoma mockup onboarding

Esercitati gli 11 scenari sintetici. Corrette destinazioni dinamiche dei collegamenti a nuove schede, coerenza conferma singola/multipla, testo dei costi facoltativi, rinvii, modifica copie e limiti monetari cumulativi. Solo prototipo e rapporto QA; nessuna modifica all’app/API/DB e nessuna chiamata AI.

## 2026-10-17 — mockup onboarding semplificato, da validare

Prototipo navigabile separato `frontend-v5/public/mockup-onboarding-semplificato.html`: ordine tre articoli e altre dieci casistiche, conferma diretta singola/multipla, esclusione e distinzione stato documento/articoli. Dati sintetici e solo storage locale; nessuna modifica a API o app operativa. Prove browser e limiti in `frontend-v5/docs/onboarding-simplified-mockup-20261017/design-qa.md`.

## 2026-10-17 — manuale ufficiale nella scheda oggetto
Sezione Manuale e istruzioni disponibile locale: ricerca iniziale Moulinex, corrispondenza esatta modello, conferma distinta, link manuale per altri produttori, rimozione e storia. Migrazione additiva25 HomeObject.manual, export metadati privati, recupero same-key e invalidazione proposta su cambio versione. Collaudato browser reale su oggetto sintetico, reload e320/390 senza overflow; nessun personale/AI/email. Onboarding da foto completo ancora da collegare. Dettagli docs/v5/object-manuals-20261017.md.

## 2026-10-17 — onboarding oggetti dai documenti, nucleo offline O1
Specifica e codice additivi per proposte multiarticolo da PDF testuali e JPEG/PNG, evidenze distinte testo/immagine, matching per articolo e scelte esplicite senza costi. Adattatore multimodale preparazione/decodifica senza dispatch, non collegato a UI/API/worker. 18 nuovi test offline e25 regressioni Anthropic/ricevuta verdi; build/lint verdi. Nessuna chiamata, dato personale o servizio modificato. Stato e limiti docs/v5/object-onboarding-development-20261017.md.

## 2026-10-16 — V5 B2 archivio assistito e consegna Claude
Salvataggio/rinvio/ripresa delle scelte, organizzazione personale versionata e conferma parziale recuperabile, consenso sostituzione, riferimento duplicato e link canonici a schede esistenti. Raccolte in Documenti e metadati in dettaglio/export; corretto riuso della cache tra raccolte. Migrazione23 dedicata; intake ancora isolato, nessun provider chiamato o documento personale riclassificato. Raccolti C1/C2/C3 Claude (4a97008,28bec15,c4b1996,a4e7787), componenti/test/handoff e screenshot sintetici; integrati solo filtri nel prodotto. Prove e limiti: docs/v5/document-intake-b2-report-20261016.md.

## 2026-10-16 — Ricevuta: prova reale sintetica
Attivato percorso solo per PDF sintetici. Corretto ritorno alla bozza dal documento. Browser verifica pausa/ripresa, conferma unica, rianalisi senza duplicati, errore/manuale, scheda/costo ed export; nessun invio AI esterno.

## 2026-10-16 — Gate collaudo ricevuta
Preparata limitazione ai soli PDF sintetici prima della prova browser; personali esclusi, nessuna attivazione/restart.3unit e39HTTP/DB verdi.

## 2026-10-16 — Ricevuta R7b
Collegati client/container lazy, documento originale, pausa/ripresa, esiti, dati scheda e confronti Da rivedere. Export frontend riconosce sezioni ricevuta. Test DB/HTTP/harness/build/lint verdi; attivazione e browser reali ancora aperti.

## 2026-10-16 — Ricevuta R7a
Bozza rimandata conserva scelte e campi manuali, ripresa esplicita e protezioni su target cambiati.25HTTP/DB e42FE verdi. Funzione ancora isolata.


## 16 ottobre2026 — ricevuta R6b isolata
Job persistenti e worker lease/quote/source-check, output PDF validato in bozza senza creare oggetti/spese. Migrazione18 additiva DB V5, API registrata ripristinata;13test jobs e9regressioni export verdi, build/lint verdi. Modulo NON attivo, nessun provider esterno; interfaccia/browser restano prossimi.
## 2026-10-16 — Ricevuta R4 conferma transazionale
Conferma unica oggetto/costo, origini validate, ledger/recovery, rollback e riuso senza duplicati o sovrascritture.12test offline+15HTTP/DB+7regressioni mirate verdi, build/lint verdi. Tutto ancora isolato dalla app, nessun provider reale o documento personale usato.


## 2026-10-16 — Ricevuta R3 e integrazione sorgenti Claude
Raccolte le tre consegne Claude;34test originali verdi e38con correzioni mirate Codex. Campi/confronti persistenti con9test HTTP/DB verdi, migrazione solo DB V5, capability non attiva. Dettagli e limiti nel rapporto receipt-assistance-backend-20261016.md.


## 2026-10-16 — Ricevuta R2: bozze persistenti in modulo isolato
Aggiunte bozze e ledger con migrazione additiva nel DB V5 dedicato; service/controller non attivati nella app.7test HTTP/DB verdi, build/lint verdi, sorgente revocata/versionata redatta e replay rifiutato. API registrata ripristinata dopo generazione client. Nessuna modifica ai documenti personali.


## 2026-10-16 — Ricevuta assistita, specifica e primo nucleo backend
Consolidata specifica, preparati tre incarichi progressivi Claude e piano autonomo fino alle20. Implementato nucleo backend per evidenze ricevuta, totali semplici, conflitti e candidati. Build/lint e10nuovi test+7regressioni mirate verdi. Nessun endpoint/migrazione/provider attivato.


## 2026-10-16 — Mockup ricevuta: verifiche indipendenti e conflitti
Verificati nel browser scelte indipendenti, ritorno con correzioni e dati invalidi; aggiunto scenario di conflitto con fonti e scelta esplicita senza sovrascritture. Esiti e collegamenti ora rispettano le operazioni selezionate. Solo mockup statico.

## 2026-10-16 — Mockup navigabile ricevuta assistita
Anteprima autonoma con quattro scenari, fonti, correzioni/esclusioni, riepilogo e ritrovamento su oggetto/Spese. Browser reale desktop e viewport390/320, nessun dato o API del prodotto toccati. Specifica proposta e limiti in v5/receipt-assisted-flow-mockup-20261016.md. Nessuna analisi o chiamata a pagamento.

## 2026-10-16 — Preselezione spesa e riscontro prova personale
Modulo S1 attende la verifica dei collegamenti di partenza e mostra l'oggetto preselezionato.19test spese/build/lint verdi, browser reale verifica senza salvare nuovi costi. Registrata richiesta documenti→oggetti/riuso costo senza duplicati, estensione ancora da specificare. Backup aggiornato rinviato su scelta committente. Vedi v5/expense-object-preset-20261016.md.

## 2026-10-16 — Corpus/scorer v2 integrati
Consegna Claude integrata59f6438/d0e2e16, test parser/fixture reali senza skip; tre correzioni scorer Codex e registrazione nuovi test in npm test.27mirati verdi, poi18puri e1parità dopo escape Unicode, lint completo verde. Nessuna chiamata remota, DB o src modificati. Vedi v5/fase0-corpus-v2-integrazione-20261016.md.

## 2026-10-16 — Collaudo UI file/export reale e fix320
Chrome estensione collegato dal committente; account sintetico storico separato, nuovi PDF/PNG Solo io, anteprima/download/ZIP/JSON desktop e mobile verificati anche sui file fisici e hash. Corretto body min-width320 che eccedeva clientWidth305 con scrollbar Windows; browser dopo fix senza overflow nelle viste provate, build/lint verdi. Esito v5/fase0-browser-collaudo-20261016.md. Account personale preservato, nessuna AI/email/env o modifica sicurezza Windows.

## 2026-10-16 — Conservazione della prova personale
Regole documentate: conservare la casa reale senza scadenza automatica; rimozione solo esplicita, archiviazione e backup distinti. Chiariti passi separati per primo archivio e AI personale. Eliminazione tecnica ancora assente, nessun runtime/DB o originale modificato. Vedi v5/prova-personale-conservazione-20261016.md.

## 2026-10-16 — Raccolta Claude Fase0 e chiusura backup
Integrate consegne UX/corpus9a65fec/8fc1947. Rifiuti certi di controllo/spazio distinti da invio incerto, retry stessa chiave, avviso pilota e testi file/JSON/ZIP aggiornati.32test frontend/build/lint verdi. Difetti scorer riprodotti offline sui fixture reali (non accuratezzaAI). Roundtrip copia cifrata Drive hash identico, chiave esterna confermata. Arbitrato e gate residui in docs/v5/fase0-chiusura-arbitrato-20261016.md.

## 2026-10-16 — V5 export personale della casa
API personal-export-v1 e pannello Documenti per JSON personale; campi espliciti, storia e provenienza filtrate, snapshot/coerenza e nuova verifica permessi/sessione. Budget10000righe10MiB2concorrenti, nessun originale o segreto nel pacchetto. Build/lint backend/frontend e prove mirate reali/harness verdi; limiti in docs/v5/personal-export-esito-20261016.md. Schema e ZIP M2 invariati.

## 2026-10-16 — V5 controllo nuovi file
Staging privato, Defender bloccante, ricevuta DB additiva e riserva disco; originali precedenti preservati. Build/lint,22 unit test e12 test HTTP/DB reali sintetici verdi. Nessuna chiamata AI/email. Vedi docs/v5/fase0-file-control-esito-20261016.md.

## 2026-10-16 — consolidamento Home dopo audit

## 2026-10-16 — Backup verificato e pianificazione Home

Backup V5 online con snapshot esportato, originali e manifest; restore isolato reale:41tabelle e255originali corrispondenti, cluster temporaneo spento, API e PG attivi invariati. Raccolti7commit documentali Claude fa4a7bf..7ac52f7. Piano e stime release Home in v5/home-release-piano-20261016.md, nessuna nuova funzione sviluppata. Report operativo v5/backup-verifica-20261016.md.

## 2026-10-16 — Arbitrato finale Home e focus consegne

Raccolta consegna UX Claude ef454e4 come492622b. Corretti HOME-FIN-002 (focus upload/conferma/accettazione/codice rifiutato) e003 (codice di confronto). Build/lint verdi,45casi distinti mirati coperti fra esecuzioni; upload e codice errato verificati anche browser reale sintetico. FIN001/004/005 facoltativi rinviati alla prova personale. Dettagli v5/home-rifinitura-arbitrato-20261016.md.

## 2026-10-16 — Collaudo funzionale finale Home

Verificato via browser reale oggetto/documento/attivita/costo, persistenza, riepiloghi, download hash e rifiuto casa estranea; dati solo sintetici. Nessuna modifica runtime. Riallineati test conteggi alla nuova Casa e attesa del login nel test errore elenco. Suite342/344 iniziale, poi29/30 e ultimo caso1/1: nessuna seconda suite completa dichiarata. Vedi v5/home-collaudo-funzionale-20261016.md.

## 2026-10-16 — Casa e consegne consolidate

Casa con azioni/scadenze/verifiche in alto e dettagli richiudibili; ingresso codice senza casa e istruzioni prima della generazione integrati da Claude. Riepilogo conferme differito, senza totali inventati da pagine parziali. Guida rinviata. Build/lint verdi,46test mirati e caso contesto finale1/1; browser reale desktop/320px. Vedi v5/home-consolidamento-integrazione-20261016.md.

Integrata la consegna Claude164e8fa come1792f20. Corretti messaggi interni di disponibilità AI, esempi condizionati alla fixture, testi caldaia nei promemoria generici, refusi/visibilità/data italiana e focus dopo aggiornamenti. In Casa i permessi futuri non figurano più fra le azioni attive. Nessun cambiamento backend o ai diritti. Arbitrato dei16rilievi e limiti: [Home](v5/home-consolidamento-arbitrato-20261016.md). Guida e riordino Casa restano proposte separate, non rilasciate.

## 2026-10-15 — C1a integrato e verificato

Condivisione selettiva documentale reale con abbinamento esterno, accettazione e revoca. Corretto il salvataggio di download dopo logout/cambio account e la persistenza di dati dopo 403. Frontend 331 test, build/lint verdi; percorso browser/API/DB reale e hash del file verificati. Dettagli: [integrazione C1](v5/c1-frontend-integration-20261015.md).

## 2026-10-15 — backend C1a sharing-v1

Contratto congelato, persistenza e API per originali scelti, abbinamento esterno, accettazione/revoca e download autorizzato. Migrazione additiva solo V5 locale; build/lint, 25 test C1, 105 offline (includono9C1) e29 regressioni DB verdi. API registrata riavviata; nessun cambiamento ai permessi M2/Spese. Report [C1 backend](v5/c1-backend-review-20261015.md).

## 2026-10-15 — C1 revisione UX consolidata

Raccolta consegna Claude 7dffbbe come aafbf86. Corretti mockup sola scheda/rifiuto e flusso abbinamento; specifica v0.2 e arbitrato. Prove browser della simulazione su percorso esterno positivo, scadenza e rifiuto. Nessun C1 reale attivo. Report v5/c1-ux-arbitrato-20261015.md.

## 2026-10-15 — C1 definizione e policy offline

Specifica e disegno API in revisione, base policy con nove test verdi, build/lint riusciti. Nessuna condivisione reale attiva o migrazione. Claude avviato dal committente per mockup/revisione UX. Report: [C1 base](v5/c1-foundation-review-20261015.md).

## 2026-10-15 — verifica percorso Spese

Collaudati via browser manuale/modifica/oggetto/archiviazione e proposta sintetica con collegamento senza duplicati. 29 test DB/HTTP verdi; nessuna correzione necessaria. Rapporto: [verifica Spese](v5/spese-verifica-percorso-20261015.md).

## 2026-10-15 — integrazione caricamento frontend V5

Sezioni caricate alla prima apertura; errore chunk recuperabile con ricaricamento esplicito. Entry JS 721140 -> 485144 byte; build/lint e 316 test verdi. Dettagli: [rapporto](v5/frontend-loading-integration-20261015.md).

# Changelog

## 2026-10-14 — H3a integrazione finale notturna

Frontend Claude760804f raccolto autonomamente, sette commit integrati escludendo sync. Spese attive: riepiloghi personali, moduli/documenti/caldaia, storia/archive/restore. Codex corregge anno storico e testo503 ambiguo; build/lint,213 baseline frontend e31 H3 mirati verdi,19 client/API non-live verdi/quattro live saltati. Browser320/390/desktop/tastiera/reload/login:0,10+0,20=0,30EUR, due soli record e fonti immutate. H3a chiusa localmente, nessun consumo AI aggiuntivo. Report docs/v5/h3-integration-review.md e outputs/Dimora-V5-rapporto-notturno-20261014.md.


## 2026-10-14 — H3a backend spese verificato

Schema additivo HomeExpense/ExpenseHistory/ExpenseRequest applicato al solo DB V5 locale; nove endpoint expenses-v1 attivi. Importi/totali in centesimi, costi personali, archive/restore, storia/idempotenza/CAS e riferimenti redatti. Build/lint, 77 offline, 89 integrazione e cinque HTTP sul processo3001 verdi. Frontend Claude ancora in lavorazione; nessuna chiamata Anthropic o modifica main/legacy. Esito docs/v5/h3-integration-review.md.


## 2026-10-14 — revisione indipendente H2 e avvio H3a

Raccolta Claude cfdd0b3: corretti next fra sessioni, ritorno dal dettaglio fra account e cache dopo revoca in paginazione, con 41 test mirati/build/lint verdi. Contratto expenses-v1 congelato e validazioni backend iniziali; H3a non ancora operativo. Nessuna chiamata AI o modifica schema/DB in questa preparazione.


## 2026-10-14 — H2 backend ricerca verificato

Implementate capabilities e ricerca documenti autorizzati con filtri MIME/visibilità, Unicode NFC e paginazione legata ai filtri. Build/lint, 73 test offline e 75 integrazione superati. Verifica HTTP H2 su harness Nest reale con PostgreSQL; riavvio del processo 3001 e integrazione frontend ancora aperti. Nessuna modifica schema o chiamata Anthropic. Dettagli in docs/v5/h2-integration-review.md.


## 2026-10-14 — H2 ricerca documenti, preparazione

Fissati document-search-v1 e ADR-V5-13: ricerca server nei titoli/nomi dei documenti autorizzati della casa, formato MIME e visibilità, cursor legato ai filtri. Capabilities pianificata, pagina M2 invariata; nessun motore AI/OCR o nuova categoria finta. Incarichi Codex/Claude e bundle base H1 preparati. Implementazione H2 ancora da iniziare; nessuna modifica schema/runtime né chiamata Anthropic.


## 2026-10-14 — H1 attività e scadenze consolidata

Integrati sette commit frontend Claude escludendo sync; Casa mostra Le tue scadenze, Attività Da fare, promemoria manuali/caldaia e completa/annulla/riapri con storia. Corretto focus trap e conservazione della chiave in caso ambiguo; nuove prove su risposta persa. Backend 71 offline/61 integrazione, frontend 152 mock/fixture, client/API 15 reali e browser 320/390/desktop/tastiera/reload/login verdi. Suite client distanziate per rispettare auth, live AI disabilitata nel runner normale. Zero nuove chiamate Anthropic; H1 chiusa solo in locale. Resoconto docs/v5/h1-integration-review.md.


## 2026-10-13 — H1 backend attività personali verificato

Implementati dieci endpoint activities-v1 e migrazione additiva nel DB locale V5. Promemoria personali con data calendario, completa/annulla/riapri, versioni e storia atomiche, retry idempotente autorizzato; collegamenti caldaia redatti se illeggibili senza perdere appunti. Build/lint, 71 test offline e 61 integrazione passano; cinque prove HTTP H1 passano anche sul runtime 3001 riavviato. Frontend Claude e browser ancora da integrare; zero chiamate Anthropic. Report docs/v5/h1-integration-review.md.


## 2026-10-13 — H1 Attività, contratto pronto

Fissati activities-v1 e ADR-V5-12 per il primo sottoincremento Home utile: promemoria manuali personali, date calendario, caldaia facoltativa, completa/annulla/riapri e storia. Dieci endpoint e prove di accettazione pianificati; nessun codice/schema/API H1 implementato o collaudato. Incarichi separati e bundle di sincronizzazione preparati per Codex/Claude. M1–M4 invariati, nessuna chiamata AI.


## 2026-10-13 — M4 Anthropic consolidata in locale

Backend/parser/ledger e frontend Claude integrati; citazioni verificate, consenso e conferme esplicite. Build/lint, 67 test backend, 45 API/DB, 4 ledger, 126 frontend, 12 client/API e 7 nella suite live passano. Browser 320/390/desktop e tastiera: fonti pagina 2/3, conflitto A+C senza sovrascrittura, chiusura verifica e reload. Sei Messages, 0.041714 USD, nessun incerto. Le sei chiamate iniziali sono terminate; risultati navigabili e saldo 9.958286 USD conservato. Dettagli docs/v5/m4-integration-review.md.


## 2026-10-13 — Backend M4 verificato offline, attivazione aperta

- Parser PDF.js 6.4.299 in processo separato senza chiave API; estratti paginati e verifica locale delle citazioni e delle grandezze. PDF senza testo o protetti falliscono esplicitamente.
- Adapter Anthropic con JSON strutturato, consenso, controllo modello/token e nessun retry automatico. Ledger persistente: riserva, costo effettivo/incerto, recupero della risposta salvata senza reinvio.
- Worker con lease rinnovata, deadline e diritti/fonti riletti prima del trasferimento e della pubblicazione. Campi confermati invariati finché l'utente non decide.
- Build, lint e 64 test offline passanti. Nuova chiave e Sonnet 5.5 verificati tramite Models HTTP 200; zero chiamate Messages live. Migrazione/API/integrazione frontend ancora da collaudare: PostgreSQL e controllo CIM richiedono avvio dal PowerShell del committente.

## 2026-10-13 — Contratto M4 Anthropic pronto

- Anthropic scelto dal committente, limite di collaudo 10 USD. Nessuna chiamata live effettuata.
- Contratto analysis-v2, citazioni testuali verificate, consenso, ledger e incarichi separati. Implementazione ancora da costruire.


## 2026-10-13 — M3 consolidata in locale

- Frontend Claude integrato; 45 test backend API/DB, 9 client/API e 105 frontend passanti, build/lint finali superati.
- Browser reale: job Caldaia, conferme parziali, potenze distinte, inbox vuota, fonte e reload; mobile 320/390.
- Fonti nominate, storico italiano, Attivita attiva nelle sottopagine e conteggi job chiariti. Provider soltanto di test.


## 2026-10-13 — Backend M3 implementato, attivazione aperta

- Dodici endpoint, worker persistente, schede personali/proposte/fonti/conferme e storico; migration additiva V5.
- Build/lint e 52 test locali superati; 19 scenari nuovi API/PostgreSQL pronti, non eseguiti.
- Launcher -Review prepara database dedicato e riavvia il solo processo API registrato. Frontend Claude in sviluppo; M3 non completata.


## 2026-10-13 — Preparazione M3 Caldaia

- Fissato contratto review-api: job persistenti, fonti, schede personali e conferme per campo, senza sovrascritture automatiche.
- Preparati tre PDF sintetici con manifesto SHA256; testo verificato e pagine renderizzate e controllate visivamente.
- Incarico frontend Claude pronto; API e worker M3 ancora da implementare. M1/M2 restano attive.

## 2026-10-13 — Documenti M2 completata in locale

- Correzione upload verificata: 23 scenari API/PostgreSQL/storage e 6 client/API superati.
- Browser reale: upload private/home, persistenza, originali e ZIP integri, mobile 320/390; sessione di prova chiusa.
- M3 proposte/conferme resta il prossimo incremento, nessuna estrazione AI implicita nell'upload.


## 2026-10-13 — Correzione upload multipart M2

- Il parser rifiutava un upload valido al raggiungimento di tre parti. Portato il limite parti a quattro mantenendo massimo un file/due campi.
- Aggiunte due prove sul vero middleware Multer; riverifica API esterna ancora necessaria.


## 2026-10-13 — Ripresa PC e integrazione frontend Documenti

- Integrata consegna Claude M2, sei commit; bloccati HTML 200 su file/ZIP e uniformate unità MiB.
- Build/lint e prove frontend verificate; 34 test documentali finali passano. API/storage reali ancora da collaudare fuori sandbox.
- Launcher -Resume per riavvio cluster esistente, senza reset o installazioni di sistema.


## 2026-10-13 — Backend documenti M2

- Implementati upload idempotente, lista paginata, dettaglio, download ed export ZIP selettivo su storage V5 privato. Originali immutabili e verificati con hash.
- Privacy default uploader, visibilita Home esplicita; membership, ruolo, contesto e sessione verificati. Export misto vietato interamente.
- Migrazione autonoma pronta; build/lint e 31 test locali passano. Collaudo API/PostgreSQL ancora da eseguire con -Documents -Test, frontend Claude in sviluppo.


## 2026-10-13 — Chiusura M1 e contratto Documenti M2

- Ultimi 3 test frontend/API e launcher ripetibile verificati; M1 completata per sviluppo locale.
- Fissato documents-v1 e preparato incarico Claude per frontend Documenti, dopo sync della review M1. Endpoint documentali non ancora implementati.


## 2026-10-13 — Riverifica runtime e launcher ripetibile

- 12 scenari API/PostgreSQL passano; nuova casa creata e aperta dal browser senza errore. M1-UI-001 chiusa.
- Launcher riusa il frontend gia avviato dopo verifica del processo registrato, invece di bloccare ogni secondo avvio. Sintassi validata; ultima suite frontend/API ancora da rieseguire.


## 2026-10-13 — Collaudo prima app reale V5

- 11 scenari API/PostgreSQL e 3 frontend/API superati. Browser: registrazione, persistenza, selezione case, logout/login, accesso tra account negato e mobile 320/390 verificati.
- Errore intermittente dopo creazione casa: validFrom ora usa la precisione Date applicativa. 18 test backend e 47 mock frontend passano; regressione reale di dieci creazioni ancora da eseguire dopo riavvio.
- Chiariti i permessi futuri della Casa; M1 resta aperta per riverifica finale.

## 2026-10-13 — Revisione finale prototipo Dimora V5 (baseline v9)

- Chiusi R2-001…007: bozze contestuali, ID Home e report, scelta destinazione Gift, import 22 originali, blocco nuova Home offline/errore, conferma schede Gift e inviti invalidi senza fallback.
- Migrazione stato v2→v3 senza reset globale; altre Home conservate e selezionabili; revoca di vendita senza riapertura tramite nuova casa. Rollback report/storia quando il salvataggio fallisce e ripristino completo dei filtri/ricerca.
- Corretto overflow della barra demo espansa su mobile. 21 controlli automatici e 64 verifiche browser registrate; baseline e documento guida MASTER-02 aggiornati. Nessun backend, database o dipendenza modificato in questa revisione.

## 2026-10-13 — Inbox prototipo con sole verifiche aperte

- Tutte le schede concluse escono da «Da rivedere»: dati descrittivi, classificazione manuale, esemplari distinti, controllo APE Agenzia e dati tecnici Admin. Le fonti restano nelle schede di dominio; le conferme sono nello storico.
- La selezione parziale marca/modello chiude solo i dati selezionati; la scheda mostra gli altri. Dopo l'ultima verifica compare uno stato vuoto, senza schede disabilitate o confermate nella lista operativa.
- Verificati con scenario isolato conferma parziale, rimozione, residui, conteggio e stato vuoto; controllata nel browser la rimozione delle schede già confermate dall'utente. Versione risorse aggiornata per evitare il vecchio JavaScript nella scheda aperta.

## 2026-10-13 — Chiusura conflitto caldaia nel prototipo V5

- Confermare le due grandezze distinte rimuove la scheda conflitto da «Da rivedere» e aggiorna il riepilogo Home. La scheda caldaia conserva 24 kW utili, 28 kW nominali riportati, fonti e stato risolto; lo storico registra la conferma.
- Scegliere «Non ho informazioni sufficienti» mantiene la verifica aperta. Le altre proposte non vengono chiuse automaticamente.
- Verificato nel browser: scheda assente dopo conferma e reload, dati descrittivi ancora aperti, entrambi i valori e fonti conservati nella scheda asset.

## 2026-10-13 — Nuovo prototipo V5 Blu architettura

- Scelta esplicita della proposta 3 e frontend nuovo da zero, senza componenti legacy; possibile riuso limitato al backend dopo audit.
- Prototipo buildless autonomo con 39 schermate principali e percorsi Home, Agenzie e Amministratori, dati sintetici e stato locale. Nessuna API, AI, email, pagamento o database reale.
- Percorsi import/review, dossier/Gift e report privato → presa in carico → manifesto → pubblicazione/chiusura; audience Scala A/B, revoca, cambio titolarità e scenari errore.
- Verificati nel browser 39 ingressi a 1280 e 320 px; provati import, conferma parziale, Gift, pubblicazione selettiva, errore invio e revoca ex proprietario. Non equivale a una certificazione o a collaudo di tutte le combinazioni.
- Ingresso locale `/v5/index.html`; il vecchio link `dimora-v5-design.html` ora conduce al nuovo prototipo. App legacy separata, main e database invariati.

## 2026-10-13 — Ambiente Windows locale Dimora V5

- Checkout isolato su `dev/dimora-v5-local-20261013`, derivato dal branch prototype; nessun push o modifica a main.
- Git, Node.js LTS, VS Code e PostgreSQL portabile: cluster nuovo, 22 migrazioni solo su `dimora_v5_dev` a `127.0.0.1:55432`. Nessun seed o credenziale AI/OAuth reale.
- `HOST` opzionale per il bind localhost del backend, default precedente conservato. Lint frontend limitato a `src` per escludere le dipendenze.
- Build frontend/backend e lint backend passano; lint frontend passa con tre warning hooks preesistenti. Jest: 26 suite, 119 test passati. Preview HTTP 200; API senza sessione HTTP 401.
- Vulnerabilità npm e gap della build production della preview registrati nel backlog. Nessuna funzionalità V5 dichiarata completata.

Modifiche rilevanti per sessione di sviluppo, più recenti in cima. Non è un elenco di ogni commit — vedi `git log` su https://github.com/Vincenzobrutto/Home_OS per quello — ma delle decisioni/feature che cambiano il comportamento dell'app o il modello dati.

## 2026-10-10 — Prodotto completo in locale via VITE_ALPHA_MODE

- `ALPHA_MODE` (frontend/src/config.ts) ora legge `VITE_ALPHA_MODE`: `false` in `frontend/.env` (gitignorato) riattiva in locale Energia (consumi), Mappa con planimetria in sottofondo, Profilo casa, Gmail/Drive e Home Score; il default resta `true`, quindi codice condiviso e coorte alpha non cambiano. Nessuna funzionalità era stata rimossa, solo nascosta dal flag.
- Trovato avviando l'app: la porta 5173 era occupata da un Vite della copia Codex (`Documents\Codex\...\Home_OS`) che serviva codice vecchio; fermato su conferma dell'utente e sostituito col frontend di questo repo.

## 2026-09-16 (6) — Convergenza strategica: wedge Renovation+Financing, niente esecuzione fisica

- Dopo il quadro competitivo verificato (voci precedenti), l'utente ha chiesto di "rimodellare Dimora prendendo il meglio da ognuno" per Italia poi Europa. Sintesi: nessun prodotto consumer-only tra i 20 verificati monetizza — chi monetizza vende a un buyer con soldi concreti in gioco (costruttore, lender, assicuratore, professionista con responsabilità, agenzia) o completa fisicamente il lavoro.
- Convergenza con l'utente (ADR #77): wedge B2B2C prioritario per l'Italia = **Renovation + Financing** (modello RenoFi), non Insurance/Energy/Transaction. Nessun layer di esecuzione fisica (niente rete tecnici propria come Casa) — Dimora resta software + referral.
- `roadmap.md` — nuova sezione "Direzione B2B2C" (non ancora una fase di sviluppo, solo la priorità dopo validazione). `backlog.md` B74 ristretto dal validare 4 wedge a validare specificamente questo. `market-strategy.md` §4 chiuso con l'esito.

## 2026-09-16 (5) — Verifica indipendente di tutti gli altri competitor citati

- Su richiesta dell'utente ("e sugli altri competitor?"), stesso trattamento di DomiKeep esteso a 16 aziende citate in `market-landscape.md`/`market-research-funding-2026.md`: Homer, HomeVaultHQ, Hint, Digs, Smart Bricks, Casa, Zero Homes, RenoFi, Nomos, Dwelly, Deutsche Sanierungsberatung, VARM, Axle Energy, Faura, Neural Earth, ScyAI, Struck, Uniti, Sesame, HomeDLBX.
- 14 confermate accurate su fonti indipendenti (stampa, App Store, registri). Due correzioni: **Smart Bricks** (raccolta reale ma categoria sbagliata — è underwriting immobiliare istituzionale, non un canale di consegna della memoria della casa, usata erroneamente in ADR #73); **ScyAI** (reale ma per portafogli enterprise/industriali, non per il singolo immobile residenziale).
- B68 chiuso con questi risultati. Vedi ADR #76 in `decisions.md`, correzione in `market-landscape.md` §1.2, sintesi aggiornata in `market-strategy.md` §2.

## 2026-09-16 (4) — DomiKeep verificato e ridimensionato (B73)

- L'analisi approfondita di DomiKeep chiesta in B73 ha trovato che **non è un concorrente operativo verificabile**: è una landing page pre-lancio (waitlist/early access, nessun prodotto/app/social), zero presenza web indipendente, e cita un Business ID che non corrisponde a quello reale della società finlandese indicata come parent (verificato sui registri imprese).
- Corretta la caratterizzazione data in ADR #74 (presa da `market-research-funding-2026.md` §6 senza verifica diretta) con una nuova ADR #75, seguendo la convenzione di non riscrivere voci passate. `market-strategy.md` §2 e `backlog.md` B73 aggiornati.
- Lezione di metodo tenuta esplicita nell'ADR: un claim competitivo va verificato con una fonte indipendente prima di essere ripetuto in documentazione, non basta leggere il sito ufficiale del prodotto citato.

## 2026-09-16 (3) — Riorganizzazione del materiale di mercato: un documento di sintesi

- Nuovo `docs/market-strategy.md`: concilia `market-landscape.md` e `market-research-funding-2026.md` in un'unica tesi di lavoro invece di lasciarle come due letture separate e in apparente tensione. Diventa il punto di ingresso primario per il contesto di mercato ("va riletto obbligatoriamente prima di..."); le due fonti restano per il dettaglio.
- La tensione risolta: `market-landscape.md` indicava il differenziale nello strato normativo territoriale, `market-research-funding-2026.md` nella storia privata longitudinale (e valutava la Compliance come il wedge B2B2C più debole). Riconciliate come due livelli distinti — normativa = cuneo di acquisizione, storia = moat di ritenzione — vedi ADR #74 in `decisions.md`.
- Trovato durante la riconciliazione: **DomiKeep**, segnalato in `market-research-funding-2026.md` §6 come il concorrente con sovrapposizione più alta, non era mai stato analizzato nella prima ricerca. Aggiunto B73. Aggiunto anche B74 (validare i 4 wedge B2B2C prima di ulteriori pivot).
- `vision.md` e i riferimenti nelle due fonti aggiornati per puntare a `market-strategy.md` come riferimento primario.

## 2026-09-16 (2) — Seconda ricerca di mercato aggiunta al repo (solo salvataggio)

- Nuovo `docs/market-research-funding-2026.md`: funding scan su Home/Property (Hint, Casa, Digs, Zero Homes, RenoFi, Nomos, ecc.), Digital Building Logbook/EPBD, tesi "Property Graph" e quattro wedge B2B2C da testare (renovation+financing, insurance, energy upgrade, transaction readiness).
- Solo salvato come riferimento, su richiesta esplicita dell'utente — nessuna modifica a `vision.md`/`decisions.md`/`backlog.md` per ora, a differenza di `market-landscape.md` (voce precedente).

## 2026-09-16 (1) — Analisi di mercato aggiunta al repo

- Nuovo `docs/market-landscape.md`: panorama competitivo (Homer, HomeVaultHQ, Digs, ecc.), il precedente normativo francese (CIL), il passaporto di ristrutturazione europeo (EPBD IV) e 4 criteri operativi (C1–C4) per valutare se una feature è un differenziale o una commodity.
- Applicate le tre appendici del documento: due nuove ADR in `decisions.md` (#72 differenziale = strato normativo territoriale, non la memoria in sé; #73 il canale come variabile di prodotto), 5 voci in `backlog.md` (B68-B72, domande di mercato ancora aperte), una riga di raccordo in `vision.md` §"Confine della promessa".
- Nota: il documento cita più volte `docs/compliance-spec.md`, che non esiste ancora nel repo — riferimenti lasciati come sono (forward-looking), per scelta esplicita dell'utente.

## 2026-09-11 (4) — Collegamento garanzia-intervento; form garanzia più chiaro

- `Warranty.originInterventionId` era già nello schema ma mai scrivibile: ora `CreateWarrantyDto`/`UpdateWarrantyDto` lo accettano (validato contro la casa) e il form "+ Aggiungi garanzia" lascia scegliere, solo per il tipo "Riparazione", quale intervento della Cronologia l'ha generata. La card garanzia mostra poi "Da intervento: ...".
- Il tipo di garanzia (Acquisto/Riparazione/Estensione/Altro) esce dalla griglia condivisa con le date e diventa un blocco con etichetta, opzioni riformulate e una spiegazione che cambia in base alla scelta.
- Trovato ragionando con l'utente sul perché lo stesso asset avesse due garanzie: il modello lo prevede correttamente (fatti commerciali distinti nel tempo), ma l'inserimento non lo spiegava. Vedi `decisions.md` #71.
- Corretto anche un dato demo: eliminata dal DB una garanzia da seed con data sbagliata (scadenza precedente all'inizio) su Frigorifero Samsung.

## 2026-09-11 (3) — Data di scadenza garanzia anche nelle informazioni principali dell'Asset

- La scadenza garanzia (`asset.warrantyUntil`) era visibile solo come badge accanto allo stato in alto; ora compare anche come campo nella griglia con Installato il/Acquistato il/Marca/Modello/ecc., più coerente con le altre date. Nessuna nuova logica: stesso campo già usato per il badge esistente.
- Richiesto dall'utente durante la revisione di usabilità/fruibilità (Fase 0).

## 2026-09-11 (2) — Fix: pulsante "Elimina" asset irraggiungibile su mobile

- La riga di intestazione della scheda Asset (`Modifica`/`Dismetti`/`Elimina`) non andava mai a capo: su viewport stretto (375px) i tre pulsanti sforavano il bordo destro dello schermo senza scroll orizzontale, rendendo "Elimina" impossibile da toccare. Aggiunto `flexWrap: 'wrap'` alla riga di intestazione e alla riga pulsanti — su desktop restano affiancati come prima, su mobile vanno a capo sotto il titolo.
- Trovato durante il test del layout mobile (viewport 375×812) nella revisione di usabilità/fruibilità (Fase 0) richiesta dall'utente.

## 2026-09-11 (1) — Fix: ricerca su un intervento non mostrava più la Cronologia

- Regressione introdotta dalle sezioni comprimibili (entry sotto, 2026-09-05 (4)): un risultato di ricerca globale su un intervento apriva la scheda Asset con "Cronologia" chiusa di default, nascondendo il contenuto appena cercato. `GlobalSearch.tsx` ora passa un segnale `focus: 'timeline'` fino ad `AssetDetail` (via `App.tsx`), che espande la sezione e ci scorre sopra automaticamente. La ricerca su una garanzia resta invariata: "Garanzie" non è comprimibile, non serve nessun segnale.
- Trovato durante la revisione di usabilità/fruibilità (Fase 0) richiesta dall'utente, verificato dal vivo con l'account demo (`demo.completa@dimora.test`): cercando "Vaillant" e aprendo "Installazione caldaia" la Cronologia è ora visibile senza click aggiuntivi.

## 2026-09-05 (5) — Regione obbligatoria alla creazione casa; suggerimenti nome asset

- `Bootstrap.tsx`: nuovo campo obbligatorio "Regione" (select, 20 regioni) nel form di creazione casa — serve solo al calcolo automatico dell'intervallo caldaia (vedi entry precedente su boiler-inspection-intervals), chiesta una volta sola invece che dentro la card manutenzione. `CreateHouseDto` backend reso coerente (region obbligatoria in creazione, resta opzionale in `UpdateHouseDto` per le case esistenti). `Maintenance.tsx` mostra il selettore regione solo come ripiego per le case create prima di questo cambio.
- `AddAssetModal`, `ManualClassifyProposal` e `AssetDocumentProposal` (i tre punti di creazione di un nuovo asset): la griglia/select "Tipo" è sostituita da chip di nomi comuni (Caldaia, Lavatrice, Climatizzatore...) che compilano nome e tipo insieme con un clic — stesso pattern già usato per gli ambienti (B63/B64), inclusa la numerazione automatica sui nomi duplicati ("Caldaia" → "Caldaia 2"). Digitare un nome libero resta sempre possibile, senza dover scegliere un tipo a parte.
- Verificato dal vivo con un utente/casa usa-e-getta attraverso il vero flusso di registrazione. Vedi `decisions.md` #70.

## 2026-09-05 (4) — Asset senza ambiente in "Asset"; scheda Asset con sezioni comprimibili

- `AssetsView` (Assets.tsx): nuovo chip "Documenti casa" nella barra filtri già usata per gli ambienti (B65), mostra gli asset senza `roomId` invece di nasconderli. `HouseDocuments.tsx` perde la sezione "Impianti senza ambiente specifico" (ribalta una scelta precedente, vedi `decisions.md` #69) e resta solo con i documenti a livello casa non legati a nessun asset.
- `AssetDetail`: "Manutenzione" e "Cronologia" sono ora sezioni comprimibili, chiuse di default con un badge che mostra il conteggio — riduce la densità della pagina segnalata da un beta tester. "Documenti" e "Garanzie" restano sempre visibili. Le azioni "+ Nuovo piano"/"+ Nuovo intervento" e l'azione rapida "Ultimo intervento" espandono automaticamente la sezione interessata; un form aperto forza comunque la sezione visibile.
- Trovati e sistemati durante la stessa sessione (fix precedenti, vedi entry sopra): rianalisi di un documento già confermato, virgola residua nel titolo casa senza città, corsa tra conferma documento e ricalcolo delle Issue.
- Verificato dal vivo con un utente/casa usa-e-getta (asset con e senza ambiente): chip e filtro funzionanti, sezioni comprimibili si espandono correttamente da header/azione/quick action.

## 2026-09-05 (3) — Fix: corsa tra conferma documento e ricalcolo "Da tenere d'occhio"

- `App.tsx` (`refreshAssets`) chiamava `recalculateScore` in fire-and-forget (`.catch(() => {})` senza `await`) dopo la conferma di un documento; `Inbox.tsx` a sua volta non attendeva `onAssetLinked()`. Risultato osservato dal vivo (segnalato da un beta tester/agente): aprendo subito la Dashboard dopo aver confermato il primo documento, il contatore "Documenti collegati" era già a 1 ma il box "Da tenere d'occhio" mostrava ancora "Nessun documento caricato" (Issue `HOUSE_WITHOUT_DOCUMENTS` non ancora risolta). Ora `refreshAssets` attende il ricalcolo e `Inbox.tsx` attende `onAssetLinked()` in entrambi i punti di conferma (guidata AI e manuale) prima di considerare finita l'operazione.
- Verificato dal vivo con un utente/casa usa-e-getta: subito dopo la conferma del primo documento, Dashboard mostra "Documenti collegati: 1" senza alcun box residuo.

## 2026-09-05 (2) — Fix da simulazione beta tester: rianalisi documento confermato, virgola residua

- Trovato da un agente che ha simulato un percorso reale da beta tester (registrazione, upload, conferma, ricerca, export, cancellazione account su dati usa-e-getta): `DocumentsService.analyze()` non controllava se il documento fosse già `CONFIRMED` prima di rilanciare l'analisi AI — un fallimento successivo (es. chiave API non valida) riportava lo stato a `PENDING` pur avendo già `assetId` valorizzato, disallineando la sezione "Documenti" dell'Asset (filtrata su `CONFIRMED`) dalla cronologia (mai retrocessa). Nella UI reale il pulsante "Analizza con AI" è già nascosto una volta confermato (`Inbox.tsx`), quindi non raggiungibile da un utente che passa solo dai pulsanti — il fix blinda comunque il backend con un `BadRequestException` esplicito. Nuovo test di regressione in `documents.service.spec.ts`.
- `Dashboard.tsx`/`Sidebar.tsx`: `{house.name}, {house.city}` lasciava una virgola residua ("Casa Test," ) quando la città è vuota — ora omessa se assente.
- Durante la stessa verifica, scoperto (non un bug applicativo) che `ANTHROPIC_API_KEY` in uso restituiva 401 "API key is invalid" da Claude — chiave rigenerata dall'utente separatamente.

## 2026-09-05 — Guida per i beta user raggiungibile dalla Sidebar

- Il PDF `dimora-guida-beta-user.pdf` (scritto dall'utente: cos'è Dimora, primo accesso, caricare un documento, cosa non c'è ancora, come segnalare problemi) è ora servito come asset statico da `frontend/public/` e raggiungibile da un link "Guida per i beta user" nel footer della Sidebar, sopra "Esporta i miei dati" — visibile a ogni utente, si apre in una nuova scheda.
- Nessuna modifica al backend. Verificato dal vivo con un utente/casa usa-e-getta che il link compare ed è corretto.

## 2026-09-04 (16) — Test alpha con amici: tunnel pubblico e report di attività

- `frontend/vite.config.ts`: aggiunto un proxy dev-server per i prefissi delle rotte backend (`API_PREFIXES`) verso `http://localhost:3000`, così frontend e backend restano sulla stessa origin agli occhi del browser. Necessario per esporre l'app tramite un tunnel pubblico (Cloudflare Tunnel, una sola porta esposta): senza, il cookie di sessione httpOnly (`SameSite=Lax`) non viaggerebbe tra un dominio frontend e uno backend separati, rompendo il login. `frontend/.env` (locale, gitignored) con `VITE_API_URL` vuoto per usare percorsi relativi. Nessun impatto sull'uso normale in locale/LAN.
- Nuovo `backend/scripts/alpha-activity-report.mjs`: script di sola lettura (nessun endpoint, nessuna UI) che stampa registrazioni e attività per utente (case, asset, documenti caricati/confermati, ultimo accesso) durante la finestra di test con amici. Pensato per essere rieseguito più volte, non una funzionalità di prodotto.
- Pianificata (Task Scheduler di Windows, non nel repository) una chiusura di sicurezza del tunnel/dev server entro domenica sera, su richiesta esplicita dell'utente ("nel dubbio").

## 2026-09-04 (15) — Fix: build backend rotta dopo l'entry (14), `@types/archiver` disallineato dal runtime

- `npm run build` falliva (`archiver(...)` "not callable") perché `@types/archiver` era pinnato a `^8.0.0` mentre il pacchetto runtime resta `archiver@^7.0.1`: la v8 dei tipi riscrive l'API a classi (`ZipArchive`/`TarArchive`, nessuna funzione factory esportata), incompatibile con l'uso `archiver('zip', opts)` già scritto in `HousesService.exportArchive` (entry (14), B62). La claim di quell'entry ("backend build... puliti") non era verificata: il comando non era mai stato rieseguito dopo l'ultimo commit di quella sessione.
- Corretto pinnando `@types/archiver` a `^7.0.0` (stessa major del runtime, API a funzione factory) — nessuna modifica al codice applicativo, solo alla versione dei tipi.
- Sistemati a cascata gli errori di lint scoperti nello stesso controllo: caratteri di controllo intenzionali nella regex di sanificazione nome file (`file-storage.service.ts`, disable mirato con commento), variabile omessa nel manifest export (`houses.service.ts`, stesso trattamento), 3 funzioni test `async` senza `await` (`file-storage.service.spec.ts`, riscritte come `Promise.resolve`/`Promise.reject` dirette) e un argomento non tipizzato in un test (`houses.service.spec.ts`).
- Verificato: `npm run build`/`npm run test` (116/116)/`npm run lint` (0 errori, 0 warning) tutti puliti; frontend non toccato, build già verificata pulita in precedenza.

## 2026-09-04 (14) — Sicurezza dati alpha, portabilità e rifiniture questionario

- **B61**: i file originali vengono ora eliminati fisicamente quando si elimina un documento, una casa o l'account. La staging area consente di ripristinarli se la cancellazione DB fallisce; aggiunti `DELETE /documents/:id`, conferma irreversibile e azioni UI sulle schede Asset/Documenti casa.
- **B62**: “Esporta i miei dati” scarica un ZIP con `dimora-data.json` e tutti i file originali nella cartella `documents/`; i percorsi interni del server non vengono esposti. Aggiunte `archiver@7.0.1` e relative tipizzazioni.
- **B63/B64**: ogni evento di cronologia apre direttamente la scheda del tecnico collegato; in alpha la card “Aggiungi il primo documento” non viene più duplicata dall'Issue `HOUSE_WITHOUT_DOCUMENTS`.
- **B65**: definito `alpha-ai-label-measurement.md` con campione, metrica primaria, scheda minima e soglie go/no-go; il prompt targhette resta invariato finché il test non viene eseguito.
- Corretti i confini del lookup caldaia: Lazio esclude esattamente 10 kW dalla fascia `>10,<100`; Lombardia copre anche `>=350 kW`. Aggiunti test espliciti su 10/35/100/350/500 kW.
- Verifica automatica: backend build/lint puliti e 116 test verdi; frontend build pulita (resta il warning noto sul bundle) e lint senza errori, con i 3 warning hooks già noti.

## 2026-09-04 (13) — Intervallo controllo caldaia calcolato automaticamente da regione + potenza

- Aggiunte due colonne nullable `House.region` e `Asset.powerKw` (migrazione `20260904124000_add_house_region_and_asset_power_kw`) e una tabella di lookup sourced (`backend/src/common/boiler-inspection-intervals.ts`, oggi Lazio + Lombardia) che sostituisce il default fisso della guideline `caldaia-controllo` con l'intervallo corretto quando regione e potenza sono entrambe note.
- Verificato su fonte primaria (DPR 74/2013, Allegato A, testo Bosetti & Gatti) che **l'età dell'impianto non è un fattore reale** per la cadenza ordinaria dei generatori a gas — l'unico riferimento all'anzianità nel decreto riguarda solo la priorità delle ispezioni straordinarie delle autorità, non la cadenza che il proprietario deve rispettare. Deliberatamente escluso dal calcolo.
- `Maintenance.tsx`: quando il calcolo è disponibile ma non ancora risolto, la card mostra un selettore regione + input potenza (kW) + pulsante "Calcola intervallo"; una volta risolto, mostra la fonte normativa citata con link. Il campo "Ogni N anni" (già editabile, vedi entry (12)) resta sempre modificabile.
- Nuovi campi DTO (`region` con `@IsIn` sulle 20 regioni italiane, `powerKw` stesso pattern di `refrigerantChargeKg`) e test in `maintenance-guidelines.spec.ts` (Lazio 24kW→4 anni, Lombardia 24kW→2 anni, fallback al default se regione/potenza mancanti). Vedi `decisions.md` #66.
- Verificato dal vivo con un utente/casa/asset CALDAIA usa-e-getta: prompt iniziale, calcolo Lazio→4 anni con fonte citata, ricalcolo Lombardia→2 anni, campo intervallo rimasto modificabile.

## 2026-09-04 (12) — Intervallo di manutenzione modificabile, non più un numero fisso

- Verificata la normativa Lazio reale (Regolamento regionale 23/12/2020 n. 30, art. 12 c.3): caldaie a gas 10-100kW ogni 4 anni, ≥100kW ogni 2 anni — diverge dalla Lombardia (2 anni sotto i 35kW) già citata nel codice. Le due fonti primarie divergono per la stessa fascia domestica tipica: non esiste un unico numero corretto senza sapere la regione.
- La card di suggerimento manutenzione (`Maintenance.tsx`) mostra ora l'intervallo come campo modificabile ("Ogni [N] anni") invece di un numero fisso nel testo, con una nota che spiega la variabilità reale (Lazio/Lombardia) per gli adempimenti obbligatori. La scadenza proposta si ricalcola dal vivo con l'intervallo corretto.
- Aggiornata la descrizione della guideline `caldaia-controllo` (`maintenance-guidelines.ts`) con il confronto sourced Lazio/Lombardia invece del solo riferimento generico.
- Nessuna modifica a backend/schema oltre al testo della guideline. Verificato dal vivo con un utente/casa usa-e-getta.

## 2026-09-04 (11) — Manutenzione obbligatoria: data di riferimento onesta quando sconosciuta

- Partendo da una richiesta di verifiche normative regionali (accantonata per ora, restava troppo lavoro per collegare `RegulatoryRule`/territorio — vedi ricognizione in questa sessione, B42 in backlog), ridotta all'esigenza reale: quando un asset (es. caldaia) non ha né data di installazione né di acquisto, il suggerimento di manutenzione obbligatoria usava silenziosamente "oggi" come base, mostrando una scadenza fittizia (es. "tra 2 anni" per un impianto che potrebbe già essere scaduto).
- `Maintenance.tsx`: quando `basedOn === 'createdAt'`, la card mostra ora un messaggio esplicito e un campo per indicare a mano l'ultima manutenzione — la scadenza proposta si ricalcola dal vivo da quella data, non da "oggi". Nessuna scrittura su `Asset.installedAt` (sarebbe un dato diverso e falsato); il form di conferma resta comunque editabile come sempre.
- Nessuna modifica a backend/schema. Verificato dal vivo con un utente/casa usa-e-getta.

## 2026-09-04 (10) — Card Asset/Ambienti più grafiche, sfondo a gradiente, filtro per ambiente

- Su richiesta dell'utente (screenshot di riferimento di un'app smart-home, ambito scelto tra 4 opzioni proposte): nuovo sfondo a gradiente chiaro (`T.appBg`, stessa famiglia cromatica del brand) su App/Login/Bootstrap/Consenso; `T.paper` invariato altrove.
- Card Asset/Ambienti ridisegnate: icona più grande su tinta colorata dell'8%, stato mostrato come testo colorato in grassetto sotto il nome.
- Nuova barra di filtro orizzontale per ambiente in "Asset della casa".
- Esclusa esplicitamente dall'utente la nav in basso al posto della sidebar — non toccata.
- Verificato dal vivo con un nono utente/casa usa-e-getta. Build/lint frontend puliti.
- Vedi `decisions.md` #65.

## 2026-09-04 (9) — Suggerimenti ambiente ampliati, numerazione automatica sui duplicati

- Su richiesta dell'utente: i suggerimenti in "Nuovo ambiente" passano da 4 a 13 nomi comuni (Cucina, Soggiorno, Camera da letto, Cameretta, Bagno, Corridoio, Ingresso, Studio, Lavanderia, Ripostiglio, Cantina, Garage, Terrazzo), ognuno mappato al tipo esistente più vicino — nessuna modifica allo schema.
- Se il nome scelto (da suggerimento o digitato a mano) coincide con un ambiente già esistente, viene proposto automaticamente il numero successivo ("Bagno" → "Bagno 2" → "Bagno 3"), sia al clic sia all'uscita dal campo Nome.
- Verificato dal vivo con un ottavo utente/casa usa-e-getta. Nessuna modifica al backend. Build/lint frontend puliti.
- Vedi `decisions.md` #64.

## 2026-09-04 (8) — Fix: il "Tipo" ambiente diventa un suggerimento, non un passo separato

- Segnalato dall'utente dopo aver provato il modal "Nuovo ambiente": la sezione "Tipo" (griglia di 4 card) sembrava un passo in più non necessario.
- Sostituita con 4 pillole sotto il campo Nome ("Cucina", "Soggiorno", "Camera da letto", "Bagno"): un clic compila subito il nome e imposta il tipo corrispondente; l'utente può comunque scrivere un nome libero senza cliccarle.
- Verificato dal vivo con un sesto utente/casa usa-e-getta. Nessuna modifica al backend. Build/lint frontend puliti.
- Vedi `decisions.md` #63.

## 2026-09-04 (7) — Gmail/Drive/Rubrica visibili ma disattivate in alpha

- Su richiesta dell'utente: invece di sparire del tutto in `ALPHA_MODE`, le tab Gmail/Drive (Documenti) e la voce Rubrica (Sidebar) restano visibili ma oscurate/non cliccabili, con una spiegazione al passaggio del mouse di cosa faranno quando disponibili.
- Nessun nuovo componente: riusa l'attributo `title` nativo, stesso pattern già presente altrove nel codebase.
- Ambito limitato a questi tre elementi (scelta esplicita tra le opzioni proposte) — Profilo casa/Energia/card Dashboard restano nascoste come prima.
- Verificato dal vivo con un quinto utente/casa usa-e-getta. Build/lint frontend puliti.
- Vedi `decisions.md` #62.

## 2026-09-04 (6) — Fix: "+ Nuovo ambiente" inline ovunque si assegna un asset a una stanza

- Segnalato dall'utente dopo aver provato il fix precedente: creare il primo asset senza ambienti già censiti lo forzava comunque su "Documenti casa", scoprendo solo dopo di dover tornare indietro a creare la stanza e riassegnare l'asset.
- Stessa opzione "+ Nuovo ambiente…" (pattern già usato per i contatti, B58) aggiunta in tutti e tre i punti dove si sceglie un ambiente per un asset: percorso manuale e percorso guidato AI in Inbox, e il form diretto "+ Aggiungi asset". Apre `AddRoomModal` sopra il form corrente, l'ambiente creato viene selezionato subito.
- Verificato dal vivo con un quarto utente/casa usa-e-getta, incluso il caso più delicato (modal "Nuovo ambiente" annidato dentro il modal "Nuovo asset").
- Vedi `decisions.md` #61.

## 2026-09-04 (5) — Fix: creazione ambiente possibile anche in vista Blocchi

- Trovato provando l'app end-to-end come un nuovo utente reale (due sessioni di test): in alpha non esisteva alcun modo di creare un Ambiente — "Nuovo ambiente" viveva solo nella vista Mappa, disattivata da B52. Ogni asset restava quindi senza ambiente, e di conseguenza invisibile nella vista "Asset" (che filtra apposta gli asset senza stanza).
- Nuovo `AddRoomModal` (stesso schema di `AddAssetModal`) collegato a un pulsante "+ Nuovo ambiente" sempre visibile nell'header di `RoomsHub.tsx`, anche fuori alpha.
- Verificato dal vivo con un terzo utente/casa usa-e-getta: ambiente creato dalla vista Blocchi, asset assegnato a quell'ambiente durante la classificazione manuale, comparso correttamente in "Asset della casa". Build/lint frontend puliti.
- Vedi `decisions.md` #60.

## 2026-09-04 (4) — B54-B59: chiusura del backlog MVP pre-alpha

- **B54** Export dati: `GET /houses/:id/export` (JSON con anagrafica, ambienti, Asset, documenti-metadati, interventi, garanzie, contatti), link "Esporta i miei dati" in Sidebar.
- **B55** Consenso privacy/AI: nuovo `User.consentedAt` (nullable, retroattivo su tutti gli account esistenti), `POST /auth/consent`, schermo bloccante `ConsentScreen.tsx` mostrato subito dopo login/registrazione finché non accettato.
- **B56** Limiti upload: max 20MB, solo PDF/PNG/JPG/WEBP su entrambe le rotte di upload documenti, messaggio d'errore in italiano.
- **B57** Errori AI comprensibili: un fallimento di analisi non risale più come errore tecnico; nuovo pulsante "Classifica manualmente" sempre disponibile in Inbox, che collega un documento senza passare dall'AI.
- **B58** "+ Nuovo contatto" inline nei form Intervento/Garanzia/riassegnazione contatto in AssetDetail, riusando `AddContactModal` esistente — nessun nuovo componente.
- **B59** Nuova suite `backend/test/main-flow.e2e-spec.ts` (login → crea casa → carica documento → conferma manuale → ritrovamento → isolamento tra case, 7 test), rimosso il boilerplate NestJS `app.e2e-spec.ts` che non copriva nulla di reale ed era già rotto (401 dall'AuthGuard globale).
- Backend: build/106 test unitari/7 test e2e/lint puliti. Frontend: build/lint puliti. Verificato con utenti/case usa-e-getta (mai la casa reale né la demo) via script diretti per export/consenso; verificato dal vivo nel browser che lo schermo di consenso compare correttamente (anche sull'account reale, effetto voluto della migrazione retroattiva — non cliccato "Ho capito, continua" per conto dell'utente).
- Chiude B54, B55, B56, B57, B58, B59 nel backlog MVP: nessun item P0 residuo prima dell'alpha.

## 2026-09-04 (3) — B53: Cancellazione account e casa

- `DELETE /houses/:id` (204): nuovo `AccessControlService.assertHouseOwner` verifica il ruolo OWNER (non solo l'accesso), poi `prisma.house.delete` — nessuna pulizia preliminare, la cascata già esistente su tutte le tabelle collegate a `House` se ne occupa da sola.
- `DELETE /auth/me` (200): `AuthService.deleteAccount` cancella in una transazione le case possedute, le membership residue e infine l'utente, in quest'ordine (obbligato: `House.owner`/`HouseMembership.user` sono `Restrict` verso `User`, non `Cascade`).
- Frontend: link "Elimina account" nel footer della Sidebar (stile destructive coerente con Asset/Contatto/Ambiente), `window.confirm` esplicito, nessuna nuova UI per "elimina solo la casa" (fuori scope, vedi `decisions.md` #53).
- Test unitari nuovi: `access-control.service.spec.ts`, `houses.service.spec.ts`, `auth.service.spec.ts`. Backend build/test/lint puliti (106/106 test).
- Verificato dal vivo con utenti/case usa-e-getta (mai la casa reale né la demo): cascata completa su `DELETE /houses/:id`, cascata account su `DELETE /auth/me`, 403 per un non-owner. Link "Elimina account" verificato presente sulla Sidebar reale senza cliccarlo.
- Chiude B53 nel backlog MVP.

## 2026-09-04 (2) — B52: Flag di navigazione per la private alpha

- Nuovo `frontend/src/config.ts` (`ALPHA_MODE`, `ALPHA_VISIBLE_RULE_CODES`): unica costante che nasconde Profilo casa, Energia, Rubrica (voce di nav), Planimetria, tab Gmail/Drive, Home Score/trend, Affidabilità della memoria, Stato adempimenti. "Inbox" rinominata "Documenti" in Sidebar e nel titolo della vista.
- **Scoperta durante l'implementazione**: `GenesisService.recalculateScore` (Home Score + Home Detective) rifiuta di eseguire senza `genesisStatus === 'COMPLETED'`, raggiungibile solo completando il wizard a 6 step — che l'alpha salta. Risolto senza toccare il backend: `Bootstrap.tsx` chiama silenziosamente l'endpoint di completamento già esistente subito dopo la creazione casa; `App.tsx` richiama silenziosamente il ricalcolo dopo ogni conferma documento/modifica Asset, così "Da tenere d'occhio" resta viva senza il bottone "Aggiorna Home Score" (nascosto).
- "Da tenere d'occhio"/"Consigliato" filtrate alle sole 3 regole Home Detective "semplici e contestuali" (`HEATING_SYSTEM_WITHOUT_DOCUMENTATION`, `UNCONFIRMED_SCAN_RESULTS`, `HOUSE_WITHOUT_DOCUMENTS`) — le 4 regole di B49 restano escluse in alpha.
- Nessuna modifica al backend: tutto il lavoro è frontend, riducibile a zero riportando `ALPHA_MODE` a `false`.
- Build/lint frontend puliti, nessun nuovo warning. Verificato dal vivo nel browser sulla casa reale: Sidebar/Dashboard/Ambienti/Documenti mostrano esattamente lo scope ridotto. Non verificata la creazione di una casa nuova end-to-end (nessun endpoint di cancellazione ancora disponibile per pulire un'eventuale casa di test, vedi B53).

## 2026-09-04 — MVP v1: private alpha su upload manuale, non sul wizard Genesis

- Nuovo `docs/mvp-v1.md`: fonte di verità sullo scope di rilascio per una private alpha di 15-20 utenti reali, centrata sul percorso documento → conferma → ricerca (già costruito e verificato in B47-B50). Distinto da `vision.md` (prodotto completo, invariato) e `roadmap.md` (sequenza tecnica di lungo periodo, invariata).
- Navigazione alpha ridotta a Home · Documenti · Asset · Cerca; tutto il resto (Planimetria, Profilo casa, Energia, Rubrica come voce di nav, Home Score, Stato adempimenti, Gmail/Drive, Genesis wizard) resta nel codice ma non ancora nascosto dietro flag — quello è il lavoro tecnico derivato, non ancora iniziato.
- Nuove voci di backlog B52-B59 (tutte P0, gating per l'alpha) e B51 anticipata da P1 a P0: flag di navigazione, cancellazione account/casa, export minimo dati, consenso privacy/AI, limiti upload, messaggi di errore AI, ingresso contatto senza Rubrica, suite e2e — ognuna verificata singolarmente nel codice attuale (non un elenco generico), vedi `decisions.md` #51.
- Nessuna modifica al codice applicativo in questa sessione: solo documentazione di scope. L'implementazione di B52-B59 resta da fare.

## 2026-09-03 (7) — B44: Home Score v2 + Stato adempimenti separato

- Home Score `HOME_SCORE_VERSION` → `v2`: la dimensione "Efficienza" (segnale debole, mai valorizzato da alcun flusso) è sostituita da "Affidabilità del record", che riusa `computeMemoryReliability` (B48) — stessa formula esatta della card "Affidabilità della memoria", mai una seconda definizione parallela.
- `ScoreSnapshot.efficiencyScore` → `reliabilityScore`: migrazione con `RENAME COLUMN`, non drop+add — le 11 righe storiche reali mantengono il loro valore v1 originale, verificato con query diretta pre/post.
- Nuova card Dashboard "Stato adempimenti", prima UI mai costruita per l'endpoint `/houses/:houseId/compliance` (esisteva da B41). Badge di copertura neutro (mai a soglia colorata): un numero basso qui significa "poco ancora tracciato", non "in pericolo".
- Regola Home Detective `ASSET_WITHOUT_ROOM` rimossa (indicazione esplicita del backlog B44).
- Backend: build/lint puliti, 101/101 test aggiornati. Frontend: build/lint puliti, nessun nuovo warning.
- Verificato dal vivo sulla casa reale: `reliabilityScore: 25` dopo il ricalcolo, identico al valore già osservato da `/memory-reliability` — coerenza tra le due fonti confermata sui dati reali. Le 4 Issue `ASSET_WITHOUT_ROOM` aperte si sono auto-risolte al primo ricalcolo (nessun intervento manuale, meccanismo di riconciliazione già esistente). `GET /houses/:houseId/compliance` verificato invariato.

## 2026-09-03 (6) — B49: Ricerca unificata, azioni rapide e nuove regole Home Detective

- Ricerca globale client-side (Asset, Contatti, Documenti, Garanzie, Interventi): `frontend/src/search.ts` (funzione pura, nessuna richiesta di rete per keystroke) + overlay `GlobalSearch.tsx`, apribile dall'icona in Sidebar o `Ctrl/Cmd+K`.
- **Bug reale trovato e corretto**: `GenesisService.reconcileIssues` usava `${ruleCode}:${assetId ?? ''}` come chiave di idempotenza — con `assetId: null` (necessario per regole non-Asset) tutte le occorrenze della stessa regola collidevano, quindi solo la prima veniva creata. La chiave ora include anche `interventionId`/`warrantyId`/`contactId`.
- `Issue` (Prisma) estesa con `interventionId`/`warrantyId`/`contactId` (stesso riferimento "morbido" già usato per `assetId`/`documentId`, nessuna FK/cascade) — migrazione additiva applicata al database reale.
- 4 nuove regole Home Detective in `common/home-detective.ts`: `INTERVENTION_WITHOUT_DOCUMENT`, `INTERVENTION_WITHOUT_CONTACT`, `WARRANTY_WITHOUT_PROOF`, `CONTACT_TO_VERIFY` (solo per contatti realmente usati e senza recapiti).
- Nuovo `GET /houses/:houseId/warranties` (elenco garanzie dell'intera casa, con Asset collegato incluso) per alimentare la ricerca.
- Azioni rapide in `AssetDetail`: manuale, ricevuta/fattura, garanzia, ultimo intervento, tecnico — ognuna condizionale sui dati già caricati, mai un bottone rotto.
- Backend: build/lint puliti, 101/101 test (16 nuovi/estesi su `home-detective.spec.ts`, 1 nuovo su `genesis.service.spec.ts` per il fix del bug, 1 nuovo su `warranties.service.spec.ts`). Frontend: build/lint puliti, nessun nuovo warning.
- Verificato dal vivo sulla casa reale: ricalcolo Home Score/Issue ha creato correttamente 7 nuove `WARRANTY_WITHOUT_PROOF` (una per ciascuna delle 7 garanzie legacy senza prova, tutte con `warrantyId` distinto — il fix del bug confermato sui dati reali) e nessuna regola su Intervention (0 interventi registrati oggi sulla casa reale). `GET /houses/:houseId/warranties` verificato con l'Asset collegato incluso nella risposta.

## 2026-09-03 (5) — B48: Affidabilità della memoria e copertura informativa

- Nuovo endpoint `GET /houses/:houseId/memory-reliability` (`common/memory-reliability.ts` + modulo `reliability`, mirror di `compliance`): tre coperture oneste `{completed, total}` — Asset con documenti, campi "core" con provenienza, `Intervention`/`Warranty` con evidenza nota — combinate in una media pesata che esclude le dimensioni senza dati invece di azzerarle.
- Nuova card Dashboard "Affidabilità della memoria", distinta dalla card Home Score esistente (vedi `decisions.md` #48): percentuale complessiva con soglia colorata, tre barre di copertura con frazione esplicita, disclaimer "un dato non ancora verificato non è un dato assente o sbagliato".
- `CORE_TRACKED_FIELDS` (sottoinsieme di 6 campi genericamente applicabili, `field-provenance.ts`) esclude i 5 campi F-gas dal calcolo di copertura — non pertinenti per Asset non termici.
- Promossa `evidenceStatusLabel` da funzione locale di `Assets.tsx` a `theme.ts`, con nuovo componente condiviso `EvidenceBadge` in `Shared.tsx`.
- Backend: build/lint puliti, 91/91 test (7 nuovi: 4 sul motore puro, 3 sul service). Frontend: build/lint puliti (nessun nuovo warning).
- Verificato dal vivo sulla casa reale con una sessione temporanea: conteggi combacianti con query dirette (14/22 Asset con documenti, 0/7 fatti con evidenza nota — tutte le garanzie legacy da B50 sono `UNKNOWN`, corretto). `fieldCoverage` risulta 0/132: nessuna riga `AssetFieldProvenance` esiste ancora per la casa reale (il tracciamento B38 è più recente della maggior parte dei dati) — risultato atteso, non un bug, coerente con il principio "UNKNOWN non vale assente o errato" applicato anche ai dati pre-esistenti al tracciamento. Verifica visiva in browser non eseguita (nessuna credenziale disponibile in questa sessione per il login, come già in B50).

## 2026-09-03 (4) — B50: Garanzie strutturate e cartella clinica dell'Asset

- Nuovo modulo `warranties` (backend): `GET/POST /assets/:assetId/warranties`, `PATCH /warranties/:id`, stessa struttura di `Intervention` (autorizzazione per-casa, evidenza risolta lato server, nessun delete).
- `Asset.warrantyUntil`/`status` diventano un riepilogo derivato: `recomputeAssetWarrantySummary` li ricalcola dopo ogni scrittura `Warranty`, ed è ora l'unico scrittore. `AssetsService.create/update` e `DocumentsService.applyFieldsToAsset` non scrivono più il campo direttamente: creano/aggiornano una `Warranty` (vedi `decisions.md` #47).
- Il campo "Garanzia fino al" nel form Modifica asset resta, ma corregge in-place la stessa garanzia "gestita da qui" invece di crearne una nuova a ogni salvataggio — verificato dal vivo con due PATCH consecutivi sulla casa reale (stessa riga aggiornata, nessun duplicato).
- `warrantyUntil` esce dal tracciamento provenienza (`TRACKED_ASSET_FIELDS`): vive ora su `Warranty.evidenceStatus`.
- Nuova sezione "Garanzie" nella scheda Asset (creazione, evidenza, fornitore, documento di prova) e colore per tipo di intervento (`InterventionKind`) sui pallini della Cronologia, per la leggibilità "installazione → manutenzione → guasto → riparazione" richiesta dal backlog.
- Backend: build/lint puliti, 84/84 test (5 nuovi per `WarrantiesService`, aggiornati i test di `DocumentsService` che coprivano il vecchio percorso di scrittura diretta). Frontend: build/lint puliti.
- Verificato dal vivo sulla casa reale: creazione Asset con `purchasedAt` → Warranty automatica a 24 mesi e riepilogo Asset coerente; garanzia manuale con documento confermato → evidenza `VERIFIED_PRESENT`; nessuna riga duplicata su modifiche ripetute. Verifica visiva in browser non eseguita (sessione scaduta, nessuna credenziale disponibile in questa sessione per il login).

## 2026-09-03 (3) — Verifica B47 Memory Core + roadmap v6 (Codex)

Recuperati e verificati da GitHub i due commit di Codex: il riordino della roadmap v6 (solo documentazione, nessun rischio) e B47 Memory Core (vedi voce sotto). Revisione approfondita di schema/migrazione (backfill via `_b47_unambiguous_matches`: Occurrence collegata a `Intervention` solo con match univoco su Asset/data/documento/contatto, garanzie legacy create senza inventare prove, vincolo CHECK costo/valuta coerente), `interventions.service.ts`/`interventions.controller.ts` (autorizzazione via `AuthenticatedRequest`+`assertHouseAccess`, nessuna ripetizione del bug di tipizzazione B41) e del diff di `maintenance.service.ts` (rimossa la doppia scrittura Occurrence/AssetTimelineEvent, `Intervention` creato una sola volta per completamento multi-piano).

**Trovati e corretti 2 errori di lint** (a differenza di B41, `nest build`/`tsc` e i 79 test erano già puliti al primo tentativo): `maintenance.service.spec.ts` aveva `@typescript-eslint/no-unsafe-assignment` su due `expect.objectContaining()` annidati non ancora trattati con `as object`, nonostante un terzo caso identico poco sopra fosse già corretto — allineati alla convenzione esistente nel codebase.

Migrazione `20260903173000_add_memory_core` applicata al database reale dopo aver salvato uno snapshot pre-migrazione: 0 `MaintenanceOccurrence` preesistenti (nessun intervento da backfillare), 33 `AssetTimelineEvent` invariati, 7 Asset con `warrantyUntil` → 7 righe `Warranty` create correttamente con `evidenceStatus: UNKNOWN` (nessun documento di prova collegato, coerente con l'assenza di provenienza confermata su quel campo) e la nota "Importata dal campo garanzia preesistente dell'Asset". Nessuna riga legacy ambigua, nessun dato perso.

Verificato dal vivo sulla casa reale (sessione temporanea creata ed eliminata subito dopo, nessuna password toccata): `GET /houses/:houseId/interventions` → `[]`; `POST /houses/:houseId/interventions` → crea correttamente un `Intervention` con Asset collegato (poi eliminato, era solo di test); `GET /assets/:id/timeline` → risposta unificata con `sourceKind: "LEGACY_EVENT"`/`sourceId` per gli eventi storici, come da contratto atteso; `GET /houses/:houseId/compliance` (B41) ancora funzionante. Frontend lint pulito (solo 3 warning preesistenti `react-hooks/exhaustive-deps`, non introdotti da B47).

## 2026-09-03 — B47 Memory Core: interventi canonici

- Auditati schema, service, API e UI di `Contact`, `AssetTimelineEvent`, `MaintenanceOccurrence`, documenti, costi e garanzie.
- Confermato che oggi il completamento manutenzione duplica lo stesso fatto in Occurrence e timeline senza relazione; gli eventi manuali non possono collegare documenti; i costi non sono tipizzati e la garanzia è una sola data su Asset.
- Implementato `Intervention` canonico multi-Asset/multi-documento, costo complessivo non duplicato, EvidenceStatus, collegamento alle Occurrence e fondazione Warranty ripetibile.
- Conservata la separazione da `HouseTimelineEvent`; nessuna tabella Event universale e nessuna reinterpretazione automatica ambigua dei dati storici.
- Nuove API CRUD/lista, timeline Asset composta, Rubrica senza doppio conteggio, form “Nuovo intervento” con tipo/costo/altri Asset/documenti e costo anche nei completamenti manutenzione manuali o da documento.
- Migrazione conservativa: collega solo Occurrence/eventi storici con match univoco, crea garanzie legacy senza inventare prove ed emette conteggi di backfill al deploy. Schema Prisma valido, build backend/frontend pulite e 79/79 test backend; applicazione al database reale ancora da eseguire.

## 2026-09-03 — Roadmap di prodotto v6: memoria prima della compliance

- Confermate le fondazioni tecniche normative già avviate, ma riordinata la roadmap di prodotto: Memoria della casa → Fiducia → Recupero rapido → Check-up → Compliance.
- Definite dieci fasi operative (0–9), dalla validazione continua al pilota Lombardia/Piemonte, con marketplace, altre regioni, benchmark e IoT in standby.
- Aggiunte B46–B51: validazione utenti, Memory Core, affidabilità della memoria, ricerca unificata, cartella clinica Asset ed export/privacy/portabilità.
- Riposizionate B41–B44: B41 resta P0 come fondazione; Genesis 2.0 e Stato adempimenti sono P1; Home Score v2 è P2 e misura affidabilità del record, non conformità.
- Nessuna modifica al codice o allo schema in questa voce; ADR #45 registra la priorità e impedisce che la compliance diventi l'identità principale di Dimora.

## 2026-09-03 (2) — Verifica B41 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa le fondazioni tecniche del check-up adempimenti v6 (vedi voce sotto): revisione approfondita dello schema/migrazione (backfill `MaintenancePlan.houseId` sicuro, vincolo XOR e indice univoco "un solo libretto attivo" a livello database, nessun endpoint scrive ancora codici libretto in chiaro — cifratura correttamente rimandata), dei motori puri (`fgas.ts`/`ape-state.ts`, nessuna soglia normativa hardcoded, sempre passata da `RegulatoryRule`) e degli ADR registrati (#38-44, coerenti con `decisions.md` #35/#37).

**Trovati e corretti 2 errori di build reali** (il changelog del commit dichiarava "build pulita" ma `nest build`/`tsc` falliva, a differenza di `npm test` che passava già): `ComplianceController` usava il tipo `Request` di Express invece di `AuthenticatedRequest` (introdotto in B2), rendendo `req.user` inesistente a livello di tipi; `MaintenanceService.planOrThrow` non restituiva un tipo con `assetId` non nullable nonostante il controllo a runtime lo garantisse, causando un mismatch in due scritture (`MaintenanceOccurrence`/`AssetTimelineEvent`, che richiedono `assetId` obbligatorio anche dopo la generalizzazione di `MaintenancePlan`).

Migrazione applicata al database reale: nessun dato perso, l'unico `MaintenancePlan` esistente retrocompilato correttamente (`houseId` dalla propria casa, `subjectType: ASSET`, `origin: USER`). Verificato dal vivo `GET /houses/:houseId/compliance` sulla casa reale: risposta onesta (`UNKNOWN`, copertura 0/1, nessuna fonte, disclaimer obbligatorio presente) coerente con l'assenza di impianti termici/regole normative attive oggi. Build/lint puliti, 76/76 test.

## 2026-09-03 — Check-up adempimenti v6: primo incremento tecnico

- Registrati gli ADR che aggiornano B37: `ThermalSystem` ristretto, libretto a livello impianto, resolver separati, regole versionate, piani generalizzati, Stato adempimenti separato dallo score e demo Genesis separata dal percorso reale.
- Aggiunti `EvidenceStatus`, territori/regole normative versionate, `ThermalSystem`, `PlantBooklet`, `EfficiencyControlReport` e `PlantResponsibility`; Asset esteso con collegamento termico e dati F-gas.
- `MaintenancePlan` ora appartiene sempre alla casa e a un solo soggetto House/ThermalSystem/Asset, con origine, regola, snapshot e chiave idempotente; migrazione retrocompila i piani esistenti come Asset/USER senza inventare provenienza.
- Aggiunti motori puri conservativi per evidenza, F-gas, APE, validazione regole e conflitti territoriali. Regole non ACTIVE o incomplete non sono eseguibili; una riga evidenza mancante resta UNKNOWN.
- Nuovo `GET /houses/:houseId/compliance`: valutazione read-only con copertura, controlli, fonti e disclaimer obbligatorio; non genera piani e resta UNKNOWN quando mancano dati o regole attive.
- Nessun seed regionale o claim normativo attivato: Lombardia/Piemonte restano subordinati a fonti primarie aggiornate e revisione professionale. Verifica: schema Prisma valido, backend build pulita, 76/76 test.

## 2026-08-25 (5) — Fix: creare una seconda casa rompeva il completamento di Genesis

Bug reale trovato creando la prima seconda casa mai esistita nel database (per simulare un nuovo utente riusando documenti già analizzati, senza consumare altro credito AI): `RoomsService.create()` generava `AMB-001` contando le stanze della sola casa nuova, ma `Room.code` è unico su tutta la tabella — collideva con l'`AMB-001` già esistente nella prima casa. Il wizard Genesis falliva con "Internal server error" al primissimo ambiente, sia per lui che per la creazione manuale di un ambiente. Corretto usando lo stesso pattern già in produzione per `Asset.code`: il prossimo numero si calcola dal massimo esistente su tutta la tabella, non da un conteggio per casa — vedi `decisions.md` #37. Nessuno stato parziale da riparare (l'errore fermava tutto al primo tentativo); verificato dal vivo completando con successo Genesis sulla seconda casa (11 ambienti, 16 asset, Home Score 80).


## 2026-08-25 (4) — Verifica B36 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa B36 (Property Profile strutturato, vedi voce sotto): merge fast-forward pulito, `npx prisma generate` (necessario dopo il pull, il client generato non è nel repo), build/test puliti su entrambi i lati (65/65), migrazione `20260825160000_add_property_profile` applicata al DB reale — puramente additiva, dati esistenti della casa reale verificati intatti dopo l'applicazione. Revisione del codice: `HouseFieldProvenance`/`changedPropertyFields` seguono correttamente il pattern origine/conferma di B38, incluso il controllo "solo se il valore è davvero cambiato" (lo stesso bug corretto in B38 non si è ripetuto qui). Verificato dal vivo: vista "Profilo casa" con i dati reali già presenti, aggiornamento di un campo tramite l'endpoint `PATCH .../property-profile` con badge di provenienza corretto — valore di prova rimosso subito dopo la verifica.

## 2026-08-25 (3) — B36: Property Profile strutturato

- Nuova vista **Profilo casa** con dati identificativi, fisici, catastali, APE e agibilità, organizzati per fonte tipica e modificabili dall'utente.
- `House` estesa con campi tipizzati e migrazione additiva; completezza calcolata sui dati essenziali, senza confondere le diverse definizioni di superficie.
- Nuova `HouseFieldProvenance`: modifiche manuali `DECLARED`, valori confermati da documenti `EXTRACTED`, con documento/utente/data visibili tramite badge.
- Claude riconosce `property_profile` per visure, APE, atti, agibilità e relazioni tecniche. Inbox permette revisione/correzione; la conferma riempie solo campi vuoti e segnala i conflitti senza sovrascrivere.
- Verifica: backend build/lint puliti e 65/65 test; frontend build pulita e lint senza errori (restano i 3 warning hook storici).

## 2026-08-25 (2) — B37: discovery su `System`, nessuna migrazione + un doppione corretto

Discovery richiesta dal backlog prima di scrivere codice: nessuna entità `System` introdotta, il bisogno non è emerso sull'unico caso reale disponibile (fotovoltaico e climatizzatori confermati come Asset indipendenti, nessuna scomposizione necessaria) — dettaglio in `decisions.md` #35. Rimane una decisione provvisoria (n=1, non i ~10 casi auspicati), da riaprire con altri utenti reali.

- Trovato durante la discovery e corretto con conferma dell'utente: due Asset `ELETTRICO` "Impianto elettrico" sulla stessa casa erano un doppione, non due impianti reali — quello vuoto (0 campi/documenti/interventi, probabile artefatto di una scansione Genesis) è stato eliminato, nessun dato perso.
- `backlog.md` B37 non chiuso ma riclassificato a priorità bassa, in attesa di altri casi.


## 2026-08-25 — B38: provenienza campo-per-campo per gli Asset

Priorità più alta rimasta nell'allineamento Dimora (sbloccata da B2), limitata in v1 agli **Asset** — Room/House restano fuori scope.

- `FieldSource` rinominato `MANUAL`/`AI_EXTRACTED` → `DECLARED`/`EXTRACTED`/`ATTESTED` (terzo valore predisposto per una futura verifica terza, nessun flusso lo scrive ancora).
- Nuova tabella `AssetFieldProvenance` per i 7 campi strutturati di Asset (marca, modello, seriale, date, fornitore); `AssetCustomField` estesa con documento sorgente, chi e quando ha confermato.
- `documents.service.ts` (conferma documento) ed `assets.service.ts` (modifica manuale) scrivono la provenienza corretta ad ogni scrittura.
- Nuovo badge `ProvenanceBadge` in `Assets.tsx`: icona + tooltip ("Dichiarato da...", "Estratto da [documento], confermato da... il...") su ogni campo che ha un record di provenienza — assente sui valori scritti prima di questa modifica (provenienza sconosciuta, non un errore).
- **Bug trovato in verifica e corretto**: la prima versione ri-etichettava come "appena dichiarato" qualunque campo presente nel form di modifica, anche se invariato (il form rimanda sempre tutti i 7 campi) — ora scrive provenienza solo se il valore è davvero cambiato rispetto a quello esistente.
- Migrazione additiva, nessun backfill dei valori già esistenti; test estesi in `documents.service.spec.ts`; verificato dal vivo (modifica manuale → badge "Dichiarato", pulizia degli asset di test usati per la verifica).


## 2026-08-24 (3) — Palette "Smeraldo": UI più vivida

Su richiesta dell'utente di colori più vivaci, proposte 3 direzioni via artifact (mockup della Dashboard reale) — l'utente ha scelto "Smeraldo", evoluzione satura della palette esistente.

- `theme.ts`: stessi token (`pine`/`ochre`/`rust`/`paper`/`card`/`slate`/`line`/`ink`), valori più saturi — verde smeraldo `#0E8A5F` (era `#2C5C4C`), marigold `#F2A93B` (era `#C4842A`), corallo `#E4572E` (era `#A94A2E`), sfondo quasi bianco `#F5F6EF` (era beige `#F1F1EC`). Propagato automaticamente a tutti i componenti, nessuna modifica oltre a `Dashboard.tsx`.
- Trovato e rimosso un esperimento di palette isolato lasciato in `Dashboard.tsx` (blu/verde acqua, mai promosso a `theme.ts`) che avrebbe reso la Dashboard incoerente con il resto dell'app — vedi `decisions.md` #33.
- Verificato dal vivo: Dashboard e Asset coerenti con la nuova palette, build/lint puliti.


## 2026-08-24 (2) — Nome utente-facing allineato a Dimora

Esecuzione pratica di `decisions.md` #31 (Dimora = nome di prodotto, HomeOS = nome tecnico del repository): i punti dell'interfaccia dove il nome compare davvero all'utente ora dicono "Dimora" — titolo scheda browser, intestazione Sidebar, `LoginScreen`, `BootstrapScreen`, testo di benvenuto del wizard Genesis, messaggio a vuoto di Consumi elettrici. Commenti di codice, prompt di estrazione AI, README e nomi tecnici (repository, package, cartelle) restano "HomeOS" — non è un rename tecnico, solo del testo mostrato all'utente. Verificato dal vivo: titolo tab e sidebar mostrano "Dimora" dopo login, dati reali invariati.

## 2026-08-24 — B2: autenticazione e sessione reale sulle API

Chiude il buco di sicurezza aperto fin dall'MVP: prima ogni endpoint si fidava ciecamente di un `userId`/`houseId` passato dal client, `GET /users` elencava tutti gli utenti, e chiunque raggiungesse il backend poteva leggere/modificare qualunque casa.

- **Login reale**: `LoginScreen` sostituisce il bootstrap automatico "prendi il primo utente" — email → login (account con password) / imposta password (account pre-esistenti senza, migrazione self-service) / registrazione (account nuovo). Sessione via cookie httpOnly `sid` + tabella `Session`, password con `crypto.scrypt` nativo di Node.
- **Autorizzazione per-casa reale**: ogni rotta è protetta di default (`AuthGuard` globale); l'accesso a una casa verifica `HouseMembership` (non più solo `House.ownerId`), su rotte dirette e su quelle per id di risorsa (assets, documents, rooms, ecc. — risolvendo `houseId` dalla risorsa). Le case esistenti hanno ricevuto una `HouseMembership` `OWNER` retroattiva (backfill automatico al boot).
- **OAuth Gmail/Drive legato alla sessione**: `connect`/`callback` usano l'utente della sessione invece di un `userId` in query — prima chiunque poteva agganciare il proprio account Google a un `userId` altrui. Il parametro `state` verso Google è ora un nonce CSRF, non più l'id in chiaro.
- **Rimosso il modulo `users`**: `POST /users` (creava account senza password) e `GET /users` (elencava tutti gli utenti) non avevano più un caso d'uso legittimo — la creazione utenti vive ora in `AuthService`.
- Nessuna perdita di dati: verificato dal vivo che la casa reale (73 Home Score, 15 ambienti, 23 asset) resti intatta e accessibile dopo il login con la nuova password.
- Nuova migrazione (`User.passwordHash`, modello `Session`), nuova dipendenza `cookie-parser`, 64/64 test backend, build/lint puliti su entrambi i lati. Dettaglio completo delle scelte in `decisions.md` #32.

## 2026-08-23 — Allineamento strategico HomeOS → Dimora

- Chiarito che Dimora è il nome/posizionamento di prodotto e HomeOS il nome tecnico storico del repository: un solo prodotto, due livelli di descrizione.
- Definito il Property Digital Record come core; Digital Twin, Home Score, manutenzioni, consumi e futuri agenti sono esperienze alimentate dal record.
- Separato esplicitamente ciò che è implementato, parziale e futuro, evitando di presentare trasferimento, record verificato e integrazioni regolatorie come capacità attuali.
- Aggiunte EPIC 10 (Property Record & Provenance) ed EPIC 11 (Ownership & Transfer), con attività B36–B39.
- Nessun cambiamento a codice, schema Prisma o comportamento applicativo in questa sessione.

## 2026-08-04 (10) — Fix bollette: race condition "Analizza con AI" e periodi non precompilati

Due bug reali segnalati dall'utente dopo il primo utilizzo con bollette vere:
- **Race condition su "Analizza con AI"**: `Inbox.tsx` teneva lo stato "in analisi" in un singolo `analyzingId: string | null` invece del pattern `Set<string>` già usato per ogni altra azione del file (`busyDocIds`) — analizzare un secondo documento prima che il primo finisse sovrascriveva lo stato del primo, facendo tornare la sua label a "Analizza con AI" mentre l'analisi era ancora in corso. Convertito in `analyzingIds: Set<string>`.
- **Periodo/consumi non precompilati nel form di conferma bolletta**: causa reale diversa da quella apparente. Il modello estraeva correttamente periodo e consumo (verificato con chiamate dirette all'API Claude sullo stesso documento, 100% di successo su più tentativi), ma `documents.service.ts` scartava l'intero periodo in fase di classificazione: il campo `amount` arrivava come stringa con virgola italiana (es. `"95,48"`, coerente con come l'importo appare sulla bolletta), `Number("95,48")` produce `NaN`, e il filtro `Number.isFinite(amount)` buttava via l'intero periodo pur avendo consumo e date validi — da qui il form vuoto che chiedeva di reinserire tutto a mano. Corretto in due punti: prompt di estrazione ora richiede esplicitamente numeri JSON con punto decimale (mai stringhe, mai virgola) per `consumptionKwh`/`amount`; `documents.service.ts` normalizza comunque una virgola decimale prima di convertire in numero, per non perdere un periodo valido se il modello sbaglia formato. Le 12 bollette già caricate dall'utente sono state ri-analizzate: 11 ora hanno periodo/consumo/importo corretti, la dodicesima è tornata a `PENDING` per credito API esaurito durante il test (comportamento corretto del gestore errori, non un bug).

## 2026-08-04 (9) — Verifica B25 (Codex)

Recuperato e verificato da GitHub il commit di Codex che implementa B25 (monitoraggio consumi elettrici YoY, vedi voce sotto e `decisions.md` #30): build/lint/test su entrambi i lati, 64/64 test, migrazione `20260804143000_add_utility_bills` applicata (puramente additiva, FK con cascade coerenti). Revisione del codice: pipeline di estrazione/conferma bollette ben guardata (blocca doppie conferme, periodi sovrapposti, ordine date invertito), matematica di ripartizione pro-rata verificata dai test (bolletta bimestrale 16gen–14feb → 160+140 kWh), UI fedele al mockup validato in sessione precedente. Nessuna correzione necessaria. Verificato dal vivo lo stato vuoto della vista "Energia" (nessuna bolletta ancora confermata); non replicato un caricamento reale end-to-end per mancanza di un PDF bolletta di prova.

## 2026-08-04 (8) — B25, monitoraggio consumi elettrici YoY

- Claude riconosce le bollette elettriche e propone fornitore, periodi, kWh e importi; l'utente corregge ogni valore prima della conferma.
- Nuova entità `UtilityBill`, collegata a casa e documento originale; conferma dei periodi e del documento atomica.
- Vista Energia con barre anno selezionato/precedente, variazione YoY e Asset installati nel mese cliccabili.
- Periodi plurimensili ripartiti per giorni e marcati con `~`, mai presentati come misure mensili reali.
- Nuova migrazione, 2 endpoint e 5 test; baseline backend 64/64.

## 2026-08-04 (7) — Sync con le evoluzioni di Codex + fix

Recuperate da GitHub e verificate le 3 evoluzioni Genesis di Codex (catalogo demo ampliato/selezionabile, ripresa precisa B34, trend storico Home Score — vedi voci sotto): build/lint/test su entrambi i lati, 59/59 test, migrazione `20260804120000_add_genesis_step` applicata e verificata additiva. Nessuna regressione: la deduplica (B33) e le rifiniture di usabilità della sessione precedente sono state preservate ed estese, non riscritte.

- **Fix trovato in verifica**: nello stepper del wizard, `textDecoration` (shorthand) mescolato con `textDecorationColor` (longhand) — React lo segnala come rischio di bug di stile. Sostituito con `textDecorationLine`, tutto longhand.
- Verificato live: catalogo demo selezionabile, ripresa precisa dello step, grafico trend Home Score — tutti funzionanti sulla casa reale.

## 2026-08-04 (6) — Trend storico Home Score

- La Dashboard mostra l'andamento degli ultimi 12 mesi per score totale e cinque dimensioni, con valori sempre leggibili anche su mobile.
- “Aggiorna Home Score” ricalcola score e Home Detective sui dati correnti; crea una nuova rilevazione solo se valori o versione cambiano.
- Evidenziata la variazione dall'ultimo snapshot e segnalata la presenza di versioni diverse dell'algoritmo.
- Due endpoint e due test backend; baseline 59/59.

## 2026-08-04 (5) — B34, ripresa precisa del wizard Genesis

- Tutti i 6 step sono ora persistiti in `House.genesisStep`, incluse le navigazioni all'indietro.
- Chi chiude durante Documenti riparte da Documenti; chi chiude durante Revisione ritrova ultima `ScanSession` e relative `Observation`.
- Il backend impedisce salti arbitrari in avanti e ripiega su Scansione se una Review non ha una sessione recuperabile.
- Nuovi endpoint `resume`/`step`, migrazione additiva e 2 test backend; baseline 57/57.

## 2026-08-04 (4) — Genesis non più modellata su una sola casa

- Il dataset dimostrativo passa da 4 a 14 ambienti e da 7 a 25 Asset/impianti comuni.
- Lo step Scansione mostra un catalogo selezionabile: solo gli elementi scelti entrano nella proposta, evitando di imporre all'utente decine di dati finti da scartare.
- Gli Asset legati a una stanza compaiono solo quando quella stanza è selezionata; gli impianti a livello casa restano sempre disponibili.
- Nuovo endpoint catalogo e supporto a `roomNames`/`assetNames` nel comando di scansione. Aggiunto test sul filtro del provider mock; backend 55/55 test.

## 2026-08-04 (3) — Genesis: rifiniture usabilità dal walkthrough

Seguito ai punti medi/bassi del walkthrough di usabilità (dopo B33):
- **Stepper del wizard cliccabile all'indietro**: si può tornare a uno step già superato per correggere qualcosa, senza dover uscire dal percorso. Non si può saltare avanti a step non ancora raggiunti.
- **Nome svuotato per errore durante la modifica**: non causa più un errore di validazione poco chiaro all'invio — ricade sul nome originariamente proposto, sia chiudendo la modifica col blur sia ricliccando la matita.
- **Pannello "Dettagli"** per ogni elemento proposto nello step di revisione: categoria in italiano, e per i possibili duplicati il codice dell'elemento reale esistente (es. "AMB-004") per poterlo controllare nella sua scheda — la scansione resta dimostrativa, dichiarato esplicitamente che non ci sono foto reali da mostrare.
- **Dashboard**: le card "Consigliato" ora sono cliccabili verso l'asset collegato (tramite l'Issue associata), come già le card "Da tenere d'occhio".
- **Step "Documenti"**: nuovo pulsante per rimuovere un documento caricato per errore (riusa l'endpoint "scarta" già usato in Inbox) — nascosto per i documenti già `CONFIRMED`, che il backend non permette di scartare da qui. Aggiunto anche un indicatore di caricamento.
- **Accessibilità**: le etichette del form "La tua casa" ora sono associate ai campi (`htmlFor`/`id`).
- **Home Score card**: `flexWrap` per non stringere il layout su schermi molto stretti.

Verificato live nel browser sulla casa reale: navigazione a ritroso funzionante, pannello Dettagli mostra correttamente categoria e codice del duplicato, pulsante rimuovi assente sui documenti già confermati. Backend 54/54 test invariati, build/lint puliti su entrambi i lati.

## 2026-08-04 (2) — Genesis: deduplica contro dati esistenti (B33)

- Trovato durante un walkthrough di usabilità sul wizard Genesis appena mergeato: la conferma di una scansione demo su una casa con dati reali preesistenti duplicava sistematicamente ambienti/asset con nomi simili (verificato: tutti e 4 gli ambienti demo e diversi asset coincidevano con dati già censiti).
- **`genesis-duplicate.ts`** (nuovo, funzione pura testata): segnala un possibile duplicato (stesso tipo + nome simile) confrontando ogni Observation con i Room/Asset già confermati in casa.
- **Step di revisione**: un elemento con un possibile duplicato mostra un avviso e parte su "Scarta" invece di "Conferma" — sempre annullabile con un click. Nessuna fusione automatica in nessun caso.
- Quando una Room duplicata resta scartata, gli Asset dello stesso batch che la referenziano per nome si collegano comunque alla Room reale, non finiscono orfani come "impianto di casa".
- Verificato live: scansione di prova sulla casa reale → 10/10 elementi correttamente segnalati (inclusi match su nomi specifici come "Forno a microonde Samsung MC28H5015AS"); rifiuto di tutti e 10 → nessuna riga creata; stato ripristinato identico a prima del test.
- Vedi `decisions.md` #26. Backend: 54/54 test (3 nuovi + 3 di regressione aggiornati), build/lint puliti su backend e frontend.

## 2026-08-04 — HomeOS Genesis MVP

- **Vertical slice completo**, su richiesta esplicita dell'utente dopo un'analisi di repository che ha flaggato il blocco reale (nessuna autenticazione, isolamento per utente non applicabile) e le sovrapposizioni con entità esistenti — utente ha accettato lo scope. Vedi `decisions.md` #25.
- **Schema**: `House`/`Room`/`Asset` estesi in modo retrocompatibile (`confidence`/`source`/`confirmed`, `address`/`postalCode`/`propertyType`/`country`/`genesisStatus`, `estimatedReplacementYear`); nuove tabelle `Floor`, `ScanSession`, `Observation`, `Issue`, `Recommendation`, `ScoreSnapshot`, `HouseTimelineEvent`. Migrazione `20260804063159_add_genesis_mvp`, puramente additiva.
- **Home Score v1** (`common/home-score.ts`): 5 dimensioni pesate, ogni scostamento motivato da una `reason` esplicita, versionato e persistito come storico (`ScoreSnapshot`). 9 test.
- **Home Detective** (`common/home-detective.ts`): 5 regole deterministiche (mai un LLM), `ASSET_WITHOUT_ROOM` adattata per rispettare la semantica esistente di `roomId: null` = "impianto di casa" (solo ELETTRODOMESTICO/CLIMA, non tutti i tipi). 8 test.
- **`HouseScanProvider`/`MockHouseScanProvider`**: interfaccia sostituibile, dataset demo fisso e non casuale (4 stanze, 7 asset), mai presentato come reale in UI.
- **Modulo backend Genesis**: `GenesisService` riusa `RoomsService`/`AssetsService` esistenti per creare Room/Asset da Observation confermate (nessuna duplicazione della generazione codice `AMB-###`/`AST-###`); riconciliazione idempotente di Issue/Recommendation per `ruleCode:assetId`. 8 endpoint REST, 3 test di servizio.
- **Wizard frontend** (`Genesis.tsx`, 6 step): Benvenuto → Informazioni casa → Documenti (riusa l'upload esistente) → Scansione guidata → Revisione Digital Twin (conferma/modifica/scarta) → Risultati (Home Score + Issue + Recommendation).
- **Dashboard**: card Home Score con le 5 barre dimensione, "Da tenere d'occhio" (Issue aperte), "Consigliato" (Recommendation aperte), conteggio documenti ora reale (era hardcoded a 0), "Cronologia casa". Banner di invito quando Genesis non è completato.
- **Verifica end-to-end reale nel browser**, non solo unit test: eseguito l'intero percorso sulla casa reale dell'utente — 4 stanze e 7 asset creati dalla scansione demo, collegamento stanza↔asset corretto (incluso `roomId: null` per impianti di casa), Home Score calcolato (73/100), Issue "Caldaia senza documentazione tecnica" generata coerentemente con lo stato reale della caldaia esistente.
- **Limite trovato durante la verifica**: la conferma non deduplica contro Asset esistenti — creato un secondo "Impianto elettrico" accanto a uno già censito. Non corretto in questa sessione, tracciato come `backlog.md` B33 (insieme a B34, ripresa del wizard a grana grossa).
- **Nuovi documenti**: `docs/genesis-architecture.md` (componenti, motori, flusso, limitazioni, percorso verso il reale), `docs/product-backlog.md` (10 epiche EPIC 0–9). Aggiornati `domain-model.md`, `architecture.md`, `roadmap.md`, `backlog.md`, `decisions.md` (#25), `README.md`.
- **Test e build**: backend 46/46 test verdi (da 26), build/lint puliti; frontend build/lint puliti (3 warning pre-esistenti invariati, non introdotti da Genesis).
- **Non fatto in questa sessione**: push su GitHub (per istruzione esplicita della specifica, da confermare con l'utente prima del primo push Genesis).

## 2026-08-03 (10) — B18 messa in standby

- Su indicazione dell'utente, le notifiche esterne per manutenzioni/garanzie restano in roadmap ma non sono pianificate: nessuna scelta di provider, canale o frequenza è approvata e non va iniziata finché non viene riattivata.

## 2026-08-03 (9) — B22, manutenzioni completate da documento

- Claude distingue gli interventi già eseguiti da preventivi, manuali e appuntamenti ed estrae attività, data, quantità e note.
- L'Inbox propone i piani compatibili su più Asset della stessa casa, preselezionati entro la quantità dichiarata; l'utente può correggere Asset e data prima di confermare.
- La conferma multipla è atomica: crea occorrenze ed eventi cronologia, collega lo stesso documento e aggiorna le prossime scadenze. Duplicati e piani di un'altra casa vengono bloccati.
- Aggiunti due endpoint e test backend; baseline aggiornata a 26 test verdi. Vedi `decisions.md` #24.

## 2026-08-03 (8) — design affinato: monitoraggio consumi elettrici

- **B25 aggiornata** da spunto generico a design completo, dopo una sessione di discussione con l'utente (nessun codice scritto): entità dedicata `UtilityBill`, solo elettricità in v1, istogramma mensile con confronto anno-su-anno per rispettare la stagionalità, badge colorati per categoria sotto i mesi in cui è stato installato un nuovo Asset (correlazione visiva, non attribuzione numerica finta). Deciso esplicitamente di NON stimare un risparmio in € per Asset in v1 finché non ci sono numeri verificati con fonti reali (stessa lezione della caldaia, `decisions.md` #20/#21).
- Validato un mockup visivo del grafico con l'utente prima di scrivere la specifica in `backlog.md`.

## 2026-08-03 (7) — anteprima nuovo look&feel su Dashboard (placeholder)

- **Dashboard**: nuova palette blu/verde acqua e badge circolari colorati per categoria (icona dell'Asset dentro un cerchio con tinta diversa per tipo), applicata SOLO qui come anteprima — il resto dell'app resta sullo stile "carta/inchiostro" attuale. Vive in un oggetto locale `PT`/`CATEGORY_COLORS` dentro `Dashboard.tsx`, non ancora in `theme.ts`.
- **`GET /houses/:id/maintenance-reminders`**: la select dell'Asset ora include anche `type` (serviva per scegliere l'icona di categoria giusta nei promemoria di manutenzione in Dashboard).
- Rimane un placeholder in attesa di ulteriore riflessione dell'utente prima di decidere se propagarlo al resto dell'app — vedi `backlog.md` B31.

## 2026-08-03 (6) — implementazione backlog, Fascia 1 completata

- **B21**: aggiunte le label "Ricorrenza", "Ogni quanti", "Preavviso (giorni)" nel form piano di manutenzione — i campi erano numeri senza contesto.
- **B19**: il dismiss di un suggerimento di manutenzione è ora persistito (nuova tabella `DismissedMaintenanceSuggestion`, endpoint `POST /assets/:id/maintenance-suggestions/:code/dismiss`) invece che solo nello state del browser — verificato che sopravvive a un reload della pagina. Vedi `decisions.md` #22.
- **B14**: tipizzata la risposta di `/v1/messages` in `claude-extraction.service.ts` invece di lasciarla `any` — risolti tutti i 12 errori lint. Corretti "di rimbalzo" (stesso pattern) anche i 2 warning in `documents.service.ts` e 1 in `main.ts`. `npm run lint` backend ora 0 errori/0 warning.
- **B17**: corretto un bug reale di matching documento→asset — una singola parola condivisa (es. la marca "Bosch") non basta più a far scambiare due prodotti diversi ("Frigorifero Bosch" vs "Forno Bosch Serie 8"); ora serve più di una parola in comune, oppure una parola di prodotto riconosciuta (`PRODUCT_WORDS`). Aggiunto test di regressione che riproduce il bug prima del fix. Vedi `decisions.md` #23.

## 2026-08-03 (5) — verifica web delle rimanenti linee guida di manutenzione

- **`clima-filtri`**: intervallo corretto da 6 a **2 mesi** (preavviso 14→7 gg) — i produttori (Daikin, Mitsubishi Electric) consigliano 1-2 mesi durante l'uso, molto più frequente di quanto scritto inizialmente.
- **`clima-tecnica`**: intervallo confermato (1 anno), ma corretta un'affermazione fuorviante — non è un obbligo di legge per la maggior parte dei climatizzatori domestici (soglia F-Gas 517/2014 raramente raggiunta), solo manutenzione consigliata.
- **`fotovoltaico-pulizia`**: intervallo confermato (1 anno), aggiunta la soglia reale dell'unico obbligo esistente (Delibera ARERA 78/2016, sopra 11,08 kW, non riguarda la pulizia).
- **`elettrico-verifica`**: intervallo confermato (5 anni), chiarito che il DPR 462/2001 riguarda soprattutto luoghi di lavoro/contesti specifici, non la casa privata tipica.
- Test aggiornati (22/22 verdi), verificato via API sul climatizzatore reale usato nei test precedenti. Vedi `decisions.md` #21.

## 2026-08-03 (4) — verifica fonte linea guida caldaia

- **Correzione dato non verificato**: la cadenza del "Controllo fumi ed efficienza energetica" per CALDAIA era ogni 1 anno, scritta da conoscenza generica senza fonte. Dopo una ricerca web esplicita, corretta a **ogni 2 anni** (DPR 74/2013, cadenza tipica per potenza domestica <35 kW secondo la normativa Lombardia — le altre regioni possono variare). Descrizione della linea guida aggiornata per citare la fonte invece di restare generica. Vedi `decisions.md` #20.
- **Motivo**: l'utente ha chiesto esplicitamente affidabilità e fonte di ogni linea guida introdotta nella sessione precedente — nessuna era stata verificata con una ricerca reale, solo scritta con linguaggio prudente. Corretto solo il caso marcato obbligatorio (il più delicato); le altre linee guida (CLIMA, FOTOVOLTAICO, ELETTRICO) restano non verificate e dichiarate tali.

## 2026-08-03 (3) — suggerimenti automatici di manutenzione

- **Nuovo endpoint** `GET /assets/:id/maintenance-suggestions`: propone piani di manutenzione basati su linee guida statiche per tipo di Asset (CLIMA, CALDAIA, FOTOVOLTAICO, ELETTRICO), con la prima scadenza calcolata da `installedAt` (fallback `purchasedAt`, poi data di creazione della scheda) + l'intervallo della linea guida — es. climatizzatore installato il 24/07/2025 con pulizia filtri ogni 6 mesi → prima scadenza proposta 24/01/2026.
- **UI**: nel dettaglio Asset, sezione "Manutenzione" mostra le proposte con badge "Suggerita", motivazione della data e due azioni — "Aggiungi" (apre il form già compilato, l'utente conferma o modifica prima di salvare) e "Ignora" (nasconde la proposta solo per la sessione corrente). Una proposta sparisce da sola una volta creato un piano con lo stesso titolo.
- **Nessuna scrittura automatica**: coerente con "l'AI propone, l'utente conferma" — qui applicato a una regola fissa, non a un'estrazione AI. Vedi `decisions.md` #19.
- **Test e build**: 22/22 test backend (5 nuovi sulla funzione pura di calcolo), build/lint puliti; verificato end-to-end nel browser su un climatizzatore reale (suggerimento → form pre-compilato → salvataggio → sparizione del suggerimento).

## 2026-08-03 (2) — piani di manutenzione programmata

- **Piani per Asset**: creazione e modifica di manutenzioni una tantum o ricorrenti ogni N giorni/mesi/anni, con prima scadenza, preavviso, tecnico abituale, obbligatorietà, descrizione e note.
- **Ciclo operativo**: completamento esplicito con data, contatto, documento e note; esecuzione e cronologia salvate atomicamente, prossima scadenza ancorata al calendario previsto. Sospensione, riattivazione ed eliminazione sicura senza perdita dello storico.
- **Dashboard**: manutenzioni imminenti e scadute visibili insieme agli altri promemoria e cliccabili verso l'Asset; gli Asset dismessi non generano avvisi.
- **Modello/API**: nuove entità `MaintenancePlan`/`MaintenanceOccurrence`, migrazione Prisma e modulo NestJS dedicato; riferimento REST aggiornato.
- **Test e build**: 18/18 test backend e build backend/frontend pulite; frontend lint invariato con 3 warning pre-esistenti. Aggiunti 10 test sulle regole temporali, ricorrenza e fine mese.

## 2026-08-03 — prima copertura delle regole di dominio backend

- **Test Asset**: aggiunti test Jest per il calcolo deterministico di `DUE`, `ATTENTION` e `OK` e per la garanzia predefinita di 24 mesi senza mutare la data di acquisto.
- **Test pipeline documentale**: aggiunti test per matching tipo+nome, assenza di suggerimenti quando il nome non coincide, nessuna scrittura durante la classificazione e applicazione dei campi solo dopo conferma esplicita.
- **Protezione dati esistenti**: verificato che la conferma non sovrascrive un campo strutturato già valorizzato, non lo duplica come campo libero e applica la garanzia predefinita quando arriva la data di acquisto.
- **Baseline verificata**: backend build e 8 test puliti; frontend build e lint puliti salvo i 3 warning già noti; restano i 12 errori e 4 warning lint backend pre-esistenti.

## 2026-08-02 (3) — repository pubblicato su GitHub

- **Git inizializzato e pushato**: primo commit (135 file) su https://github.com/Vincenzobrutto/Home_OS, branch `main`. Trovato e rimosso prima del commit un problema reale: `.claude/settings.local.json` conteneva la password del database in chiaro in una riga di permessi salvata in una sessione precedente — ora escluso in `.gitignore` root. Vedi `decisions.md` #17.
- **Identità Git locale**: impostata a `Vincenzo Brutto <bruttovincenzo@gmail.com>` (solo per questo repository, non globalmente).
- **Protocollo di coordinamento multi-agente**: aggiunta una regola in `AGENTS.md` — ogni assistente fa `git fetch` e confronta con `origin/main` prima di iniziare a lavorare, per accorgersi se un altro assistente (es. Codex) ha pushato modifiche nel frattempo.
- **Workflow di sincronizzazione concordato con l'utente**: commit + push automatici dopo ogni modifica rilevante, senza richiedere conferma ogni volta (preferenza esplicita, salvata anche nella memoria dell'assistente).

## 2026-08-02 (2) — preparazione al passaggio di consegne

- **`docs/HANDOFF.md`**: nuovo documento di consegna (stato, funzionalità, comandi, problemi noti, debito tecnico, prossimi passi).
- **`.gitignore`**: aggiunto `.gitignore` di root (era assente); `backend/.gitignore` esteso con `coverage/`, `.env.*`; `frontend/.gitignore` corretto — mancava del tutto `.env`/`.env.*` (bug reale: un `.env` frontend non sarebbe stato escluso dal futuro repository Git).
- **`frontend/.env.example`**: nuovo file, documenta `VITE_API_URL` (opzionale, non esisteva prima nessun `.env.example` per il frontend).
- **`backend/.env.example`**: aggiunta `FRONTEND_ORIGIN` (opzionale, era usata nel codice ma non documentata — chiudeva `backlog.md` B5).
- **Verifica build/lint/test**: eseguiti su backend e frontend, nessuna modifica funzionale necessaria. Risultati: backend build ✅, test ✅ (solo scaffold), lint 12 errori pre-esistenti (`claude-extraction.service.ts`, risposta Claude tipata `any`); frontend build ✅, lint 3 warning (`exhaustive-deps`), nessuno script `test` configurato. Dettaglio completo in `docs/HANDOFF.md`.
- **Verifica avvio da README**: confermato che `npm install && npx prisma migrate deploy && npm run start:dev` (backend) e `npm install && npm run dev` (frontend) funzionano come documentato — nessuna modifica necessaria al quickstart, solo aggiunta la sezione "Lint, build, test".
- **Aggiornamento documentazione**: `README.md`, `architecture.md`, `roadmap.md`, `backlog.md` aggiornati per riflettere lo stato verificato (test frontend assenti, non solo "scaffold"; nuove voci di debito tecnico B14–B16 da lint/build).

## 2026-08-02

- **Documentazione di progetto per collaborazione multi-assistente**: creati `README.md`, `docs/` (vision, architecture, domain-model, api, ui-ux, roadmap, decisions, backlog, changelog), `prompts/` (coding-guidelines, conventions), `AGENTS.md` + `CLAUDE.md`.
- **Dashboard → Asset**: cliccare un promemoria in Dashboard porta ora direttamente al dettaglio dell'asset corrispondente (`Dashboard.tsx`, `App.tsx`).
- **Rotazione planimetria**: nuovo pulsante "Ruota" (90° per volta) in `FloorPlan.tsx`. Ruota le coordinate persistite di ambienti e asset (non solo la vista), mantenendo ogni asset nella stanza a cui è assegnato. Nuovo campo `House.floorPlanRotation` (migrazione `20260802142034_add_house_floor_plan_rotation`) usato per ri-ruotare l'immagine di sfondo raster in modo coerente. Vedi `decisions.md` #10.
- **Fix selezione asset vicino ai vertici stanza**: corretto z-index dell'icona asset (`FloorPlan.tsx`) che veniva intercettata dagli handle di ridimensionamento. Vedi `decisions.md` #15.
- **`createdAt`/`updatedAt` visibili in UI**: aggiunta riga "Creato il / ultima modifica il" nel dettaglio Asset (`Assets.tsx`) — i campi esistevano già nello schema, non erano solo esposti.
- **App raggiungibile da cellulare in LAN**: CORS backend `origin: true`, base URL API calcolato da `window.location.hostname` nel frontend, Vite con `server.host: true`. Vedi `decisions.md` #12.
- **Fix suggerimento asset da documento**: il matching documento→asset ora richiede tipo uguale **e** nome simile, non più "il primo asset di quel tipo" (causava il suggerimento sempre sbagliato con più elettrodomestici in casa). Sotto la soglia di confidenza (~50%), nessun suggerimento invece di uno arbitrario. Vedi `decisions.md` #7, #8.
- **Ottimizzazione mobile**: sidebar a scomparsa (drawer) sotto 860px, griglie responsive, fix overflow modali, supporto touch (Pointer Events) sull'intera planimetria interattiva. Vedi `ui-ux.md`.
- **Scelta ambiente alla creazione asset da Inbox**: il mini-form di creazione asset da documento non riconosciuto include ora la selezione dell'Ambiente, per non far finire ogni nuovo asset in "Documenti casa". Vedi `decisions.md` #9.

## Prima di questa sessione

Storia non tracciata in questo changelog (il repository non era ancora un progetto Git — vedi `backlog.md` B3). Per il contesto di progettazione originale vedi `START_HERE.md` e `architettura/homeos_architettura_tecnica.md`; il grosso del modello dati e delle feature elencate come "già implementate" in `roadmap.md` (M1) proviene da sessioni precedenti non documentate qui.

## 2026-10-13 — Ciclo di vita Dimora V5
Prototipo: perdita accesso Home alla vendita, pratica agenzia chiusa dopo 60 giorni con soli metadati, cessazione mandato senza perdita delle pubblicazioni autorizzate delle Home. Export, liste e percorsi rispettano la chiusura. Fonte ADR 80. Verifiche isolate e navigazione browser; nessun backend/database reale modificato.


### 2026-10-13 — Validazione guidata v9.1
Targhetta libretto derivata dalle verifiche caldaia: aperta anche dopo conferma parziale, dati estratti confermati alla conclusione; nessuna certificazione del documento. 22 controlli sul codice superati.

### 2026-10-13 — Accesso diretto condominio v9.2
La Casa espone Vai al condominio e Invia segnalazione per unità collegata a studio attivo, indipendentemente dalle comunicazioni presenti. Sintassi e 22 regressioni passano.

### 2026-10-13 — Invio segnalazione v9.3
Pulsante sempre Invia segnalazione; comunicazioni consultabili facoltativamente senza attribuire una pertinenza automatica. Sintassi e 22 regressioni superate.

### 2026-10-13 — Comunicazioni condominio in Home v9.4
Testo delle comunicazioni autorizzate leggibile direttamente nel riquadro Dal tuo condominio, senza apertura del dettaglio. Note di chiusura private escluse. Sintassi e 23 controlli sul codice superati.

### 2026-10-13 — Stato comunicato e icone V5 v9.5
Selezione esplicita dello stato pubblico, icona e dicitura coerenti in Home/Condominio/manifesto/pubblicazioni; rettifiche mantengono lo stato, legacy informativo. 24 controlli codice e ispezione UI del selettore.

### 2026-10-13 — Base collaborazione V5 identity-v1
Contratto account/casa/CSRF/idempotenza, ADR frontend nuovo e istruzioni scoped frontend-v5. Checkpoint 101f053 e checkout Claude indipendente, senza modifiche non committate o credenziali legacy. Frontend/backend reali ancora da implementare.

### 2026-10-13 — Primo backend V5 identity-v1
Nuovo backend-v5 indipendente: auth/sessione/CSRF, Home/membership temporali, idempotenza e migrazione iniziale. Client V5, build/typecheck/lint e 14 test dominio passano. API/DB reali non ancora avviati per limite TCP della sandbox; launcher e suite integrazione preparati.

### 2026-10-13 — Integrazione frontend Claude e review identity-v1.1
Integrati b00f602/8dfc967 di Claude in 06beb7f/93ed322. API v1 verificata con 9 scenari reali. Review aggiunge contesto account, codici errori, Unicode e logout scaduto. Build/lint passano, 17 test dominio e 47 frontend mock. Nuovo collaudo reale ancora da eseguire.









## Economia V5 — definizione consolidata del 14 ottobre 2026

Definiti obiettivi, UX, categorie, costo canonico, natura/fonte/pagamento separati, ricorrenze e rinnovi, copertura, privacy e criteri di collaudo. Scouting PDF trattato come spunti con correzioni rispetto al runtime V5. Preparato incarico Claude per revisione UX documentale; non ancora avviato. Nessuna modifica runtime/schema/servizi/rete o chiamata AI prodotto.


## G1 — contratto e revisione UX raccolta (14 ottobre 2026)

Raccolta e integrata revisione documentale Claude (senza browser); risolte dieci osservazioni con decisioni motivate. Contratto G1 e prime validazioni/test backend: build/lint e quattro scenari dominio verdi. Nessuno schema/migrazione/servizio/rete modificato; frontend nuovo non implementato, nessuna chiamata Anthropic.


## G1 — backend attivo e verificato (14 ottobre 2026)

Implementati sei modelli additivi e migrazioni202610140002/003 nel solo DB V5 guardato, endpoint home-objects-v1 e controllo compatibilità assetId H1/H3a. Backend verificato81offline/102integrazione/5HTTP processo reale; ulteriore8DBmirati per26link/storia multipagina. Originali e dati tecnici invariati, nessun paid AI/main/push. Frontend ancora in corso.


## G1 — integrazione finale reale (14 ottobre 2026)

Integrati8commit frontend Claude bf10356, escluso sync26525c0. Ambienti shared e oggetti personali/multiambiente, boiler originale, documenti/costi/attività canonici, archive/restore/storia. Correzioni finali history.position/importo diretto/focus promemoria G1 e testo destinazione. Build/lint,237mockbaseline+47mirati finali,81offline/102integrazionebaseline+13G1finali/5HTTP runtime,21clientAPI non-live veri (M4supplemento3), browser320/390/1280 e reload/login verdi. Nessun paid AI/main/push/DB reale/rete.

## S1 — pianificazione approvata dopo G1 (14 ottobre 2026)
S1 precede C1 e include manuale breve più proposta economica da bollette/fatture semplici, con conferma e costo unico. Specifica docs/v5/s1-economic-history-spec.md; revisione UX documentale preparata per Claude. Implementazione e contratto REST congelato ancora da completare; nessuna migrazione, chiamata paid o modifica runtime in questa sessione.

## ADR-V5-19 — S1 prima C1, contratto e arbitrato UX
14 ottobre 2026. S1 include manuale breve e compilazione assistita bollette/fatture. Bozza economy-v1 separata da expenses-v1 e da analisi caldaia, stesso HomeExpense canonico. Proposta create atomico con lavoro/oggetto e riepiloghi server con somme stringhe centesimi. Scartati copie del costo, pagamento dedotto e esclusione finanziamento dal totale generale. Revisione Claude d54a533 raccolta come db45d1b e arbitrata in s1-design-review.md: collegamento documento incrementa CAS/storia se cambia costo; bozze originali persistite, edit non salvati espliciti; consenso per ogni trasferimento. Nessuna dipendenza/migrazione/runtime o chiamata paid in questa fase. Contratto ancora bozza fino esempi DTO/congelamento.

## S1 — mockup prima dello sviluppo e modulo aggiuntivo
14 ottobre 2026. Steering esplicito: prima navigazione UX mockup, poi implementazione; Economia aggiunge capacità senza alterare funzionalità già definite. Creato frontend-v5/public/mockup-economia-s1.html standalone, dati sintetici in chiave localStorage isolata dimora-s1-ux-mock-v1 (QA separata suffisso -qa), nessuna API/AI o DB. Provati da browser: manuale85 EUR Lavatrice totale505; link gas esistente totale invariato; scelta80su80+20 e nuova registrazione esplicita; fatturaIVA122; scansione manuale; filtroGas e confronto;320px senza overflow. Backend invariato, nessuna build/test backend necessari. Confronti e archivio nel mockup sono simulazioni, non funzioni già aggiunte all'app.

## S1 — schede oggetto preservate nel mockup
14 ottobre 2026. Su richiesta committente, catalogo Oggetti distinto da Costi per oggetto. Scheda completa con sintesi essenziale e sezioni documenti/attività/costi/storia, link verso vista economica e ritorno. Verificato browser accesso fonte sintetica e ritorno,320px senza overflow e console senza errori. Solo mockup isolato: app/backend/DB e funzionalità già definite invariati. Specifica aggiornata docs/v5/s1-economic-history-spec.md; guida outputs/Dimora-V5-S1-mockup-navigazione.md. Sviluppo operativo ancora sospeso per revisione esperienza.

## Mockup Home proprietario completo prima S1
14 ottobre 2026. Quattro sezioni Casa/Attività/Documenti/Spese; ambienti/oggetti/condominio da Casa; spese essenziali distinte da approfondimento Economia. Archivio generale, review card aperte, attività, originali, costi collegati, ritorni contestuali, C1/ciclo di vita come anteprime simulate. Verifica browser reale delle sole simulazioni e viewport320, zero consoleerrori; nessuna API/DB/AI o modifica runtime. Source frontend-v5/public/mockup-proprietario-v5.html e report docs/v5/owner-mockup-navigation.md. Multi-casa/onboarding account e funzioni future non rappresentati. Backend S1 ancora sospeso finché committente valuta navigazione.

## Audit UX Home e famiglie approvate —14ottobre
Contributi Claude da02584/9357f2b raccolti selettivamente (audit20screenshot, proposta autonoma, famiglie). Audit attendibile con correzioni alle affermazioni assolute; alternativa2 raccomandata con schede ad anteprime limitate, unico ingresso Spese e ritorni contestuali; ufficiale non modificato. Report docs/v5/home-ux-audit-arbitration-20261014.md. Famiglie approvate recepite in spec/modulo/bozzaREST: settecodici serverfamily, categorie invarianti, repairs_works derivata da lavoro, polizza mutuo financing esplicita, totale generale e withoutFinancing stessa base. Non importare fonte Claude integralmente: vecchi gruppi, confronti annuali non omogenei, secondarie segnaposto, liste complete e viewportmeta assente. Nessuna API/DB/AIpaid; contratto non congelato.

## Famiglie approvate ora visibili nei mockup —14ottobre
Aggiornati mockup proprietario e copia navigabile proposta-Claude: tutte7famiglie, repairs_works con lavoro derivata in works_purchases, polizza casa180EUR insurance e polizza mutuo120EUR financing espliciti sintetici, rata450 già presente. Totale fixture2477,90EUR, famigliafinancing570EUR, senza1907,90EUR. Dati esistenti non riclassificati; esempi inseriti soltanto se ID mancante. Confronto proposta corrente allineato fino14ott in entrambi anni, viewportmeta/lang aggiunti. Originale consegna Claude in frontend-v5/docs/proposta-ux preservato; copia public ora adattata Codex e marcata. Browser verificato riepilogo proposta e proprietario, sintassi valida e console senza errori. Nessuna API/DB/AI. Non applicata ancora intera riorganizzazione UX al mockup ufficiale.

## Spese — macro famiglie come navigazione principale
14 ottobre2026. Richiesta esplicita committente: sostituire menu Elenco/Peroggetto/Lavori/Riepilogo con famiglie. Proposta navigabile aggiornata: Tutte+7famiglie; modalità secondarie nel select Visualizza, family applicata a elenco/totali/riepilogo/oggetti/lavori; mantenuto scroll orizzontale mobile. Verificati Mutuo570 e Assicurazioni180 con registrazioni giuste, Riepilogo stessa famiglia,320px senza overflow/scrollWidth305; console nessun errore. SintassiJS controllata. Solo copia proposta public e spec, mockup ufficiale/backend invariati da questa modifica. Scelta documentata per successiva integrazione UX ufficiale.


### 14 ottobre 2026 — Consolidamento mockup proprietario S1

Approvata dal committente la navigazione Spese per macro famiglie con Visualizza secondario. Applicata al mockup ufficiale completo, preservando sezioni oggetto/documenti/attività e percorsi condivisione/storia/esportazione. Report e limiti: docs/v5/owner-ux-consolidation-20261014.md. Si rimuove la duplicazione di ingresso Spese/Economia senza rimuovere funzioni. Contratto e implementazione S1 operativa restano separati dalla prova UX. Nessun nuovo incarico Claude o consumo API.


### 14 ottobre 2026 — Rifinitura UI Claude integrata

Raccolta variante Claude 2a5fd69/f37768d e applicata al mockup ufficiale preservando stato e funzionalità. Tipografia, densità, gerarchia azioni e righe Spese migliorate. Verifiche e limiti in docs/v5/owner-ui-refinement-integration-20261014.md; contratto S1 ancora da congelare, runtime invariato.


### 14 ottobre 2026 — Contratto S1 e proposta dashboard

Definizione S1 e wire economy-v1 congelati con tipi, esempi e hash in docs/v5/s1-contract-freeze-20261014.md. Bozze accantonate recuperabili, confronto nullable e compatibilità H3a/G1 definiti. Incarico Claude dashboard alternativa separata pronto; non cambia specifica, ingressi o API e non blocca implementazione. Nessun runtime o DB modificato.


### 14 ottobre 2026 — Backend S1a/b e dashboard separata

API economy-v1 implementate per costi/metadati/famiglie/filtri/confronti e lavori personali; mutazioni condivise con H3a e riferimenti G1 atomici. Migrazione additiva solo DB V5 dedicato. DocumentDrafts false: S1c e frontend operativo restano aperti. Build/lint,86 offline e119 integrazione passati;5 test ulteriori contro API registrata. Report docs/v5/s1ab-backend-review-20261014.md. Dashboard Claude raccolta e servita separatamente, non integrata nel mockup ufficiale.


### 15 ottobre 2026 — Backend S1c fixture e ripresa verifiche

Job economici persistenti, bozze recuperabili, candidati e conferma atomica sul costo canonico implementati; fonte/versione/hash e redazione replay/storia. Provider fixture solo due PDF sintetici, Anthropic economico disabilitato senza invii o spesa. Build/lint e12test S1c mirati verdi nella ripresa;89offline e130integrazione precedenti documentati. API locale ripristinata autonomamente. Frontend Claude non raccolto, S1 nel complesso non completato. Report docs/v5/s1c-backend-review-20261015.md.


### 15 ottobre 2026 — Integrazione frontend Spese S1a/b
Claude c7f145b/1e2ae0e raccolti senza sync, dashboard/manuale/lavori operativi. Build/lint e267test frontend verdi,17test mirati sulla correzione ritorno dal nuovo costo. Percorso browser/API/DB reale verificato: costo sintetico240EUR, totale240,60EUR, archivio/ripristino e storia. Report docs/v5/s1ab-frontend-integration-20261015.md. S1c UI resta aperta; Anthropic economico disabilitato, nessuna chiamata paid. Warning bundle677kB e riepiloghi H3a da evolvere tracciati nel report. Nessun push/main/legacyDB.



### 15 ottobre 2026 — S1c frontend integrato con fixture
Claude1e76d7f/afb9897 raccolti come da0135d/d3a27dd, sync escluso. Build/lint/typecheck e37test mirati verdi. Browser/API/DB reale: upload gas sintetico, fonti/importi, park/reopen dopo reload, conferma80EUR e link_existing senza duplicato. Dashboard320,60EUR/cinque record; AiAttempt8 invariato. Report docs/v5/s1c-frontend-integration-20261015.md. Adapter Anthropic economico non implementato/disabilitato; bundle715kB aperto. Nessun push/main/DBlegacy/paid.



### 15 ottobre 2026 — Adapter economico Anthropic offline
Prepare/decode con parser reale e schema/citazioni verificate, trasporto strutturato condiviso con regressioni caldaia verdi. Evidenza date italiane/importi raggruppati. Build/lint,95offline e12S1cDB/HTTP verdi. Report docs/v5/economic-anthropic-offline-20261015.md. Nessun invio paid/.env/migrazione/restart. Provider resta disabled: ledger economico dedicato, worker protetto e consenso UI reale ancora da implementare prima di autorizzare campagna live.



### 15 ottobre 2026 — Ledger e worker Anthropic economico, ancora disabilitato
Registro separato EconomicAiCampaign/EconomicAiAttempt, riserva atomica, quota/costi, consenso start/retry, recupero senza reinvio e permessi prima di count/Messages/pubblicazione. Migrazione20261015090000 solo DBV5 dedicato. Build/lint96offline/21DBHTTP verdi con AnthropicHTTP stub. API riavviata; providerdisabled, ledger economico vuoto, M4rimasto8. Report docs/v5/economic-ai-ledger-worker-20261015.md. Consenso frontend affidabile a Claude; nessun paid, budgetlive ancora da autorizzare dopo integrazione.



### 15 ottobre 2026 — Consenso Anthropic economico integrato
Claude0c3db1b/55aec7f raccolti d8c5e0b/a6b7497; allineamento escluso. Consenso locale, reset, nuovo retry e billing separato; Codex esclude retry quando billinguncertain anche con timeout. Build/lint48mirati e1test client/API reale a providerdisabled verdi. Economyledger0/M4Attempt8. Report docs/v5/economic-consent-integration-20261015.md. 311completi/browser solo evidenza Claude; nessun paid o budget attivato. Proposta collaudo1USD/treMessages sintetiche ancora da approvare.



### 15 ottobre 2026 — Primo collaudo Anthropic economico reale
Autorizzati1USD/treanalisi solo sintetici. Aggiunta allowlistSHA256 obbligatoria server (ECONOMY_AI_ALLOWED_SHA256), rifiuto prima riserva e trasferimento. Build/lint16mirati verdi; dueMessages reali Sonnet4.6, gas80/20/100 e fattura100+22/lordo122 corretti, conferma canonica totale202EUR. SpesaAPI0,021834USD settled; M4invariato8. Providerdisabilitato in finally/APIriavviata. Report docs/v5/economic-anthropic-live-20261015.md. Nessun terzoinvio o quota resettata; nessuna bolletta personale. Claude possibileottimizzazione bundle incaricopreparato; frontendnonmodificato.


## 16 ottobre 2026 Fase 0 avviata

Aggiunti tre test storage/export: corruzione a stessa dimensione, limite ZIP e rilascio slot dopo guasti concorrenti; 18/18 mirati e lint backend verdi. Nuovi docs/v5/fase0-prerequisiti-20261016.md e fase0-recovery-design-20261016.md: stato del pilota e proposta recupero, nessuna API nuova. Incarico Claude UX separato in outputs. Nessuna modifica runtime, DB, provider o sicurezza.


## 16 ottobre 2026 Fase 0 preparazione email e corpus

Aggiunti adapter Brevo non registrato/non attivo (6 test offline), corpus sintetico24 casi con parser reale e scorer (2 test), strumenti read-only preflight/manifesto. Build/lint verdi; nessuna nuova API o migrazione. Contratto export personale proposto. Report docs/v5/fase0-avanzamento-tecnico-20261016.md. Claude confermato su UX; prova personale ancora non pronta.


## 16 ottobre 2026 Recupero account V5 implementato

Raccolti report/mockup Claude aa4f55d; implementati schema/API recupero e verifica, pagine reali lazy, ingressi login/registrazione, banner verifica e guard upload per nuovi account. Migrazione additiva dedicata, API registrata riavviata da Codex senza intervento utente e senza toccare PG/frontend. Backend40offline,11DB con mailfinta,25HTTPregressioni; frontend40mirati, build/lint verdi. Canale Brevo con credenziale locale esclusaGit, API mittente attivo verificata dopo autorizzazioneIP manuale; utente su prova nuova registrazione/verifica, nessuna falsa attestazione ricezione/reset completo. .envAnthropic/main/legacy preservati.


## 16 ottobre 2026 Collaudo live recupero concluso

Brevo/API mittente verificati dopo autorizzazione IP eseguita dal committente, due email reali richieste da lui (verifica e reset), challenge accepted/consumed confermate DB. Committente conferma login con nuova password; Codex osserva /case autenticato senza case. Nessuna password letta. Runtime660e50d, report docs/v5/account-recovery-esito-20261016.md. Backup aggiornato083531Z verificato con restore43tabelle/262originali, clusterspento. Recupero gatechiuso locale; altri gate Fase0 aperti. Nessun paidAI/main/legacy/push. Preflight ora distingue il GETsession che puo creare metadato anonimo da una lettura file pura.

- Ricevuta assistita, mockup: originale consultabile da errore di estrazione e modulo manuale, anteprima e ingrandimento; campi preservati, verifica browser desktop/320px.

- Annotati per futura progettazione i canali upload drag-and-drop, cartella cloud e inoltro ricevute via email, con convergenza nel flusso documentale assistito. Nessuna integrazione attivata.


Ricevuta assistita R5a (16 ottobre2026): policy fonte/versione/hash del nome generico estesa a catalogo G1 prima di LIMIT, scheda/storia, riferimento S1 ed export con verifica dei proof dopo snapshot. Rinomina manuale sostituisce la provenienza del nome; storia degli oggetti ricevuta mostra nome corrente autorizzato. Backend compilato/testato su fixture, servizio registrato non riavviato, modulo ricevuta ancora isolato/capabilities false. Dettagli docs/v5/receipt-assistance-backend-20261016.md.


Ricevuta R5c (16ottobre): SHA256 di originale leggibile nella stessa Home identifica copie, non nome/importo. Conferma unica serializzata account/Home, costo canonico preservato; fingerprint conflitti hash/campo/proposta scoped oggetto. API candidati paginate + linkedCount autorevole oltre pagina, nessuna preselezione da pagina parziale. Modulo ancora isolato/capabilities false;22DB/HTTP/build/lint verdi. Dettagli report receipt-assistance-backend-20261016.


## R6a — provider di simulazione e PDF sintetici reali
Aggiunti fixture-provider.ts e quattro PDF deterministici con manifest hash: acquisto singolo, multiarticolo, vuoto/non leggibile, documento estraneo. Provider receipt_fixture_v1 esplicitamente isSimulation; accetta soltanto hash noti, nessun fallback basato su nome/marker e nessuna API esterna. Estrae col processo PDF reale e valida citazioni/totale/data con receiptExtraction prima di restituire proposte.5test offline verdi: acquisto17990centesimi, hash ignoto senza parser, byte alterati, multiarticolo/documento estraneo rifiutati, PDF vuoto senza testo. Build/lint BE verdi. Non è ancora un job o un endpoint attivo, nessuna persistenza/DB/restart/browser nuovo. PDF non sono documenti personali e non provano qualità di Anthropic. Prossimo R6b job persistente/lease/replay/source checks, poi adapter/frontend/browser.

### 16ott2026 — Ricevuta R8b, pronto offline
Implementati budget/campagne ricevute separati, consenso/fonte ricontrollati, dispatcher con esito incerto senza retry, costo nella bozza e client validato. Migrazione20 V5 applicata; API ripristinata.11nuovi testBE/39regressioniDBHTTP e30FE pertinenti verdi, build/lint verdi. Nessuna chiamata Anthropic reale/paid/personale/env; resta opt-in disabilitato.

### 16ott2026 — Ricevuta R8c live sintetico verificato
Una analisi Anthropic autorizzata, testoPDF sintetico, costo0.008250USD entro0.25. Dati e citazioni validati, riuso oggetto/costo, conferma0/0 senza duplicati e reload con costo persistente. Provider nuovamente disabilitato, nessun personale/env/ledgerprecedenti modificato. Evidenze receipt-browser-20261016/live-verification.json nel workspace.

### 16ott2026 — Mockup archivio assistito M1
Nuovo prototipo isolato con lotto misto di7documenti sintetici: APE, pratiche edilizie multiparte, schemi, regolamento, ricevuta, copia e scansione. Revisione e conferma parziale, privacy invariata, nessun oggetto/costo forzato. QA browser e viewport320, nessuna API/AI/persistenza reale.

### 16ott2026 — Archivio assistito V1 consolidato, B1a
Consolidata specifica dopo approvazione mockup; incarico Claude UI isolata. Implementati catalogo/validazioni e persistenza lotto/elementi con ripresa, idempotenza concorrente e autorizzazioni.7unit+6HTTP/DB verdi, build/lint verdi; migrazione21 V5 applicata e API ripristinata. Modulo non attivo, nessun file/AI/personale toccato; upload/organizzazione/classificatore/integration ancora in sviluppo.

###16ott2026 — ArchivioB1b, upload e copie
Implementati uploadindipendenti, lease/retry/replay, scansione/storage esistenti, dedup privata e redazione fonti nel moduloisolato.13HTTP/DB e testfisico MicrosoftDefender con PDFsintetico verdi;2regressioni multipart e build/lint verdi. Migrazione22V5, APIripristinata; modulo ancora disabilitato, nessun AI/personale.

## 2026-10-16 — Archivio assistito attivo con classificazione locale
Collegati componenti Claude a sessione/API: upload perfile2alla volta, coda locale, fonti e originale, revisione/rinvio, consenso sostituzione, conferma parziale, storico/ripresa lotti e annullamento upload. Client trasmette AbortSignal anche in POST. Raccolti tutti i contributi B4Claude, senza merge di allineamento. Testo non riconosciuto manuale, nessuna AI esterna o costo, demoPDF scaricabili distinti dal prodotto. Collaudo Chrome+DB+Defender su4sintetici,1copia,3joblocali,2decisioni,0nuovioggetti/costi. Rapporti V5 dedicati.

### 16 ottobre 2026 — Sezioni Documenti
Raccolte in evidenza sopra la ricerca, con gli stessi controlli grafici delle famiglie Spese. Cambio raccolta immediato e URL persistente, preserva ricerca/formato/visibilità applicati; Tutti riunisce l'archivio, Azzera filtri rimuove tutto. Nessuna riclassificazione automatica dei file esistenti o modifica di permessi. Test mirati e build/lint frontend; nessuna modifica backend.


### 16 ottobre 2026 — Export come icona di pagina
Su richiesta del committente l'export ZIP è un'icona accanto al titolo Documenti in ogni raccolta, incluse quelle vuote (disabilitato). La raccolta non limita la presenza dell'azione; ruoli e selezione continuano a governarne l'abilitazione. Tooltip e nome accessibile espliciti, target44px. Stessa icona per scaricare l'originale e dati personaliJSON. Non aggiunti nuovi endpoint o export Spese separati. Nessun download personale effettuato durante la verifica.


### 16 ottobre 2026 — Documenti: ingresso unico, export contestuale e ricerca compatta
- Un solo ingresso «Carica documenti» per uno o più PDF/JPEG/PNG: selezione multipla dal dispositivo o drag&drop nella medesima area. Il controller esistente mantiene limiti, upload indipendenti e conferma esplicita dell'organizzazione. Non è un collegamento a cartelle cloud o scansione ricorsiva di directory.
- Icona export accanto al titolo: primo clic abilita caselle/strumenti, secondo clic sui selezionati prepara ZIP. Annulla/cambio raccolta escono dalla selezione; successo la chiude. Nessuna casella nell'archivio normale. Il pannello JSON conserva la funzione distinta e compare soltanto nelle opzioni di esportazione, anche quando non ci sono originali.
- Ricerca compatta con titolo «Cerca documenti», campo e azioni. «Ricerca in» e nota sul contenuto conservate per lettori di schermo, senza duplicare visivamente la casa già nel titolo. Formato e visibilità in details «Filtri aggiuntivi», chiusi se inattivi e aperti con filtri applicati.
- Il form UploadForm ancora usato da Spese non è cancellato. Le sue regressioni sono isolate nel SingleUploadHarness e in route aggiuntive SOLO del harness, senza ingresso legacy nascosto nel prodotto. Nessuna API/mock fallback nel runtime.

### 16 ottobre 2026 — Unico ingresso documentale
Rimosso anche Analizza documenti dalla testata Documenti: resta solo Carica documenti, che entra nel percorso caricamento/classificazione locale/revisione/conferma. L'analisi tecnica M3/M4 resta disponibile da Attività e dai percorsi dedicati: nessuna funzione rimossa, nessuna AI a pagamento avviata. L'avvio locale e le conferme nel lotto mantengono le regole già implementate; non dichiarare introdotta un'analisi esterna automatica. Test mirato sulla testata, typecheck ed eslint dei file coinvolti.


### 16 ottobre 2026 — Aggiunta progressiva di documenti allo stesso lotto
POST /homes/:homeId/document-intake/batches/:batchId/items, body {items:[clientItemId,filename,byteSize,mimeType]}, Idempotency-Key. Stessa validazione manifest/CSRF/account/Home/ruolo/email del caricamento iniziale. Append commutativo senza expectedVersion: lock lotto e quote rilette serializzano conteggio, byte e ordinali, mentre i job possono avanzare. Max20file e200MiB sull'intero lotto, non per singola selezione. Stessa chiave/payload → replay del lotto attuale; payload diverso →409; clientItemId già presente con altra richiesta →409. Nessuna lettura di originali, schema o provider aggiunti.
I file, le proposte, le scelte e gli esiti confermati precedenti non sono sovrascritti. Un lotto completato riapre solo per accogliere nuovi file; i risultati precedenti restano registrati. Il client usa stesso batchId e upload indipendenti soltanto per gli ID della nuova selezione; non ritenta automaticamente file precedenti falliti. Esito incerto conserva chiave/manifest per recupero. Risposta tardiva non naviga in un altro lotto.
Il pulsante «+ Aggiungi documenti» nel lotto apre la medesima selezione/drag&drop e torna al lotto dopo la scelta, anche scegliendo un solo file. Durante il caricamento il selettore è disabilitato. Nessun file personale usato per verificare l'aggiunta, nessuna chiamata AI/email/paid, nessuna modifica .env/quote/sicurezza. Solo DB V5 dedicato e riavvio dell'API registrata.

16ott2026: + Aggiungi documenti spostato dalla colonna laterale a subito dopo l'elenco, dentro File del lotto, su indicazione del committente. Nessun cambiamento di comportamento/API. Verifica smoke, typecheck ed eslint mirati.


### 16 ottobre 2026 — Titolo e tipi proposti, revisione semplificata
Il committente richiede di ridurre la compilazione manuale: il classificatore locale propone il titolo da una riga breve riconoscibile del testo effettivo, quando comincia con il tipo rilevato e non supera120caratteri. In assenza di intestazione affidabile resta un'etichetta del tipo; nessuna deduzione dal nomefile o OCR/AI esterna. I contenuti proposti sono tutti preselezionati, modificabili prima di salvataggio/conferma: prevale sulle precedenti istruzioni V1 che richiedevano selezione manuale dei PDF multiparte. Nessuna scrittura di organizzazione senza conferma e nessun consenso sostituzione preselezionato.
Catalogo additivo: agibility_record → building, «Visura agibilità (non certificato)». Una pagina con Visuraagibilità/noncostituiscecertificazione non viene proposta come certificato agibilità/abitabilità solo perché li menziona. Non è una verifica semantica o legale: resta obbligatorio controllare l'originale. Test sintetici separano intestazione reale, prosa, riferimenti e dichiarazione di noncertificazione.
Anche le copie identiche autorizzate possono essere classificate LOCALMENTE su avvio esplicito, tramite la stessa fonte canonica e controlli esistenti. Nessuna copia nuova, alterazione dell'originale o avvio paid. Possono essere riproposti file ready senza proposta ma ancora unreviewed; saved/confirmed/deferred esclusi dall'avvio UI. Backend conserva blocco saved/confirmed. Titolo e contenuti già confermati prevalgono sulla nuova proposta della copia, con scelta di riuso/organizzazione e consenso di sostituzione invariati.
Revisione manuale: pagine facoltative in details richiudibile; già aperto se intervalli presenti. Percorso tastiera aggiornato al nuovo controllo, range conservati. Nessuna analisi dei documenti personali eseguita durante sviluppo: il nuovo comportamento si vede al prossimo avvio locale scelto dall'utente, non riclassificando retroattivamente.

### 16 ottobre 2026 — Riuso distinto da organizzazione e correzione senza upload
Diagnosi in sola lettura sul contesto del committente: il classificatore aveva proposto agibility_record, ma l'azione scelta era reuse dell'originale; una precedente organizzazione other/unclassified era quindi rimasta invariata. Non è un errore del filtro building né un fallimento di riconoscimento della visura. Nessuna modifica dei suoi dati effettuata dal collaudo: consultati solo metadati scoped al suo account/Home, non i byte originali. Evidenza locale outputs/intake-organization-readonly-result.json NON da committare.
La revisione di una copia con organizzazione other e proposta più specifica ora preseleziona i tipi proposti, conservando titolo personalizzato e consenso di sostituzione esplicito. Scelte già classificate restano conservate. Il solo riuso avvisa che non applica titolo/categoria e lo stato non dice più Organizzato: Originale riusato · organizzazione invariata.
POST /homes/:homeId/document-intake/batches/from-documents {documentIds:[uuid,...]} +Idempotency-Key prepara una nuova revisione degli originali già autorizzati (max20/200MiB e stessi limiti di formato/dimensione). Non ricarica byte, non crea Document/StoredFile, non modifica organizzazioni o vecchi ledger. Lock/check di account/Home/ruolo/email/originale; idempotenza peraccount/Home/chiave con digest origine distinto dai manifest. Riusa solo proposte precedenti dello stesso account/Home/documentId/versione/hash; altrimenti not_started. La nuova organizzazione esiste solo dopo salvataggio e conferma, con replaceOrganization/versioni quando necessario.
Il comando Riorganizza senza ricaricare sui file confermati prepara quel lotto e porta lì il client, proteggendo da doppio clic e risposte tardive di altro lotto. Nessun automatismo paid/AI/OCR o classificazione retroattiva; la categoria deriva dal tipo riconosciuto oppure scelto. Per scansioni unreadable l'OCR resta fuori scope.

### 16 ottobre 2026, notte — Documenti semplificati V2 disponibili
Consegna Claude integrata in quattro commit pertinenti, senza sync/push. Area unica, conferma singola o selezione diretta multipla, lettura locale automatica, rinvio persistente, copie/conflitti individuali con consenso; modifica titolo/tipo dal dettaglio senza nuovo upload. Mantenimenti non riscrivono dati, titolo conservato correttamente. Build/lint verdi, suite pertinenti verdi e browser reale con cinque originali sintetici in una casa di collaudo separata; originali invariati, nessuna spesa/oggetto implicito. Rapporto docs/v5/document-intake-simplified-development-20261016.md.

### 17 ottobre 2026 — accesso da telefono sulla stessa Wi-Fi
Attivato ingresso separato 192.168.1.66:5175/case con login normale, controlli CSRF conservati e UUID/upload compatibili con HTTP LAN. API e DB restano locali; nessun firewall o file segreti modificato. Launcher Telefono e report V5 dedicati; prova sul telefono fisico da confermare.

### 17 ottobre 2026 — layout mobile Documenti contenuto nello schermo
Corretto track grid implicito di mainStack, che lasciava alla riga categorie una larghezza min-content di circa 997 px su viewport390. Ora minmax(0,1fr): scorre solo la riga categorie, non la pagina; testo/ricerca/pulsanti leggibili. Verificati Documenti320/390 e desktop1280, filtri reali e catalogo Oggetti vuoto320/390. BuildVite verde; rapporto docs/v5/mobile-document-layout-fix-20261017.md. Nessun dato o servizio modificato.


### 17 ottobre 2026 — onboarding documenti e oggetti O2–O5

Home V5: collegato Documenti → riconosci oggetti, multiarticolo/quantità, creazione o riuso espliciti, dati tecnici/date/garanzia modificabili e provenienze, rinvio/conflitti/ripresa, costi canonici facoltativi solo ricevuta singola. Build/lint/test e browser sintetico verdi. Primo invio personale autorizzato incerto; schema corretto offline, provider disabilitato, riconoscimento reale non validato.


### 17 ottobre 2026 — collaudo reale onboarding r2

Collaudo reale v3 screenshot Amazon riuscito:1prodotto/quantità1, nessun dato assente inventato, costo0.013558USD; bozza da confermare, zero oggetti/costi creati. Vecchia campagna incerta invariata. Nuova autorizzazione separata gestita con canStartAnalysis e guard incerto per campagna, nessun retry automatico.


### 17 ottobre 2026 — identità dal nome del prodotto

Proposte marca/modello dal titolo già analizzato, origine visibile e conferma richiesta; Echo Dot Max riutilizza la bozza reale senza altre chiamate. Fonti/fingerprint invariati, dati espliciti prioritari, titoli ambigui o incompleti non completati.


### 17 ottobre 2026 — consolidamento caso Echo

Consolidata l’accettazione del committente del caso reale Echo: scheda con marca/modello e screenshot, senza spesa in assenza del prezzo. Definito riuso dell’oggetto per futura fattura e controllo costo canonico; nessuna nuova analisi o modifica runtime.


### 17 ottobre 2026 — validazione fattura e caricamento integrato

Corrette data ricevuta d’acquisto e quantità tabellare con citazioni provate; caricamento con proposte oggetti/spesa inline e conferma coordinata per casi chiari, ripresa e recupero esiti incerti. Test locali/DB/UI e browser sintetico verdi; nessuna nuova chiamata AI.

### 17 ottobre 2026 — data acquisto: contesto locale e prompt v4

Diagnostica r2 purchaseDate/date: risposta grezza non conservata, impossibile attribuire il rifiuto a una specifica citazione. Corretta lacuna riproducibile: Il tuo ordine del, Ordine effettuato il, Data di acquisto e Ricevuta d’acquisto anche con data su riga immediatamente successiva. Per citazione della sola data, verificare tutte le sue occorrenze nella stessa pagina originale: ciascuna deve avere etichetta acquisto sulla riga o immediatamente precedente senza contenuti intermedi; espandere la fonte con tale contesto reale. Nessuna ricerca su altre pagine, nessuna data dedotta, rifiutare contesti di consegna prevista/produzione/pagamento e ambiguità. Nessun fallback che scarta silenziosamente il campo. Prompt object-onboarding-v4 richiede etichetta+data, omettendo dati privi di fonte.

Build e lint mirati verdi;44 test offline distinti verdi (11 ricevuta,22 onboarding,11 profilo), sei nuovi casi. Parser reale su PDF sintetico→wire→validazione; controlli sull’originale locale con hash verificato: tre forme di citazione acquisto accettate, nessuna scritturaDB o chiamata provider. Non è replay del replyAI precedente, né prova di successo di una nuova risposta reale. Nessun endpoint/schema/frontend modificato; vecchi job/costi immutati. Prossimo collaudo reale SOLO con nuova autorizzazione: i due precedenti invii della fattura hanno consumato i rispettivi consensi.


### 17 ottobre 2026 — proposta automatica spesa con conferma unica

Ricevuta estratta non ambigua,unico articolo/esemplare,totale positivo e acquisto esplicito: controllo candidati e proposta create già visibile, mai scrittura prima della conferma articolo. Nessun costo automatico da consegna/etichetta/multiarticolo o dati insufficienti. Scelte precedenti salvate restano prioritarie, inclusa esclusione costo. Ricerca incerta/errore blocca proposta automatica: riprova oppure scelta esplicita. Stessa ricevuta o stessa cifra/data producono avviso senza scelta automatica. Importo/data non provano identità del costo: scelta link/skip oppure acquisto distinto dichiarato. Conferma resta una e usa transazione/idempotenza esistenti.

GET expense-candidates: rank2 stessa fonteSHA,rank1 stesso importo/data acquisto,rank0 selezione manuale. Ordinamento su tutto lo scope autorizzato prima della paginazione. Conferma expense.create ammette acknowledgePossibleDuplicate boolean opzionale; senza true un altro costo attivo leggibile con stesso importo/data genera409 onboarding_possible_expense_duplicate. True non supera il divieto di secondo costo per stessa ricevuta, né controlli fonte/target/versione. Nessuna migrazione o nuovo endpoint. Controllo ripetuto nella transazione con lock Home condiviso dalle mutazioni.


### 17 ottobre 2026 — esclusione individuale dalla casa

Scelta «Non riguarda questa casa» nel gruppo Crea/Collega di ogni articolo, anche ricevute con costo proposto. Nasconde campi/profilo/costi, azzera selezione costo/link/manuale e payload finale contiene solo itemId+action skip: nessun prezzo residuo può creare spese. Pulsante «Conferma esclusione», eliminato doppio comando Non creare un oggetto. Prima di confermare si può tornare a Crea/Collega; per una ricevuta chiara la proposta spesa viene ricontrollata. Conferme multiple mescolano scelte indipendenti; preparazione archiviazione documento solo se almeno una scelta crea/collega. Esclusione sola non resta bloccata dal tipo documento da indicare. Originale e altre proposte conservati. Nessuna cancellazione di costi precedenti o ripartizione automatica di totali multiarticolo: il divieto esistente di attribuire tutto il totale resta attivo.

Nessun endpoint/schema/backendruntime modificato: uso del comando skip già esistente, server rifiuta skip+expense.29FE/3file verdi,13DB inclusi contenitori verdi, build/lint frontend verdi. Test aggiunti: ricevuta con costo già proposto esclusa senza payload economico, articolo multiplo escluso lascia gli altri, ripristino scelta prima conferma, payload con costi residui e serverzerooggetti/zerospese/zerobinding/originalepresente. Prima nuovaasserzioneDB corregge assert.rejects per un errore sincrono, non controllo runtime. Browser app reale ordine70a1532f/bozza150a815d mostra3nuoveopzioni, nessuna scelta o conferma personale effettuata. Screenshot16-scelta-non-riguarda-casa.png. Zero AI/email/paid/env/modifiche dati personali. Provider disabilitato. Prossimo committente sceglie articoli estranei e conferma esclusione, poi classificazione documento e revisione router.


### 17 ottobre 2026 — valori riconosciuti visibili nei menu, marca Strong

MarcaStrong derivata localmente dal titolo router, con origine derived_from_product_name e fonte originale; descrizioni router/modem/ripetitore non diventano modelli precisi anche se non troncate. Identità esplicite e scelte utente protette. Nessuna nuova estrazione/provider: stessa bozza reale150a815d, nuove proposte proiettate dal nome già acquisito. Menu accettazione mostra direttamente il valore proposto (Strong, modello noto, date ecc.), preselezione accept già prevista per i nuovi campi; valori non identificati facoltativi restano vuoti. Fonti/origini restano visibili, selezioni salvate intenzionali non sovrascritte automaticamente.

12 testBEprofilo+19FErouter verdi, buildBE/FE e lint mirati verdi. TestaggiuntoStrong titolotroncato/generico/accessori/contraddizione, menu con dato e accept iniziale verificato. Sistemato mock old-job della prova consenso: prima rispondeva succeeded con altra id e smontava il pulsante; ora restituisce il vero stato uncertain dello scenario, nessun comportamento runtime modificato. Browser personale: salvataggio bozza conserva nome/checkboxutente e due esclusioni; selezionata proposta Strong come richiesto e salvata SOLO bozza. Nessun oggetto/costo confermato. Screenshot17-strong-precompilato.png, menuvalueaccept/labelStrong verificati. API aggiornata via launcherTelefono senza campagna; zeroAI/paid/env. Prossimo classificare documento ancora tipo da indicare, poi conferma router dautente.


### 17 ottobre 2026 — aiuto contestuale con icona informazioni

Regola UX approvata: valori e azioni in pagina, spiegazioni secondarie/fonti/origini in popup su icona i accanto al campo. Component FieldInfo riutilizzabile: clic/touch/Enter, dialog aria-labelledby, focus iniziale/Tab confinato/Esc/Chiudi/clic fuori e ritorno focus, blocco scroll temporaneo ripristinato. Applicato a tutti i campi dati/garanzia di ItemEditor e al profilo confermato ProfileSection. Dati attuali confermati e differenze restano visibili; istruzioni decisive/errori non nascosti. Riferimento su riga piena evita etichetta spezzata. Nessun cambio conferme, API, riconoscimento o dati. Estendere questo criterio alle altre sezioni quando si interviene su spiegazioni analoghe, non nascondere avvisi necessari all'azione.

30FE distinti/4file verdi (19router,4intake,5profilo,2FieldInfo), build/lint verdi. Testprovenienza adeguato a apertura esplicita, verificati tastiera/focuschiusura, profilo readonly conserva fonti su richiesta. Browser reale Strong: popup con fonte e stato da confermare, poi chiuso; viewport320 popup left16/right304/width288,clientWidth=scrollWidth286,reset. Screenshot18popup e19campicompatti. Nessun nuovo salvataggio o conferma personale, nessunAI/paid/riavvio backend. Pattern documentato, non dichiarare ridisegnate tutte le altre pagine.


### 17 ottobre 2026 — conferma articolo apparentemente inerte: prerequisito documento

Diagnosi browser read-only: messaggio Rivedi prima il documento già presente in alto; screenshot70a1532f ancora tipo da indicare, quindi guard prepareDocumentForObject impedisce scritture. Correzione: errore inline accanto al pulsante dell'articolo, rolealert/tabindex/focus per portarlo in vista, azione Rivedi documento apre dialogo del medesimoitem tramite callback, senza cambiare route/perdere form né bypassare copie/conflitti. Feedback scompare quando prerequisito confermato; altri errori/incerti mantengono recupero/idempotenza. Nessun comando personale di conferma cliccato dall'agente.

45FE/3file verdi, build/lint verdi. Caso aggiunto screenshot tipo sconosciuto: click→alertfocused, zero POST organizzazione/oggetto, azione→dialogovisibile e nomeformpreservato; recovery 503/stessachiave ancoraverde. Nessun backend/API/AI/paid/env/DBmutato. Browser personale aperta SOLO finestra Indica il tipo per continuareutente, screenshot20. Limite emerso: nessun tipo Ordine/conferma consegna nel vocabolario corrente; usare Altro documento per il collaudo, non classificare una consegna come fattura/ricevuta. Da progettare riconciliazione classificazione locale vs documentKind AI già disponibile, senza nuovi invii impliciti.



### 17 ottobre 2026 — consolidamento onboarding pilota

Sostituzione esplicita versionata, quote manuali multiarticolo con limite cumulativo e tipi ordine/consegna/etichetta implementati; conferma unica e recupero conservati. Dettagli, prove e limiti: `v5/onboarding-pilot-consolidation-20261017.md`. Nessuna migrazione o attivazione provider; priorità ora uso reale e feedback.


### 17 ottobre 2026 — attivazione AI casa con tetto autorizzato

Modalità pilota account/casa, consenso per invio e campagna persistente5 USD/40 analisi. Contatori e blocchi visibili; collaudi esclusivamente simulati, attivazione verificata senza Messages. Appartamento Roma svuotato dopo conferma definitiva, mantenendo account/anagrafica e nuovo budget. Vedi `v5/ai-home-pilot-20261017.md`.


### 17 ottobre 2026 — coda AI pilota corretta

Allineati claim del worker e lettura input allo scope account/casa, mantenendo consenso e filtro campagna/modello. Corretto il blocco queued del primo uso;19 test DB mirati verdi con nuovo percorso completo simulato. Nessun secondo incarico o reset budget. Dettagli in `v5/ai-home-pilot-20261017.md`.


### Caricamento unico — 17 ottobre 2026

Caricamento unico con preparazione di lotto, revisione su richiesta e proposte bollette senza oggetti; controlli copie, esiti incerti e storia canonica. Vedi docs/v5/unified-document-proposals-v1.md.


### HTTP400 bollette — 17 ottobre 2026

Corretto feedback del lotto senza proposte dopo HTTP400; schema specializzato per sorgente, recupero volontario con consenso e riserva aggiuntivi, test offline verdi. Report: docs/v5/unified-document-proposals-verification-20261017.md.


### Bollette — prove autonome 17 ottobre2026

Bolletta reale Sorgenia letta: proposta78,20EUR senza oggetti; revisione compatta con Modifica dati e Conferma spesa, dettaglio specifico per bollette. Report: docs/v5/unified-document-proposals-verification-20261017.md.

- 2026-10-17: elenco Documenti senza etichetta «Caricamento manuale»; proposte bollette confermate con link «Proposta accettata · Vedi dettaglio». Informazione di origine conservata nel dettaglio.

- 2026-10-17: ripristinata nell’onboarding la scelta esplicita per un nuovo tentativo dopo analisi incerta, con consenso separato e budget invariato.

- 2026-10-17: nella Casa, Ambienti e oggetti è ora la prima sezione di «La tua casa», subito dopo «Da fare ora» e prima del riepilogo spese, con lo stesso ordine su desktop e mobile.

- 2026-10-17: Casa/ambienti/oggetto semplificati; stati vuoti compatti, contenuti principali anticipati e prezzo di acquisto dalla spesa collegata.

- 2026-10-17: Esiti confermati e lotti completati semplificati: link a oggetti/spese esistenti, stato comune anche sulle fatture, identificazione leggibile e ritorno contestuale. Upload con testi più brevi. Test mirati e viewport mobile verificati.


### 17 ottobre 2026 — Compilazione per documento

Compilazione manuale/AI direttamente su ciascun documento; eliminata lista di selezione preliminare AI e barra collettiva nella pagina reale. Apertura diretta editor singolo, collegamenti agli oggetti confermati e recupero chiaro delle conferme interrotte. Recuperata la conferma manuale Dreame già salvata: robot presente nel catalogo con PDF, marca e modello. Report v5/document-compilation-per-file-20261017.md.


### 17 ottobre 2026 — Copia Samsung nella conferma articolo

Copia già presente: scelta esplicita di riuso direttamente nella scheda articolo, conferma unica documento/articolo con recupero della stessa richiesta. Corretto il blocco Samsung. 40 test mirati verdi, build/lint verdi.


### 17 ottobre 2026 — Originale nella revisione articolo

Link all’originale nella testata fissa di ogni revisione articolo, nuova scheda e modulo conservato. Anteprima raggiunta a caricamento concluso.


### 17 ottobre 2026 — Planimetria a livello immobile

Planimetria come documento dell’immobile: tipo floor_plan in Pratiche edilizie, revisione Solo alla casa senza creazione oggetti/spese. Raccordo applicato anche ad APE e documenti immobiliari identificati.

## 18 ottobre 2026 — Correzioni onboarding da uso reale
Titoli non compressi dai pulsanti; costo e data disponibili nella revisione manuale anche con tipo non riconosciuto. Tipo documento manuale selezionabile nella revisione inline. Errori provider leggibili e aggiornamento capabilities a esito terminale. Schema provider V8 senza unioni nullable annidate; riepiloghi ordine con data/totale espliciti ammessi come acquisti. Nessuna nuova analisi reale.

## 18 ottobre 2026 — Rifiuto provider diagnosticato e corretto V9
Test sintetico reale conferma HTTP400 “compiled grammar is too large”. Fonti condivise una sola volta nel wire; riferimenti per indice validati e ricostruiti localmente. Secondo test sintetico autorizzato riuscito: nome/marca/modello/data/prezzo corretti,0.027650USD. Nessuna nuova trasmissione della ricevuta personale. Riserva primo test0.25USD conservata; residuo3.070794USD,18/40.

## 18 ottobre 2026 — Prezzo nelle proposte da ordini/immagini
Campo Prezzo di acquisto visibile nella revisione di ogni articolo singolo, anche dopo AI/consegna/documento prodotto; inserimento esplicito avvia scelta costo manuale con data obbligatoria, nessun costo implicito da documenti senza prezzo. Conferme ordine possono estrarre totaleEUR esplicito (TOTALE COSTI), senza prezzi barrati/ratizzazione/date inventate. Nessuna nuovaAI.
## Fase 0 qualità AI v3 — aggiornamento offline, 22 ottobre 2026

Corpus sintetico completato a 52 originali e gold auditati; aggiunta tipologia con certezza nell’onboarding, cache delle sole istruzioni fisse con contabilità di costo prudenziale, selezione locale conservativa delle pagine e scorer puro per le osservazioni validate. Nessuna analisi AI eseguita. [Stato, misure aggregate e lavoro residuo](v5/fase0-quality-v3-stage2-20261022.md).

## Fase 0 qualità AI v3 — runner con ledger durevole, 22 ottobre 2026

Runner collegato al ledger onboarding esistente, campagna sintetica separata, prenotazione atomica prima del provider simulato e ripresa senza reinvii. Verificati concorrenza, tetti persistiti, rollback ed esiti incerti anche dopo riavvio PostgreSQL. Build/lint verdi; test offline 17/17, ledger 12/12 più 1/1 dopo riavvio. Nessuna modifica a schema/quote del prodotto e nessuna chiamata AI/email. [Report](v5/fase0-quality-v3-ledger-20261022.md).

## Fase 0 qualità AI v3 — adattatore e ciclo progressivo, 22 ottobre 2026

Adattatore al modello con preparazione/decoding, evidenze, prezzi cache e politica automatica del prodotto; HTTP simulato e nessuna chiave o trasporto live implicito. Ciclo progressivo con prefissi cumulativi, riserva per passaggio e completezza persistita; arresto su risposta invalida/incerta, tetto e annullamento, ripresa senza reinvii. Corretto il prefisso dei PDF testuali (`onboarding-reading-v2`); fonte completa resta predefinita. [Verifiche, limite delle prove simulate e costo da misurare](v5/fase0-quality-v3-model-20261022.md).

### 2026-10-23 — verifica offline acconto/saldo

Aggiunti collaudo DB isolato e diagnostica in entrambi gli ordini, replay, ricaricamenti e privacy. Documentati i limiti di identità tra fonti diverse e riconciliazione economica; nessun cambiamento al prodotto o AI live. [Report](v5/fase0-installments-offline-20261023.md).

### 2026-10-23 — acconto/saldo, revisione esplicita e costo unico

Bloccati nuovi oggetti omonimi e seconda spesa non riconciliata nel percorso fattura. Nuova conferma manuale dello stesso acquisto, con costo complessivo inserito esplicitamente e un solo aggiornamento canonico/storico. Ricaricamenti e fonte privata/versione/SHA protetti; importi ambigui lasciati pendenti. [Correzione, test e limiti](v5/fase0-installments-fix-offline-20261023.md).
