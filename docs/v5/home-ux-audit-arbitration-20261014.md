# Arbitrato Codex — audit Home, proposta Claude e famiglie approvate

14 ottobre 2026. Sorgenti Claude da02584ef52cd0d8b4df2998049f8ff90cef4854 e9357f2b648fcf8c239a7f3c57046d0652c3b8c6f raccolte selettivamente nel master. Nessun sync o modifica checkout Claude, dirty backend-status.md preservato. Mockup ufficiale SHA256 aecd08be5bd6a7044a2fc5dde95204ba93702187a422eda4542c1f868351c0ef verificato identico alla baseline dell'audit, NON sostituito dalla proposta.

## Verdetto generale

Audit attendibile come revisione esperta: versione identificata,20screenshot, distinzione browser/codice/opinione, selezioni/date via strumenti browser dichiarate, resetQA isolato, scenari parziali e limiti espliciti. Non è ricerca con utenti né prova esaustiva di320/desktop/tastiera/sicurezza. La diagnosi principale regge: due viste economiche duplicate, continuità tra pagine debole, importazioni/bozze disconnesse, troppe informazioni ripetute nella Home.

Non adottare automaticamente tutte le conclusioni o il codice alternativo: alcune descrizioni sono troppo assolute e alcune proposte non rispettano ancora la specifica o lasciano funzioni segnaposto. L'alternativa2 è una buona direzione, da adattare, non un sostituto pronto.

## Base di questa verifica

Letti audit intero, decisione famiglie e sorgente proposta (struttura, dati, navigazione, scheda, riepiloghi, importazione/bozze, secondarie). Screenshot audit18 e09 ispezionati direttamente. Proposta servita in copia byte-identica separata frontend-v5/public/proposta-claude-ux.html; browser390px: Casa->Cucina->Caldaia, scheda a sezioni, registrazione85EUR con ritorno a oggetto e messaggio in linea, Spese->Riepilogo. Larghezza375<=viewport390; scheda~1940px già con soli2documenti/1attività. Viewport poi ripristinato. La prova cambia soltanto dati sintetici della proposta, in sua chiave storage separata. Non riprodotti da Codex tutti21scenari; verdetti seguenti distinguono codice/evidenze e opinioni.

## Rilievi

