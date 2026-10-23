# Cestino — lotto 1, modello e backend dei documenti: piano, 23 ottobre 2026

Lotto Claude, branch `claude/cestino-backend-20261023` dal consolidamento `d373700`. **Solo piano, in attesa di approvazione del committente: nessun codice scritto.** Parte dal [progetto del 22/10](fase0-deletion-design-20261022.md), §2–§4.1, §4.4, §5–§8 punti 1–2, limitato ai documenti.

## Perimetro

**Dentro:** modello dati del cestino, registro delle eliminazioni, API backend per mettere nel cestino, ripristinare, eliminare subito e svuotare; anteprima d'impatto; revoca delle condivisioni; blocco con analisi in corso; scadenza automatica a 30 giorni; eliminazione definitiva del contenuto del documento; esclusione dei documenti nel cestino da tutte le letture.

**Fuori, lotti successivi:** pagina Cestino e avviso «Annulla» (lotto 2, frontend); casella «elimina anche le schede create solo da questo documento» e schede/eventi (§4.2–§4.3, lotto 3); casa e account (§4.5–§4.6); ciclo delle copie di backup e procedura di restore (gli script di backup non sono nel repository: serve un incarico a parte). Nessuna AI, nessun DB reale, nessuna modifica a `.env`.

## Modello dati (una migrazione nuova)

- `Document`: `trashedAt`, `trashedById`, `purgeAfter`, `purgedAt`. Il documento nel cestino resta la stessa riga, così spese, oggetti e proposte che lo citano non perdono il collegamento.
- `TrashRequest`: registro idempotente delle operazioni sul cestino (chiave, impronta, risposta), come gli altri `*Request`.
- `DeletionRecord`: registro delle eliminazioni definitive senza contenuto (tipo, identificativo, casa, data, esito). Serve al restore dei backup (§6) e alla verifica.

Scelta tecnica: all'eliminazione definitiva la riga `Document` resta come **segnaposto senza contenuto** (nome svuotato, `purgedAt` valorizzato). Le altre tabelle hanno chiavi esterne `Restrict` verso il documento: rimuovere la riga obbligherebbe a toccarne una ventina. Nelle schede la fonte appare come «documento eliminato» (§4.1).

## Regole

- **Chi:** solo chi ha caricato il documento, privato o condiviso con la casa. Essere proprietario della casa non basta, come per l'accesso agli originali.
- **Chi vede il cestino:** ogni membro solo ciò che ha eliminato lui (§3).
- **Messa nel cestino:** anteprima con ciò di cui il documento è fonte, poi conferma con chiave di idempotenza e versione, nella stessa transazione e con blocco. Le condivisioni del documento vengono revocate subito. Analisi in coda o in corso: rifiuto con messaggio (§4.4).
- **Dopo:** il documento sparisce da elenchi, ricerca, storia, export, conteggi, suggerimenti AI e download. Le conferme di analisi già avviate controllano lo stato del documento nella stessa transazione e rifiutano se è nel cestino.
- **Ripristino:** entro i 30 giorni, con chiave; tornano visibilità e collegamenti. Le condivisioni revocate non tornano.
- **Eliminazione definitiva** (scadenza, «Elimina subito», «Svuota cestino»): rimuove nome, versione, file registrato e originale su disco, testi e output di analisi legati al documento (intake, onboarding, ricevute, economia) e le risposte salvate dei registri idempotenti che li contengono. I dati confermati delle schede restano (§4.1). Il file fisico si rimuove dopo il commit, con ripetizione sicura se fallisce.
- **Scadenza automatica:** attività del server ripetibile e idempotente, come i worker esistenti. A server spento recupera alla riaccensione: va dichiarato nelle prove locali.

## Inventario da completare in implementazione

Le letture dei documenti sono in una ventina di file (`documents`, `review`, `document-intake`, `sharing`, `personal-export`, `home-objects`, `receipt-assistance`, `object-onboarding`, `home-history`, `expenses`, `economy`, `contacts`). Per non dimenticarne nessuna: un filtro unico «documento attivo» e un test di guardia che fallisce se una nuova lettura non lo usa. L'endpoint attuale `POST documents/:id/removal` resta invariato per compatibilità; il frontend passerà al cestino nel lotto 2.

## Verifiche previste

- Build, lint, suite unitarie e suite DB sul runner offline (DB temporaneo, porte proprie).
- Nuovo test DB: messa nel cestino, ripristino, idempotenza e concorrenza, analisi in corso, conferma tardiva rifiutata, condivisione revocata, download e export rifiutati, scadenza simulata, errore di rimozione fisica e ripetizione, privacy tra membri.
- Dopo l'eliminazione definitiva di un documento sintetico: ricerca in tutte le tabelle, JSON inclusi, del nome e dei valori del documento, con zero risultati.
- Suite esistenti invariate: nessuna asserzione allentata.

## Domande al committente

1. Va bene che solo chi ha caricato un documento possa eliminarlo, anche quando è condiviso con la casa?
2. Va bene lasciare a un lotto a parte il ciclo dei backup, visto che i relativi script stanno fuori dal repository?
