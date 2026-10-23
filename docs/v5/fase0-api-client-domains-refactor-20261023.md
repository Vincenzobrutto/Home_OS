# R10 — client frontend per dominio, trasporto unico

23 ottobre 2026, branch Fase 0. ApiClient resta la facciata pubblica: 83 metodi, getter CSRF e gli export storici di tipi/filename. Otto moduli separano case, documenti, review, attività, oggetti/ambienti, spese, economia e planimetrie. Percorsi e paginazione sono helper comuni. Nessun endpoint o contratto server modificato.

Ogni istanza ApiClient costruisce un solo ApiTransport, passato ai moduli di dominio. Solo quel trasporto possiede fetch, base URL e token CSRF; sessione e logout aggiornano quello stesso stato. JSON, multipart ed export binari mantengono account catturato, cookie include, no-store, segnale di annullamento, idempotenza, errori e vincoli MIME. Il client non copia le validazioni autorevoli del server.

## Verifiche

- Typecheck, lint e build produzione superati; 38/38 test API esistenti.
- Due nuove prove permanenti: token unico tra più domini ed export, rinnovo dopo logout, isolamento fra client e mantenimento account/segnale/errori.
- Suite mock completa **860/860, 105 file, 558,98 secondi**, comando npx vitest run --project mock --maxWorkers 2 --retry 1. Retry massimo 1 configurato; nessuna asserzione o timeout esistente modificato. Avvisi jsdom scrollTo non implementato, nessun test fallito finale.
- Confronto differenziale della facciata prima/dopo: 83 metodi × 7 modalità = **581 casi**, con richieste/ordine/header/body e risultati/errori/CSRF equivalenti. Include JSON, errore HTTP, gateway, binario, 204, JSON malformato e rete fallita, con fetch in memoria. Non sostituisce i casi di successo di ogni dominio.
- **99 corpi di metodi/getter** conservati dopo normalizzazione di spazi e del solo riferimento al trasporto; validatori e URL restano gli stessi.

## Costo e limiti

Entry JS rispetto all'ultima build R03: 479.513 → 486.727 byte, gzip 147.618 → 148.617. L'aumento di 7.214 byte (+1,50%; gzip +999 byte) deriva dalla facciata/delega e dai confini aggiunti. È un intervento di manutenzione, non una riduzione del bundle o una misura di velocità. I domini rimangono caricati con la facciata, non vengono dichiarati lazy. Nessuna dipendenza aggiunta.

Nessuna prova sul DB reale, AI/email, .env, deploy o salvataggio nel collaudo utente. Le verifiche backend/DB della conferma sono documentate nel relativo lotto, non dichiarate nuove qui. R10 completato nel perimetro della separazione per dominio e del trasporto condiviso.
