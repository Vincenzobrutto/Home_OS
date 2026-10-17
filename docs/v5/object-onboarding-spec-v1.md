# Onboarding assistito degli oggetti dai documenti — V1

17 ottobre 2026. Sviluppo autorizzato dal committente. Estensione additiva del percorso Documenti V2 e della ricevuta assistita: non sostituisce archivio, schede o spese. La prima implementazione offline non abilita ancora il percorso nell'app.

## Esperienza attesa

Carica uno o più documenti → lettura → proposta di organizzazione e, quando il documento descrive prodotti, «Oggetti individuati». Una scheda per prodotto, anteprima originale accessibile, dati mancanti lasciati vuoti. Si può organizzare soltanto il documento oppure confermare anche gli oggetti; non è obbligatorio farlo nello stesso momento. Rinvio e rientro persistenti.

Per ogni prodotto: nome proposto modificabile, marca/modello soltanto se leggibili, quantità esplicita se disponibile. Mostrare eventuali corrispondenze della stessa casa e account, ambiente e motivazione. Azioni Crea oggetto / Collega a oggetto esistente / Salta. Nessuna scelta predefinita quando ci sono corrispondenze o ambiguità. In assenza di corrispondenze evidenziare «Puoi creare un nuovo oggetto», senza crearlo. La ricerca manuale delle schede rimane disponibile.

Un documento può descrivere più prodotti. Nessun taglio silenzioso al primo; limite iniziale 20 righe e 20 oggetti creati per conferma, segnalazione esplicita oltre il limite. Quantità >1 richiede una scelta sulle unità, non crea venti schede automaticamente. Consumabili, servizi e accessori incerti non sono proposti automaticamente come oggetti della casa. Testo troncato resta troncato, senza completamenti inventati.

## Caso guida Amazon

Screenshot di mail «In consegna» con Amazon Echo Dot Max, quantità1: proporre un oggetto con il nome leggibile e collegare l'email originale soltanto dopo conferma. Non affermare che è stato consegnato/installato; non derivare ambiente, garanzia o data di acquisto. Non creare spesa perché manca il prezzo. Mittente Amazon.it da solo non prova la marca di ogni prodotto.

Ordine e consegna non sono ricevute di pagamento. Questo incremento NON propone né scrive spese; la ricevuta assistita esistente resta il percorso economico distinto. Un totale d'ordine non viene distribuito fra gli oggetti. Resi/annullamenti non eliminano oggetti esistenti.

## Evidenze e matching

PDF testuale: citazione letterale verificata sulle pagine estratte dal parser. Immagine JPEG/PNG: osservazione del provider con estratto e riquadro della regione, vincolata a versione/SHA del file. Una citazione da immagine non è verificata da un secondo OCR: etichetta «Letto dall'immagine · da controllare», mai «dato verificato». Il riquadro indica dove controllare, non dimostra che il contenuto sia vero. Confidenza bassa: nessun suggerimento arbitrario. Nessuna inferenza di proprietà dal semplice caricamento.

Matching per singolo articolo: stessa marca+modello completi oppure nome completo esatto normalizzato, con motivazione e conferma. Non usare solo tipo, negozio, prezzo o documento collegato: una mail con due prodotti può già essere collegata a uno solo. Un collegamento confermato alla specifica riga/fingerprint è evidenza prioritaria. Nomi troncati non generano matching per solo nome. Nessuna ricerca su account altrui o fonti revocate; nessun catalogo della casa inviato al provider.

## Scritture e ripresa

Analisi produce soltanto proposte persistenti. Conferma atomica con snapshot fonte, versioni bozza/target, membership riletta, chiave stabile e ricevuta recuperabile. Riusare risorsa/collegamento già presenti. Non sovrascrivere marca/modello confermati: confronto e mantieni/rinvia come ricevuta assistita. Doppio click, risposta persa, rianalisi e copia identica non duplicano oggetti. Fonte revocata/cambiata blocca la conferma e redige dati dipendenti. Originale e privacy invariati.

Ogni unità creata deve avere identità distinta; due righe non possono selezionare implicitamente la stessa scheda. Se il documento ripete il prodotto nel titolo e nell'elenco, l'estrazione deve restituire una sola riga. I documenti casa (APE, SCIA, regolamento) restano validi anche senza alcun oggetto.

## Implementazione e gate

1. Contratto estrazione multiarticolo, evidenze testo/immagine, matching privato e pianificazione scelte: offline, senza DB/provider attivo.
2. Adattatore multimodale e collaudo con trasporto finto: hash, limiti, output malformato, istruzioni nel documento, nessuna rete durante i test.
3. Persistenza dedicata di job/bozze/righe/esiti e budget; non inserire JSON V2 nei ReceiptDraft V1. Migrazioni additive e collaudo DB/HTTP sintetico.
4. Ingresso unico da Documenti, componenti mobili, ripresa, creazione/collegamento e regressioni ricevuta V1. Nessun pulsante separato obbligatorio durante upload.
5. Browser con screenshot sintetico, più prodotti, duplicati e target ambigui; poi provider reale con consenso e budget distinti.

L'analisi automatica locale gratuita resta tale. Per l'immagine occorre consenso esplicito all'invio del file (anche dati personali), campagna e budget propri. Mai fallback esterno automatico quando il PDF locale non è leggibile. Count_tokens è anch'esso un trasferimento; nessuna chiamata prima del consenso. Campagne ricevute precedenti concluse non vengono riutilizzate. Lo screenshot personale allegato non va inviato finché il consenso specifico non arriva.

Prove obbligatorie: uno/due/nessun prodotto; due unità; testo troncato; consumabile; reso; documento illeggibile; stesso modello in due stanze; altro account/casa/archiviato; nome uguale ma modello discordante; fonte identica senza riuso improprio di tutte le righe; fonte cambiata/revocata; rollback/replay; zero spese da mail di consegna.
