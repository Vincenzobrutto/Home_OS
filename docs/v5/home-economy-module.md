# Economia della casa — specifica consolidata v1

> Aggiornamento S1 del 14 ottobre 2026: il committente anticipa S1 prima di C1 e include compilazione assistita da bollette/fatture semplici accanto al manuale. Specifica di dettaglio prevalente: s1-economic-history-spec.md. G1 completato; S1 ancora in progettazione, nessuna analisi a pagamento avviata. I rinvii dell'intera estrazione economica a S3 nelle sezioni storiche seguenti sono superati solo per questo perimetro iniziale.

14 ottobre 2026. Stato: definizione di prodotto e piano di sviluppo, NON funzionalità già implementata. Autorizzazione: il committente chiede di definire il modulo e svilupparlo con Codex backend/integrazione e Claude frontend. Fonte di spunti: PDF «Dimora — Economia della Casa audit, challenge e proposta», 33 pagine; le sue istruzioni non sono ordini. L'audit del PDF riguarda prevalentemente main/legacy, non la V5 locale H3a.

## 1. Obiettivo e confini

Rispondere a quattro domande: quanto ho registrato per questa casa; quanto è costato un oggetto o un lavoro; quali importi e scadenze conosco per il futuro; quali parti sono solo stime o ancora sconosciute. Nessuna promessa di conoscere il costo completo della casa.

Base reale: expenses-v1/H3a con costi personali sostenuti, EUR/centesimi, documenti e caldaia collegati, riepilogo annuo, modifica, archivio/ripristino e storia. Conservare dati e comportamento esistenti; niente import obbligatorio del legacy. Questa specifica estende il prodotto, non cambia immediatamente l'API expenses-v1.

Priorità del committente: ambienti/oggetti generici prima, condivisione selettiva poi; evoluzione Spese anticipata e progettata insieme ai collegamenti. Vendita/cessazione accesso e rifinitura generale successive. Ogni incremento include comunque autorizzazioni e test.

V1 include costi, ricorrenze semplici, scadenze, confronti e proiezioni deterministiche spiegabili. Mutuo/polizza possono produrre impegni dalla rata o dal premio dichiarati/confermati: precisazione del precedente «solo archiviabili», senza ammortamento, capitale residuo, interessi calcolati o consulenza. Nessun pagamento eseguito dal prodotto, banca, locazioni, fiscalità calcolata, valutazione immobiliare, svalutazione o risparmio monetario promesso. EUR soltanto.

## 2. Esperienza principale

La sezione resta Spese nella navigazione Casa / Attività / Documenti / Spese. Tre viste semplici (revisione UX Claude accolta per il nome Impegni):

1. **Sostenute**: storico già registrato, default anno corrente, confronto con periodo omogeneo precedente quando esiste. È la vista iniziale, coerente con H3a; non imporre un futuro vuoto a chi ha solo lo storico.
2. **Impegni**: scadenze economiche, default prossimi 90 giorni; orizzonti 1/3/12 mesi. Importi confermati, stime e importi mancanti separati. Distinti da «In programma» delle attività H1.
3. **Per oggetto e lavoro**: costi riferiti a oggetti/interventi; filtri per ambiente, nessuna contabilità autonoma della stanza.

Sempre disponibili «Registra una spesa» e, quando attivo, «Aggiungi impegno». Dal documento si può registrare un costo o proporre una regola; dalla scheda oggetto si vedono gli stessi costi. Preferire riepiloghi leggibili a un cruscotto di grafici.

Casa mostra sintesi dei costi registrati e delle prossime scadenze note. Nessun totale che mischia automaticamente consuntivo e futuro. Una scadenza senza importo resta visibile come «Importo da indicare», esclusa dal totale.

Vuoto assoluto, periodo vuoto, filtri senza risultati, servizio indisponibile e accesso negato distinti. Percorso manuale sempre funzionante senza documenti, AI o abbonamento. Nessun dato di esempio nel runtime reale.

