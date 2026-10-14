# Dimora Partner Agenzie — UX consolidata v0.1
Data: 13 ottobre 2026. Stato: decisioni di concept approvate; non codice implementato.
Riferimenti: MASTER_FUNCTIONAL_CATALOG_v0.2_20261012.md e DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md.

## Percorso end-to-end
1. **Incarico**: scheda preliminare gratuita; fascicolo operativo attivato esplicitamente secondo pricing ibrido a fascicolo/pacchetti o piano.
2. **Raccolta**: document-first e batch; checklist dinamica contestuale e collaborativa. Proprietario, amministratore e professionisti possono contribuire tramite richieste/link limitati anche senza account obbligatorio.
3. **Controllo**: l'AI segnala documenti mancanti, incongruenze possibili e proposte di associazione; distingue sempre ricevuto/classificato/da verificare e non certifica regolarità dell'immobile.
4. **Dossier acquirente**: tre livelli distinti: anteprima non documentale, dossier riservato con accesso graduato e destinatario autorizzato, Home Gift su consegna separata.
5. **Home Gift**: trasferisce copia selettiva di documenti **e memoria strutturata** (immobile, asset, documenti e storico ove condivisibili); no attivazione automatica di obblighi o scadenze non confermate. Manifesto di consegna con fonte/versione/inclusioni/esclusioni. No accesso perpetuo dell'agenzia.

## Acquisizione da link
**A approvata:** documenti caricati dal proprietario via link entrano **direttamente nel fascicolo** dell'agenzia; la ricezione NON è una verifica. Non sono automaticamente visibili all'acquirente. Provenienza, mittente/contesto richiesta, file originale e stato tracciati. Protezione link, upload security e retention da progettare.

## Checklist C+ (approvata)
- Base dinamica per caratteristiche immobile, tipo operazione e regole pertinenti; distinguere requisito verificato da consiglio operativo.
- Collaborativa: ogni richiesta assegnabile al soggetto pertinente, con stati da richiedere/richiesto/ricevuto/da verificare/completato/non applicabile.
- Apprendimento **per singola agenzia**: osservare documenti aggiunti ripetutamente e richiesti in fase avanzata; proporre aggiornamenti ai template **solo con approvazione esplicita dell'agente**. In V1 algoritmo semplice/rule-based sufficiente; nessun addestramento automatico implicito.
- Apprendimento aggregato **tra agenzie solo futuro**, subordinato a privacy, diritti sul dato, basi giuridiche, statistiche robuste e test dei benefici. Nessuna divulgazione dei dati di altre agenzie.
- Sezione «Da rivedere» centralizza proposte, discrepanze, errori e verifiche.

## Dossier a 3 livelli
**1 Anteprima:** presentazione immobile e metadati non riservati. **2 Dossier riservato:** documenti selezionati, destinatario identificato e autorizzato, permessi granulari, link con scadenza/revoca e controllo accessi. **3 Home Gift:** copia selettiva verso nuova Home, distinta da consultazione e download precedenti. La disponibilità di un documento non implica automaticamente diritto a trasferirlo.

## Account del nuovo proprietario
- Agenzia inserisce email destinatario per **inviare invito**, non per creare account attivo automaticamente.
- Il destinatario verifica email, accetta condivisione ed eventualmente crea account Home Free; se già registrato, accede e importa/collega selettivamente evitando duplicati.
- Non rivelare all'agenzia se l'email è già registrata (protezione anti-enumerazione).
- Gestire invito inviato/accettato/scaduto/revocato e possibilità di sollecito appropriato.
- L'email verificata non prova la titolarità immobiliare; verifica permessi/titolo e data di efficacia secondo trattamento legittimo.
- Stesso principio per eventuale consegna al proprietario attuale a prescindere da vendita.

## Wireframe da produrre / test
Portafoglio pratiche; scheda incarico; checklist con richieste e stati; upload da link; revisione anomalie; configurazione accessi dossier; 3 viste acquirente; Home Gift con email+manifesto; invito/account nuovo o esistente/scaduto.
Errori: file non leggibile, link scaduto, documento sensibile, destinatario non autorizzato, conflitti di versione, account già in possesso della medesima casa.

**Non deliberati**: listino e cap per fascicolo, accordi professionali, integrazioni CRM specifiche, automatismi normativi certificanti.
