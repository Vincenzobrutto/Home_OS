# Alpha — misurazione foto targhette (B65)

## Obiettivo

Capire se la pipeline documentale generica legge già abbastanza bene le foto
di targhette prima di costruire un prompt o un flusso dedicato. Conta se
l'utente ottiene dati utili e corretti con l'esperienza reale di Dimora.

## Campione e procedura

- Almeno 30 foto reali da almeno 10 partecipanti, distribuite su almeno cinque
  categorie di Asset; massimo tre foto dello stesso partecipante.
- Foto scattata dal telefono durante la sessione, senza istruzioni tecniche
  oltre a “inquadra la targhetta come faresti normalmente”.
- Usare l'attuale flusso upload → “Analizza con AI” → revisione. Non cambiare
  prompt, ritagliare o trascrivere prima dell'analisi.
- Non copiare le immagini nel foglio di ricerca. Registrare solo un id
  partecipante pseudonimo e gli esiti sotto.

## Esito primario

Un tentativo è **riuscito** solo se, entro due minuti e senza trascrivere un
campo identificativo, la proposta:

1. individua una categoria Asset accettabile;
2. legge correttamente la marca;
3. legge correttamente almeno uno tra modello e numero seriale;
4. non inventa un valore identificativo che l'utente potrebbe confermare per
   errore.

Il tasso primario è `tentativi riusciti / tentativi analizzati`. Timeout,
errore tecnico e risultato inutilizzabile restano nel denominatore.

## Scheda minima per tentativo

| Campo | Valori |
|---|---|
| Partecipante | codice pseudonimo |
| Categoria Asset | caldaia / clima / grande elettrodomestico / piccolo elettrodomestico / altro |
| Condizione foto | buona / riflesso / poca luce / inclinata / testo piccolo |
| Analisi completata | sì / no |
| Categoria corretta | sì / parziale / no |
| Marca corretta | sì / no / assente in targhetta |
| Modello corretto | sì / parziale / no / assente |
| Seriale corretto | sì / parziale / no / assente |
| Allucinazione identificativa | sì / no |
| Tempo alla proposta confermabile | secondi |
| Esito primario | riuscito / non riuscito |
| Nota | massimo una frase, senza dati personali |

## Soglie decisionali

- **≥70% riuscito e <5% allucinazioni identificative**: mantenere il prompt
  generico nell'alpha; migliorare solo guida fotografica e microcopy.
- **40–69% riuscito oppure 5–10% allucinazioni**: test A/B di istruzioni
  specifiche per targhette, sugli stessi criteri e su un nuovo campione.
- **<40% riuscito o >10% allucinazioni**: progettare pipeline dedicata
  (ritaglio/OCR/prompt), senza abilitarne scritture automatiche su Asset.

La soglia non autorizza mai la scrittura diretta: anche un risultato perfetto
resta una proposta che l'utente deve confermare.
