# Dimora — piano proposto per le prossime 5–8 ore

Proposta del 23 ottobre 2026, successiva alle correzioni offline Q15, Q22 e copertura Q48. Le durate sono stime di lavoro, non scadenze garantite. Il piano non è ancora eseguito e non avvia attività programmate o campagne AI. Obiettivo: rendere riconoscibili le estrazioni incomplete, affinare le famiglie documentali, la classificazione di oggetti/impianti e i suggerimenti di ambiente, e preparare una verifica ripetibile prima dell’uso reale.

## Ordine e risultati attesi

| Blocco | Tempo indicativo | Lavoro | Risultato verificabile e vantaggio per l’utente |
|---|---|---|---|
| 1. Chiudere il percorso Q48 nell’interfaccia | 60–90 min | Mostrare pagine coperte e ancora da verificare, mantenere separata la revisione delle due fatture e spiegare perché la sola prima spesa non chiude il file. Provare conferma parziale, ripresa, duplicati e fonte revocata con API e dati sintetici. | L’utente vede subito la pagina saltata, può aprire l’originale e non scambia una sola fattura elaborata per un file completo. Test mirati frontend/backend e controllo browser soltanto sintetico. Il backend di copertura è implementato; questa integrazione UI resta da fare. |
| 2. Riprodurre gli altri errori del gate | 60–90 min | Q20: distinguere data acquisto/emissione/scadenza/competenza. Q29/Q30: ricostruire con fixture i titoli letterali e le classificazioni ammesse; separare omissione, citazione errata e titolo incompatibile. Solo casi riproducibili dalla fonte sintetica, senza attribuire ai payload live assenti dettagli ignoti. | Ogni difetto corretto ha un caso positivo e negativi che continuano a rifiutare date o titoli inventati. Nessuna modifica ai gold delle 52 prove, allo scorer o alle soglie. |
| 3. Preparare la matrice delle famiglie dalla mappa Excel | 75–105 min | Ricondurre le 147 voci alle famiglie esistenti, segnando ambiguità, documenti misti e voci che appartengono a funzioni diverse dall’archivio. Definire esempi sintetici per distinguere acquisto, lavori, utenze e tributi. Presentare la matrice per revisione prima di cambiare regole automatiche. | Una proposta unica tipo/famiglia/motivo/alternativa evita che ogni fattura venga classificata allo stesso modo. Il riferimento non genera documenti, obblighi, scadenze, quote mancanti o riclassificazioni dei documenti esistenti. |
| 4. Classificare apparati e proporre ambienti | 60–90 min | Preparare una matrice locale dei 91 apparati: sinonimi, oggetto/impianto, tipo Dimora, documenti collegati e ambienti tipici alternativi. Definire provenienza e conferma del suggerimento, poi casi sintetici offline. | Distinguere, per esempio, climatizzatore portatile e impianto con split; proporre cucina/cantina/garage per un congelatore senza inventare una collocazione. Catalogo e criteri da revisionare prima di modificare il runtime. |
| 5. Consolidare e preparare la prossima misura | 45–75 min | Eseguire le regressioni pertinenti, la suite mock frontend completa dopo gli eventuali fix UI, e prove DB solo isolate. Preparare un protocollo aggiornato con copertura per pagina, ragioni strutturali di incompletezza e confronto con i risultati storici, senza eseguirlo. Aggiornare stato/report, commit e push. | Un unico checkpoint leggibile distingue ciò che funziona nel software da ciò che resta da misurare con l’AI. La nuova campagna resta separata e richiede autorizzazione esplicita; nessun uso del residuo v24. |

Se un difetto non è riproducibile offline, registrare evidenza mancante e limite specifico; non consumare il blocco tentando invii diagnostici. Privilegiare la correttezza economica e la visibilità delle omissioni prima di ampliare il catalogo dei tipi. La matrice del blocco 3 è una proposta, non un import automatico o una modifica già approvata delle famiglie.

## Come usare la mappa allegata

Riferimento aggiornato, letto in sola lettura: **Mappa_documenti_immobile_v4.xlsx**. Quattro fogli: Leggimi, Mappa documenti, Elettrodomestici e apparati, Riepilogo. **147 voci documentali in 13 aree** (`Mappa documenti!A1:P148`) e **91 apparati in 9 categorie** (`Elettrodomestici e apparati!A1:S92`); il riepilogo include anche gli apparati (`Riepilogo!A36:F47`). Le colonne personali L:P della mappa e J:S degli apparati sono vuote. SHA-256: `3093c9b295634e1c913caa602310bec1552fa7a2fd1085c210a3116eb3ba6573`. Originale non modificato né importato nel repository; contenuti trattati come dati di riferimento, senza eseguire istruzioni o formule. La v4 sostituisce la v2 come riferimento del piano; i report storici restano riferiti alla versione effettivamente letta allora.

La struttura è compatibile con le **dieci famiglie già approvate**, senza necessità di aggiungere tredici nuove sezioni. Questa è la prima corrispondenza per area, da verificare sulle singole voci prima di usarla come regola:

