# Casa: riepilogo compatto con conteggi — 19 ottobre 2026

Da completare ora contiene tre righe interamente cliccabili: Documenti da compilare, Proposte da rivedere, Verifiche da rivedere. Conteggi server completi, visualizzati anche a zero soltanto dopo risposta riuscita. Caricamento ed errore non sono presentati come zero. Scadenze autonome sopra il box conservate.

Aggiunto endpoint documentale aggregato e filtri esatti to_compile/review nella lista. Riutilizzata la proiezione SQL degli stati, con privacy, membership e fonte versione/SHA correnti. Nessuna migrazione. Analisi in corso e fonti che richiedono attenzione hanno una nota separata quando presenti, senza sparire o gonfiare gli altri gruppi. Le verifiche mantengono il conteggio Review esistente. Cache sempre account/casa; nessun conteggio da pagina parziale.

Superato quindi il limite documentato nella prima implementazione Casa, che mostrava solo tre fonti senza conteggi. Nessun dato dimostrativo inserito nel prodotto.

Verifiche: backend 7 test di integrazione su DB dedicato, con più di 50 fonti, confronto integrale con lista paginata, filtri esatti, fonte SHA cambiata, owner/viewer, visibilità privata/condivisa e revoca. Frontend: 56 test mirati Casa/attività/ricerca/filtri superati, incluso conteggio oltre la prima pagina e collegamenti dei gruppi. Typecheck/lint/build frontend e backend verificati prima della pubblicazione.

Browser locale con API reali, desktop e viewport 390 × 844: nella casa COLLAUDO V2 restituiti 4 documenti da compilare, 1 proposta e 0 verifiche. Provati tutti e tre i collegamenti: 4 fonti esatte, sola proposta pronta e nessuna verifica aperta. Nessun upload, nuovo costo o invio AI durante il collaudo. Nessun overflow orizzontale generale nella vista mobile.

Limiti: non verificato telefono fisico o screen reader, nessuna certificazione WCAG. I numeri del collaudo sono una fotografia dei dati della casa di prova e cambiano con i dati reali.
