# Dimora — piano proposto per le prossime 4–6 ore

Proposta del 23 ottobre 2026, successiva alle correzioni offline Q15, Q22 e copertura Q48. Le durate sono stime di lavoro, non scadenze garantite. Il piano non è ancora eseguito e non avvia attività programmate o campagne AI. Obiettivo: rendere riconoscibili le estrazioni incomplete, affinare le famiglie documentali e preparare una verifica ripetibile prima dell’uso reale.

## Ordine e risultati attesi

| Blocco | Tempo indicativo | Lavoro | Risultato verificabile e vantaggio per l’utente |
|---|---|---|---|
| 1. Chiudere il percorso Q48 nell’interfaccia | 60–90 min | Mostrare pagine coperte e ancora da verificare, mantenere separata la revisione delle due fatture e spiegare perché la sola prima spesa non chiude il file. Provare conferma parziale, ripresa, duplicati e fonte revocata con API e dati sintetici. | L’utente vede subito la pagina saltata, può aprire l’originale e non scambia una sola fattura elaborata per un file completo. Test mirati frontend/backend e controllo browser soltanto sintetico. Il backend di copertura è implementato; questa integrazione UI resta da fare. |
| 2. Riprodurre gli altri errori del gate | 60–90 min | Q20: distinguere data acquisto/emissione/scadenza/competenza. Q29/Q30: ricostruire con fixture i titoli letterali e le classificazioni ammesse; separare omissione, citazione errata e titolo incompatibile. Solo casi riproducibili dalla fonte sintetica, senza attribuire ai payload live assenti dettagli ignoti. | Ogni difetto corretto ha un caso positivo e negativi che continuano a rifiutare date o titoli inventati. Nessuna modifica ai gold delle 52 prove, allo scorer o alle soglie. |
| 3. Preparare la matrice delle famiglie dalla mappa Excel | 75–105 min | Ricondurre le 126 voci alle famiglie esistenti, segnando ambiguità, documenti misti e voci che appartengono a funzioni diverse dall’archivio. Definire esempi sintetici per distinguere acquisto, lavori, utenze e tributi. Presentare la matrice per revisione prima di cambiare regole automatiche. | Una proposta unica tipo/famiglia/motivo/alternativa evita che ogni fattura venga classificata allo stesso modo. Il riferimento non genera documenti, obblighi, scadenze, quote mancanti o riclassificazioni dei documenti esistenti. |
| 4. Consolidare e preparare la prossima misura | 45–75 min | Eseguire le regressioni pertinenti, la suite mock frontend completa dopo gli eventuali fix UI, e prove DB solo isolate. Preparare un protocollo aggiornato con copertura per pagina, ragioni strutturali di incompletezza e confronto con i risultati storici, senza eseguirlo. Aggiornare stato/report, commit e push. | Un unico checkpoint leggibile distingue ciò che funziona nel software da ciò che resta da misurare con l’AI. La nuova campagna resta separata e richiede autorizzazione esplicita; nessun uso del residuo v24. |

Se un difetto non è riproducibile offline, registrare evidenza mancante e limite specifico; non consumare il blocco tentando invii diagnostici. Privilegiare la correttezza economica e la visibilità delle omissioni prima di ampliare il catalogo dei tipi. La matrice del blocco 3 è una proposta, non un import automatico o una modifica già approvata delle famiglie.

## Come usare la mappa allegata

Riferimento letto in sola lettura: **Mappa_documenti_immobile_v2.xlsx**, foglio **Mappa documenti**, `A1:P127`; per appartenenza delle voci sono pertinenti soprattutto `A1:C127` (Area, Sotto-area, Documento). Tre fogli: Leggimi, Mappa documenti e Riepilogo. **126 voci in 13 aree**; le colonne personali L:P non risultano compilate. SHA-256 del file letto: `25922fcf84469174de196946c4208b916d6a2f94e53e87eb6fc6c517023200e8`. Originale non modificato né importato nel repository; contenuti trattati come dati di riferimento.

La struttura è compatibile con le **dieci famiglie già approvate**, senza necessità di aggiungere tredici nuove sezioni. Questa è la prima corrispondenza per area, da verificare sulle singole voci prima di usarla come regola:

| Area della mappa | Voci | Famiglia Dimora proposta per il confronto |
|---|---:|---|
| Titolarità e acquisto | 15 | Proprietà e affitto |
| Catasto e identificazione | 10 | Catasto e pratiche edilizie |
| Urbanistica ed edilizia | 14 | Catasto e pratiche edilizie |
| Energia e impianti | 17 | Energia e impianti |
| Condominio | 8 | Condominio |
| Utenze e servizi | 9 | Utenze e servizi |
| Fiscalità e tributi | 6 | Tasse e tributi |
| Bonus, detrazioni e lavori | 15 | Lavori, ristrutturazioni e bonus |
| Assicurazioni e rischi | 6 | Assicurazioni |
| Garanzie e libretti d’uso | 5 | Acquisti, garanzie e manuali |
| Locazione e gestione | 9 | Proprietà e affitto, con casi misti da esaminare |
| Sicurezza e vincoli | 6 | Sicurezza e vincoli |
| Diario della casa | 6 | Esaminare per funzione; non creare una nuova famiglia automaticamente |

Le prime dodici aree contengono 120 voci; le sei del Diario riguardano storia manutenzioni, fornitori, foto/planimetrie, inventario, scadenzario e indice dei documenti. Si collegano a Storia della casa, Contatti, Oggetti, Attività e Documenti secondo il contenuto, senza duplicare un archivio o creare sei file fittizi.

Ambiguità da risolvere nella matrice:

- Una fattura di elettrodomestico può appartenere ad Acquisti; una fattura di intervento a Lavori; una bolletta a Utenze. Il tipo «fattura» da solo non basta a scegliere la famiglia.
- Registrazione della locazione, imposte e ricevute richiedono una scelta contestuale fra Proprietà e affitto e Tasse. L’area Excel non deve prevalere sulla natura del singolo documento.
- Un APE, una planimetria o un regolamento allegato a un contratto conservano il proprio tipo e contesto; non diventano automaticamente tutti «contratti». Per un file misto non riconducibile con certezza a una famiglia, mantenere Da classificare o una scelta esplicita dell’utente.
- Manuale o garanzia di un impianto e dichiarazione di conformità sono documenti diversi: evitare un generico accorpamento di tutto ciò che riguarda una caldaia nella stessa famiglia.
- Le colonne Presenza, Obbligatorio e Validità tipica non diventano in questa fase regole software di obbligatorietà, certificazioni o scadenze. Un campo vuoto non prova che un documento manchi nella casa dell’utente. Nessuna garanzia o durata presunta.

## Vincoli e criterio di uscita

Tutto il lavoro indicato per queste ore resta offline rispetto ai provider AI: zero chiamate, inclusi conteggi/metadata. Solo sintetici nelle prove modificanti; DB temporanei dedicati e spenti al termine. Nessuna modifica `.env`, al DB/API dell’app o a `main`, nessun reset/clean/force push o rimozione di worktree. Dati personali, originali, ledger e risultati storici preservati.

Si conclude con test pertinenti verdi, diff controllato, stato/report aggiornati e push del branch Fase 0 verificato con `git ls-remote`. Il gate AI rimane non superato finché una nuova misura autorizzata non dimostra il contrario. Nessuna attivazione nell’app o estensione ai reali implicita nel piano.
