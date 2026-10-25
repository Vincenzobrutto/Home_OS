# Titoli leggibili dei documenti completati

Lotto `codex/documenti-titoli-completati-20261025`, base `44cd449` dopo il merge approvato della PR #53. Registrazione `a7c001a` prima del codice, fonte prodotto definitiva `efade50`. Nessun file dei lotti Claude aperti, checkout legacy o main modificato.

## Regola di presentazione

L'archivio può mostrare «Bolletta Fornitore Prova · settembre 2026» per un documento completato con una sola parte di tipo Bolletta e una sola spesa personale attiva associata. Fornitore non vuoto e mese della fattura YYYY-MM devono essere già salvati nella spesa canonica. Non si usa OCR aggiuntivo, nome del fornitore noto, data di emissione/scadenza o periodo dei servizi per inventare un titolo. Il mese è quello della fattura scelto dal committente, non il periodo dei consumi.

Il nome viene presentato soltanto quando il titolo salvato è ancora il filename originale o il suo nome senza estensione PDF/JPEG/PNG. Qualunque titolo diverso viene preservato, anche se generico: non si può ricostruire se l'utente lo abbia scelto intenzionalmente. Il filename e il titolo effettivamente salvato restano visibili nei dettagli del file. Un documento non completato, composito, con più spese, senza fornitore o mese valido mantiene la presentazione precedente. Le risposte di API precedenti senza i nuovi metadati restano supportate.

Non viene rinominato nulla nel database, nell'originale o negli export; nessun backfill o salvataggio automatico. Il titolo è un alias visuale, non un nuovo fatto estratto o una nuova proposta. Ricerca e ordinamento conservano il contratto precedente: titolo salvato e filename, non l'alias. Questo limite è esplicitato nei dettagli del file. Dettaglio documento e collegamenti che ricevono soltanto il vecchio contratto mantengono il titolo salvato; non vengono aggiunte letture per ciascuna riga per uniformarli.

## Proiezione e privacy

`documentRowContexts` include `invoiceMonth` soltanto se presente nella spesa personale attiva già selezionata per account/casa e documento accessibile. Se nullo, il campo viene omesso per conservare la forma precedente delle risposte. Le due letture aggregate per pagina restano le stesse: nessuna chiamata per riga e nessun endpoint nuovo. `name`, `organization.title`, filtro, conteggi, cursori e policy di visibilità restano invariati. Il dettaglio non acquisisce nuovi campi. Nessuna modifica di schema/migrazione, worker o conferme.

Il test DB verifica un mese proprio e uno diverso sulla spesa di un altro account: la riga espone soltanto i fatti personali. Dopo archiviazione la spesa sparisce dal contesto; rimuovendo il mese si torna alla risposta compatibile senza proprietà. Letture ripetute lasciano identici Document e DocumentOrganization. Restano invariati gli assert esistenti di privacy, fonte illeggibile, revoca e paginazione.

## Verifiche offline

- Nuovi test frontend: **24/24** (23 regole pure e un percorso nell'archivio). Solo completati, titolo personalizzato preservato, unico mese esplicito, più spese/parti e valori mancanti/invalidi, fornitore vuoto, tipo non bolletta e API precedente. Il percorso reale del renderer nel mock verifica alias, filename/titolo salvato, link con ID invariato, zero scritture e zero letture per documento.
- Backend ordinari **301/301**, lint/build verdi. **50/50 document-workflow-db** su cluster nuovo del runner, `tim25/dimora-offline-Bxg042`, poi fermato e conservato. Migrazioni applicate soltanto al cluster sintetico, nessuna connessione a DB/API/storage reale. Fonte backend invariata dopo le verifiche; nessuna suite DB in parallelo ad altri cluster.
- Prima mirata estesa 184/186: un test puro era stato eseguito mentre si completava il vincolo a una sola parte; il nuovo test archivio mancava del supporto alle famiglie nel simulatore. Corretto soltanto il setup della nuova fixture (capabilities, riepilogo e famiglia esplicita). Un ulteriore controllo troppo generico contava `/documents/trash` come lettura per documento: sostituito con il controllo sugli ID dei tre originali, mantenendo zero scritture e vietando anche letture file per riga. Nuovi casi finali24/24; nessuna asserzione preesistente, gold, soglia o timeout ridotti.

Typecheck/lint/build frontend finali verdi (build7,31s). Suite mock completa sulla stessa fonte definitiva efade50: **1461/1461 in141 file**,892,53s, un worker e retry0. Report JSON: zero fallimenti, saltati o todo. Nessuna prova browser/mobile rivendicata; app del lotto titoli non aggiornata. Il futuro rilascio richiede API e frontend della nuova fonte insieme per ricevere il mese nel contesto; nessuna nuova migrazione. Merge al committente.

## Rilascio separato della rilettura già approvata

La PR #53 è stata approvata e integrata a `44cd449e38755de2625389e02033ec053c98b17d`; hash remoto verificato, main invariato a cdbb318. Runtime detached `Dimora-V5-runtime-rilettura-20261025`, frontend identico all'albero collaudato della PR53 e backend identico a c749c18. Frontend ricompilato prima del cambio; sostituito soltanto il processo identificato con PID, creazione, command line e listener.

Frontend nuovo PID36500 su loopback5174; API10956 su3011 e PostgreSQL22924 su55432 preservati, con identità/creazione/listener controllati. Header API `roma-consolidata-c749c18-no-ai`, worker e guardie AI/email/rete invariati. Primo HTTP eseguito prima dell'apertura del listener: connessione rifiutata; ripetizione dopo readiness **16/16 HTTP statici/anonimi verdi**, inclusi nuovo comando/helper, traccia, worker PDF/OCR e API anonima401. Nessuna richiesta autenticata, upload, conferma, rilettura di originali, migrazione, query SQL o scrittura automatica durante l'attivazione. Nessun nuovo backup richiesto per questo cambio del solo frontend.

Evidenze nel task locale: `work/reread-release-build.log`, `-runtime-proof.json`, `-runtime-http-proof.json`, `-frontend.log` e metadata canonici `roma-runtime.json`/`schede-app-frontend-runtime.json`. Evidenze titoli: `work/completed-title-*.log/json` e log del cluster temporaneo; nessun contenuto personale nel repository.

## Consegna

[PR #54](https://github.com/Vincenzobrutto/Home_OS/pull/54) pronta per revisione verso il consolidamento, commit/push verificati con ls-remote e worktree pulito. Stato, roadmap, changelog, decisione e contratto aggiornati. Codice backend/frontend identico a efade50 dopo le verifiche; ultime modifiche soltanto documentali. Nessun merge del lotto titoli o attivazione implicita: richiede la decisione del committente e un futuro aggiornamento coordinato API/frontend, senza nuove migrazioni. Main e branch Claude preservati.

Evidenze: work/completed-title-new-green.log e -new.json (24/24), -checks-final.log, -backend-test.log (301/301), -backend-test-document-workflow-db.log e tim25/dimora-offline-Bxg042/tests.log (50/50), -backend-lint.log, -full.log e -full.json (1461/1461). I tentativi iniziali -focus.log/json e -new*.log conservano gli errori distinti; nessun timeout o controllo esistente è stato ridotto. Nessuna prova visiva/browser o nuova lettura OCR rivendicata.
