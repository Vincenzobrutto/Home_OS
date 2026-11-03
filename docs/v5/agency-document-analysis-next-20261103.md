# Analisi documentale Agenzie — prossimo verticale, 3 novembre 2026

## Stato effettivo e avanzamento immediato

L'inventario comune già prodotto il31ottobre (170campi/20entità, P1di47campi) non viene rifatto. Esistono upload e catalogazione dominio, decoder PDF locale con autorizzazioni prima/dopo, verifica letterale delle citazioni, stage persistente interno, letture/binding/revisione/confronti/finding e preparazione dati incarico. Non esiste ancora un avvio AI atto/visura dall'app, né una generazione sul modello approvato dell'agenzia.

Il primo collegamento concreto di questo lotto è la catalogazione nella pratica: selettore dei tipi reali al posto del comando fisso Usa come planimetria, etichette coerenti e stesso contratto API protetto. Questo consente di preparare correttamente atto, visura, APE e successione. Non costituisce un'estrazione AI.

## Percorso successivo, senza duplicare quanto esiste

1. **Ammissione documentale e proposta economica server.** Nuova finalità di estrazione, distinta dalle planimetrie; fonte/versione/SHA, pagine, provider, tariffa, cap/valuta, scadenza e consenso esatti. Il vecchio budget sperimentale delle planimetrie non autorizza atti o count. Runtime non disponibile senza configurazione reale, mai fixture come fallback.
2. **Job e contabilizzazione durevoli.** Persistenza distinta di offerta, consenso, prenotazione, marker dispatch, lease/fence, costo e receipt; stesso actor/key/body = stesso job, body diverso = conflitto. Riavvio/concorrenza/revoca/fonte cambiata sono parte dei test, non retry a chiave nuova. Nessun invio dentro lockSQL lungo.
3. **Coordinatore con porta provider.** Originale dal vault autorizzato, decoder server e limiti, controllo consenso anche prima di count, trasporto senza redirect/retry automatici; risposta non fidata validata con il contratto delle citazioni, poi stage atomico esistente. Risposta incerta resta non ritentabile automaticamente; accounting non autorizza la lettura dopo revoca.
4. **Atto e visura nel medesimo percorso.** Il validatore attuale accetta solo deed/succession: aggiungere supporto esplicito e testato per cadastral, mantenendo campi/entità del P1 e nessun ruolo proprietario dedotto dal venditore storico. Distinguere unità e quote, date e riferimenti catastali con evidenza; sub12/sub13 incongruenti diventano finding, non correzione automatica.
5. **UI reale sopra il coordinatore.** Scegli documento/pagine, mostra destinazione e costo massimo, autorizza, avvia e segue lo stato; apre il record proposte già persistito con citazioni. Associazione persona/unità e conferma dei fatti restano due azioni distinte. Nessuna risposta AI attestata dal browser.
6. **Prova controllata.** Prima provider fixture vincolato ai byte sintetici e test API/DB/browser su cluster nuovo; poi solo con incarico/consenso e budget specifici una prova AI reale. La riserva4EUR precedente è storica e impegnata: nessuna nuova chiamata viene autorizzata da questo piano.

## Caso di accettazione del verticale

Pratica di due eredi, provenienza per successione e difformità interna; atto e visura sintetici mostrano due unità e un subalterno incoerente. Il decoder conserva pagine/hash; una citazione inventata viene esclusa, una persona storica non diventa conferente corrente, un dato corretto può essere associato e confermato senza sovrascrivere fatti già confermati. Reload recupera job/record, revoca nasconde i contenuti, nuova versione invalida il risultato. PDF senza testo indica limite/OCR non configurato; non diventa estrazione vuota riuscita.

## Confini

Il modello incarico è ancora un input mancante per la vera bozza, non un motivo per fermare i job e la revisione. `canGenerateDraft` resta false. Nessun nuovo servizio a pagamento, provider di test nel runtime, migrazione su DB esistente, modifica demo Alessio o certificazione automatica. Questo documento è un piano del collegamento residuo; solo il selettore di catalogazione appartiene all'implementazione corrente. Per contratto completo e matrice rischi si riusa agency-deed-orchestration-contract-v1.md.