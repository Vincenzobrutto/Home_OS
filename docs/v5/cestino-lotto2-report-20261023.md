# Cestino — lotto 2, pagina e azioni nel frontend: report, 23 ottobre 2026

Lotto Claude sul branch `claude/cestino-frontend-20261023`, partito dalla punta del lotto 1 `a132696`. [Piano](cestino-lotto2-piano-20261023.md) approvato il 23/10 con due scelte: l'avviso «Annulla» resta finché lo chiudi o cambi pagina; la riga sul fornitore AI viene mostrata. Solo `frontend-v5` e documentazione; backend non toccato.

## Cosa fa

- **Elimina → cestino.** «Altre azioni › Elimina» apre «Spostare nel cestino?», con l'anteprima del server (`GET documents/:id/trash`). La finestra dice che il documento resta 30 giorni e di quante spese, oggetti, contatti ed eventi della storia è fonte («restano salvati, con la fonte indicata come eliminata»). Dice anche quante condivisioni verranno revocate e che le copie già scaricate non si possono richiamare. Se il documento risulta analizzato aggiunge la riga sulla conservazione di Anthropic. Se il server rifiuta, il motivo è mostrato e «Sposta nel cestino» resta disattivato. Lo spostamento usa versione e chiave di idempotenza.
- **Avviso «Annulla».** ««Nome» spostato nel cestino · Annulla · Vai al cestino · Chiudi» compare in basso, sopra la barra di navigazione su telefono e centrato sui contenuti su desktop. Resta finché lo chiudi o cambi pagina. «Annulla» ripristina con la versione restituita dallo spostamento.
- **Pagina `/home/:homeId/cestino`.** Mostra solo ciò che ho eliminato io, con data ed «Eliminazione definitiva tra N giorni». Per ogni voce «Ripristina» ed «Elimina subito», con conferma; in alto «Svuota cestino», con conferma. Stato vuoto, errori del server mostrati e dati ricaricati dopo ogni azione, senza tentativi automatici. I viewer vedono l'elenco senza azioni.
- **Link discreto «Cestino (n)»** in fondo alla barra laterale e nel «Menu» su telefono, solo se il cestino non è vuoto; mai nella barra in basso.
- **Test:** il backend finto implementa le API del cestino con le regole del server (solo il caricatore, invisibilità ovunque, versione, idempotenza, scadenza).

## Verifiche

| Ambito | Esito |
| --- | --- |
| Typecheck, lint, build | Superati |
| Nuovi test `src/documents/Trash.test.tsx` | 9/9 |
| Suite mock completa | 872/876, 107 file. I 4 falliti (rubrica, oggetti, spese) sono attese scadute in aree non toccate, con un collaudo DB di un'altra sessione in corso sulla stessa macchina; rieseguiti da soli 55/55. Nessun timeout o asserzione esistente allentato |
| Browser con backend simulato, dati sintetici | Desktop e 375 px: anteprima, spostamento, avviso in vista in fondo all'elenco, link nella barra laterale e nel menu, pagina, ripristino |

Durante la prova nel browser ho corretto due cose. L'avviso era in cima alla pagina e restava fuori vista quando si elimina un documento in fondo all'elenco; poi finiva sotto la barra di ricerca fissa di Documenti. Ora è fisso in basso. Il link nella barra laterale aveva poco contrasto e ora usa il colore e l'area di tocco delle altre voci.

Il test esistente `PendingUploads` «Elimina…» ora usa l'anteprima del cestino invece di `/removal`, con le stesse asserzioni: rifiuto mostrato, conferma disattivata, nessuna scrittura. I test di `AppShell` sostituiscono il conteggio del cestino con un cestino vuoto, come già fanno per logout e avviso email.

## Limiti

- La riga su Anthropic compare per ogni documento con `aiAnalysisSucceeded`: non distingue un invio reale da una simulazione, perché servirebbe un dato in più dal backend.
- Il pulsante «Rimuovi» del caricamento a lotti resta invariato: toglie un file non ancora usato.
- `POST documents/:id/removal` resta nel backend ma il frontend non lo usa più.
- Da unire dopo la PR #9. Se la revisione del lotto 1 cambia le API, il lotto 2 va aggiornato con un merge.
