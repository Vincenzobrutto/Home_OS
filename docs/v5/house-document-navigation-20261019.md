# Documenti della casa e Rubrica — 19 ottobre 2026

Esplora la casa contiene Oggetti e impianti, Ambienti e Documenti della casa. Eliminato il collegamento generico Documenti su richiesta: rimane nella navigazione principale. Rubrica spostata sotto Spese nella spalla desktop e nella navigazione mobile a cinque voci, senza cambiare dati o permessi dei contatti.

Documenti della casa apre lo stesso archivio con collection=house e tutti gli stati visibili. Tipologie esplicite: Planimetrie, Pratiche edilizie, APE ed energia, Contratti, Impianti. Collegamento per tornare all'archivio completo. Nessun file, originale, spesa o contatto duplicato o modificato.

Filtri server prima della paginazione, sempre account/casa/versione/SHA e visibilità esistenti. house unisce building/energy/technical/contracts; floor_plans verifica il tipo floor_plan nelle parti classificate; contracts è una nuova raccolta reale con tipo contract. Gli altri filtri restano invariati e il cursore resta vincolato alla raccolta. Un documento misto è restituito una volta. Classificazione locale prudente dei contratti abitativi (locazione, affitto, compravendita, mutuo, comodato); una generica clausola di fornitura non diventa Contratto. Vecchi file Altro non riclassificati automaticamente: usare Modifica titolo e tipo. Nessuna migrazione o chiamata AI live.

Verifica: typecheck/build/lint; test document-search, classificazione, intake e frontend Casa/ricerca. Nel browser verificati la planimetria presente nella casa corrente con lo stesso ID nel filtro Planimetrie, apertura Rubrica, tre sole destinazioni in Casa e layout mobile. Nessuna fixture aggiunta ai dati reali.
