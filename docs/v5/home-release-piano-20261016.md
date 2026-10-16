# Home — piano di release prima di Agenzie, 16 ottobre 2026

**Proposta di pianificazione, non avvio dello sviluppo.** Ordine approvato dal committente conservato: Fase0 → BL-04 → BL-01 → BL-02 manuale → BL-03 essenziale → BL-10 → BL-10b → Agenzie. I vecchi rinvii di rubrica e storia sono superati solo per il perimetro ora approvato. Non sostituire le funzioni operative esistenti.

## Fonti e raccolta

Backlog Claude: `frontend-v5/docs/home-backlog-proposition-20261016/BACKLOG.md`, versione7ac52f7. Fonte delle decisioni di rilascio: istruzione diretta del committente e Piano di release finale, prevalenti sul testo introduttivo che lascia a Codex l'ordine definitivo. Documenti Drive elencati da Claude non riletti direttamente in questo incarico: il piano stima i requisiti consegnati confrontandoli con codice e contratti locali, non certifica le fonti Drive.

Audit UX ef454e4 già raccolto492622b e arbitrato in `home-rifinitura-arbitrato-20261016.md`; focus e terminologia corretti1a15ad4. Non duplicarlo. Backlog fa4a7bf/203ff28/9ba0204/c0ab03a/1be0a6d/d1b63b7/7ac52f7 raccolto come39b822e/b61b542/75a7b6f/2e342e9/5e7cb87/61c6108/34b863d. Solo documenti, niente sync né codice Claude.

## Stima preliminare

Giornate **equivalenti di lavoro tecnico** per progettazione di dettaglio, codice, integrazione e prove; non durata di esecuzione dell'AI né promessa di calendario. Una giornata equivale circa8ore di lavoro focalizzato. Stime da rifissare dopo ogni contratto; attese del committente, accessi/costi esterni e validazioni su telefoni reali escluse. Codex e Claude possono sovrapporre backend/frontend soltanto dopo congelamento del contratto, senza sommare i crediti ai giorni o promettere riduzioni automatiche.

| Ordine | Blocco | Specifica/contratto | Backend e dati | Frontend | Prove e integrazione | Totale |
|---|---|---:|---:|---:|---:|---:|
| 0 | Prerequisiti pilota, parte restante |0,5–1|1–2|0,5–1|1|**3–5** |
| 1 | BL-04 Scatta una foto |0,25|0|0,5–1|0,25–0,75|**1–2** |
| 2 | BL-01 Proponi prossimo promemoria |0,5–1|0,5–1|0,5–1|0,5–1|**2–4** |
| 3 | BL-02 Garanzia manuale |0,5–1|1–1,5|1–1,5|0,5–1|**3–5** |
| 4 | BL-03 Storia essenziale |1–1,5|1,5–2,5|1–2|1,5–2|**5–8** |
| 5 | BL-10 Mini-rubrica |0,5–1|1,5–2|1–1,5|1–1,5|**4–6** |
| 6 | BL-10b Documento → costo/professionista/oggetto |1–1,5|2–3,5|1,5–2,5|1,5–2,5|**6–10** |
| 7 | Stabilizzazione trasversale e prova pilota |—|—|—|2–3|**2–3** |

**Totale base26–43giornate equivalenti**, oltre al backup già svolto. Riserva di pianificazione circa20%: **31–52**. Non sono scadenze personali o un preventivo commerciale. Fase0 è la stima meno stabile finché non si sceglie come recuperare l'account; BL-10b è più grande della M di Claude perché richiede conferma atomica e deduplicazione, non solo campi di estrazione. La scomposizione evita di impegnare tutta la release prima delle verifiche intermedie.

## Fase0 — gate del pilota, non una spunta generica

