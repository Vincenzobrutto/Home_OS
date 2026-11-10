# Registro delle verifiche — UI indipendente

30 ottobre2026, ciclo diurno fino18:00Europe/Rome. Ipotesi di prodotto da validare con un’agenzia reale. Nessuna modifica della demo Alessio.

## Implementato

`FindingsWorkspace` e `agencyFindingsApi` nella cartella frontend-v5/src/agency-review, su GET/POST findings già esistenti. Nessun cambio backend, router, AppModule o workspace planimetrie.

Vista unica dei quesiti visibili nella pratica:

- Confronti fra fatti: unità, ambito/soggetto fornito dal contenitore, riferimento temporale, valori/prove e stato di conferma. Senza etichetta autorizzata l’ambito resta da identificare, non viene inferito da un nome storico.
- Osservazioni manuali successione/distribuzione interna/altro, con descrizione e prove. Nuova osservazione richiede unità e tipo espliciti; visibilità iniziale Solo io, passaggio agli assegnati deliberato.
- Stato aperto, verifica registrata o da rivedere, coerente con risposta server. Nessuna chiusura all’ingresso o dichiarazione di conformità.
- Risoluzione con esito e motivazione obbligatori, revisione pratica e fingerprint correnti. Confronti non valutabili/osservazioni superate non chiudibili; stato risolto non consente nuove decisioni fino alla riapertura server.
- Documento tecnico ricevuto richiede prova effettivamente selezionata, massimo5. Nessun flag “ricevuto” senza documento; se il contenitore rimuove una prova, la chiusura diventa non inviabile.
- Storico di esiti/motivi/prove con indicazione della decisione ancora corrente o da rivedere. Non ripristina decisioni private assenti nella vista server.

Gli originali non sono aperti da URL nel contenuto: callback con descrittore prova esatto, da autorizzare nel contenitore. Le opzioni di prova, unità ed etichette devono provenire dal contesto server autorizzato; il componente non le inventa e non attesta la validità della relazione tecnica. Citazioni e note sono testo React.

## Concorrenza e permessi

Mutazioni senza promozione ottimistica.403/401/404 nascondono registro e controlli;409/source_changed congelano fino a ricarica;422 conserva input correggibili. Dopo servizio/esito incerto, solo retry manuale dell’esatto payload/key oppure ricarica. Il payload è clonato prima dell’async: mutare le opzioni del contenitore non altera una richiesta in attesa.

Scope/porta API catturati dal client; owner e generazione della vista scartano risultati tardivi. Form readonly e fonti superate disabilitati anche al submit. I controlli UI non sostituiscono membership/grant e verifiche del backend esistente.

## Verifiche

20nuovi test (17componente+3client), gruppo finale **38/38** inclusi18precedenti dati/fonti. Typecheck app e lint mirato verdi. Primo gruppo35/35, poi tre casi aggiunti per readonly corrente, prova rimossa e confronto non valutabile; aggiunta etichetta esplicita dell’ambito nei confronti e verificato nuovamente38/38.

Casi: motivo/esito espliciti, fingerprint/CAS, prova tecnica obbligatoria, riapertura e storico, readonly/stale, retry clonato dopo mutazione delle props,409/reload,403/privacy, assenza di punti non equivalente a completezza, nuova nota privata e scelta unità/tipo, risposta tardiva al cambio scope, massimo5prove, confronto proposte/confermati e ambito senza inferenza. Client con trasporto reale su fetch finto: account/sessione/CSRF/idempotenza e denial senza fallback.

Browser su harness sintetico isolato, desktop/375px: parete interna, documento tecnico non inviabile prima della scelta prova, motivo, salvataggio simulato, storico con fonte, nota manuale successione e ricarica. Viewport375/client360/scroll360, nessun overflow orizzontale e0errori console osservati. Confronti verificati nei test, non nello stesso esercizio browser. Screenshot outputs/Dimora-verifiche-desktop.png,375.png,375-storico.png e375-successione.png. Viewport ripristinato, tab propria chiusa; server proprio34879 fermato e assenza listener verificata. Nessun servizio del collaudo altrui toccato.

Harness agency-findings-preview.html/__preview__/findings.tsx con dati e API in memoria dichiarati nel banner, non importati dal prodotto. Il browser non dimostra persistenza DB, chiamata AI o uso del telefono fisico. Backend invariato: non ripetuti test DB o regressioni backend già concluse.

## Limiti e prossimo passo

Componente/client non ancora montati nella navigazione. Mancano creazione guidata dei confronti fra fatti, caricamento delle prove dentro questo pannello e visualizzazione di autori/date nello storico. Le note e le risoluzioni sono già supportate dal contratto server, ma l’esercizio browser usa un port sintetico.

Prossimo incremento: persistenza dei risultati dell’adapter atti e binding umano esplicito verso soggetti/unità, con privacy, invalidazione e idempotenza. Poi cablaggio delle viste di revisione nel percorso pratica, senza inventare modello incarico approvato, identità, diritti o quote. Nessuna nuova AI reale, file personale, installazione, merge o deploy.