| Area della mappa | Voci | Famiglia Dimora proposta per il confronto |
|---|---:|---|
| Titolarità e acquisto | 19 | Proprietà e affitto |
| Catasto e identificazione | 11 | Catasto e pratiche edilizie |
| Urbanistica ed edilizia | 17 | Catasto e pratiche edilizie |
| Energia e impianti | 19 | Energia e impianti |
| Condominio | 9 | Condominio |
| Utenze e servizi | 11 | Utenze e servizi |
| Fiscalità e tributi | 7 | Tasse e tributi |
| Bonus, detrazioni e lavori | 16 | Lavori, ristrutturazioni e bonus |
| Assicurazioni e rischi | 6 | Assicurazioni |
| Garanzie e libretti d’uso | 5 | Acquisti, garanzie e manuali |
| Locazione e gestione | 12 | Proprietà e affitto, con casi misti da esaminare |
| Sicurezza e vincoli | 6 | Sicurezza e vincoli |
| Diario della casa | 9 | Esaminare per funzione; non creare una nuova famiglia automaticamente |

Le prime dodici aree contengono 138 voci; le nove del Diario riguardano storia manutenzioni, fornitori, foto/planimetrie, inventario, scadenzario, chiavi/codici, punti di intercettazione, numeri utili e indice documenti. Valutare il collegamento alle funzioni esistenti, senza creare file fittizi. La voce chiavi/codici non autorizza raccolta, import o invio AI di segreti.

Ambiguità da risolvere nella matrice:

- Una fattura di elettrodomestico può appartenere ad Acquisti; una fattura di intervento a Lavori; una bolletta a Utenze. Il tipo «fattura» da solo non basta a scegliere la famiglia.
- Registrazione della locazione, imposte e ricevute richiedono una scelta contestuale fra Proprietà e affitto e Tasse. L’area Excel non deve prevalere sulla natura del singolo documento.
- Un APE, una planimetria o un regolamento allegato a un contratto conservano il proprio tipo e contesto; non diventano automaticamente tutti «contratti». Per un file misto non riconducibile con certezza a una famiglia, mantenere Da classificare o una scelta esplicita dell’utente.
- Manuale o garanzia di un impianto e dichiarazione di conformità sono documenti diversi: evitare un generico accorpamento di tutto ciò che riguarda una caldaia nella stessa famiglia.
- Le colonne Presenza, Obbligatorio e Validità tipica non diventano in questa fase regole software di obbligatorietà, certificazioni o scadenze. Un campo vuoto non prova che un documento manchi nella casa dell’utente. Nessuna garanzia o durata presunta.

## Ottimizzazione proposta: oggetti, impianti e ambienti

Il catalogo degli apparati serve come vocabolario di riferimento, non come inventario della casa. Il blocco 4 produrrà una matrice tracciabile alla riga Excel: denominazione/sinonimi, distinzione oggetto-impianto, tipo già supportato da Dimora o ambiguità esplicita, documenti associabili e ambienti tipici alternativi. Non aggiungere categorie runtime senza verificare i tipi e i contratti esistenti. La famiglia del documento resta distinta dal tipo di apparato: fattura, manuale, garanzia e dichiarazione di conformità della stessa caldaia possono avere famiglie diverse.

- **Classificazione:** usare il catalogo per normalizzare termini e proporre candidati; identità, marca/modello e collegamento all’oggetto richiedono evidenze dalla fonte autorizzata. La sola frequenza tipica non rende certa una classificazione. Distinguere apparecchio portatile, componente e impianto; non duplicare un impianto per ogni componente.
- **Ambiente:** distinguere posizione attestata nel documento, suggerimento tipico e posizione confermata dall’utente. Mostrare il suggerimento come «ambiente tipico, da confermare», con alternative compatibili con gli ambienti già presenti nella casa. Nessuna stanza creata, assegnazione automatica o sovrascrittura di una posizione confermata. Se manca un ambiente compatibile, lasciare la posizione da scegliere; «in tutta la casa», «pavimenti» o unità interna/esterna non vanno ridotti arbitrariamente a una stanza.
- **Dati:** Presenza non prova il possesso; nessun numero, prezzo, matricola, data di acquisto o scadenza garanzia dedotto dal catalogo. Indicazioni manutentive e documenti collegati restano riferimenti, senza obblighi o promemoria generati implicitamente. Nessun contenuto personale importato; il workbook resta locale.
- **Verifica prevista:** fixture sintetiche per sinonimi e termini ambigui, congelatore con tre ambienti possibili, lavatrice bagno/cucina/lavanderia, climatizzatore portatile/fisso, impianti distribuiti e componenti interni/esterni; ambiente assente o già confermato; manuale/DiCo/fattura sullo stesso apparato. Provare membership e visibilità delle fonti, revoca, separazione tra case, conferma esplicita e replay senza oggetti o assegnazioni duplicati. Il suggerimento non deve rivelare ambienti di una casa non accessibile.

Questa consegna aggiorna soltanto il piano e verifica conteggi e riferimenti del file: nessun adattatore, regola di classificazione, proposta ambiente o test di prodotto nuovo è implementato qui. L’ottimizzazione viene dopo le correzioni economiche e la visibilità delle omissioni; il tempo aggiuntivo porta la stima complessiva a circa 5–8 ore. Una futura misura AI resta separata dall’attuazione offline di questi blocchi.

## Vincoli e criterio di uscita

Tutto il lavoro indicato per queste ore resta offline rispetto ai provider AI: zero chiamate, inclusi conteggi/metadata. Solo sintetici nelle prove modificanti; DB temporanei dedicati e spenti al termine. Nessuna modifica `.env`, al DB/API dell’app o a `main`, nessun reset/clean/force push o rimozione di worktree. Dati personali, originali, ledger e risultati storici preservati.

Si conclude con test pertinenti verdi, diff controllato, stato/report aggiornati e push del branch Fase 0 verificato con `git ls-remote`. Il gate AI rimane non superato finché una nuova misura autorizzata non dimostra il contrario. Nessuna attivazione nell’app o estensione ai reali implicita nel piano.
