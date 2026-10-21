# Riepilogo salvataggio, filtri Spese e dettaglio oggetto — 21 ottobre 2026

Tre miglioramenti successivi all’audit UX, autorizzati insieme dall’utente. Solo frontend V5; nessun cambiamento a endpoint, schema, permessi, consensi, AI o logica di conferma canonica.

## Comportamento

- **Documenti:** “Al salvataggio” usa i valori correnti del modulo, non solo i conteggi. Mostra documento, nuove spese (importo, fornitore, categoria e data), mese/intervallo di riferimento della bolletta con emissione e scadenza distinte, oggetti da creare/collegare e contatti selezionati. Collegare una spesa esistente, escluderla o rimandarla ha un testo distinto; gli articoli esclusi non risultano da creare. “Conserva solo il documento” spiega che i collegamenti esistenti restano. Nessun nuovo passaggio obbligatorio o clic di conferma aggiunto.
- Il cambio temporaneo a “Conserva solo il documento” conserva i campi della spesa tornando alla compilazione completa. La sezione resta montata ma nascosta, evitando l’azzeramento dei suoi input locali. Il riepilogo incompleto non presenta un totale di nuove spese pari a zero come importo definitivo. Guardie di uscita, bozze e recupero idempotente restano attivi.
- **Spese:** ricerca e periodo sempre visibili; tipo, raggruppamento e filtri secondari nello stesso pannello richiudibile desktop/mobile. “Applica filtri” applica insieme le scelte, richiude il pannello e riporta il focus al titolo. Fuori dal pannello rimangono conteggio e indicatori rimovibili dei filtri applicati (inclusa la famiglia). La ricerca ha già il proprio controllo separato. “Azzera filtri” conserva periodo e testo di ricerca. Grafico, aggregazioni, ricerca privata nello stato di navigazione e ritorno da dettaglio preservati.
- **Oggetto:** stanze effettivamente salvate riconoscibili in etichette, distinte dalla tendina di modifica; se la selezione cambia è esplicito che va salvata. Più ambienti e Gestisci ambienti restano disponibili. Marca/modello nei dati essenziali; date di acquisto, garanzia e dettagli tecnici in “Altri dettagli”, con tutte le informazioni sulle fonti accessibili. Acquisto e scadenza garanzia restano nella sintesi superiore. Modifica dati e garanzia mantiene i suoi campi principali iniziali.

## Verifiche

- 131 test frontend con API simulate, 8 file: riepilogo, revisione unica, Spese, profilo, oggetti, compilazione/bozze, onboarding e workspace documenti. Inclusi valori correnti, date distinte, spesa già presente/esclusa, conservazione input al cambio modalità, applicazione esplicita e rimozione filtri, ricerca e ritorno dal dettaglio, accessibilità delle fonti. Nessun DB reale.
- TypeScript, lint frontend e build superati. Resta l’avviso Vite preesistente per il bundle principale oltre 500 kB.
- Browser desktop 1440×1000 e mobile 390×844/320×740: riepilogo con bolletta fittizia 93,39 €, dicembre 2025, emissione 17 gennaio e scadenza 6 febbraio 2026. Cambio solo-documento e ritorno con valori conservati. Nessun salvataggio, conferma o invio AI live.
- App reale consultata in lettura: filtri Spese applicati, rimossi e conservati tornando dal dettaglio; oggetto con collocazione e dettagli richiudibili. Nessuna modifica a oggetti, stanze, spese o documenti personali. Pannello e riepilogo senza overflow orizzontale nelle larghezze provate (contenuto 305 px su viewport 320 px).
- Screenshot nella chat, cartella `outputs/ux-three-20261021/`. Simulatore separato chiuso al termine e viewport temporanei ripristinati. Modifiche legacy locali escluse.

## Limiti

Il riepilogo descrive le scelte prima del salvataggio: non certifica pagamenti o dati estratti. La rimozione di filtri modifica solo la consultazione; non cancella registrazioni. Gli altri percorsi di bozze e il fallback Spese precedente a economy-v1 non sono stati riprogettati.