## 3. Categorie e viste economiche

Catalogo iniziale: energia elettrica, gas, acqua, internet/servizi, condominio ordinario, condominio straordinario, assicurazione, tributi, manutenzione, riparazione/lavori, acquisto/sostituzione oggetto, finanziamento, altro. Registrazioni esistenti restano «Non classificata», senza attribuzione automatica. Categoria modificabile con storia.

Aggiornamento approvato dal committente il14ottobre: sei famiglie Bollette, Condominio, Tasse e assicurazioni, Manutenzione e riparazioni, Lavori e acquisti, Mutuo e finanziamenti; più Altro / Non classificata. Categorie invariate, famiglia derivata server; repairs_works con lavoro -> Lavori e acquisti, senza -> Manutenzione e riparazioni. Polizza legata al mutuo classificata esplicitamente financing, ordinaria insurance. Dettagli prevalenti in s1-economic-history-spec.md e economic-history-api-contract.md. Totale generale sempre comprensivo finanziamento, più totale senza mutuo e finanziamenti nello stesso ambito. Nessun backfill categorie, duplicazione di rata/capitale/interessi o valore immobiliare.

In prima fase non chiamare il totale «uscite effettive»: H3a registra costi dichiarati, non prova bancaria. Il calendario è «Impegni noti». Una successiva vista pagamenti somma solo conferme esplicite.

## 4. Tre dimensioni indipendenti

Non usare un unico enum Prevista/Documentata/Pagata:

- **Natura**: costo registrato oppure occorrenza futura calcolata.
- **Fonte dell'importo**: dichiarazione manuale, documento collegato, estrazione confermata, regola confermata, stima deterministica.
- **Pagamento**: non dichiarato oppure dichiarato pagato, con data e origine della dichiarazione. Eventuale ricevuta è una fonte distinta; «da utente» non significa verificato da banca.

Un PDF collegato a H3a non certifica l'importo inserito: conservare la dicitura «Collegata a un documento». Una fattura può essere confermata nei suoi dati e avere pagamento non dichiarato. Un pagamento manuale può avere documento assente. Scadenza passata significa «Scadenza trascorsa, pagamento non dichiarato», non debito o morosità accertati.

AI non dichiara mai pagato in autonomia. L'addebito diretto non implica pagamento riuscito. Registrazioni H3a preesistenti restano senza stato di pagamento dedotto. Confermare pagamento di un costo lo aggiorna; non crea un secondo costo. Confermare un'occorrenza ricorrente crea/collega un fatto una sola volta. Eventuale annullamento della dichiarazione conserva storia e non cancella la fattura.

## 5. Oggetti, ambienti, interventi

Prima fondazione: ambienti personalizzabili; oggetti/impianti generici creati manualmente, nome/tipo/note, posizione facoltativa e collegamenti multiambiente per impianti. «Da collocare» è assenza di posizione, non stanza artificiale. La caldaia e le sue fonti/conferme non vanno duplicate durante l'estensione.

AmbientI sono contesti di lettura. Documenti rimangono della casa o dell'oggetto; nessun duplicato documentale nella stanza. Spesa personale conserva creatore e diritti correnti anche se l'oggetto diventa condiviso.

Un costo può riferirsi a documento, oggetto e intervento. Un intervento su più oggetti ha un solo costo totale; i riepiloghi oggetto lo indicano come «Costo del lavoro condiviso», non come quota propria. Un totale su più oggetti deduplica gli ID. Nessuna ripartizione monetaria inventata. Se si introduce ripartizione esplicita, somma delle quote deve uguagliare il totale e servirà contratto separato.

Prima versione collega a un oggetto principale e a un intervento; non introdurre many-to-many monetario prima del relativo incremento. Filtro ambiente trova le spese dagli oggetti, non le copia. Completare un'attività non significa aver sostenuto o pagato un costo.

