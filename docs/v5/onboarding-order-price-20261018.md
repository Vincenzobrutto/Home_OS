# Prezzo ordine e inserimento manuale

Diagnosi read-only della bozza indicata:modeextraction/documentKindorder_confirmation, nome e marca presenti,purchaseTotalnull,nessunapurchaseDate. Originaleimmagine: prezzoattuale/totale444EUR,prezzobarrato600EUR,nessunadata. Nessuna nuovaAI o mutazione della bozza.

Cause: prompt/validatore riservavano totale ai purchase_document, frontend nascondeva l’intero costo agli ordini e alle bozzeAI di altri tipi. V10 consente il totale ordine chiaramente etichettato (Totale costi), mantiene esclusione prezzi barrati/subtotali/ratizzazione. Date solo esplicite. Non viene inventata una data per registrare automaticamente una spesa.

UI: Prezzo di acquisto subito visibile per articoloquantità1, anche dopoAI. Inserendo valore esplicitamente seleziona creazione costo; per confermare servono importo valido e data. È possibile scegliere non registrare costo/collegare spesa esistente. Stessa transazione e controlli dei doppioni/replay e limiti di allocazione. Prezzo salvato tramite spesa canonica collegata e mostrata nella scheda oggetto. Nessuna nuova colonna prezzo né migrazione.

Prove:39BEoffline,24DB con parser reale/provider fake;47FE distinti mirati con una vecchia aspettativa “costo nascosto su consegna” aggiornata e riprovata, mantenendo nessuna spesa automatica. Build/lint mirati. Prompt V10 nuovo da collaudare sui prossimi invii volontari, non dichiarare nuova estrazione reale su questaimmagine. No paidcalls/env/segreti/quote/push o modifiche dati personali. Vecchia bozza: inserire444manuale e data d’acquisto corretta, oppure nuovaAI solo con consensoUI.