| Prerequisito | Stato verificato ora | Uscita richiesta |
|---|---|---|
| Backup/restauro | **Completato** sul DB dedicato e255originali,41tabelle; rapporto backup-verifica-20261016.md | Nuova copia prima di migrazioni; destinazione separata dal PC da concordare, istruzioni di recupero conservate |
| Recupero account | **Mancante:** auth.controller offre session/register/login/logout, non recovery; identità email non verificata | Contratto identity esteso: prova del possesso, token monouso hashed/scadenza, rate limit/risposte neutre, sessioni revocate dopo reset e nessuna fuga in log |
| Storage/upload | PDF/JPEG/PNG e20MiB già operativi, file privati e hash verificati | Check mirato nomi/formati falsi, file grandi, quota/spazio, accessi, file corrotti e fallimenti; comportamento esplicito su HEIC/scansioni |
| Conservazione/export | ZIP originali già esiste; **non equivale** a export di attività, costi, oggetti e futura rubrica | Decidere perimetro del pilota e formato esportabile dei dati personali; policy esplicita su conservazione/chiusura, senza nuove cancellazioni implicite |
| Documenti sensibili | Visibilità Solo io, autorizzazioni e test già presenti | Verificare backup/download/log/sessioni, accesso dal solo ambiente concordato, istruzioni sul dispositivo; non scambiare questa verifica con audit completo |
| Qualità AI | Due esempi live precedenti non bastano a una misura generale; nessuna nuova chiamata autorizzata qui | Corpus golden di20–30documenti sintetici tipici/ambigui/negativi, metriche per campo e provenienza; benchmark provider reale solo con file e budget concordati |

**Decisione da chiudere prima di implementare recovery:** propongo email verificata e servizio transazionale riusabile. BL-08 riguarda il riepilogo settimanale, quindi resta rinviato; una base email per il recupero è infrastruttura distinta. Selezione fornitore, trattamento dei dati e costo vanno approvati prima di attivazioni. Alternativa per un pilota strettamente locale: codici di recupero monouso, da progettare/validare; nessun reset amministrativo per semplice dichiarazione dell'email. La stima assume una sola soluzione, non entrambe, e non include tempi di attivazione esterna.

Per i documenti veri distinguere **pilota manuale** e **analisi reale**: nessun dato deve partire verso un provider solo perché è stato caricato. Non dichiarare chiusa la Fase0 sulla sola prova backup. Prima dell'apertura del pilota vanno esplicitamente approvati gli esiti/limiti ancora aperti; questa pianificazione non concede deroghe automatiche.

## BL-04 — foto: acquisizione, non OCR automatico

Riutilizzare upload M2: comando distinto per scatto e scelta file, privacy Solo io, nessuna analisi automatica. Iniziare con input capture per immagini supportate, mantenendo galleria/file come alternativa. JPEG/PNG restano limite server; non promettere JPEG su ogni sistema senza prova su iPhone/Android. HEIC va rifiutato con istruzioni comprensibili; conversione/compressione aggiuntive non sono comprese se richiedono un sottosistema nuovo.

**Conflitto di promessa:** l'estrattore corrente `review/pdf-text.ts` e l'adapter economico usano testo PDF; foto e PDF scansionati non diventano leggibili con il solo pulsante fotocamera. In questa release BL-04 garantisce scatto/archiviazione, non «fotografi e l'AI legge» su foto. OCR/visione non approvati né inclusi nella stima: prima di estendere la promessa serve progettazione esplicita, non un fallback nascosto. Verifica telefono reale richiede un accesso di sviluppo concordato: nessuna apertura firewall/LAN o disabilitazione Origin implicita.

Gate: scatto fisico, upload/ripresa errore, limiti/visibilità e nessun job AI avviato. Non basta emulare la viewport.

## BL-01 — completamento e proposta del successivo

Il contratto activities-v1 oggi esclude ricorrenze: aggiornamento esplicito del perimetro. Non è BL-09/S2: nessuna regola ricorrente, scheduler, costo o adempimento automatico.

Proposta tecnica: dopo completamento mostrare6/12/24mesi o data libera; base proposta = data di completamento nel calendario Europe/Rome, etichettata e modificabile. Chiarire prima del contratto se si preferisce la precedente scadenza. Mesi con giorno mancante gestiti come ultimo giorno del mese, non multipli fissi di30giorni.

**Serve backend**, non solo un secondo POST dal browser: riferimento persistente all'attività precedente, legame leggibile nella storia di entrambe, idempotenza della conferma e protezione dalla doppia creazione dopo retry/refresh. Verificare completamento/versione e prevenire duplicati anche quando l'attività viene riaperta/completata di nuovo. Proposta ignorata non lascia attività fittizie.