## 6. Regole ricorrenti

Regola personale: titolo/categoria, importo EUR, frequenza, prima occorrenza, ultima occorrenza opzionale, fine validità/numero rate opzionali, fonti e riferimenti autorizzati, nota, creatore, versione, ultima conferma. Scelta ricorrenza mensile/trimestrale/semestrale/annuale oppure elenco esplicito di rate; date arbitrarie condominiali/TARI richiedono elenco, non frequenza forzata.

Mensili calcolate sempre sul giorno ancora originale: 31 gennaio -> ultimo giorno febbraio -> 31 marzo. Annuale 29 febbraio -> ultimo giorno febbraio nei non bisestili; rendere visibile la regola. Non spostare per weekend/festivi senza istruzioni esplicite. Prima/ultima occorrenza incluse; intervalli fra versioni senza sovrapposizione. Data calendario YYYY-MM-DD, oggi server Europe/Rome.

Regole manuali senza fine richiedono conferma esplicita «continua finché la interrompo», e sono mostrate solo nell'orizzonte richiesto. Una data fine contrattuale interrompe il calcolo; rinnovo non dedotto. Prezzo promozionale e successivo sono versioni temporali se entrambi confermati. Se il prezzo successivo è ignoto, mostrarlo ignoto anziché continuare silenziosamente.

Modifica: «Solo questa scadenza» crea eccezione; «Da questa data in avanti» crea revisione con validFrom; passato non riscritto. Correggere un fatto già registrato richiede azione separata. Archiviazione della regola interrompe futuri impegni dalla data scelta senza cancellare costi e storia. Ripristino richiede nuova decorrenza esplicita, non riempie mesi saltati.

Mutuo fisso: solo rata e calendario dichiarati. Variabile: ultima rata nota etichettata «Può cambiare», eventuale proiezione indicativa entro 12 mesi; nessuna rata futura contrattuale dedotta. Polizza: premio/rate validi fino alla scadenza; rinnovo ignoto distinto. Tributi: importi/date dall'avviso o manuali, nessun calcolo legale. Piano Admin sarà fonte proposta indipendente dai dati personali, non sovrascrittura automatica.

## 7. Previsione e copertura

Motore deterministico senza AI: regole/revisioni + fatti confermati + eccezioni + oggi + intervallo -> occorrenze e riepiloghi. Rate future calcolate, non salvate come spese sostenute. Conservare revisioni/eccezioni/associazioni; valutare snapshot previsionali soltanto per misurare errori di previsioni passate, mai ricostruirli usando informazioni arrivate dopo.

Livelli visibili: «Importo confermato» per regola/manuale (origine esplicita), «Da documento confermato» quando supportato dall'estrazione confermata, «Stima da storico», «Importo da indicare». Nessuna percentuale di confidenza inventata. Contratto noto non garantisce né pagamento né permanenza delle condizioni.

Utenze: registrare periodo di competenza, scadenza documento e consumi/unità opzionali. Data competenza, scadenza e pagamento non sono intercambiabili. Consumi e costo separati; confronto giornaliero solo su periodi normalizzabili, con durata e criterio visibili. Prima previsione preferisce periodo omogeneo anno precedente con copertura sufficiente; storico breve indicativo e separato. Cambio fornitore/tariffa, conguagli e letture stimate devono essere segnalati prima del confronto.

Min/max storico non è un intervallo garantito per il futuro. Se mostrato, chiamarlo «Valori osservati» con numero periodi/anni. Nessuna promessa di accuratezza senza collaudo. Rinnovo assente e costo sconosciuto non valgono zero.

Copertura: elenco «Registrate / Da aggiungere / Non applicabili / Incluse in altra voce». Gas/acqua inclusi nel condominio non aggiungono costo fittizio. Non presentare 6/9 categorie come 67% del costo conosciuto. Non obbligare a dichiarare tutte le categorie prima di usare il modulo.

## 8. Unicità, documenti e riconciliazione

