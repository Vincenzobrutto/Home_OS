# Cestino — lotto 2, pagina e azioni nel frontend: piano, 23 ottobre 2026

Lotto Claude, branch `claude/cestino-frontend-20261023`, partito dalla punta del lotto 1 `a132696` (PR #9, in revisione da Codex). **Solo piano, in attesa di approvazione del committente: nessun codice scritto.** Usa le API del [lotto 1](documents-api-contract.md) e le scelte del [progetto del 22/10](fase0-deletion-design-20261022.md), §2–§3 e §4.1.

## Dipendenza dal lotto 1

Questo branch contiene il backend della PR #9. Se la revisione di Codex porta altre correzioni, le riporto qui con un merge. La PR del lotto 2 va unita **dopo** la #9; finché la #9 è aperta, la PR del lotto 2 punta al branch del lotto 1, così il diff mostra solo il frontend.

## Perimetro

**Dentro (solo `frontend-v5` e documentazione):**

1. **Elimina → cestino.** «Altre azioni › Elimina» nella scheda documento apre una finestra con l'anteprima d'impatto (`GET documents/:id/trash`): di quante spese, oggetti, contatti ed eventi della storia il documento è fonte, e quante condivisioni attive verranno revocate. Il testo dice che i dati confermati restano, con la fonte indicata come eliminata. Se l'anteprima rifiuta (analisi in corso, scheda caldaia), il motivo è mostrato e la conferma è disattivata. Conferma con versione e chiave di idempotenza.
2. **Avviso dopo lo spostamento:** «Spostato nel cestino · Annulla · Vai al cestino». «Annulla» ripristina subito, con la versione restituita dallo spostamento. L'avviso è annunciato agli screen reader e resta finché l'utente non lo chiude o cambia pagina, senza scomparire a tempo.
3. **Pagina `/home/:homeId/cestino`:** elenco dei soli documenti che ho eliminato io, con nome, data di eliminazione ed «eliminazione definitiva tra N giorni». Per ogni voce «Ripristina» ed «Elimina subito»; in alto «Svuota cestino». Le azioni definitive chiedono una conferma esplicita. Stato vuoto: «Il cestino è vuoto».
4. **Accesso discreto:** link «Cestino (n)» in fondo alla barra laterale, visibile solo se il cestino non è vuoto. Su telefono sta nel menu «Menu», non nella barra in basso.
5. **Errori gestiti:** versione cambiata, già nel cestino, scaduto, analisi in corso, fonte eliminata (410), rete assente. Il messaggio è chiaro e i dati vengono ricaricati, senza tentativi automatici.
6. **Informazione sul fornitore AI:** nella finestra di eliminazione, una riga dice che i documenti già inviati ad Anthropic per l'analisi seguono la sua politica di conservazione e che Dimora non può richiamarli. Compare quando il documento risulta analizzato (`aiAnalysisSucceeded`, già nella lista). Per distinguere un invio reale da una simulazione servirebbe un dato in più dal backend: lo rimando, per non toccare la PR #9 durante la revisione.
7. **Pulizia delle cache:** dopo spostamento, ripristino ed eliminazione si aggiornano elenco documenti, riepilogo della casa, schede collegate e cestino.

**Fuori:** il pulsante «Rimuovi» dei file nel caricamento a lotti resta com'è, perché toglie un file non ancora usato e non è un'eliminazione. Restano fuori anche le schede (lotto 3), casa e account, i backup e il filtro per tipo nel cestino (serve solo con molti tipi). Nessuna modifica al backend, salvo correzioni chieste dalla revisione della PR #9.

## Domande al committente

1. L'avviso «Annulla» resta visibile finché lo chiudi o cambi pagina. Va bene, o preferisci che scompaia dopo qualche secondo?
2. La riga sul fornitore AI va bene così, o preferisci farla verificare prima a chi cura gli aspetti legali e per ora non mostrarla?

## Verifiche previste

- Typecheck, lint e build del frontend.
- Test mock con il backend finto, esteso con le API del cestino. Casi coperti: anteprima e rifiuto, spostamento e annullamento, pagina con ripristino, eliminazione subito e svuotamento, scadenza mostrata in giorni, privacy (un altro membro non vede il mio cestino), link nel menu solo se il cestino non è vuoto, errori 409/410, tastiera e focus nelle finestre.
- Suite mock completa senza allentare asserzioni o timeout esistenti.
- Prova nel browser con dati sintetici, su desktop e a larghezza telefono.