Copia di titolo/descrizione e collegamenti autorizzati, sempre modificabile. G1 collega attività a oggetti generici separatamente da assetId della caldaia H1: entrambi i casi devono essere coperti. Se un collegamento è revocato non copiarlo né mostrarne il nome. Creazione e legami nello stesso esito transazionale.

Gate: doppio clic, retry, fonte riaperta, mese bisestile, cambio Home/account, membro/viewer e link non più leggibile. Nessuna modifica automatica alla manutenzione tecnica.

## BL-02 — garanzia manuale

Estensione contratto G1 e schema, non campi liberi nascosti nelle note. Acquisto e scadenza/durata opzionali, provenienza per campo, documento di supporto e proposta promemoria esplicita. Nessuna durata legale presunta; collegare una fattura non prova da solo la data o la copertura: «dato dichiarato · documento associato» quando il valore è stato inserito a mano.

Da congelare: durata come mesi oppure scadenza esplicita, gestione conflitto fra le due, più garanzie per uno stesso oggetto (stima assume una garanzia principale manuale), eventuale estensione a boiler senza riscrivere i dati tecnici confermati. Date ammesse/incomplete, documento revocato, garanzia scaduta e archivio oggetto devono avere stati chiari.

Dipende da BL-01 per proporre il promemoria senza duplicare la creazione sicura; prima di BL-03 definire gli eventi significativi prodotti dalla garanzia. AI sulla garanzia resta alla release successiva.

## BL-03 — storia della casa essenziale

Nuovo endpoint aggregato server per persona/Home, più entità eventi manuali e collegamenti a documenti. Non scaricare tutte le storie nel browser né duplicare i log grezzi in una seconda tabella che diverge. Tipi iniziali fissati prima del frontend: lavori significativi, attività completate, oggetti aggiunti/sostituzioni esplicitamente dichiarate, documenti marcati rilevanti, conferme tecniche significative ed eventi passati manuali.

Chiarimenti contrattuali:
- data dell'evento distinta da createdAt/uploadedAt/confirmedAt; una conferma di marca non dimostra la data d'installazione;
- «2020 bagno rifatto» deve poter restare un anno, senza inventare1gennaio: precisione almeno giorno/anno oppure perimetro ristretto da approvare;
- fonte/etichetta esplicite: «aggiunto a Dimora» non è «acquistato», archivio+nuovo oggetto non prova una sostituzione;
- filtro anno e cursor server stabile per sorgente/id/data, anche con eventi retrodatati e timestamp uguali;
- privacy prima di paging/conteggi, non dopo; eventi personali mai pubblicati agli altri membri. Risorse revocate/archiviate e riferimenti non leggibili devono essere redatti coerentemente;
- nessun evento condominiale, nessuna storia condivisa dell'immobile o passaggio di proprietà in questo incremento.

Dipendenze: contratti/eventi BL-01/02 già stabili, lavori S1 e G1 operativi. BL-10/10b arrivano dopo e aggiungeranno eventuali tipi attraverso estensione dichiarata, senza ricostruire retroattivamente interpretazioni. Gate: filtro/ritorno, storia manuale con data incompleta, privacy/cursor e assenza di duplicazioni.

## BL-10 — mini-rubrica personale riusabile

Nuova entità versionata, CRUD con archivio, contratti di lista/dettaglio/picker e collegamenti a lavori/spese; attività/oggetti secondo il perimetro approvato. Il semplice supplier testuale di S1 non basta: conservarlo per compatibilità e per le bozze vecchie, nessun backfill automatico di contatti.

Proposta di scope iniziale: voce privata per account e Home, riutilizzabile fra risorse della stessa casa. Il riuso **fra case** non è chiarito nel backlog: se desiderato va deciso prima del contratto, non duplicato o dedotto. Nome/mestiere/recapito/nota; forma persona/impresa e identificativo fiscale opzionale predisposti già per BL-10b. Nessuna condivisione con familiari/invitati, rubrica telefono, marketplace o contatto automatico.

