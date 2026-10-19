# Catalogo Oggetti e impianti — 19 ottobre 2026

## Comportamento implementato

Proposta approvata: schede compatte cliccabili, due colonne desktop e una su mobile, con icona di categoria, nome, marca/modello, ambienti e una data utile. Vista Elenco alternativa; ricerca sempre visibile per nome, marca o modello; chip ambiente con conteggi completi, filtri tipo/stato e ordinamento Nome A–Z o Più recenti. Non crea ambienti o oggetti di esempio. La casa corrente mostra soltanto gli ambienti effettivamente confermati: le proposte da planimetria non diventano filtri fino alla conferma.

Nessun sistema foto nuovo: le immagini del mockup erano illustrative. Le schede reali usano icone Phosphor, senza attribuire foto arbitrarie ai prodotti. Scadenze da attività aperte realmente collegate, prioritarie entro 30 giorni o se scadute; altrimenti garanzia confermata, poi attività futura. Garanzia scaduta è descrittiva, non una manutenzione inventata.

Il ritorno dal dettaglio, tramite link o Indietro, conserva ricerca, ambiente, tipo/stato, ordine, vista, pannello filtri, pagine caricate, focus e posizione. Stato di ritorno nella cache privata TanStack Query per account/casa/URL; nessun localStorage. Vale nella sessione/cache corrente, non è persistenza garantita dopo chiusura del browser. Logout/cambio contesto isolano le cache.

## API e sicurezza

GET objects aggiunge sort=name|recent (default recent per compatibilità). Il frontend usa name. Ricerca letterale Unicode su nome/marca/modello, applicata sul server prima della pagina; marca e modello rispettano origine, visibilità, versione e SHA delle fonti. Conteggi e ricerca non rivelano campi privati revocati. Le caldaie mantengono identità e policy precedenti.

Risposta additiva: total, today Europe/Rome, facets {all,unplaced,rooms:[{id,name,count}]}, items[].summary {brand,model,nextActivity:{title,dueDate}|null}. Total considera tutti i filtri; facets considera stato/tipo/ricerca ma ignora la collocazione selezionata per consentire il cambio ambiente. Multiambiente contato una volta nel totale e in ciascun ambiente pertinente. Stanze attive, più eventuale stanza archiviata selezionata. Nessun totale economico nuovo.

Keyset DB per nome normalizzato/casefold ICU + kind/id o data + kind/id; cursor legato anche all'ordine e ai filtri, limite massimo 2048 caratteri. Cursor precedenti del catalogo da ricaricare. Nessuna migrazione/schema, modifica dei documenti, costo AI o consumo budget.

## Verifica

- Backend build/lint; 20 test unitari, DB e HTTP pertinenti passati: privacy/revoca, accessi/CSRF, compatibilità collegamenti, 46 record su più pagine, ricerca modello oltre pagina 1, fonte revocata, caratteri wildcard letterali, conteggi multiambiente e cursor scope.
- Frontend build/lint; 28 test mirati passati: catalogo/dettaglio, ricerca, filtri, permessi, revoca/cache e segnali delle schede.
- Browser reale desktop 1440×1024, mobile 390×844 e 320×740: tre oggetti personali correnti, ricerca Rivelia, schede/elenco e ritorno contestuale. Fixture isolata di 48 oggetti: conteggi 48/12 per ambiente, caricamento 40, ritorno alla scheda 36 con scrollY 2540 e focus identici. Mobile Indietro conserva filtro Cucina, Elenco e focus. Fixture rimossa integralmente; nessun dato reale modificato. Console senza errori/warning nel collaudo finale. Nessun overflow pagina a 390/320; chip scorrono solo nel proprio contenitore.
- Confronto con proposta definitiva e catture effettive in frontend-v5/design-qa.md. Evidenze sotto outputs/dimora-v5-completo/oggetti-implementation nella chat del 18 ottobre.

## Limiti e prossimi incrementi

Foto reali caricabili e personalizzazione icona sono fuori scope. Non confondere icona categoria con riconoscimento certo del prodotto. Nessuna dichiarazione WCAG completa o prestazione certificata su archivi enormi: verificata paginazione con decine di oggetti. Il dettaglio esistente resta il punto per modifica, documenti, spese e attività.

## Scelta stanza nel dettaglio — 19 ottobre 2026

Nel box Dettagli è ora disponibile il menu Stanza con ambienti attivi della casa e Salva stanza esplicito. Da collocare rimuove l’assegnazione. Più ambienti apre il selettore multiplo esistente nello stesso box; selezionare una sola stanza su un oggetto multiambiente sostituisce esplicitamente la posizione, con avviso. Ambienti archiviati assegnati visibili ma non proposti come nuove assegnazioni. Carica altre stanze mantiene accessibili pagine successive; stato vuoto con Gestisci ambienti, errori senza fallback inventato. Solo oggetti attivi modificabili; stessi CAS/idempotenza/retry G1, nessun cambio API/schema. Focus e conferma restano vicino al menu dopo il salvataggio.

Verificati browser desktop e mobile 390 px: opzioni reali presenti; salvataggio Studio su fixture isolata, persistenza dopo ricarica e ritorno Da collocare. Fixture rimossa, nessuna collocazione reale scelta al posto dell’utente. 23 test frontend del percorso passati (22 suite completa più nuovo caso vuoto mirato), build/typecheck/lint riusciti.
