# Arbitrato Codex sulla revisione UX S1

14 ottobre 2026. Contributo Claude d54a533c36b99825be33cd066e377d036c7e66a1 raccolto come db45d1b, solo frontend-v5/docs/S1-UX-REVIEW-20261014.md. Revisione documentale, nessun browser o test: non trattare rilievi come difetti riprodotti. La sua baseline frontend bf10356 precede le ultime correzioni G1 master493def7. Nessun sync frontend riapplicato, dirty esterno preservato.

| Rilievo | Verdetto / regola definitiva di progettazione |
|---|---|
| S1-01 / P1 | Accolto: «Data di riferimento», aiuto breve sul significato. Stesso nome nelle schermate economia aggiornate, senza cambiare spentOn o dati storici. |
| S1-02 | Accolto: documento data assente/futura richiede data scelta, nessun fallback silenzioso a oggi. Manuale propone oggi server. |
| S1-03 / P5 | Accolto con precisazione: se arretrati presenti richiedere scelta esplicita, anche se totale corrente sostenuto. Candidate amount_due può essere scelta consapevolmente con avviso, senza obbligare ad inutilmente riscrivere il numero in «Altro importo». Nessuna sottrazione degli arretrati per dedurre un totale non sostenuto. |
| S1-04 | Accolto: totale lordo corrente suggerito; imponibile/IVA informativi, non alternative principali. Altro importo manuale rimane possibile. |
| S1-05 / P2 | Accolto: risultati analisi e bozze aperte persistiti in Spese «Da confermare», personali. Non aggiungere un secondo inbox M3. Modifiche al modulo non salvate non sono automaticamente persistite: avviso uscita; niente «Salva per dopo» che finga di salvare campi editati. Riapertura recupera proposte originali e candidato/costo confermato. Salvataggio di edit bozza futuro solo con endpoint/test dedicati. |
| S1-06 / P3 | Accolto: consenso esplicito per ogni analisi e retry a pagamento, checkbox non preselezionata + azione Analizza. Il solo upload o click che sceglie documento non autorizza trasferimento. Fixture esplicitamente simulata. |
| S1-07 | Accolto: capacità backend autorevole; analisi disabilitata lascia manuale con documento. No spinner eterno/mock fallback. |
| S1-08 / P4 | Sostituito: totale generale include gestione, lavori/acquisti, finanziamento e non classificata. Finanziamento separato nel breakdown e totale «Gestione» distinto. Escludere rate dal generale contraddirebbe H3a/modulo §3 e renderebbe un vecchio costo scomparso dopo classificazione. Scrivere cosa comprende il totale, nessun capitale/interessi sommato due volte. |
| S1-09 | Accolto: filtro ambiente secondo posizione attuale; no cronologia economica riscritta. |
| S1-10 | Accolto per S1: scheda oggetto solo propri costi e rimando lavoro, senza totale lavoro attribuito all'oggetto. La frase «Costo lavoro condiviso» del modulo è obiettivo di incremento multioggetto successivo, non many-to-many attuale. |
| S1-11 | Accolto: somme server dell'intero filtro, non pagina UI. |
| S1-12 | Corretto: collegamento esistente non cambia importo/data/categoria; **se aggiunge documento, incrementa versione costo e evento**, altrimenti mutazione invisibile e CAS incoerenti. Stesso documento già presente: costo no-op, solo conferma bozza. Aggiornamenti valori azione distinta. |
| S1-13 | Accolto: provenienza campi e correzioni nella bozza/storia, senza chiamare fonte manuale «verificata». |
| S1-14 | Accolto: testo ricerca in memoria, fuori URL/next/storage. Le date/filtro e UUID già autorizzati possono essere URL, ma non prova permessi. |
| S1-15 | Accolto: confronto registrazioni, stesso intervallo, basezero niente percentuale, bisestile spiegato, nessun risparmio dedotto. |
| S1-16 | Accolto: create/conferma S1 atomici con metadati/lavoro/oggetto, usando collegamenti G1 canonici. Vie H3a/G1 e recupero due fasi restano compatibili per client vecchi. Non copiare objectId in un secondo modello. |
| S1-17 | Accolto: selezione categoria nativa raggruppata, Non classificata sempre possibile. |
| S1-18 | Accolto: focus titoli/ritorno dopo successo, test reali prima chiusura. Focusbody come rilievo qui è rischio, non bug appena riprodotto. |

## Precisazioni ai wireframe

- Correggere esempio riepilogo Claude: sommare finanziamento anche nel totale generale; mostrare distintamente breakdown gestione/lavori/finanziamento/non classificata. Stesso filtro vale per lista e totale: esempio «Gas» non deve lasciare righe riparazione.
- Consenso provider effettivo/checkbox/tentativo, non sola nota «prima dell'analisi una volta per documento»; una nuova analisi è nuovo trasferimento.
- Manuale da oggetto focus nel primo campo utile quando opportuno; nessuna regressione ActivityForm G1. I wireframe sono proposta, non API runtime.
- Oggetto/lavoro suggeriti: niente generazione di UUID dal modello. Primo estrattore può non proporli, picker autorizzato disponibile. Questo non impedisce la conferma della spesa.
- Fonte revocata redige valori proposti/estratti/candidati; costo già confermato conserva valori dichiarati autorizzati e fonte unavailable. Non fare fallback manuale popolato da una bozza ormai illeggibile.

## Prossimo passo

Congelare DTO/esempi del contratto economy-v1, quindi Codex backend S1a/b e analisi economica fixture S1c; Claude frontend solo con nuovo incarico e baseline aggiornata. Nessuna scelta qui richiede modello di business/prezzo o nuove chiamate Anthropic; paid ancora disabilitato, collaudo live futuro distinto. Nessun runtime o DB modificato da questa revisione.


## Aggiornamento approvato famiglie —14ottobre
La decisione SPESE-FAMIGLIE-20261014.md prevale sulla suddivisione precedente di S1-08: sei famiglie + Altro/Non classificata; totale generale comprensivo mutuo e aggiunta totale senza mutuo/finanziamenti. Le categorie rimangono invariate. Codex adotta repairs_works derivata dal collegamento lavoro (archiviato ancora collegato) e polizza mutuo classificata esplicitamente financing. Nessuna migrazione categorie o modifica del runtime; spec/contratto aggiornati, ancora non congelati. Audit Home e mockup Claude sono materiale di arbitrato, non nuova navigazione adottata automaticamente.