Creazione inline preserva la bozza del costo/lavoro. Dettaglio mostra soltanto collegamenti leggibili, con paging. Archivio non cancella contatto o storia; decidere se sono consentiti nuovi collegamenti a un archiviato. Proporre la riattivazione esplicita invece di creare un duplicato.

Gate: concorrenza e idempotenza della creazione inline, permessi su ogni collegamento, nessun recapito privato in timeline condivise/export altrui. Nessuna email automatica al professionista.

## BL-10b — conferma unica di proposte indipendenti

Estendere schema/output provider, bozza economy-v1, provenienza, UI e transazione di conferma, mantenendo leggibili/accantonabili le bozze precedenti. Nessuna creazione all'upload o durante l'analisi.

Ogni proposta ha scelta esplicita: costo create/link_existing; professionista create/use_existing/skip; oggetto esistente da collegare o nessun collegamento. La stima NON include creazione automatica di un nuovo oggetto o di una nuova scheda tecnica: il testo approvato richiede soprattutto il collegamento, non autorizza quei dati per inferenza. Chiarirlo se si vuole quel caso.

Conferma unica = una transazione DB per le scelte accettate, con idempotenza, versioni e autorizzazioni delle fonti rilette. Non tre POST indipendenti con mezzo risultato salvato. Mantenere la distinzione fra consenso all'analisi a pagamento e conferma dei dati.

Con P.IVA normalizzata già presente nello stesso ambito, proporre collegamento, mai fusione automatica; nome simile da solo non prova identità. Vincolo e gestione gara fra due conferme per evitare doppioni. Un documento di negozio/utenza non crea un tecnico: mostrare evidenza dell'identità e del ruolo, con campo vuoto/scarto se insufficiente. Telefono/email non inferiti o cercati online. L'oggetto è proposto solo per indizio documentale o contesto esplicito dell'analisi, senza matching per solo tipo.

Dipendenze obbligatorie BL-10 e corpus/metriche Fase0. Gate: scarto indipendente, stesso fornitore in due bozze concorrenti, nessun tecnico da bolletta, vecchia bozza ancora confermabile, errore/retry senza costo o contatto duplicati, fonte revocata senza salvataggio parziale. Test offline prima di eventuale nuova campagna live autorizzata.

## Sequenza operativa e ruoli, dopo approvazione del piano

1. Chiudere decisioni Fase0 e scrivere matrice prerequisiti con esiti e limiti. Backup già verificato, non rifarlo senza nuovi dati o migrazioni.
2. Per ogni voce nell'ordine approvato: breve specifica con esempi → contratto/versione/capability/errori/idempotenza/privacy → prova di navigazione mirata quando cambia esperienza → congelamento → backend e frontend separati → integrazione e gate.
3. Codex mantiene contratti, schema/migrazioni additive, backend, integrazione e verifica reale. Claude può prima revisionare la specifica e poi sviluppare soltanto i file frontend assegnati su baseline fissata; mai inventare API mentre cambiano. Per BL-04 lavoro soprattutto frontend dopo definizione scope fotografico.
4. Un blocco alla volta accettato; la preparazione del successivo può sovrapporsi alle prove del precedente se non cambia contratti dipendenti. Nessun doppio proprietario dei file.
5. Dopo BL-10b: prova Home completa e backup aggiornato, regressioni mirate su privacy e conferme, quindi passaggio ad Agenzie. Le rifiniture HOME-FIN facoltative non si trasformano in prerequisiti nascosti.

## Confini temporali

**Release successiva, senza stime qui:** BL-07 persone della casa; BL-08 riepilogo email settimanale; BL-09/S2 impegni e spese ricorrenti; AI garanzia BL-02 e filtri/estensioni BL-03.

**BL-12…BL-16 restano placeholder:** nessuna pianificazione, stima, migrazione o preparazione dati implicita. Si progettano dopo Agenzie se richiesti. BL-05/06/11 esclusi per ora. Nessun evento condominiale in Home.

Questa sessione raccoglie e pianifica: non implementa nessuna delle nuove funzioni. Non autorizza servizi a pagamento, invii email, analisi AI personali, esposizione del PC o modifiche alla sicurezza. La sola attività operativa svolta è la conclusione del backup/verifica già autorizzata.
