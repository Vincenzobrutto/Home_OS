# Pagina unica Documenti — 18 ottobre 2026

Implementata dopo l’audit UX/UI approvato: /documenti resta il punto di aggiunta, consultazione e completamento.

- Aggiungi documenti apre lo stesso uploader nella pagina, con selezione rimovibile prima del trasferimento. Consenso AI per singolo documento, senza avvii automatici da questo ingresso.
- L’elenco canonico conserva anche gli originali non ancora analizzati; manuale e AI aprono la revisione esistente sotto la scheda. Anteprima originale inline.
- Tutti/Da completare/Completati sono filtri server prima della paginazione. Fattura/bolletta classificate ma non confermate restano incomplete. Una nuova bozza riapre il lavoro; un’incertezza AI precedente a una conferma non lo riapre.
- Recupero del caricamento parziale con lo stesso manifest e le stesse chiavi; i file già acquisiti non vengono inviati di nuovo.
- Elimina controlla prima le dipendenze e richiede una scelta esplicita. Rimuove fonti private proprie inutilizzate e tutti i loro riferimenti di caricamento. Fonti già analizzate, organizzate, condivise o collegate sono conservate con spiegazione. Non implementato cestino per tali fonti.
- Ricerca/raccolte e PDF di esempio sono richiudibili.

Verifica: build frontend/backend e lint verdi. Test mirati della nuova pagina (manuale e AI senza invio, filtro unico, scelta/rimozione locale, eliminazione bloccata, recupero parziale), ricerca H2 e uploader/automatic-intake esistenti. Test PostgreSQL dedicato: filtro prima della paginazione e firma cursori, nuova revisione, fonte con vecchia incertezza, rimozione atomica multi-riferimento, replay, ownership/versione/viewer. Corrette le fixture e le aspettative della ricerca dopo la chiusura dei filtri; nessun errore di prodotto nascosto.

Browser reale: Documenti in Appartamento Roma, filtro Da completare, aggiunta inline e controllo eliminazione senza confermarla. Verifica responsive 390x844 e 320x760; categorie in una striscia scorrevole quando aperte. Screenshot in outputs/document-workspace-20261018/. Nessun documento personale inviato, modificato o eliminato, nessuna analisi a pagamento. API locale riavviata, nessuna modifica env, quote, firewall o schema.

Limiti: vecchi ingressi dei lotti/dettagli restano compatibili; la revisione richiede ancora Salva e organizza o Decidi più avanti per conservare modifiche. Cestino delle fonti già utilizzate e convergenza dei link legacy annotati nel backlog.