| ID | Verdetto e base | Proposta Codex |
|---|---|---|
| UXH-001 | Confermato sul codice, evidenze e navigazione della proposta;P1 | Un ingresso Spese, manuale semplice iniziale; Elenco, Per oggetto, Lavori, Riepilogo come approfondimenti. Aggiuntivo significa capacità aggiunte, non obbligo di duplicare pagine. |
| UXH-002 | Confermato sul codice;P1 | Esito import per documento, stessoID/nome/hash lungo analisi/bozza/conferma. Se estrazione tecnica non simulata, limite dichiarato; non mandare a esempi estranei. |
| UXH-003 | Confermato sul codice;P1 | Accantonata recuperabile da Spese/Da confermare, distinta da aperta/confermata; nessuna cancellazione implicita. Il futuro API deve rendere esplicita la semantica oggi chiamata abandoned. |
| UXH-004 | Confermato con precisazione;P2 nel mockup | Checkbox non presele­zionata per mostrare il flusso di consenso futuro. Il pulsante attuale Simula estrazione non trasferisce alcun dato: non è una vulnerabilità Anthropic reale. M4 runtime ha già consenso esplicito. |
| UXH-005 | Confermato sul codice, soluzione di ritorno provata nel browser proposta;P1 | Ritorno all'origine reale o fallback sensato in ingresso diretto; salva da oggetto -> oggetto con esito e Apri costo. Non obbligare sempre a lista o dettaglio costo. |
| UXH-006 | Scelta UX condivisa;P2 | Mantieni sezione durante approfondimento/compito. Cambio esplicito tramite nav principale o Vedi in Spese cambia la sezione; non conservare Casa indefinitamente per ogni pagina visitata. |
| UXH-007 | Confermato con correzione delle evidenze;P2 | Riduci hero e ridondanze. Screenshot18 mostra chiaramente Importa documenti/Aggiungi oggetto sopra la piega: «nulla di azionabile» è falso. Inoltre menu secondario era aperto. Il problema vero è priorità e spazio. |
| UXH-008 | Confermato parzialmente su screenshot/codice;P2 | Un menu secondario compatto e chiuso. Non usare il menu aperto+bannerQA come altezza fissa del prodotto: chiuso non occupa240px. Conserva indicazione globale di mockup. |
| UXH-009 | Scelta prodotto, non difetto automatico;P2 | Scheda ibrida: dati essenziali + anteprime limitate (2documenti,2attività,2costi,3eventi) con Vedi tutti, ancore/chip. Non mostrare liste complete tutte insieme né eliminare approfondimenti. |
| UXH-010 | Confermato sul codice;P2 | Titolo Documenti, ricerca immediata, una primaria contestuale e secondarie. Stato estrazione e visibilità due dimensioni indipendenti; documento disponibile non significa condiviso. |
| UXH-011 | Confermato sul codice;P2 | Ricerca con risultati vicini, filtri attivi e Azzera; no focus/scroll in cima al titolo a ogni filtro. Ritorno conserva query/scroll nel contesto corrente. |
| UXH-012 | Confermato con precisazioni sul codice;P2 | Confermato da te con fonte, mai dalla fonte. Importazioni mostrano metadata, risultati estratti solo dopo analisi. Gli importi del pacchetto attuale sono esempi sintetici dichiarati: non prova di lettura AI eseguita prima del consenso. |
| UXH-013 | Confermato con correzione;P2 | Periodo esplicito in ogni totale; anno corrente separato dagli altri. Non attribuire bollette a caldaia automaticamente, ma un collegamento esplicito resta legittimo: non scollegare dati esistenti per la preferenza del revisore. |
| UXH-014 | Confermato sul codice/evidenza09;P2 | Prima esistente/nuova e importo; descrizione/data visibili, dettagli chiusi, fonte apribile. Candidati simili dichiarano ragione/differenze, non dimostrano duplicato. Non scegliere85vs122 automaticamente. |
| UXH-015 | Confermato sul codice;P2 | Ambiente previsto, filtri compact su mobile/applica chiude, chip e risultati; mantenere scroll/lista al ritorno. Sempre stessi filtri nei totali. |
| UXH-016 | Confermato con correzioni;P2 | Allineare a M2 Solo io/Persone della casa: il secondo concede visibilità Home, non è sinonimo innocuo di non riservato. Cambi solo espliciti. Un documento Solo io può essere condiviso selettivamente dal titolare; non vietarlo solo perché riservato. |
| UXH-017 | Misto scelta/leggibilità;P2 | Manifesto con destinatario/contenuti e avviso finanziario. Vendita richiede conferma chiara. Revoca va identificata e deve avere esito immediato; non imporre una nuova doppia conferma a qualsiasi azione senza valutarne il costo. |
| UXH-018 | Confermato sul codice;P3 | Via codici S1/C1 e stati inglesi dall'interfaccia quotidiana; date, singolare/plurale e formato2.177,90EUR. Mantieni una sola barra esterna di simulazione esplicita. |
| UXH-019 | Scelta di presentazione;P3 | Stato non equivoco e data completamento; icona cerchio/aperto vs spunta/completato. Icona e testo non sono sempre ridondanza inutile. |
| UXH-020 | Confermato sul codice;P2 reperibilità | Da collocare visibile con conteggio quando serve; tipo senza default fuorviante, creazione senza ambiente/documento possibile. |
| UXH-021 | Confermato sul codice;P3 | Elimina link a pagina stessa e nome lavoro ripetuto nelle righe. |

## Cosa recepire della proposta navigabile

