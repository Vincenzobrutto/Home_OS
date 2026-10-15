# Spese — verifica del percorso completo, 15 ottobre 2026

## Esito

Nessun difetto riprodotto nei percorsi sotto. Nessuna modifica al codice necessaria. Collaudo sul frontend reale 5174, API locale 3001 e PostgreSQL V5 dedicato; dati sintetici di Prova M4/Casa M4. Non è un audit esaustivo né una dichiarazione di conformità WCAG.

## Prove eseguite nel browser

| Percorso | Osservato |
| --- | --- |
| Inserimento manuale | Creata «Collaudo finale · manutenzione sintetica», 12,34 EUR, 15 ottobre, categoria Manutenzione, collegata alla Caldaia. Origine «Dichiarato da te», famiglia Manutenzione e riparazioni. |
| Validazione | Invio senza data effettivamente acquisita bloccato con messaggio sul campo. Il fill del controllo date dell'automazione non era acquisito dallo stato React: completato con input nativo da tastiera, senza cambiare il prodotto o iniettare stato. |
| Modifica | Importo 12,34 → 24,68 EUR; storico mostra prima/dopo. Dashboard 345,28 EUR e sei costi, famiglia manutenzione 24,68 EUR. |
| Oggetto | Scheda Caldaia mostra il costo aggiornato; documenti e attività rimangono presenti e distinti. |
| Annullamento | Aperta archiviazione, «Torna indietro» lascia il costo attivo e invariato. |
| Archiviazione | Confermata solo sul costo creato in questa prova; stato archiviato, ripristino disponibile e storia conservata. Dashboard torna a 320,60 EUR e cinque costi. Nessuna cancellazione. |
| Proposta da documento | Avviata esclusivamente la prova locale `test_fixture_v1` su gas.pdf sintetico già presente. Job completato; importi 80/20/100 distinti e non preselezionati, fonti visibili, nessun costo automatico. |
| Possibile duplicato | Costo «Bolletta gas settembre» riconosciuto. Dialogo esplicito e conferma «Collega il documento a questo costo» portano al medesimo costo da 80 EUR. Nessun secondo costo nel totale. |
| Uscita dalle verifiche aperte | Dopo conferma, «Da confermare» mostra nessuna bozza da confermare. |

Identificativi sintetici utili alla riproduzione: costo manuale archiviato `04bd51c2-4355-41aa-b4ec-c08f320f7797`; job locale `5820996d-20e1-4a6d-ae84-f29fc435ccae`; bozza confermata `bcb96a21-77c0-4889-9f11-983fedba82b9`; costo gas esistente `b4e358c2-e99b-44c3-915f-8eaa3a9051c4`.

## Prove automatiche e distinzione delle evidenze

Eseguiti in questa verifica **29 test con PostgreSQL/HTTP**, tutti riusciti, nei quattro file `economy.integration`, `economy.http`, `economic-documents.integration`, `economic-documents.http`. Log workspace: `outputs/Dimora-V5-spese-percorso-db-20261015.log`.

Copertura: costo canonico tra vecchia/nuova API, famiglie e lavori, aggiornamenti concorrenti/versioni, archiviazione, autorizzazioni e redazione, somme esatte, bozze persistenti, conferme concorrenti e ripetizione della risposta persa senza duplicati, collegamento esistente, importi lordo/manuale e revoca della fonte. Questi casi di errore/concorrenza sono prove automatiche, non simulazioni browser dichiarate come interazioni reali.

Build/lint e suite frontend **316/316** erano già verdi nella verifica immediatamente precedente, sul medesimo codice. Non ripetuti perché qui non è cambiato codice. Vedi `frontend-loading-integration-20261015.md`.

## Stato lasciato e limiti

Il solo costo manuale creato qui resta archiviato e recuperabile; il job/bozza locale resta come evidenza confermata. Le suite creano dati isolati e ne eseguono la pulizia prevista. Nessuna modifica a main, dati reali/legacy, configurazioni o contatori. Nessuna chiamata Anthropic: il provider reale è mostrato disabilitato nella pagina; nessuna riattivazione o analisi a pagamento.

Questa verifica copre il comportamento economico corrente. Condivisione selettiva, Agenzie e Amministratori non sono oggetto di questo collaudo. La qualità dell'estrazione AI generale su documenti nuovi non è stata rivalutata con le fixture.
