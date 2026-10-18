# Documenti — correzioni UX 1–4, 18 ottobre 2026

## Perimetro approvato e comportamento

- «Conserva solo il documento» salva titolo e tipo senza nuovi oggetti, spese o contatti. Default per compilazione manuale nella revisione unica; le proposte AI restano inizialmente in revisione. La scelta nasconde gli articoli fittizi e le richieste di dati non pertinenti; passando alla revisione si ritrovano i campi.
- Il salvataggio dei metadati non smonta più la revisione quando il tipo diventa un documento della casa. La conferma chiude la bozza corrente; solo l’esito server confermato mostra «Documento organizzato» e l’accesso ai Completati. Se altre bozze o elaborazioni richiedono attenzione, il server mantiene il relativo stato.
- Dati mancanti elencati per articolo (nome, collegamento, importo/data, doppioni e sostituzione campi), titolo/tipo/consenso metadati e spesa della casa (titolo, categoria, totale, importo, data e doppioni). Le indicazioni portano al campo o alla sezione. I vincoli cumulativi sulla fattura rimangono espliciti nel riepilogo.
- «Vedi dettagli» e «Apri documento» portano il contesto di vista/ricerca/filtri al dettaglio. Il collegamento di ritorno lo ricostruisce solo per lo stesso account. Non introduce ripristino della posizione di scroll o delle pagine aggiuntive già caricate.

## API e protezioni

Esteso il flag esistente documentOnly: un’organizzazione personale sulla stessa versione/SHA consente la chiusura delle proposte aperte senza nuove risorse. Scelte miste, spese e totale manuale rifiutati. Compatibilità conservata per documentInfo senza articoli/spese con contatti esplicitamente selezionati nel precedente percorso V11. Gli elementi già confermati rimangono invariati. Membership, visibilità della fonte, versione/SHA, transazione e ledger idempotente restano obbligatori. Nessun endpoint, schema o migrazione aggiunto.

Una conferma già pendente mantiene corpo e chiave originali, anche se il nuovo default manuale sarebbe «solo documento». Nessun reset del ledger. Il salvataggio metadati e la conferma della bozza rimangono due operazioni recuperabili: l’archiviazione da sola non prova la conclusione dell’intero percorso.

## Verifiche eseguite

- Backend build TypeScript riuscita.
- Frontend build TypeScript/Vite e lint dei file modificati riusciti.
- 78 test frontend: UnifiedReview, OnboardingPage, DocumentCompilationActions, HouseExpenseProposal, SingleScreenClassification e documentWorkflow. Esecuzione mock con un worker; il test di navigazione attende query/render e usa timeout adeguato al flusso completo.
- 41 test backend: object-onboarding.integration, document-only.integration e document-workspace.integration; DB dedicato, parser PDF reale e provider finto. Zero invii AI live. Coperti rifiuto della fonte non organizzata/obsoleta, scelte miste, zero creazioni canoniche, Completati prima del paging, replay, permessi e regressioni oggetti/spese/contatti.
- Browser locale, casa COLLAUDO V2 con soli documenti sintetici: recuperata la conferma dell’audit con la stessa chiave; nuova fixture audit-solo-documento.pdf caricata e salvata come Regolamento condominiale. Completato visibile, originale disponibile, nessuna spesa o contatto collegato. Checklist tipo porta il focus alla select; Vedi dettagli e ritorno preservano workflow=completed e q=audit.
- Screenshot nella cartella outputs/documenti-fix della chat: solo-documento.png e completati.png. Nessuno screenshot personale nel repository.

## Fuori perimetro

Ricerca e mobile sono la prossima fase richiesta, da proporre prima di implementare. Rimangono aperti persistenza dei campi non salvati, cestino/ripristino e OCR/qualità estrazione. Nessun deploy pubblico o modifica alle tre differenze legacy locali.
