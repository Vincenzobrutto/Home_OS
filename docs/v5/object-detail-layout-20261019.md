# Dettaglio oggetto compatto — 19 ottobre 2026

## Comportamento

Implementata l’anteprima approvata: testata con Modifica (Nome e tipo / Dati e garanzia) e Altre azioni (Archivia), collocazione compatta, sintesi acquisto/garanzia, griglia desktop e singola colonna mobile. Dati essenziali e Documenti e manuali nella colonna principale; costi e attività a lato. Contatti e Storia richiudibili. Ripristina resta disponibile sugli oggetti archiviati; caldaie mantengono ingresso al dettaglio tecnico canonico e collegamenti nativi.

Il profilo mantiene campi e origini: in consultazione le due date garanzia occupano una cella, con entrambe le evidenze disponibili nello stesso pannello informativo; in modifica restano due campi distinti. Date leggibili, form al posto dei valori, dati tecnici facoltativi richiudibili. Menu globale disabilita la modifica dei profili con fonti indisponibili come il controllo precedente. Salva/Annulla, CAS, conferme e retry idempotenti rimangono invariati. Focus al campo iniziale e ritorno ai controlli dopo annullamento. Le altre sezioni rimangono montate durante la modifica nome/tipo per conservare eventuali bozze locali.

Documenti/manuali raccolti nello stesso gruppo; note di visibilità e provenienza nei pannelli informativi o nel menu di riga. Rimuovi collegamento richiede ancora conferma e non cancella l’originale. Collega/registra spesa raggruppati in un dettaglio, senza perdere i percorsi distinti; attività nuova o esistente entrambe disponibili. Nessun conteggio dedotto da una pagina parziale. La sintesi acquisto continua a leggere solo la categoria acquisto/sostituzione, distingue acquisti multipli e non somma manutenzioni al prezzo. I rimandi puntano alle stesse spese canoniche, senza copie.

## Verifiche e limiti

- 42 test frontend mirati passati: oggetti/posizioni/archivio/ruoli/revoca/collegamenti, profilo e fonti, salvataggio e replay incerto, acquisti singoli/multipli, manuali. Due casi aggiunti per modifica dal menu e impedimento modifica su fonte indisponibile. Build/typecheck/lint riusciti.
- Browser reale: desktop 1440×1024, mobile 390×844 e 320×740. Modifica nome/tipo e dati/garanzia aperta e annullata, campi esistenti preservati, dettagli tecnici e fonti della garanzia consultati, documento aperto e ritorno, manuale aperto senza ricerca esterna, azioni spesa, contatti/storia, conferme rimozione/archivio aperte e annullate. Nessun salvataggio sul dato reale.
- La scheda corrente è più corta rispetto all’audit (circa 1.800 px mobile anziché circa 3.000, con sezioni secondarie chiuse; misura dipendente da contenuti e font). Nessun overflow pagina alle larghezze provate. Dopo ricarica completa nessun nuovo errore/warning; errori intermedi di HMR durante sviluppo risolti.
- Nessuna API/schema, dato reale, budget AI o chiamata a pagamento modificata. Salvataggi verificati dai test sintetici; il browser reale è stato verificato senza confermare mutazioni. Nessuna nuova ricerca manuali o analisi AI.
- Non è una certificazione WCAG; screen reader completo e archivi con molte risorse non verificati dal vivo. Paginazione e autorizzazioni esistenti conservate.

Target e catture: outputs/dettaglio-oggetto-preview/desktop-mobile.png e outputs/dimora-v5-completo/dettaglio-oggetto-implementation nella chat del 18 ottobre. QA visiva in frontend-v5/design-qa.md.