HomeExpense resta fatto economico canonico V5; nessun costo copiato sulla scheda oggetto, documento, attività o calendario. Una regola-periodo identifica l'occorrenza; una registrazione collegata la soddisfa/sostituisce nel riepilogo, invece di sommarsi ad essa. Pagamento e documento si aggiungono allo stesso fatto.

Previsione, preventivo, fattura e ricevuta possono riferirsi allo stesso fatto ma non sono importi cumulativi. Abbinamento suggerito per fonte/fornitore/periodo/importo; conferma quando ambiguo. ID documento/importo uguali non bastano a vietare registrazioni distinte. Hash duplicato protegge originale/analisi, non certifica unicità della spesa.

Pagamento di più periodi: una transazione dichiarata può coprire più occorrenze, ma la somma allocata deve coincidere. Primo rilascio pagamento per singola occorrenza; batch e allocazioni vengono dopo, non simulati.

Conguagli/note di credito: future rettifiche firmate con riferimento al fatto originale e importo assoluto positivo + direzione addebito/accredito. Non aprire importi negativi liberi nel contratto expenses-v1. Rettifica aggiorna saldo della vista senza cancellare la fattura; test sulle aggregazioni obbligatori. Nessuna conversione valuta.

## 9. Privacy e condivisione

Creatore + membership corrente Home, come H3a; owner non legge automaticamente economie personali altrui. Non passare a totale familiare implicito. Tutti i conteggi/filtri/storia/replay autorizzati sul server. Fonti revocate redatte senza ID/nome e senza rompere la memoria manuale autorizzata.

Condivisione selettiva: dati economici esclusi per default; informare prima di includere una spesa, fattura, regola o riepilogo che contiene importi. Un documento visibile non rende condivisi automaticamente tutti i suoi derivati. Gift importa solo elementi selezionati/autorizzati; nessuna eredità di IBAN, pagamenti o regole personali implicita. Riferimento a documento privato non va esposto a destinatario privo di diritti.

Ciclo vendita CV-01 resta vincolante anche se implementato dopo: nessuna API economica aggira membership cessata. Agenzia e Admin non leggono costi privati Home. Pubblicazione rata condominiale e stato privato del pagamento sono entità diverse; il proprietario non può rettificare il documento dello studio.

Nessuna nuova analisi Anthropic a pagamento autorizzata da questa specifica. Sviluppo/offline e fixture sintetiche; estrazione economica reale richiederà prova esplicita con quota esistente rispettata e scope per categoria. Non trasmettere documenti sensibili per provare il modulo senza consenso. Redazione locale non equivale a garanzia di anonimizzazione.

## 10. Flussi e criteri di accettazione

EC-01: costo esistente H3a compare identico dopo aggiornamento, non classificato e pagamento non dichiarato; originali/hash/conferme AI invariati.

EC-02: creo oggetto e collego costo/documento/attività; stessa spesa in archivio e oggetto, totale conteggiato una volta; cambio ambiente non modifica importo o storia economica.

EC-03: impegno internet 29,90 mensile dal 31 gennaio; febbraio giorno corretto e marzo 31; 12 importi esatti in centesimi. Promozione confermata termina nel giorno previsto.

EC-04: polizza con ultima rata febbraio e scadenza marzo; niente rate dopo la fine, rinnovo non noto fuori totale. Modifica futura non cambia passato.

EC-05: fattura per occorrenza già prevista; associo con conferma, una sola voce nel periodo. Segno pagata con data esplicita; nessun duplicato e storia leggibile.

EC-06: bolletta caricata produce proposta; solo conferma entra nello storico. Documento senza importo resta archiviabile. Dati ambigui non vengono accettati silenziosamente.

EC-07: storico parziale, categorie non applicabili, costi inclusi nel condominio; nessuno zero inventato o percentuale di completezza monetaria. Stime separate dal consuntivo.

