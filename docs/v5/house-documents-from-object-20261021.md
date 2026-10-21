# Documenti della casa e fatture condivise

Aggiornato il 21 ottobre 2026. Dalla scheda di un oggetto generico attivo: **Altre azioni → Sposta in Documenti della casa**.

## Comportamento confermato

La conferma **Sposta e archivia scheda** conserva tutti i documenti e le fatture nella vista della casa, archivia soltanto la scheda scelta e la toglie dalle stanze. Gli originali rimangono unici. La scheda è ripristinabile dagli archiviati, con stanza da riassegnare.

**Gli altri oggetti e i loro collegamenti restano invariati.** Esempio: archiviando l’impianto elettrico nella casa, il videocitofono resta attivo e continua a mostrare le stesse fatture di acconto e saldo. Le fatture sono consultabili sia nella casa sia dal videocitofono, senza copie e senza nuove spese. Il riepilogo mostra “Collegamenti che rimangono”. Questa regola corregge e sostituisce la precedente rimozione dei riferimenti ad altre schede.

Si rimuovono soltanto i riferimenti personali alla scheda archiviata. I costi attribuiti ad altre schede non cambiano, neppure nella versione o nella storia. Per i soli costi scollegati dalla scheda corrente si aggiorna la versione e si registra il cambio di attribuzione, mantenendo importo, titolo, date, fornitore, provenienza e documento.

La classificazione corrente Fattura/Ricevuta o tecnica resta invariata; se manca un’organizzazione corrente, si registra una scelta manuale generica in Altri documenti della casa. Annulla non scrive. Dopo la conferma si apre Documenti → Della casa con esito.

## Archivio unico e viste sovrapposte

Migrazione additiva `20261021190000_document_house_membership`: `DocumentOrganization.houseDocument` booleano, default false. Lo spostamento lo imposta a true per le sole fonti personali selezionate, con versione/SHA correnti; non deriva l’appartenenza dalla rimozione dei collegamenti agli altri oggetti.

La vista casa comprende organizzazioni correnti con appartenenza esplicita **oppure** senza riferimenti personali leggibili. La vista oggetti continua a includere i documenti collegati. Le due viste possono sovrapporsi: i conteggi non sono partizioni, e Tutti include ogni file una sola volta. Gruppi, ricerca e paging applicano la medesima regola. Nessun ampliamento della visibilità dei file o dei derivati altrui.

Modificare titolo/tipo della stessa fonte conserva l’appartenenza esplicita; una fonte di nuova versione/SHA richiede una nuova scelta. La migrazione inizializza false e non riclassifica documenti esistenti.

## Sicurezza e limiti

Sessione, Origin/CSRF, contesto account, membership edit e diritti sulle fonti rivalidati. Snapshot del riepilogo vincolato a scheda, posizione, collegamenti, costi, organizzazioni e versione/SHA. Conferma atomica/idempotente sotto lock G1, fonti bloccate e storia della sola scheda interessata. Retry della risposta persa con stesso corpo/chiave, senza ripetere l’operazione.

Tutti i documenti devono essere disponibili e inclusi (massimo 50). Attività o costi senza documento residui, riferimenti nativi a caldaie, elaborazioni pendenti/incerte e fonti non consultabili restano bloccati. Nessuna nuova AI, copia, cancellazione o fusione di schede. Non ripristina automaticamente vecchi collegamenti eventualmente rimossi da conferme precedenti.

Per nuove richieste `archiveObject:true`; `detachRelatedObjects:true` è rifiutato. I replay storici già confermati restano compatibili e non effettuano nuove rimozioni.

## Verifiche

Fixture isolate: spostamento condiviso, archivio/stanze, stessi file in casa e oggetti, una riga in Tutti, classificazioni conservate, costi e collegamenti delle altre schede invariati, token scaduto, fonte di nuova versione esclusa, fonti private, riferimenti nativi, viewer, CSRF e replay. Regressione viste e organizzazione dell’acquisizione, build/lint V5 e test UI con backend simulato.

Browser desktop/mobile con due fatture sintetiche condivise e videocitofono conservato. Dati reali controllati in sola lettura: le due fatture risultano ancora collegate al videocitofono. Nessuno spostamento reale eseguito durante la correzione.
