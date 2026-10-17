# Documenti: organizzazione semplificata V2

Approvata dal committente il 16 ottobre 2026 dopo la prova del mockup `mockup-documenti-semplificato.html`. Prevale sui passaggi salva scelta → riepilogo → conferma della specifica V1; restano validi permessi, originali, limiti, fonti, privacy e idempotenza V1.

## Percorso approvato

Un ingresso Carica documenti per uno o più file, selezione da cartella o trascinamento. Dopo ogni acquisizione riuscita parte la sola lettura locale disponibile, senza trasmettere documenti e senza un pulsante Analizza. Aggiungi documenti sotto l'elenco; i risultati precedenti restano visibili. Un provider esterno non è autorizzato da questo automatismo.

Area di lavoro unica: Da rivedere, Più tardi, Completati. Ogni riga mostra stato e, quando disponibili, titolo, tipo e destinazione proposti. Nel singolo Rivedi apre originale e campi; Conferma e organizza applica direttamente. Nessun Salva scelta per dopo, stato Scelte salvate o riepilogo supplementare.

Nel multiplo le proposte chiare sono selezionabili direttamente, con caselle inizialmente vuote. Organizza N documenti selezionati applica soltanto queste scelte senza altro dialogo. Titolo/tipo/destinazione devono essere leggibili prima di selezionare. Reset selezione dopo reload, cambio contesto o modifica delle versioni; nessuna selezione nascosta da filtri. Seleziona disponibili è sempre una scelta esplicita.

Non sono selezionabili in gruppo copie, organizzazioni già confermate, documenti da classificare manualmente, proposte ambigue, rinviati, fonti indisponibili, analisi o scritture in corso, esiti incerti e completati. Questi casi richiedono revisione individuale. Un errore di un elemento non annulla gli altri: mostra esiti per file e lascia recuperabili i non applicati.

## Eccezioni e modifiche

- Copia: scelta inizialmente assente fra Mantieni invariato e Aggiorna. Il mantenimento completa l'elemento senza riclassificare, creare un originale o un collegamento; esito Mantenuto invariato. Aggiorna conserva un solo originale e richiede consenso se cambia dati confermati.
- Conflitto: DATI ATTUALI / Già confermati da te distinti da PROPOSTA DAL DOCUMENTO. Consenso alla sostituzione non preselezionato, invalidato da modifica della proposta o della versione corrente.
- Scansione senza testo: titolo e tipo manuali, originale apribile, pagine facoltative. Nessuna fonte o certezza inventata. SCIA e agibilità appartengono a Pratiche edilizie.
- Decidi più avanti persiste lato server e resta riprendibile dopo reload in Più tardi. Chiudere una modifica chiede se scartare i cambiamenti effettivi; non li conserva silenziosamente.
- Correzione dal documento già in archivio, senza ricaricare il file o ritrovare il vecchio caricamento. La modifica del titolo personale non rinomina l'originale.
- Su mobile campi e decisioni prima dell'anteprima apribile; azione primaria raggiungibile, nessun overflow a 320 e 390 px.

Classificare Condominio non condivide. Originali Solo io; nessun oggetto o costo creato implicitamente. Ricevute possono aprire il percorso assistito separato. Altro è una classificazione legittima, distinta da una decisione ancora da prendere.

## Contratto diretto (integrazione Codex)

POST `homes/:homeId/document-intake/batches/:batchId/organizations`, header Idempotency-Key. Corpo:

```ts
{
  expectedVersion: number; // versione lotto osservata
  mode: 'single' | 'multiple';
  items: Array<{
    itemId: string;
    expectedVersion: number;
    expectedOrganizationVersion: number; // 0 se assente
    replaceOrganization: boolean;
    selection: OrganizationSelection; // action organize soltanto
  }>;
}
```

Single contiene esattamente un elemento; multiple da 1 a 20. Nel multiplo il server accetta soltanto proposte locali pronte, non duplicate, non rinviate, non già organizzate, con titolo/parti uguali alla proposta mostrata e destinazione casa. La modifica o il collegamento a oggetto richiede revisione individuale. Non basta una proposta per applicarla: serve sempre questa richiesta esplicita.

Risposta come le conferme V1: `{batch, results: {[itemId]: {state:'confirmed'} | {state:'rejected',code}}}`. Ricevuta GET `.../organizations/:key`. Ogni applicazione e il relativo risultato sono atomici per documento; chiave stabile e corpo immutabile per recuperare una risposta persa. GET mancante è distinto da operazione registrata ma parziale. Solo dopo riconciliazione si ripete lo stesso POST, mai una nuova chiave per un esito ignoto. Fonte/permessi/versioni/consenso verificati nuovamente sul server.

La revisione V1 resta per rinvio e compatibilità; `saved` preesistente resta interno e torna Da rivedere, mai Completato senza applicazione. Nessuna migrazione o cancellazione dei vecchi caricamenti.

## Contratto componenti Claude → container Codex

In `model.ts` aggiungere `OrganizeBatchPayload = { batchId: OpaqueId; expectedVersion: OpaqueVersion; mode: 'single'|'multiple'; items: ReviewPayload[] }`. Per la chiamata diretta expectedOrganizationVersion e replaceOrganization devono essere valorizzati (0/false ammessi).

Props additive opzionali `onOrganize?(payload: OrganizeBatchPayload): Promise<ConfirmBatchOutcome>` e `onRecoverOrganization?(payload: OrganizeBatchPayload): Promise<RecoverBatchOutcome>`. Il payload contiene anche batchId, escluso dal corpo HTTP dal container. Il container conserva la chiave stabile. Nessuna scrittura simulata se callback assente: azione disabilitata con motivo. Mantieni le props precedenti per compilare il container durante il lavoro parallelo, senza esporre il vecchio percorso nell'interfaccia V2.

Rinvio usa onSaveReview con action defer; Mantieni copia usa onResolveDuplicate. Esiti incerti bloccano ulteriori scritture sull'elemento, offrono recupero e non mostrano successo. Fonte persa e cambio account/casa invalidano anteprima, selezione e contenuti sensibili in cache.

Arbitrato d'integrazione: anche Mantieni i dati attuali su un conflitto stored usa onResolveDuplicate (nome conservato per compatibilità), con stesso endpoint di mantenimento e controlli fonte/organizzazione corrente. Il completamento è Mantenuto invariato, selection nulla, titolo attuale conservato. Nessuna riscrittura dell'organizzazione e nessun nuovo collegamento. Modifica titolo e tipo dal dettaglio prepara una revisione dell'originale esistente, senza upload.

## Criteri di chiusura

Test componenti e HTTP/DB sintetici su singolo, selezione parziale multipla, rinvio/reload, copia invariata/aggiornata, consenso mancante, versione cambiata, sorgente revocata, errore parziale, risposta persa e replay. Build/lint mirati; browser sull'app integrata con dati sintetici, desktop e mobile. Le prove del mockup non valgono come collaudo del prodotto. Nessun provider a pagamento per questa implementazione.


## Revisione UX successiva

Il 17 ottobre è approvata la specifica complementare [onboarding V3](onboarding-simplified-spec-v3.md), con lista articoli compatta e revisione dedicata. Permessi, organizzazione documenti, consenso e recuperi V2 rimangono validi. Stato della prima integrazione e limiti in [rapporto V3](onboarding-v3-implementation-20261017.md).
