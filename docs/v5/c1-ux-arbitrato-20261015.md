# C1 — raccolta e arbitrato UX, 15 ottobre 2026

Consegna Claude `7dffbbe` raccolta come `aafbf86`: solo mockup, rapporto e quattro screenshot; nessun sync o runtime frontend. Dirty estraneo e checkout Claude preservati.

## Verdetto e scelte

Il rapporto è utile e trasparente sui limiti. Le 40 verifiche e i quattro screenshot sono evidenze di Claude su una simulazione, non prove di API/DB, controllo di identità o sicurezza in produzione. Approvo la consegna stretta, i quattro passaggi, manifesto e nessuna selezione implicita. Le tre prove dichiarate mancanti meritavano verifica prima del congelamento.

| Punto | Decisione Codex |
| --- | --- |
| Sequenza | Accolta la critica: same-Home ha valore limitato e duplica in parte la visibilità M2. Nucleo tecnico riutilizzabile, primo rilascio utente proposto con esterni autenticati. Documenti prima, schede tecniche dopo. |
| Identificazione esterno | Codice + login + approvazione del mittente sono una base, non una verifica d'identità. Aggiungo confronto di challenge diversa per ogni claim tramite contatto conosciuto, approvazione vincolata ad account/claim/versione/manifesto e accettazione finale del destinatario. Non fidarsi del nome dichiarato: è imitabile. |
| Protocollo da completare | Codice casuale di almeno 50 bit, hash/HMAC a riposo, TTL 15 minuti, claim atomico senza sostituzione silenziosa; challenge server separata e legata al claim. Tentativi limitati per account/IP/globalmente, messaggi generici e nessun codice/log contenente segreti. Rigenerazione/revoca invalida codice e claim precedenti. Parametri e persistenza da fissare nel contratto: il mockup usa valori fissi sintetici e non implementa queste difese. |
| Rifiuto | Stato Rifiutata distinto da Revocata. |
| Consenso | Ogni modifica invalida il precedente. Conferma anche per soli dati tecnici, con testo coerente e nessun avviso file se non ci sono file. |
| Destinazione | Consegne ricevute a livello account; non aggiungere una quinta tab principale alla Home. |
| Lettura | Nessuna ricevuta di lettura. Accettato non significa aperto. |
| Scadenza | Istante server nell'anteprima e vincolato al manifesto; non esteso dall'accettazione/retry. TTL abbinamento distinto dalla durata della consegna, entrambi visibili. |
| Categoria economica | Etichetta ammessa solo se il dato è già dichiarato dall'utente. Non esiste oggi un classificatore/categoria M2 da inventare per popolare questa etichetta nel runtime. Avviso sul contenuto completo vale per tutti i file. |
| Documento di altri | Disattivato con motivo solo se già leggibile nel contesto autorizzato del mittente. Mai usare il picker per rivelare titoli privati altrui. |
| Revoca | Revoca il canale C1, non gli eventuali permessi M2 indipendenti e non le copie scaricate. Specificato nella simulazione. |
| Vecchio mockup | Sezione C1 superata: usare la proposta standalone corretta; il resto del mockup proprietario resta riferimento per gli altri moduli. |

Nessun servizio email/SMS, costo esterno, nuove condizioni legali o trasmissione di file autorizzati da questo arbitrato. La proposta esterni è di prodotto/architettura, non un permesso concesso ora a persone reali.

## Difetti corretti nel mockup integrato

1. `create()` richiedeva almeno un documento, mentre il wizard permetteva zero file più scheda tecnica. Conferma ora obbligatoria anche per la scheda e creazione coerente con `hasContent`.
2. Rifiuto registrato come `revoked`: aggiunto `declined`, proiezione non disponibile e stato Rifiutata per il mittente.
3. Abbinamento approvato rendeva subito attiva la consegna, senza accettazione distinta. Ora confronto dichiarato obbligatorio → approvazione → invito da accettare → consultabile.
4. Rischio di scambiare nome/account per prova d'identità: aggiunti confronto tra le schermate e contatto già conosciuto. Frasi fisse soltanto nella demo.
5. Revoca descritta come blocco di tutti gli accessi Dimora: testo circoscritto alla consegna, avviso su accessi M2 già esistenti.
6. Microtesti di sola scheda non dicono più «0 file per te» e non promettono download di file assenti; timeline in attesa non formula l'accettazione come fatto già avvenuto.

## Verifiche Codex

Browser reale sulla sola simulazione servita dal Vite esistente, nessun nuovo servizio e nessuna chiamata alle API del prodotto:

- Percorso da oggetto, zero file e soli campi confermati: scelta esplicita, consenso non spuntato/creazione disabilitata, poi invito creato.
- Luca inserisce il codice sintetico: nessun dato tecnico visibile; frase di confronto. Giulia vede lo stesso confronto, conferma disabilitata fino alla dichiarazione. Approvazione produce un invito ancora da accettare. Luca accetta e vede soltanto la scheda tecnica.
- Simulazione scadenza cliccata: destinatario vede messaggio/data, non la scheda.
- Documento singolo a Marco: rifiuto nel dialogo, stato Rifiutata per Giulia.

Le prove usano click/tasti e selettore persona dichiaratamente di simulazione; nessuno stato applicativo iniettato. Dopo le correzioni testuali finali verificata apertura della proposta. I risultati backend precedenti restano nove test offline same-Home, non una validazione del nuovo protocollo esterno. Build/lint/suite del prodotto non ripetute: sono cambiati solo HTML standalone e documenti, non importati nell'app.

## Prossimo passaggio

Far valutare al committente il percorso concreto «manuale/libretto al tecnico» e il numero di passaggi di abbinamento. Poi congelare il contratto esterno con stati, DTO, anti-abuso, idempotenza e locking; Codex persistenza/API/test DB, Claude frontend reale con incarico nuovo. Nessuna modifica a Spese o collegamenti oggetto esistenti. C1 non è ancora attivo e il disegno API v0.1 non va implementato immutato.