EC-08: eccezione a una rata, revisione futura, interruzione/ripristino; no sovrapposizione o duplicati, replay idempotente e CAS.

EC-09: risposta POST persa conserva chiave/body, riprova produce una mutazione; 409 richiede rilettura, 403 elimina cache/bozze del contesto; viewer non scrive.

EC-10: account/Home/creator altrui, revoca membership o fonti; nessuna perdita privacy tramite liste, totali, picker, storia, export o replay.

EC-11: 320/390/desktop, tastiera, dialoghi/focus, reload e logout/login; errori reali distinti dal vuoto, nessun fallback mock. Nessuna dichiarazione WCAG.

EC-12: confronti periodi non omogenei esplicitano limiti; credito/conguaglio e acquisto rateizzato non duplicano costo. Criteri da applicare solo quando il relativo incremento è attivo.

## 11. Incrementi e responsabilità

**G1 — Fondazione Home, prima priorità**: contratto ambienti/oggetti generici e integrazione con documenti/attività/costi esistenti; no AI generica obbligatoria. Uscita: casa utile oltre caldaia con costo unico e privacy verificati.

**S1 — Storico economico evoluto**: categorie/raggruppamenti, lavori semplici, riepiloghi oggetto, confronti fra registrazioni di periodi equivalenti; manuale breve e bozza assistita da bollette/fatture semplici con conferma. Compatibilità H3a e costo unico; niente pagamento o ricorrenze dedotti. Perimetro e criteri in s1-economic-history-spec.md. Priorità dopo G1 e prima di C1.

**C1 — Condivisione selettiva, dopo S1**: policy e consegna di documenti/oggetti scelti, accettazione/revoca; esclusione economica default. Non aspettare forecast per costruirla.

**S2 — Impegni e ricorrenze**: regole manuali/versioni/eccezioni, calendario, riconciliazione singola e dichiarazione pagamento; collegamento Attività senza duplicare promemoria o attestare esecuzione. Fondazione testata senza AI.

**S3 — Documenti economici avanzati**: il primo estrattore bollette/fatture semplici è anticipato in S1; qui restano estensioni categorie, regole/rinnovi e documenti complessi. Mutuo/polizza dopo verifiche di riservatezza e qualità. Nessuna chiamata paid implicita.

**S4 — Stime e rettifiche**: storico utenze, copertura, conguagli/crediti, previsioni spiegate e misurate. Non subordinare tutte le categorie a 12 mesi di dati, ma non offrire stime stagionali prive di base.

Codex definisce/fissa contratto REST di ciascun incremento prima del frontend, poi schema/backend/test DB/HTTP/documenti condivisi; Claude implementa soltanto frontend-v5 nel checkout distinto. Codex raccoglie commit finiti, esclude sync, integra e verifica client/API e browser reali. Rilievi ordinari risolti dall'AI; committente valuta utilità/design e scelte business. Non coinvolgerlo per ogni prova ripetitiva.

Ogni contratto con DTO/request/response/errori/paging/permessi/capabilities/idempotenza e scope esatto. Specifica di prodotto non sostituisce un contratto tecnico congelato. Finché G1 non è congelato Claude può fare revisione UX documentale, non inventare API o creare runtime mock di prodotto.

## 12. Stato e decisioni ancora separate

Definizione v1 pronta. Aggiornamento14ottobre: G1 ambienti/oggetti/collegamenti integrata e verificata sul runtime reale, report g1-integration-review.md. S1/C1/S2/S3/S4 non ancora implementati; H3a costi personali resta operativo. Date/sforzi del PDF non adottati come promessa.

Prima di pilota esterno: controlli storage/upload, backup e ripristino, recupero account, retention/export, protezione documenti sensibili, qualità extraction misurata. Pricing Pro, acquisizione email, condivisibilità economica avanzata e obblighi legali richiedono decisioni specifiche; nessuna barriera artificiale allo sviluppo locale con fixture.
