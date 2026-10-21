# Percorso documento–spesa: ritorno e azioni esplicite — 21 ottobre 2026

Completato il punto 3 concordato dopo l’audit. Intervento frontend V5, senza modificare contratti, dati, quote AI o conferme.

- Dal documento, aprire una spesa conserva la provenienza: “← Documento” riporta allo stesso documento e ripristina il suo stato di navigazione (anche la provenienza dall’archivio o da un oggetto). Dagli elenchi Spese resta il ritorno esistente con ricerca e filtri. Contesto valido solo per lo stesso account/casa e identificativi documento locali; nessun URL arbitrario accettato. Ritorno presente anche nel dettaglio fallback.
- Quando il documento ha spese attive collegate, il comando è “Registra un’altra spesa”, con spiegazione che crea una registrazione separata. Senza spese collegate resta l’invito iniziale. Nessuna creazione o analisi al semplice passaggio. Nel modulo economy-v1, Annulla torna al documento; dopo un nuovo salvataggio esplicito, il dettaglio della nuova spesa mantiene il ritorno al documento. Le registrazioni precedenti rimangono distinte.
- Nel riquadro della proposta la data già mostrata è etichettata **Emissione**, in formato italiano leggibile. Non viene più presentata come data senza significato; nessun periodo o data vengono dedotti. Il riepilogo canonico sopra continua a separare mese/intervallo, emissione e scadenza: non si aggiungono duplicati del periodo o della scadenza nel titolo della proposta.

## Verifica

86 test frontend con API simulate, 6 file: provenienza sicura, etichette proposta, DocumentBillEntry, Spese, Documenti e fallback. Il nuovo test percorre documento → spesa → documento, conserva lo stato originario, annulla un costo aggiuntivo senza POST, poi registra esplicitamente un nuovo costo fittizio: due registrazioni distinte, un solo POST di creazione. Verificati contesti estranei/rifiutati e assenza di date inventate. Due vecchie aspettative di DocumentBillEntry sui pulsanti separati manuale/AI sono state aggiornate al comportamento Compila diretto già approvato; nessun cambiamento a quel flusso applicativo.

Build (con TypeScript) e lint frontend superati. Resta l’avviso Vite preesistente sul bundle principale oltre 500 kB.

Browser con router/componenti di produzione e API in memoria: desktop 1440×1000, mobile 390×844 e 320×740. Ritorno e annullamento verificati desktop/mobile; azione aggiuntiva ed Emissione leggibili, nessun overflow orizzontale a 320 px. Nessuna scrittura durante la consultazione del simulatore. App reale usata solo in lettura per documento → spesa → documento; dati personali intatti, nessun invio AI. Screenshot nella chat in `outputs/document-expense-flow-20261021/`; simulatore chiuso e viewport ripristinato.

## Fuori da questo intervento

Restano le rifiniture dell’elenco Documenti (metadati secondari), dei filtri stanza e dei testi Ambienti, e il collaudo UX di Attività/Rubrica con elenchi molto popolati. Nessuna nuova scansione completa o modifica funzionale di queste sezioni.
