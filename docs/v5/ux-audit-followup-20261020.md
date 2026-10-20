# Correzioni dopo audit UX nel browser — 20 ottobre 2026

Quattro interventi autorizzati dopo il rapporto browser di Claude. Solo presentazione e letture delle API esistenti; nessuna migrazione o modifica dei dati reali.

## Comportamento

- Spese collegate a un documento: quando economy-v1 è disponibile, elenco canonico filtrato per documento e tutti gli anni, paginato. Le bollette mostrano il periodo di riferimento con la stessa funzione dell’elenco Spese; emissione separata. Nessuna data dedotta da titolo/file, nessun costo duplicato. Su servizi senza economy-v1 resta il percorso H3a; collegamenti alle caldaie invariati.
- Documento collegato dalla spesa: lettura autorizzata dei metadati con cache per account/casa, titolo personale confermato preferito al nome originale. In assenza di titolo leggibile, un nome composto solo da hash/UUID diventa «Documento collegato». Nessuna rinomina o scrittura; nome originale ancora consultabile nei dati del file. Applicato ai dettagli economy-v1 e H3a, senza cambiare gli snapshot storici.
- Metadati dell’archivio: tipi confermati delle parti (Planimetria, CILA, Ricevuta, ecc.), senza duplicati. La raccolta generica resta fallback in assenza di tipi riconosciuti. Una planimetria non viene più presentata come tipo «Pratiche edilizie»; classificazione, filtri server e archivio restano invariati.
- Bordo dei campi: token `--color-input-border` da `#9fb6c2` a `#708997`; contrasto sul bianco circa 3,68:1. Anello di focus esistente da 3 px preservato. Intervento mirato, non certificazione WCAG completa.

## Verifica

Browser reale desktop e viewport emulati 390×844 e 320×740: competenza dicembre nella bolletta, emissione distinta, stessa spesa collegata, titolo personale nel dettaglio spesa, filtro Planimetrie con tipo Planimetria, assenza di overflow nelle viste provate. Bordo letto dagli stili effettivi; focus da tastiera sul campo di ricerca visibile con outline da 3 px. Viewport ripristinato a fine verifica.

Nessun upload, salvataggio, archiviazione o chiamata AI nel browser reale. 53 test superati con backend simulato: collegamento trasversale agli anni senza scritture, titoli e fallback, documenti misti, suite Spese, ricerca documenti e periodo bollette. Due vecchie aspettative sul testo del totale Casa aggiornate per includere l’anno già presente nell’interfaccia. Build/TypeScript e lint frontend superati.

Evidenze locali nella chat: `outputs/ux-audit-followup-20261020/`; le immagini con suffisso `finale` mostrano il riepilogo definitivo della bolletta. Gli altri rilievi dell’audit restano fuori da questo intervento; la successiva decisione sulla selezione AI è descritta sotto.

## Selezione AI: esclusione dei completati

Decisione confermata dall’utente: i documenti con stato canonico `completed` non sono selezionabili nella compilazione AI multipla, anche in Tutti, raccolte e ricerche miste. Se tutti i risultati sono completati non compare l’ingresso alla selezione AI. Nessun nuovo messaggio o azione di rianalisi dal dettaglio: questo percorso resta da decidere.

Le caselle individuali e «Seleziona tutti» escludono i completati; il limite di 20 si applica ai soli documenti non completati mostrati. Una rilettura che rileva un documento appena completato lo esclude anche dal gruppo di un nuovo avvio. L’esito incerto di un avvio già inviato conserva invece il gruppo e la chiave autorizzati per il recupero idempotente, senza un secondo avvio. Stato ZIP e consultazione invariati; nessun cambio ai contratti API.

Verifica: 9 test simulati di workflow e upload/selezione, inclusi elenco misto, selezione totale, cambio stato da un’altra sessione e recupero con stessa chiave. Browser desktop e viewport 390/320: Tutti con cinque completati e ricerca della bolletta senza ingresso/caselle AI, vista Completati preservata, nessun overflow nelle viste provate. Nessuna modifica o analisi sui dati reali; il caso misto è provato nel simulatore perché la casa reale contiene solo completati. Evidenze locali: `outputs/ai-completed-exclusion-20261020/`.