1. Quattro porte Casa/Attività/Documenti/Spese, coerenti fra telefono e desktop.
2. Home corta: attenzione utile, ambienti/oggetti, condominio e una sintesi spese. Evita slogan e quattro ripetizioni degli stessi contatori.
3. Spese unica, funzioni avanzate progressive e famiglia approvata nel Riepilogo. Non eliminare inserimento manuale essenziale né altre funzioni già definite.
4. Ritorni/scroll/filtri mantenuti e salvataggi contestuali con messaggio in linea. + globale è scorciatoia; azioni frequenti restano anche nel contesto.
5. Bozza economica corta: esistente/nuova, importo corrente vs arretrati espliciti, manuale libero, dettagli aggiuntivi chiusi e fonti raggiungibili.
6. Da rivedere come segmento di Attività, accessibile dalla scheda; sole verifiche aperte, niente fusione degli stati con promemoria.

## Cosa non importare automaticamente

- Scheda proposta renderizza tutti i documenti, tutte le attività aperte e tutti i costi correnti (codice V.scheda, docs.map/openT.map/cy.map). Già~1940px con pochi elementi: necessita anteprime limitate prima di adottarla.
- «Da fare ora» mescola verifiche/attività e comunicazione ascensore. Una programmazione informativa non è un compito del proprietario; separarli semanticamente e non duplicare la stessa notizia nel blocco Condominio.
- V.altro per Condivisioni/Impostazioni è un segnaposto: sostituire integralmente il mockup ufficiale perderebbe percorsi già presenti (manifesto/revoca/export/vendita). Preservarli.
- Riepilogo proposta ancora management/works/financing/unclassified, non le famiglie approvate. L'approvazione del documento famiglie non rende il codice automaticamente aggiornato.
- Confronto proposta usa anno precedente intero (include manutenzione12nov2025) rispetto all'anno corrente fino14ott2026. Non è intervallo omogeneo; correggere prima adozione. Non interpretare delta come risparmio.
- Raw HTML manca meta viewport e lang/doctype. Funziona nel viewport desktop ristretto, ma non basta per dichiarare resa su telefono reale. Correggere nel nuovo mockup, senza modificare l'originale consegnato da Claude.
- parseEur usa float/Math.round e non impone tutti i limiti H3a. Non usarlo come implementazione monetaria, conservare parser centesimi già verificato.
- Tema scuro e altri abbellimenti non sono una priorità di questo arbitrato. Preservare Blu architettura.

## Famiglie — decisione recepita e punti tecnici risolti

Scelta del committente già approvata; non va sottoposta nuovamente a voto. Spec S1, modulo Economia, arbitrato S1-08 e bozza REST aggiornati. Family derivata server, categorie13+null invariate; sette codici utilities/condominium/taxes_insurance/maintenance_repairs/works_purchases/financing/unclassified. Ultima famiglia raggruppa Altro e Non classificata ma categorie restano distinguibili.

Adottate raccomandazioni Claude: repairs_works con lavoro -> works_purchases, senza -> maintenance_repairs; lavoro archiviato mantiene collegamento, rimozione esplicita cambia famiglia con storia ma non importo o totale. Polizza legata a mutuo -> categoria financing scelta dall'utente, con aiuto nel form; normale insurance -> taxes_insurance. Nessuna categoria nuova, override nascosto, deduzione automatica o backfill. Archiviare lavoro non riclassifica costi.

Generale include tutto; totaleWithoutFinancingCents nello stesso periodo/filtro = generale meno famiglia financing, incluse polizze che l'utente ha esplicitamente classificato lì. Non chiamarlo costo completo di gestione.

## Ordine proposto per il mockup ufficiale

Prima: unificazione Spese/recupero bozze, ritorni e import->fonte corretta, checkbox analisi simulata e glossario visibilità. Poi: Home essenziale e scheda con anteprime limitate, filtri/bozza corti, famiglie e totali senza finanziamento. Preservare secondarie e dati sintetici esistenti o migrare soltanto la chiave mock con backup; nessun cambiamento runtime/DB/main.

Solo dopo nuova navigazione concordata: congelamento contratto S1 e sviluppo. Questo documento propone modifiche al mockup ufficiale; non le ha ancora applicate. La copia di confronto della proposta è separata e byte-identica; nessuna chiamata Anthropic o consumo prodotto.
