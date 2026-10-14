# Home proprietario — consolidamento UX

14 ottobre 2026. Il committente autorizza Codex a consolidare il mockup completo con le famiglie di spesa come navigazione principale. Non è richiesto un nuovo incarico Claude.

## Modifiche applicate

- Casa / Attività / Documenti / Spese resta la navigazione principale.
- Spese e la precedente pagina Economia usano un'unica schermata. Famiglie principali: Tutte, Bollette, Condominio, Tasse e assicurazioni, Manutenzione e riparazioni, Lavori e acquisti, Mutuo e finanziamenti, Altro / Non classificata.
- Visualizza cambia Elenco / Per oggetto / Per lavoro / Riepilogo. Famiglia, periodo, ricerca e altri filtri agiscono sullo stesso insieme di costi e sul totale. I costi senza collegamenti restano consultabili nelle viste raggruppate.
- Il totale comprende i finanziamenti; il totale senza finanziamenti è una seconda misura, visibile nella vista Tutte. La polizza collegata al mutuo è un esempio esplicitamente classificato come finanziamento.
- Home compatta: azioni contestuali, verifiche aperte, ambienti, prossime attività e comunicazioni condominiali. Rimossi il grande hero e i contatori ripetuti.
- Scheda oggetto con dati essenziali, prossima attività, massimo due anteprime documenti e due costi recenti. Le sezioni complete Documenti / Attività / Costi / Storia rimangono disponibili.
- Ritorni ai dettagli preservati; costo manuale aperto dall'oggetto torna ai suoi costi. Apertura dell'oggetto dalla stanza mantiene il riferimento alla stanza.
- Importazione mostra i tre originali effettivamente importati. La bolletta gas apre la compilazione economica; il flusso non rimanda alle verifiche di una caldaia estranea ai file appena importati.
- Analisi dimostrativa con scelta esplicita, inserimento manuale alternativo, importo gas non preselezionato. Le bozze accantonate restano elencate in Spese e si possono riaprire.
- Etichette di visibilità coerenti con il modello Home: Solo io / Persone della casa. Link esterni e relativi manifesti rimangono un percorso separato. Questo mockup non applica permessi reali.
- Condivisioni, manifesto, revoca simulata, storia, esportazione sintetica e cessazione dell'accesso per vendita mantenuti.

## Verifiche riprodotte nel browser

Stato separato con `?qa=1`; dati sintetici, senza API del prodotto.

1. Totale 2026 iniziale 2.477,90 EUR; senza finanziamenti 1.907,90 EUR.
2. Mutuo e finanziamenti: rata 450 EUR e polizza 120 EUR; totale 570 EUR coerente tra Elenco e Riepilogo.
3. Tasse e assicurazioni: polizza casa 180 EUR. Cambio famiglia applicato alla vista corrente.
4. Casa → Cucina → Caldaia: dati tecnici, documenti e attività rimangono accessibili; anteprime costi includono i record 2025 e 2026, chiaramente datati.
5. Costo manuale 85 EUR collegato alla caldaia: una registrazione, visibile nel dettaglio e nei costi oggetto; ritorno alla sezione costi. Ripristino successivo del solo stato QA.
6. Importa esempi → originale gas → compilazione: scelta esplicita necessaria prima della simulazione; proposta 80 EUR corrente / 100 EUR con arretrati senza preselezione.
7. Accantona → Spese → Apri bozza → Riapri: bozza recuperabile ed esclusa dal totale.
8. Collega alla spesa gas esistente: originale presente nel dettaglio, fonte importo ancora Inserito da te, totale invariato 2.477,90 EUR, sempre nove registrazioni.
9. Viewport 320 × 780: larghezza documento 305 px, menu famiglie scorrevole, famiglia finanziamento selezionabile e riepilogo 570 EUR. Nessun errore console osservato durante questi percorsi.
10. Parsing JavaScript e controllo whitespace del diff.

## Limiti e passo successivo

Mockup standalone locale, non sostituisce l'app React né introduce backend, login, upload o AI reale. Le date sono fixture al 14 ottobre 2026. I controlli di persistenza e consenso sono simulati. Nessuna dichiarazione di conformità WCAG o di sicurezza backend deriva da queste prove.

Questa sessione non congela il contratto economic-history e non avvia lo sviluppo S1 operativo. Prima occorre allineare stati delle bozze recuperabili, DTO, nullability, esempi JSON e atomicità al contratto, poi congelare la baseline e implementare con test API/DB dedicato. Il mockup ufficiale è la base per la prossima navigazione del committente.
