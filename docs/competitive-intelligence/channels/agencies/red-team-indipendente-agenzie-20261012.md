# Red Team indipendente — Canale AGENZIE IMMOBILIARI (Dimora/HomeOS)

**Data:** 12 ottobre 2026 · **Autore:** Red Team indipendente (Claude) · **Stato:** parere di ricerca, **nessuna voce è approvata**: serve decisione umana.
**Oggetto della revisione:** dossier Agente 3 (`channels/agencies/dossier-agenzie-immobiliari.md`), `features.csv` e `opportunities.csv`, branch `claude/project-thread-swk101` (commit `fda9b58`).
**Base di confronto interna:** `docs/decisions.md` (ADR #77), `docs/market-research-funding-2026.md`, `docs/backlog.md`, `docs/vision.md`.
**Vincoli rispettati:** questo documento è l'unico file aggiunto. Non modifica roadmap, backlog né decisioni, né i file dell'Agente 3.

### Legenda delle etichette
- **[V]** verificato su fonte consultata il 12/10/2026. Se la fonte è il venditore, scrivo *dichiarato*: dichiarato non vuol dire dimostrato.
- **[V-sec]** verificato solo su una fonte secondaria (commento legale, articolo, blog), non sul documento originale.
- **[I]** inferenza mia da fatti verificati.
- **[S]** stima mia, con le ipotesi scritte accanto.
- **[ND]** dato assente: non l'ho trovato. *Non trovato non vuol dire che non esista.*

---

## 1. Verdetto in breve

| Nicchia | Verdetto | Motivo in una riga | Cosa farebbe cambiare verdetto |
|---|---|---|---|
| **N1** Fascicolo venditore pronto al rogito | **TEST** (ridimensionato, a soglie, non GO) | Il problema è reale ma la disponibilità a pagare delle agenzie è dimostrata solo da concorrenti che già occupano il terreno; l'esperimento del dossier misura la cortesia, non il pagamento | ≥3 agenzie su 5 pagano dal primo fascicolo **e** parere legale favorevole **e** decisione esplicita di Vincenzo su ADR #77 |
| **N2** Libretto digitale all'acquirente | **NO GO** come nicchia autonoma, ora | Bloccata da B12 e B39, rischio legale più alto, nessuna prova di uso nel tempo, già dichiarata da Immodoc e da un libretto gratuito (MigliorPro) | N1 supera la soglia **e** esiste la specifica con threat model di B39 **e** parere legale sul trasferimento |
| **N3** Immobili ereditati/datati | **NO GO** come nicchia; **solo etichetta di segmento** dentro il test N1 | Nessun dato sulla frequenza; il blocco tipico delle eredità è la catena successoria (notaio/CAF), non i documenti tecnici della casa; per gli immobili ante 1967 un documento "mancante" può essere normale | Dati affidabili sulla quota di vendite ereditate **e** disponibilità a pagare osservata più alta su incarichi etichettati (con cautela: il campione sarà di 5 agenzie) |

**Conclusione generale.** Nessuna delle tre nicchie è dimostrata come nicchia sostenibile a pagamento. La sola che merita un test economico è N1, con un test più duro di quello proposto dal dossier. Se N1 fallisce, l'esito onesto è quello che l'Agente 3 già prevede: le agenzie sono per Dimora **un canale di segnalazione, non un cliente**.

**ADR #77.** Il conflitto è reale sulla conclusione (Transaction Readiness scartata come wedge di acquisizione) e solo in parte superabile sulla logica (§5). Non propongo di modificarlo. La scelta di riaprirlo, o di tenere un test a tempo limitato che lo metta alla prova, spetta a Vincenzo.

---

## 2. Come ho lavorato e limiti dichiarati

**Letto:** dossier e due matrici dell'Agente 3; ADR #77 per intero; `market-research-funding-2026.md` §14, §25.4 e la scheda Dwelly; backlog (B12, B36, B38, B39, B46, B52, B69, B74); `vision.md`; `RESEARCH_PROTOCOL.md`, `AGENT_3_AGENCIES.md` e l'analisi trasversale v0.1 sul branch di destinazione.

**Verificato online il 12/10/2026:** Gestim (home, prezzi, panoramica funzioni, tabella comparativa), Faloosa, Immodoc (home, fascicolo, termini, intervista del 16/09/2026, articolo InsideMagazine del 05/06/2026), Getrix, Youdomus, Genio Diligence, RogitoSubito, DokiCasa, HomeZada, MigliorPro; dati OMI 2025; commenti legali sulla responsabilità del mediatore; fonti sulle successioni.

**Limiti che incidono sulla lettura:**
1. Le pagine web mi sono arrivate attraverso un estrattore automatico di testo: non ho letto l'HTML o il PDF grezzo. Cifre e diciture sono quelle riportate dall'estrattore. **Prima di qualunque uso esterno vanno riviste a mano.**
2. La tabella comparativa PDF di Gestim non è ricostruibile in modo affidabile: i valori "Max 10" e "illimitati" non si lasciano attribuire ai singoli piani.
3. Le sentenze non sono state lette nel testo: solo commenti e massime di studi legali (**[V-sec]**).
4. Non accessibili o non letti: centro assistenza Gestim (richiede accesso), prezzi di Getrix e Youdomus, pagina agenzie di Immodoc, sottopagine di Faloosa, dettaglio del "Check Up agenzie" di RogitoSubito, Altalex (errore di caricamento).
5. Nessuna intervista, demo o prova di pagamento: **non esiste in questo lavoro alcun dato primario di disponibilità a pagare**.

---

## 3. Correzioni e integrazioni al dossier (verifica sulle fonti primarie)

| # | Cosa dice il dossier | Cosa risulta | Impatto |
|---|---|---|---|
| 1 | Compravendite 2025: "stime 750.000–780.000, dato ufficiale ND" | Rapporto Immobiliare 2026 OMI: **766.757** compravendite di abitazioni, +6,4% sul 2024; 333.759 con mutuo (+18,3%). Pubblicazione 21/05/2026, letta tramite sintesi di un operatore ([V-sec]). Il 92% delle compravendite riguarda immobili esistenti (Affaritaliani 16/07/2026, che cita OMI, [V-sec]) | Aggiornare il dato. Vendite per agenzia ≈ 9,7–15,3 l'anno [S] (§6, appendice) |
| 2 | Gestim: "workflow documentali limitati a 10 nei piani bassi, illimitati nei piani alti"; riga CSV AG-DOC-02 con livello "Platinum (limitato a 10 nei piani bassi)" | Pagina prezzi e home mostrano il workflow documentale **solo nel piano Platinum**. L'estrazione del PDF non permette di attribuire "Max 10"/"illimitati" ai piani | L'affermazione del dossier e quella delle pagine pubbliche sono in contrasto: **[ND]** finché non si apre il PDF a mano. La riga CSV è internamente incoerente |
| 3 | Gestim: nessun dettaglio sul workflow | Confermato. La panoramica dice solo che aiuta a inserire documenti e a semplificare la due diligence. Gli allegati si caricano dall'agenzia ("Carica i tuoi allegati"). L'Area Proprietari condivide "attività svolte ed esiti", senza dichiarare documenti. **Non dichiarati** (non vuol dire assenti): caricamento da parte del proprietario, checklist di vendita, condivisione con acquirente/notaio/tecnici | Conferma [ND] su funzione reale; indebolisce la tesi "Gestim è un archivio di allegati" solo in parte: è [I], non provata |
| 4 | Gestim: prezzi 10/20/30 € | Confermati: Personal 30, Professional 10 (fino a 5 utenti), Gold 20, Platinum 30 con promo "(era 35)" valida fino al "31 Ottobre" senza anno. Spazio documenti da tabella: 1, 2, 20, 100 GB e illimitato (come riportato dall'estrattore). Home: "più di 2.500 agenzie" dichiarate | Nessuna correzione sostanziale |
| 5 | Faloosa "agency-centrico", AI di raccolta non citata | Il sito dichiara che i **clienti possono essere invitati** sulla piattaforma per archiviare dati e documenti, e che il piano Premium usa **"format dinamici assistiti da IA" per raccogliere dati dai clienti** (dichiarato). Prezzi: Lite 9,99 €/mese su base annua (19,99 mensile), **solo Lombardia**; Premium 69,99 su base annua (87,49 mensile), nazionale. Nessun dato di trazione. Tre testimonianze senza cognome e senza agenzia | **Il cuore di N1 (proprietario che carica + AI) è già dichiarato da Faloosa.** Va tolto "agency-centrico" come differenziatore |
| 6 | Immodoc: "rete di oltre cento professionisti" [V] | La cifra compare nella **domanda del giornalista** dell'intervista del 16/09/2026, non nella risposta dell'intervistato. L'articolo InsideMagazine (05/06/2026) la attribuisce all'azienda; la home mostra un contatore "0+" non valorizzato | Declassare a **dichiarato, non verificato** |
| 7 | Immodoc: Salva Rogito 229 € + IVA | Confermato (APE + accesso agli atti, fino a 200 mq, diritti di segreteria comunali esclusi). La home lo presenta anche per le agenzie: acquisire incarichi "con i documenti già pronti" | **Sovrapposizione diretta con A3-04** (check documentale come argomento per l'esclusiva) |
| 8 | Immodoc: passaggio al nuovo proprietario "con un click", già attivo | Dichiarato "Già attivo" sul sito. Le fonti **descrivono il meccanismo in modo diverso**: l'articolo di giugno parla di migrazione automatica al nuovo proprietario; l'intervista di settembre parla di un fascicolo che il proprietario può "riscattare" e che è "trasferibile al rogito". Il consenso del venditore non è spiegato. I Termini (aggiornati al 03/02/2026) **non hanno clausole** su titolarità dei documenti o trasferimento | Nessuna prova indipendente. Il meccanismo legale è sconosciuto |
| 9 | Immodoc: base gratuita "primo immobile" | Il sito dice in un punto "gratuito per il primo immobile", in un altro "gratuito per sempre". Prezzi dei servizi non indicati nella pagina del fascicolo | Ambiguità sul modello di ricavo |
| 10 | Immodoc: "fondata nel 2026" | Confermato dall'intervista (scheda aziendale). La società è Domodeus S.r.l., Tivoli, capitale 30.000 €; la home non indica la data di fondazione. Pilota in Emilia-Romagna e Toscana; nessun numero di clienti. Il fascicolo "di scopo" include **Successione** | Il dossier non riportava il capitale; confermato che copre il caso N3 |
| 11 | Getrix/Youdomus/Genio: "il gruppo possiede già tutti i mattoni" | Getrix: **nessun modulo di documenti, fascicolo o area proprietario** sulla home; Youdomus è solo una voce di menu. Youdomus: archivio "organizzato per soggetto/immobile", monitoraggio variazioni catastali, nessuna area proprietario. Genio Diligence: destinatari banche, servizi finanziari e network di mediatori; **non nomina agenzie né Immobiliare.it**. Clienti Getrix: 16.000 o 14.000 a seconda del punto del sito | Il rischio competitivo n. 1 resta **[I]**: capacità tecnica sì, prodotto per agenzie non documentato. Non ho trovato annunci recenti ([ND]) |
| 12 | RogitoSubito | Dichiara un **team interno, "non una rete"**; nessun prezzo; tempi solo "in tempi brevi". Il dettaglio del Check Up agenzie non era leggibile | Contrasta con i modelli a rete di Faloosa e Immodoc |
| 13 | DokiCasa: copre contratti, non documenti della casa | Confermato: archivio "per cliente o per immobile" ma riferito a pratiche e contratti; nessuna checklist dei documenti di vendita. Dichiarati (dal venditore): "oltre 10.000 pratiche al mese" e un pareggio dell'abbonamento "in genere sotto le 10 pratiche all'anno" | La seconda cifra è utile come ancora di prezzo (§6) |
| 14 | HomeZada PRO | Confermati 99 $ per immobile, 49 $ di condivisione, 5 $ per cliente di marchio, un anno Premium regalato al cliente. **Nessun dato di adozione o ritenzione** sulla pagina | Conferma [ND] |
| 15 | Dossier: 20 operatori mappati | **Manca MigliorPro** (citato nell'analisi trasversale): "Libretto Casa" digitale gratuito, "Certificato Libretto Casa" in PDF proposto anche per vendita e locazione, elenco di professionisti. Sito senza ragione sociale, con numero di telefono segnaposto "(+00) 123 456789" | Operatore a bassa affidabilità, ma sovrapposto a N2. Nota per revisione umana: B69 afferma che non risultava alcun operatore italiano rilevante; con Immodoc e MigliorPro la premessa va rivista (non la modifico) |
| 16 | Cass. 7972/2026 citata da un'intervista | Resta **[ND]**: non l'ho trovata né letta | Nessuna novità |

---

## 4. Concorrenza verificata, in sintesi

| Operatore | Documentato [V] | Non documentato | Pressione su |
|---|---|---|---|
| **Immodoc/Domodeus** | Fascicolo con 6 categorie, indice di completezza con checklist, condivisione con permessi e link revocabili, trasferimento dichiarato "già attivo", 6 fascicoli di scopo (compravendita, locazione, mutuo, successione, ristrutturazione, incentivi), Salva Rogito 229 € + IVA, linea agenzie in lancio | Trazione, numero di tecnici, prezzi reali, meccanismo di consenso al trasferimento | **N1, N2, N3** |
| **Faloosa** | Dossier Immobili con azioni guidate, invito dei clienti, raccolta dati assistita da IA (Premium), istruttoria notarile, e-commerce di servizi tecnici (Lombardia), prezzi pubblici | Chi carica davvero, trazione, passi del flusso | **N1** |
| **Gestim (idealista)** | Workflow documentale per la due diligence nel piano Platinum; allegati; Area Proprietari | Contenuto del workflow; caricamento da parte del proprietario | **N1** (rischio di estensione) |
| **Getrix / Youdomus** | CRM e incroci; visure e monitoraggio catastale | Qualunque modulo documentale o area proprietario | Rischio [I] |
| **Genio Diligence** | Estrazione documentale con integrazioni a catasto/ADE/InfoCamere per banche e mediatori | Offerta alle agenzie | Rischio [I] |
| **RogitoSubito** | Verifica di conformità con team interno | Prezzi, Check Up agenzie | N1, N3 |
| **DokiCasa** | Contratti, firma, adempimenti, archivio di pratiche | Documenti della casa | Complemento/partner |
| **MigliorPro** | Libretto Casa gratuito, certificato PDF, elenco professionisti | Società, trazione | N2 |
| **HomeZada / HomeBinder (USA)** | Record casa regalato dal professionista | Adozione e ritenzione | Modello di N2 |

---

## 5. Conflitto con ADR #77

### 5.1 Cosa dice davvero
L'ADR #77 (16/09/2026) sceglie come wedge B2B2C prioritario per l'Italia **Renovation + Financing** "non Insurance/Energy/Transaction", e tra le alternative scartate elenca "Transaction Readiness (frequenza troppo bassa, più adatto come exit-point futuro del dato che come wedge di acquisizione)". Decide inoltre **nessun layer di esecuzione fisica**: software più referral verso artigiani e imprese esistenti. Stabilisce che B74 valida *solo* Renovation + Financing e che prima c'è la validazione, non lo sviluppo.
Il ragionamento è in `market-research-funding-2026.md`: §14 ("la vendita ha frequenza molto bassa… probabilmente un exit point del dato"), §25.4 (buyer agenzia, ipotesi di ricavo "SaaS per agenzia / transaction fee", **falsificazione: "raccolta ad hoc al momento della vendita costa meno"**) e la scheda del rischio "documenti pubblici/recuperabili possono essere commodity".

### 5.2 Dove il conflitto è reale
1. **N1–N3 sono Transaction Readiness usata come ingresso di acquisizione tramite le agenzie.** È esattamente ciò che l'ADR ha scartato.
2. **L'argomento della frequenza non è risolto.** Il dossier calcola 9–14 vendite per agenzia, ma ogni incarico è un *nuovo* proprietario senza relazione con Dimora, e il suo orizzonte con il fascicolo è di settimane (lo ammette lo stesso dossier, red team n. 6). La memoria duratura nasce solo dall'acquirente, cioè da N2, la parte più bloccata e meno provata.
3. **Il rischio "commodity" è confermato dalla mappa**: Faloosa, Immodoc, Gestim Platinum e Youdomus presidiano già raccolta e visure.
4. **Il criterio di falsificazione dell'ADR non è testato dall'esperimento del dossier**: nessuna misura del costo attuale della raccolta ad hoc (minuti dell'agente, ruolo del geometra).
5. **Capacità.** L'ADR motiva se stesso con "fase alpha, un fondatore". B74 e B46 (P0, 15–20 questionari) competono per lo stesso tempo.

### 5.3 Dove il conflitto non c'è, o è attenuato
- Il pattern che l'ADR elenca per i buyer che monetizzano include "agenzia per Dwelly", e la scheda Dwelly conclude che i **workflow professionali ricorrenti** hanno disponibilità a pagare più evidente del software per il proprietario. La frequenza per agenzia (ricorrente) e quella per proprietario (rara) sono due cose distinte: l'ADR argomenta sulla seconda, il dossier sulla prima. Il dossier non ha reso esplicita la distinzione.
- N1 non richiede una rete tecnica propria: indirizza i documenti mancanti al geometra dell'agenzia. L'opzione (b) del dossier (commissione di segnalazione sui servizi tecnici) resta nel perimetro "software + referral" dell'ADR. Se una commissione di segnalazione verso professionisti tecnici sia consentita dalle regole professionali è **[ND]**: serve parere.
- L'agenzia come canale di consegna era già prevista (ADR #73).

### 5.4 Mia valutazione
- Per N1 inteso come **wedge di acquisizione** il conflitto è sostanziale. Per N1 inteso come **test che prova a falsificare lo scarto dell'ADR** non c'è divieto: c'è un costo opportunità.
- Una sinergia vera esiste solo su N2: l'acquirente di una casa spesso ristruttura (ponte verso Renovation + Financing). Ma richiede una catena di passaggi non provati: l'agenzia adotta, il venditore carica, l'acquirente attiva, l'acquirente ristruttura, un finanziatore o un'impresa paga. **Esercizio illustrativo, non stima:** con una probabilità del 50% per ciascuno dei quattro passaggi consecutivi, la catena arriva al 6%.
- Non propongo alcuna modifica dell'ADR. Se Vincenzo vuole il test, consiglio di decidere prima, per iscritto e fuori da questo report, un **tetto di impegno** (a titolo di esempio: non più di 2–3 settimane-persona nella fase 0) e di tenerlo fuori dalle priorità di B74/B46.

---

## 6. Valutazione per nicchia (nove criteri)

### N1 — Fascicolo venditore pronto al rogito

| Criterio | Valutazione |
|---|---|
| **Problema effettivo** | **[V-sec, ripreso dal dossier e non riletto alla fonte]** Esistono casi in cui il titolo edilizio emerge dopo il preliminare (Cass. 32264/2025: titolo del 1978, sconto di circa 19.000 €) e l'accesso agli atti può richiedere settimane. **[V]** Tre concorrenti vendono su questo problema. **[ND]** frequenza, minuti persi per incarico, quota di trattative riaperte o saltate. **[V-sec]** Per la Cassazione, senza incarico specifico il mediatore **non** è tenuto a verifiche tecniche e il dovere informativo (art. 1759 c.c.) riguarda ciò che sa o avrebbe dovuto sapere con diligenza professionale (Cass. 16184/2024; 32264/2025; 11371/2023). Il dolore è quindi più commerciale (tempi, prezzo riaperto) che di responsabilità: il dossier lo sovrastima nel punto P2 |
| **Incentivo dell'agenzia** | A favore **[I]**: meno rincorse via email/WhatsApp, argomento per l'esclusiva (Immodoc lo vende già così). Contro **[I]**: la provvigione arriva alla chiusura, non alla completezza; il geometra di fiducia fa il lavoro e lo paga il venditore; il link va inviato **nel momento in cui l'agente sta ancora conquistando l'incarico**, quando aggiungere un compito al venditore è più rischioso; molti incarichi non si chiudono ([ND] la quota) |
| **Disponibilità a pagare non dimostrata** | **[ND]** nessuna prova diretta. Ancore di prezzo **[V]**: Gestim 10–30 €/utente/mese; Faloosa Lite 9,99 €/mese (solo Lombardia), Premium 69,99 €/mese su base annua; DokiCasa dichiara pareggio dell'abbonamento sotto le 10 pratiche l'anno; Salva Rogito 229 € + IVA. **[S]** 39 € × 12 incarichi = 468 €/anno, circa 3,9 volte il costo annuo di un utente Gestim Professional; per pratica, Faloosa Premium costa 55–87 € e Lite 8–12 € (assumendo, non verificato, abbonamento senza limite di pratiche). Il prezzo di N1 è plausibile solo se sostituisce uno strumento o misura un risparmio. **Il test del dossier ("4 su 10 pagano il secondo lotto") misura la cortesia dopo un primo lotto gratuito**: va fatto pagare dal primo fascicolo |
| **Tempi di configurazione** | Lato Dimora **[V repo]**: mancano interfaccia di invito (B12), vista in sola lettura per l'agente, lista di completezza di vendita, pacchetto di esportazione; il profilo casa esiste ma è nascosto in alpha (B52). Lato agenzia **[I]**: nessuna integrazione, ma un passaggio nuovo all'incarico. **[S]** per il solo test: 2–3 settimane di preparazione (parere legale, modulistica, tracciamento), 4–6 settimane per reclutare, 6–8 per eseguire: circa 3–4 mesi, non le 6–8 settimane del dossier, che escludono il reclutamento |
| **Concorrenza** | **[V]** Faloosa (invito clienti + raccolta assistita da IA, dichiarata), Immodoc (indice di completezza, condivisione, Salva Rogito per le agenzie), Gestim Platinum (workflow, dettaglio ND). **[I]** il vantaggio "AI che capisce i documenti" **non è dimostrato**: le capacità dei concorrenti non sono documentate, non sono assenti. **[V]** Il gruppo Immobiliare.it ha tecnologia documentale (Genio Diligence) ma per banche |
| **Scalabilità** | **[V-sec]** circa 50.000 agenzie, 262 sopra 1 M€ di fatturato (fonte secondaria). **[S]** 9,7–15,3 vendite l'anno per agenzia (63% di quota via agenzia dal 2018; 50.000 agenzie; 766.757 compravendite): media che nasconde grandi differenze. **[S]** 100.000 € di ricavo ricorrente richiedono 214–264 agenzie attive a 39 €/incarico. **[ND]** costo di acquisizione. **[I]** il concierge non scala: serve il prodotto per l'agente e un canale (reti, franchising) |
| **Rischi legali** | **[V-sec]** art. 1759 c.c. e giurisprudenza sopra. **[I]** *paradosso della conoscibilità*: uno strumento che mostra "mancante/da verificare" trasforma l'ignoto in noto e quindi in fatto da comunicare; può tutelare (diligenza documentata) o esporre. **[I]** Il "punteggio di prontezza" immaginato in `market-research-funding-2026.md` §14 va evitato: può essere letto come giudizio di conformità. **[I]** GDPR: ruoli (Dimora, agenzia, venditore), informativa, documenti con dati di terzi, nessun documento d'identità. **[ND]** commissioni di segnalazione verso tecnici. **Serve un parere legale prima di qualunque materiale esterno** (lo dice anche il dossier) |
| **Valore per il proprietario** | **[I]** Vede subito cosa manca e tiene una copia ordinata. Ma l'orizzonte è di settimane: dopo la vendita la casa non è più sua. **[I]** Rischio di selezione avversa: chi carica rivela le proprie lacune prima della trattativa e può rifiutarsi. Il valore duraturo passa all'acquirente (N2) |
| **Sperimentazione minima** | Vedi §7 (fase 0 senza sviluppo; fase 1 concierge ridotto, a pagamento dal primo fascicolo) |

### N2 — Libretto digitale consegnato all'acquirente

| Criterio | Valutazione |
|---|---|
| **Problema effettivo** | **[I]** L'acquirente riparte da zero; **[ND]** quanti acquirenti lo chiedono o ne soffrono. **[V-sec, USA]** 66% dei venditori ha trovato l'agente per referenza (NAR 2025): **dato italiano [ND]**. Il trasferimento è dichiarato attivo solo da Immodoc, senza prova indipendente |
| **Incentivo dell'agenzia** | **[I]** Beneficio morbido (immagine, referenze) dopo che l'incarico è chiuso e pagato; nessun ritorno misurabile in Italia. Il modello USA ha un prezzo (HomeZada: 99 $ per immobile; 5 $ per cliente di marchio, dichiarati) ma nessun dato di adozione |
| **Disponibilità a pagare non dimostrata** | **[ND]** nessuna. HomeBinder è gratuito per il proprietario e i ricavi dei partner sono [ND]. MigliorPro e la base di Immodoc sono gratuiti: l'anello pagante non è chiaro |
| **Tempi di configurazione** | **[V repo]** Il trasferimento è "visione futura, subordinata a identità, permessi, separazione dati e verifica legale" (`vision.md`). B39: da non implementare prima di B2/B12/B38; richiede matrice dati immobile/persona, consenso, revoca, audit, handover e verifica legale/GDPR; la prima consegna è specifica e threat model. B12 è aperta; B38 è chiusa solo per gli Asset |
| **Concorrenza** | **[V]** Immodoc (trasferimento dichiarato, base gratuita), MigliorPro (libretto gratuito con certificato PDF), Switcho per le utenze. **[I]** concorrenti gratuiti rendono più difficile far pagare l'agenzia |
| **Scalabilità** | Dipende dai volumi di N1 e dal consenso di ogni venditore; **[ND]** tasso di attivazione degli acquirenti |
| **Rischi legali** | **[I]** I più alti delle tre: separazione tra dati personali del venditore e dati oggettivi della casa; consenso e revoca; l'acquirente si affida a un libretto **con il marchio dell'agenzia**, che può essere letto come informazione fornita dal mediatore (art. 1759: niente informazioni non verificate, **[V-sec]**) |
| **Valore per il proprietario (acquirente)** | **[I]** È il valore potenziale più alto e l'unico legato a Renovation + Financing. Le soglie del dossier (attivazione 50%, aggiunta di un documento nel 25% entro 60 giorni) sono obiettivi, non evidenza |
| **Sperimentazione minima** | Nessun test dedicato ora. Dentro le interviste della fase 0: "cosa consegni al rogito oltre alle chiavi?", "quanti clienti ti richiamano per rivendere o ti segnalano qualcuno?". Nessuna costruzione del trasferimento |

### N3 — Immobili ereditati e datati

| Criterio | Valutazione |
|---|---|
| **Problema effettivo** | **[V-sec]** Per vendere una casa ereditata servono dichiarazione di successione, accettazione dell'eredità (espressa o tacita) e trascrizione dell'accettazione; senza di esse il notaio non stipula; i coeredi devono accordarsi (fonte: blog di una piattaforma di agenzie, RealAdvisor). **[I]** Sono documenti della **catena successoria**, gestiti da notaio/CAF, non la memoria tecnica della casa. **[V-sec]** Per immobili con costruzione iniziata prima del 1° settembre 1967 il venditore può dichiarare la data di inizio al posto degli estremi del titolo (art. 40 c. 2 L. 47/1985; Cass. 23394/2023; SS.UU. 8230/2019, tramite Studio Pagliai). **[I]** Quindi, per le case datate, "titolo edilizio mancante" può essere normale: una lista automatica produce falsi allarmi e richiede giudizio tecnico locale |
| **Frequenza** | **[ND]** nessun dato affidabile: l'articolo di Affaritaliani (16/07/2026) non ne contiene; il "80%" è il flusso di un'impresa (Homingo), che include immobili invenduti da tempo; QuiFinanza (25/05/2026) dà solo il patrimonio immobiliare degli over 70, oltre 2.720 miliardi di euro (Scenari Immobiliari su dati ADE/ISTAT), che indica potenziale futuro, non vendite |
| **Incentivo dell'agenzia** | **[I]** Incarichi più lenti e rischiosi: l'aiuto è desiderabile, ma gli eredi decidono in più persone, spesso a distanza; **[I]** esistono acquirenti specializzati in case ereditate (Homingo) come alternativa di vendita |
| **Disponibilità a pagare non dimostrata** | **[ND]**. "Dovrebbe essere più alta" (dossier) è **[I]** |
| **Tempi di configurazione** | Più invitati per casa e ruoli oltre il solo proprietario (`vision.md`: oggi solo OWNER, manca l'invito); **[I]** i filtri per data di costruzione e comune richiedono regole che oggi non ci sono |
| **Concorrenza** | **[V]** Immodoc: fascicolo "Successione" dichiarato; **[I]** notai, CAF, geometri |
| **Scalabilità** | **[ND]**. Esercizio **illustrativo, non supportato da dati**: anche supponendo il 10–20% di vendite ereditate, un'agenzia con 10–15 vendite l'anno avrebbe 1–3 casi: il segmento restringe il già basso volume |
| **Rischi legali** | **[I]** documenti con dati di altri eredi; confine con la consulenza successoria e fiscale, riservata a professionisti; falsi allarmi sugli immobili ante 1967 |
| **Valore per il proprietario** | **[I]** Alto ma una tantum: l'erede vende e se ne va (stesso orizzonte breve di N1) |
| **Sperimentazione minima** | Come etichetta dentro la fase 1 di N1: almeno un incarico ereditato o ante 1990 per agenzia, confrontato con gli altri. Con 5 agenzie ogni differenza è un aneddoto, non una misura |

---

## 7. Sperimentazione minima raccomandata (solo N1)

### Fase 0 — Prove di problema e di prezzo, nessuna costruzione (2–3 settimane)
- **Persone:** 10 agenti (5 con Gestim, 5 con Getrix, come nel dossier), 3 notai, 3 geometri.
- **Domande ancorate agli ultimi 3 incarichi:** quando è emerso il primo documento mancante e cosa è costato; quanti minuti si spendono a rincorrere documenti; chi paga la relazione tecnica; quale strumento si usa oggi (WhatsApp, Gestim, Faloosa, Immodoc) e se lo mostrano.
- **Controprova richiesta dall'ADR #77:** quanto costa oggi la raccolta ad hoc (per almeno 3 agenti, registrare i minuti di 3 incarichi).
- **Prezzo:** mostrare la scheda "39 € per immobile, dal primo fascicolo" e l'alternativa "paga il venditore"; chiedere un impegno di pilota scritto.
- **Soglie proposte (mie, da discutere):** almeno 5 su 10 raccontano un documento scoperto dopo la proposta in uno degli ultimi 3 incarichi; almeno 3 su 10 firmano l'impegno di pilota con prezzo; ≥2 su 10 usano già uno strumento a pagamento e sanno dire cosa manca. **Stop** se non più di 1 su 10 mostra intenzione di pagare.

### Fase 1 — Concierge ridotto (solo se la fase 0 supera le soglie)
- **5 agenzie × 3 incarichi = 15 fascicoli**, con almeno un incarico ereditato o ante 1990 per agenzia (etichetta N3).
- **Pagamento dal primo fascicolo** (anche 19 €), non dopo un lotto gratuito.
- Output: elenco "presente / mancante / da verificare con il tecnico", **senza punteggio e senza il termine "conforme"**, con formulazione approvata dal legale.
- **Misure:** venditori che caricano almeno 5 documenti in 7 giorni (superato ≥60%, stop <40%, soglie del dossier); lacune scoperte prima della proposta (conteggio); minuti dell'agente prima/dopo; agenzie che chiedono un secondo lotto a pagamento (superato ≥3 su 5).
- **Stop:** meno di 3 agenzie su 5 pagano il secondo lotto; meno del 40% dei venditori carica; parere legale sfavorevole; un concorrente offre la stessa funzione gratis alle agenzie.
- **Prerequisiti legali:** formulazione "raccolta, non verifica"; effetto del dovere di comunicare ciò che si conosce (art. 1759); ruoli e informativa GDPR; accordo con l'agenzia; esclusione dei documenti d'identità; commissioni verso tecnici ([ND]).
- **Da non fare:** costruire B12, vista agente o esportazione prima del superamento della soglia.

---

## 8. GO / TEST / NO GO

**N1 — TEST (a soglie).** Non GO, perché la sola evidenza di disponibilità a pagare è che altri vendono funzioni vicine, e perché il test del dossier è favorevole a chi lo conduce. Non NO GO, perché il costo della fase 0 è basso e risponde alle domande decisive (esiste il dolore? paga qualcuno? che cosa fa oggi il geometra?). Condizione necessaria: decisione esplicita di Vincenzo sul rapporto con ADR #77 e sul tetto di impegno.

**N2 — NO GO ora.** Valore potenziale alto, evidenza minima, blocchi tecnici e legali dichiarati nel repository (B12, B39), concorrenti gratuiti. Resta un **vincolo di progetto** (compatibilità del modello con una consegna mediata, ADR #73), non una nicchia. Da rivalutare solo se N1 supera la soglia **e** la specifica con threat model di B39 esiste **e** il parere legale è favorevole.

**N3 — NO GO come nicchia.** Nessun dato sulla frequenza, mismatch tra la catena successoria e la memoria tecnica della casa, rischio di falsi allarmi sugli immobili datati. Resta **un'etichetta di segmento** dentro il test N1, senza trarne conclusioni statistiche.

**Esito di riserva:** se N1 fallisce, le agenzie sono un **canale di segnalazione gratuito** verso i proprietari, coerente con `AGENT_3_AGENCIES.md` ("se non emerge una nicchia sostenibile, dichiaralo") e con ADR #77.

**Da portare ad A2:** (1) distinguere la frequenza per agenzia da quella per proprietario; (2) il falsificatore dell'ADR (costo della raccolta ad hoc) è una misura da aggiungere a qualunque test; (3) Faloosa dichiara già invito del cliente e raccolta assistita da IA; (4) Immodoc e MigliorPro contraddicono la premessa di B69 (da rivedere a mano); (5) verificare a mano il PDF Gestim e la pagina agenzie di Immodoc prima di usare questi numeri.

---

## 9. Dati assenti e domande aperte

1. Quota attuale delle compravendite intermediate da agenzie in Italia (il 63% è del 2018).
2. Quante trattative si riaprono, si scontano o saltano per documenti mancanti; minuti per incarico.
3. Funzionamento reale del workflow documentale di Gestim e se il proprietario può caricare.
4. Prezzi di Getrix e Youdomus; stato attuale del blocco dei flussi tra Immobiliare.it e idealista.
5. Trazione effettiva di Immodoc, Faloosa e MigliorPro; numero reale di tecnici di Immodoc.
6. Meccanismo e base giuridica del trasferimento dichiarato da Immodoc.
7. Quota di vendite di case ereditate; dati italiani su referenze e ritorno al medesimo agente.
8. Testo delle sentenze e Cass. 7972/2026; regole professionali sulle commissioni di segnalazione.
9. Se le tabelle PDF di Gestim assegnano il limite "Max 10" ai piani bassi.
10. Capitale sociale di Afa Solving (10.000 € nel dossier): non ricontrollato.

---

## 10. Fonti (consultate il 12/10/2026)

**Interne:** `docs/decisions.md` (ADR #77); `docs/market-research-funding-2026.md` (§14, §25.4, Dwelly); `docs/backlog.md` (B12, B36, B38, B39, B46, B52, B69, B74); `docs/vision.md`; branch di destinazione: `RESEARCH_PROTOCOL.md`, `AGENT_3_AGENCIES.md`, `strategy/channel-cross-analysis-v0.1.md`.

**Operatori:** https://www.gestim.it/ · https://www.gestim.it/prezzi/ · https://www.gestim.it/panoramica-delle-funzioni/ · https://www.gestim.it/tabellacomparativa_rev1_2026.pdf · https://faloosa.it/ · https://www.immodoc.it · https://www.immodoc.it/fascicolo-digitale · https://www.immodoc.it/termini-e-condizioni · https://www.influentpeople.it/documentazione-immobiliare-digitale-la-visione-di-immodoc-per-il-futuro-delle-compravendite/ · https://www.insidemagazine.it/2026/06/05/domodeus-il-fascicolo-digitale-immobiliare-che-vuole-mettere-ordine-nei-documenti-di-casa/ · https://www.getrix.it · https://www.youdomus.it · https://www.geniodiligence.it/ · https://rogitosubito.it/ · https://dokicasa.it · https://www.migliorpro.com/ · https://www.homezada.com/professionals/pricing

**Mercato:** https://m.dellevittorie.it/omi-rapporto-immobiliare-compravendite-abitazioni-2026/ (21/05/2026, su dati OMI) · https://www.affaritaliani.it/economia/immobiliare-case-ereditate-e-edifici-da-riqualificare-il-lato-invisibile-delle-compravendite.html (16/07/2026) · https://quifinanza.it/mercato-immobiliare/case-ereditate-over-70-valore/995308/ (25/05/2026)

**Norme e sentenze (fonti secondarie, da far confermare a un legale):** https://www.brocardi.it/codice-civile/libro-quarto/titolo-iii/capo-xi/art1759.html · https://www.studiotecnicopagliai.it/agente-immobiliare-responsabilita-difformita-edilizie-dopo-preliminare-rogito-compravendita/ · https://www.studiotecnicopagliai.it/immobile-ante-67-esclusa-nullita-compravendita-falsa-dichiarazione/ · https://realadvisor.it/it/blog/vendita-immobile-ereditato

**Non leggibili:** Altalex (errore di caricamento); ingenio-web su ante 1967 (errore); centro assistenza Gestim (richiede accesso); pagina agenzie di Immodoc.

---

## Appendice — Calcoli [S]

| Voce | Calcolo | Risultato |
|---|---|---|
| Vendite per agenzia, quota 63% | 766.757 × 0,63 ÷ 50.000 | ≈ 9,7 |
| Vendite per agenzia, quota 100% | 766.757 ÷ 50.000 | ≈ 15,3 |
| N1 a 39 € per 12 incarichi | 39 × 12 | 468 €/anno |
| Agenzie per 100.000 € di ricavo ricorrente | 100.000 ÷ 468 (12 incarichi) / ÷ (39 × 9,7) | 214 / 264 |
| N1 rispetto a un utente Gestim Professional | 468 ÷ (10 × 12) | ≈ 3,9 volte |
| Faloosa per pratica (Lite, 9,99 € × 12) | 119,88 ÷ 15,3 / 9,7 | 7,8 / 12,4 € |
| Faloosa per pratica (Premium annuale, 69,99 € × 12) | 839,88 ÷ 15,3 / 9,7 | 54,9 / 86,6 € |

Ipotesi: la quota via agenzia del 63% è del 2018 ([V-sec], metodo non leggibile); 50.000 agenzie da fonte secondaria; ogni compravendita conta una volta (nella realtà possono partecipare due agenzie); gli abbonamenti Faloosa si assumono senza limite di pratiche (non verificato).

---

## Changelog
- 2026-10-12 — Prima versione del Red Team indipendente sul canale agenzie. Nessun file preesistente modificato.
