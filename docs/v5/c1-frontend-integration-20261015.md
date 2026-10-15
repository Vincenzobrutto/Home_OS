# C1a — integrazione conclusa nel prodotto locale, 15 ottobre 2026

## Risultato e provenienza

Consegna Claude e80c132 integrata come024526b, report/screenshot8b8d9a4 come0bdcca4, senza sync né sovrapposizione durante la lavorazione. Backend9d305a2 già montato nel servizio V5 locale3001; frontend5174. Sei rotte differite, ingresso da Casa/documento e consegne ricevute a livello account, senza quinta tab. C1a consegna solo originali propri selezionati: non estende membership, ricerca, M2 o dati economici e non include ancora schede tecniche.

## Correzioni di integrazione

- Un file arrivato dopo logout/cambio account o smontaggio della pagina non viene salvato dal browser. Controllo sessione corrente e componente ancora attivo prima di usare il blob.
- 403 al download: dettaglio in cache azzerato e riletto; nessun titolo dell'originale nel messaggio di errore o nella lista residua.
- Liste del mittente e picker non mostrano dati precedenti dopo una risposta di autorizzazione negata.
- Harness: attesa del redirect definitivo dopo login, evitando che HomeEntry sovrascriva la rotta del test. Le due nuove regressioni preparano la consegna tramite wizard UI; una prima fixture navigava prima della stabilizzazione della pagina. Corrette le attese, senza aumentare timeout o indebolire le asserzioni.

## Verifiche Codex

**331 test frontend verdi in28file**, comprendono15 C1 (13Claude+2regressioni Codex). Build TypeScript/Vite e lint verdi. Log workspace: outputs/Dimora-V5-C1-frontend-test-final.log, frontend-build.log e frontend-lint.log con prefisso Dimora-V5-C1-. Prima suite327/329: due attese di navigazione della fixture; correzione e successiva suite completa331/331. Controllo TypeScript ha inoltre intercettato due opzioni `exact` non supportate dalle query Testing Library dei nuovi test, rimosse prima della build finale.

Entry finale487,71kB, gzip148,71kB; baseline precedente485.144byte/gzip148.155byte. La maggior parte di C1 resta nei chunk differiti (SharingPages26,96kB); nessuna nuova dipendenza o audit generico. Backend già verificato:105offline (includono9C1),16risultati HTTP/DB C1,29regressioni documenti/economia. Non rieseguiti senza modifiche backend; vedi rapporto backend, non sommare i nove test due volte.

### Browser contro API/DB reali

Due nuovi account sintetici `c1-sender-…@example.test` e `c1-receiver-…@example.test`, casa separata e PDF sintetico gas.pdf (966byte) caricati tramite normali endpoint sessione/CSRF/registrazione/upload. Nessun accesso diretto al DB per preparare stati C1; tutte le transizioni seguenti tramite UI reale, nessun mock o localStorage preparato:

1. Casa → Condivisioni → Nuova: nessun file selezionato automaticamente; scelto il solo originale privato proprio.
2. Persona esterna → durata7giorni → manifesto server → conferma puntuale del file → creazione. Codice monouso mostrato solo allora, non nell'URL.
3. Logout/login come destinatario senza case: Consegne ricevute accessibile; codice e consenso esplicito → solo confronto, nessun nome/file/indirizzo dell'originale.
4. Logout/login mittente: stesso confronto su entrambi gli schermi, account dichiarato etichettato non verificato, conferma disattivata prima della casella. Conferma → invito ancora da accettare.
5. Logout/login destinatario: prima di Accetta nessun titolo; dopo Accetta un solo file scaricabile, nessun accesso alla casa. Download reale salvato in Downloads/Documento sintetico C1.pdf, SHA256 identico all'originale: `0ebb316b1e5dba5a6e038b68bcf3ea488d3cb167179a15f01dbfd6258fbc2acb`. Ricarica del deep link conserva l'accettazione.
6. Mittente revoca tramite dialogo: avvisi su copie già scaricate e diritti M2 indipendenti. Destinatario riapre lo stesso invito: **Non più disponibile**, senza titolo o pulsante download.

Fixture metadata: outputs/Dimora-V5-C1-browser-fixture.json, homef375f8f0-96ed-4dfe-a7dd-5d24f7927e7a, shareb4d45bbf-b9a7-4747-99ae-5d4b20bbb3f6. Evidenze outputs/Dimora-V5-C1-ricevuta-reale.png e Dimora-V5-C1-revoca-reale.png. Account/casa/documento sintetici conservati per riesame; sessione browser lasciata sul destinatario sintetico. Dati dell'account Prova M4 preservati, suo accesso chiuso tramite normale logout; non recuperate password esistenti.

## Otto punti sollevati da Claude

1. Confermato nel backend e browser: recipient diventa la persona abbinata dopo approvazione.
2. GET destinatario conserva comparison durante claim valido: ricarica gestita dal contratto.
3. Claim scaduto: mittente torna awaiting_pairing e può ruotare esplicitamente; destinatario unavailable. Nessun grant automatico.
4. Origine fuori pagina: mantenuta indicazione «Carica altri». Filtro dedicato rinviato, non bloccante.
5. Istanti degli eventi in UI rinviati; non introdurre ricevute di lettura.
6. Avviso M2 generico nel dettaglio/revoca, senza dedurre visibilità dal nome del file.
7. 503 POST trattato come esito ignoto: retry esplicito con stessa chiave/body; ledger server impedisce duplicati.
8. 404 capabilities può rappresentare servizio precedente senza C1. Nel servizio corrente endpoint montati; 403 resta indisponibilità, non fallback dati.

## Limiti e prossimo lavoro

Prova browser propria su desktop; mobile320/390 e ulteriori errori sono coperti dal report Claude con API simulata, non dichiarati riprodotti qui contro API reale. Race download/logout verificata nel test simulato con risposta ritardata; autorizzazione/concorrenza server nei test HTTP/DB reali. Non è un audit esaustivo di sicurezza o una dichiarazione WCAG. Nessuna email/SMS, invito a persona reale, chiamata Anthropic, modifica.env, quota AI, installazione, push o main. Dati reali/legacy preservati.

Su richiesta del committente predisposto incarico separato per Claude: **preparazione Agenzie**, solo report frontend-v5/docs/AGENZIE-PREPARAZIONE-20261015.md, nessun runtime/contratto. File workspace outputs/Dimora-V5-incarico-Claude-Agenzie-preparazione.md. L'avvio resta nell'app Claude a cura del committente; non dichiarato in esecuzione finché non confermato.
