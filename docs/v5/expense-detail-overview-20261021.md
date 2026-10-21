# Dettagli spese e bollette: riepilogo iniziale — 21 ottobre 2026

Implementata la priorità concordata dopo i tre interventi precedenti. Solo presentazione frontend V5 economy-v1: nessuna modifica a dati, endpoint, schema, AI o conferme.

## Comportamento attuale

- Nel dettaglio Spese un riepilogo subito dopo il titolo riunisce **importo, fornitore e periodo di riferimento** della bolletta. **Emissione e scadenza** sono distinte, sotto una separazione visiva. Il periodo usa i dati salvati: mese intero oppure intervallo, senza ricavarlo dalla data di emissione o dalla data odierna.
- Fornitore assente: “Non indicato”. Periodo bolletta assente/incompleto: “Da completare”. Emissione o scadenza assenti: “Non indicata”. Non si inventano valori o stati di pagamento.
- Le spese ordinarie mantengono la loro data della spesa; emissione/scadenza compaiono se presenti. Nei dettagli secondari della bolletta resta la data registrata per la spesa, con etichetta distinta dal periodo e dall’emissione.
- Il dettaglio Documento mostra le spese collegate prima degli strumenti per le proposte. Ogni voce riusa lo stesso componente e gli stessi record restituiti dal server, con collegamento al dettaglio Spese: nessuna copia, somma client o nuova registrazione. Rimosse le ripetizioni dei medesimi campi dal successivo elenco Dettagli della spesa.
- Navigazione, ricerca e ritorno, modifica/archiviazione, originali, fonti, contatti e storia restano disponibili. Il fallback spese precedente a economy-v1 e il modulo di compilazione non vengono riprogettati.

## Verifiche

75 test frontend con API simulate, 4 file: ExpenseOverview, Spese, Documenti e spese fallback. Nuove prove su mese/intervallo, dati mancanti senza sostituzioni implicite, date separate, spesa ordinaria e uguaglianza dei valori fra dettaglio spesa e documento, senza POST di consultazione. Test preesistenti su permessi, modifiche, archiviazione e ritorno superati.

TypeScript, lint frontend e build superati. Resta il warning Vite preesistente sul bundle principale oltre 500 kB.

Browser con componenti e router di produzione, backend simulato in memoria: desktop 1440×1000, mobile 390×844 e 320×740. Bolletta fittizia 93,39 €, fornitore di prova, dicembre 2025, emissione 17 gennaio 2026 e scadenza 6 febbraio 2026. Passaggio documento-spesa con valori coerenti; zero scritture durante la consultazione. Nessun overflow orizzontale a 320 px (contenuto 305 px). La verifica non riguarda l’analisi AI, non esposta dal simulatore.

App reale consultata in lettura: dettaglio spesa ordinaria e documento collegato con riepilogo coerente e fornitore non indicato, senza modificare dati personali. Nessuna chiamata AI o scrittura al DB reale. Screenshot nella chat in `outputs/expense-detail-20261021/`; simulatore chiuso e viewport ripristinati. Modifiche legacy locali preservate.
