# Round 3 — Red Team strategico: Dimora Partner + Home

**Data:** 2026-10-12 · **Stato:** ricerca, ipotesi da validare · **Non modifica** roadmap, ADR, backlog, codice né le PR esistenti.
**Input confrontati:** (1) Copilot, *Due diligence indipendente — Dimora Partner + Dimora Home* (PDF, 15 pp.); (2) Gemini Round 2 (trascrizione `Dimora_Gemini_Round2_integrale.md`); (3) repository `Vincenzobrutto/Home_OS`, `main` @ `cdbb318`, e il ramo `research/dimora-four-agent-intelligence-20261012`.
**Etichette** (da `RESEARCH_PROTOCOL.md`): **[V]** verificato da me in questa sessione, con fonte · **[I]** inferenza · **[S]** stima con ipotesi dichiarate · **[ND]** non determinato / non trovato (non trovato ≠ assente).
**Data di consultazione di tutte le fonti web:** 2026-10-12.

---

## 0. Risposta in breve

**Domanda finale — il più piccolo insieme di funzioni professionali per cui l'intermediario pagherebbe o distribuirebbe Dimora, e che aumenta il valore di Dimora Home:**

Per le **agenzie** sono quattro funzioni, non di più:

1. **Link di raccolta per il venditore**: carica dal telefono, senza creare un account.
2. **Classificazione ed estrazione AI con conferma umana**, che riusa la pipeline dell'alpha.
3. **Vista "pronta / mancante / incoerente / da verificare" con la fonte di ogni dato**, senza dichiarare conformità.
4. **Consegna selettiva** dei soli dati dell'immobile in un Dimora Home dell'acquirente, per copia e con provenienza dichiarata.

Tutto il resto (CRM, portali, firma, antiriciclaggio, valutazione, marketplace, dashboard multi-agenzia, export notarile come prodotto a sé) è fuori. Le funzioni 1–3 esistono già in forma parziale nell'alpha o nei suoi mattoni; la 4 è l'unico pezzo davvero nuovo e coincide con il legame verso Home.

**Quello che nessuna delle due ricerche dimostra:** che un'agenzia paghi, che il Gift aumenti l'adozione o il pagamento, che il proprietario attivi e rinnovi. Tutto questo resta da validare con il test di §6, che non richiede sviluppo.

**Scelta tra le due ricerche (senza compromessi artificiali):**
- **Struttura commerciale: vince Copilot.** Si paga a pratica completata, si parte gratis, niente canone prima di aver visto l'uso reale. Il canone di Gemini (€59/mese) è HOLD.
- **Livello dei prezzi: nessuno dei due è difendibile.** La scala di Copilot va ridotta a €49 / €99 (il €149 richiede più di quanto un tempo risparmiato possa giustificare, §4.1).
- **Fatti di mercato: Copilot è più affidabile**, Gemini contiene errori fattuali verificabili (§3).
- **Lacuna comune:** il canale installatori/manutentori non è studiato da nessuno dei due. Lo tratto qui come seconda configurazione, a livello di sola intervista.

### Verdetti (dettaglio in §7)

| Ipotesi | Verdetto |
|---|---|
| Agenzie: "Pratica pronta" con consegna a Dimora Home, pagamento a pratica completata | **TEST** |
| Installatori/manutentori: "passaporto d'intervento" verso Home | **TEST** (interviste e passaporti manuali, 3 interventi per tecnico aderente) |
| Partner Lite €59/mese con 12 Gift inclusi (Gemini) | **HOLD** |
| Gift venduto come prodotto separato | **NO GO** |
| Amministratori come clienti paganti | **NO GO** |
| Amministratori come distributori / referral | **HOLD** |
| Hub documentale 1→N con inviti ai condòmini (Gemini, flusso B) | **NO GO** |
| Rinnovi B2C come giustificazione dell'investimento B2B | **NO GO** (come da mandato) |

---

## 1. Cosa esiste davvero in Dimora (verificato nel codice)

| Capacità | Stato | Evidenza |
|---|---|---|
| Login email + password, sessione con cookie di 30 giorni | **Implementato** [V] | `backend/src/auth/auth.service.ts` (hash scrypt, `SESSION_TTL_MS` 30 giorni); `User.passwordHash`, `Session` in `schema.prisma`. `docs/HANDOFF.md` su `main` è coerente: "autenticazione a sessione e isolamento per casa; nessun deploy pubblico". |
| Isolamento per casa | **Implementato** [V] | `AccessControlService.assertHouseAccess` controlla `HouseMembership(houseId, userId)`. |
| Ruoli OWNER / MEMBER / VIEWER | **Solo OWNER è usato** [V] | `houses.service.create` crea solo la riga OWNER. Nessun endpoint/UI di invito (backlog B12). |
| Organizzazioni, multi-tenant, ruoli professionali, audit | **Assente** [V] | Nessun modello `Organization`/`Tenant` nell'elenco dei modelli di `schema.prisma`. |
| Inviti, condivisione, trasferimento, Gift, fatturazione | **Assente** [V] | Nessun codice in `backend/src` (le uniche occorrenze di "share" sono nel matcher dei nomi). `docs/mvp-v1.md` §7 esclude condivisione e trasferimento; B39 chiede prima specifica e threat model, "non endpoint". |
| Documento → estrazione AI → conferma → asset / intervento / garanzia, con provenienza | **Implementato** [V] | `mvp-v1.md` §1; `AssetFieldProvenance` ha `sourceDocumentId`, `confirmedByUserId`, `confirmedAt`. |
| Cosa vede l'utente dell'alpha | **Home · Documenti · Asset · Cerca** [V] | `mvp-v1.md` §5; `ALPHA_MODE` in `frontend/src/config.ts` nasconde il resto. |
| Accuratezza dell'estrazione AI | **Non misurata** [ND] | `alpha-ai-label-measurement.md` (B65) è un piano di misura con soglie, non risultati. La soglia ">90%" di Gemini non ha base nel repo. |
| Costo AI per documento | **Non misurato** [ND] | Nessuna telemetria di costo nel repo. I €144/anno di Gemini sono pura ipotesi. |
| Strategia registrata | ADR #77: wedge **Renovation + Financing**; Transaction Readiness non riaperto | `decisions.md` §77. **Questo report non la modifica**: se Config 1 passasse il test, servirebbe una revisione esplicita dell'ADR da parte tua. |

**Conflitto documentale (sollevato da Copilot) risolto:** l'HANDOFF di agosto parlava di "nessuna autenticazione"; su `main` oggi l'autenticazione esiste. Non ho verificato la sicurezza dell'implementazione né fatto test di intrusione. Dimora resta **non** multi-tenant e **non** production-ready.

---

## 2. Convergenze e contraddizioni Copilot / Gemini

| # | Tema | Copilot | Gemini | Esito del Red Team |
|---|---|---|---|---|
| 1 | Canale prioritario | Agenzie | Agenzie | **Convergenza**, ma è un'inferenza di entrambi: nessuna prova di disponibilità a pagare. |
| 2 | Amministratori | NO GO come cliente; referral o fonte documentale | "Secondo canale", 3 funzioni (censimento impianti, estrattore contratti, hub 1→N) | **Contraddizione. Copilot più solido**: ciascuna delle 3 funzioni di Gemini si sovrappone a un incumbent o richiede una base legale che manca (§3, §4.2). |
| 3 | Struttura del prezzo per le agenzie | Lite gratuito, pagamento a pratica completata (€49/99/149, ipotesi) | Canone €59/mese, 12 Gift inclusi | **Contraddizione di struttura**: impegno mensile prima del valore contro pagamento a risultato. Per un prodotto non ancora usato da nessun professionista, vince il pagamento a risultato (§4.1). |
| 4 | Gift isolato | "Fascicolo vuoto, pur regalato, ha valore debole" | "Gift isolato non abbastanza attraente" | **Convergenza**: il Gift non si vende da solo. |
| 5 | Chi paga il Gift | Incluso nella pratica | Incluso nel canone | Equivalenti nella sostanza: per l'agenzia è un costo, non un acquisto. |
| 6 | Unicità del passaggio al nuovo proprietario | ImmoDoc lo ha già | "Nessun competitor italiano" lo offre | **Gemini errato** [V]: ImmoDoc dichiara consegna all'acquirente col marchio dell'agenzia (§3 F1). |
| 7 | Funzioni per agenzie | 5 (raccolta guidata, AI, readiness, collaborazione selettiva, handover) | 3 (AI triage, export notarile/bancario, handover pack) | Sovrapposte su triage e handover. **Gemini omette la raccolta guidata dal venditore**, il dolore principale che descrive lui stesso ("documenti frammentati via WhatsApp"). Copilot omette l'export, che è un'uscita della readiness, non una funzione a sé. |
| 8 | Rinnovi B2C | Mai nel caso base | 8% × €35, ma "il B2B è la leva" | **Convergenza di fatto.** Il numero di Gemini è comunque irrilevante (§3 E4). |
| 9 | Costo di sviluppo | Nessuna cifra; "non è sviluppo prodotto"; budget di test €4–12k | €18.000 (1,5 mesi-uomo) | **Contraddizione di ordine di grandezza.** Il repo conferma Copilot: tenancy, ruoli, inviti, trasferimento sono architetture nuove (§1). |
| 10 | Break-even | Formula, nessun numero | 39 agenzie | **39 è errato** con il costo di acquisizione di Gemini stesso: ne servono 165 (§3 E1). |
| 11 | Attivazione del Gift | Soglia di test ≥30% | 45% nel conto, "20–35% tipico" nel Red Team, senza fonti | Gemini si contraddice da solo. Nessuno dei due ha un dato osservato. |
| 12 | Privacy del passaggio | Selezione, separazione dei dati personali, nessun trasferimento automatico | "La titolarità passa integralmente al riscatto; l'agenzia decade" | **Copilot più prudente e corretto**; Gemini non descrive chi sceglie cosa trasferire (§3 T1). |
| 13 | Stato del prodotto | Alpha ≠ prodotto professionale; auth da verificare | Il motore alpha "alimenta" lo spazio B2B | Copilot corretto; ora verificato in §1. |
| 14 | Evidenze internazionali | HomeZada, HomeBinder, Chimni, Home Owner's Passport | Nessuna | Copilot; ma nessun dato indipendente di conversione o retention (vedi §3 F9). |
| 15 | Test proposto | Concierge 15 pratiche, deposito, 5×3 | Nessun test | Copilot; il disegno ha però due difetti di potenza e di costo (§3 E8–E10). |
| 16 | Installatori / manutentori | Solo accennati ("Technical Asset Passport") | Non trattati | **Lacuna comune**, colmata in §4.5 e §5. |

---

## 3. Errori verificati

### 3.1 Fattuali

| ID | Affermazione | Chi | Esito | Fonte | Gravità |
|---|---|---|---|---|---|
| F1 | "Nessun competitor immobiliare italiano offre un passaggio a logbook privato post-vendita" | Gemini | **Falso.** ImmoDoc dichiara che dopo il rogito il fascicolo passa all'acquirente e può riportare il marchio dell'agenzia. [V] | https://www.immodoc.it/fascicolo-di-compravendita | Alta |
| F2 | Faloosa/ImmoDoc = "checklist statiche", senza strumenti di raccolta evoluti | Gemini | **Impreciso.** Faloosa Premium include raccolta guidata assistita da IA; ImmoDoc invia inviti per link senza registrazione con permessi diversi per ruolo e collega una rete di tecnici per i documenti mancanti. [V] | https://www.faloosa.it/ · ImmoDoc come sopra | Alta |
| F3 | Gestim: "archiviazione generica, nessun workflow" | Gemini | **Falso per Platinum**: il piano include un workflow documentale per la due diligence. [V] Getrix: non verificato da me. [ND] | https://www.gestim.it/prezzi | Media |
| F4 | "La sintesi per l'assemblea è redatta a mano dall'amministratore" | Gemini | **Falso.** Multidomus riassume i verbali con l'AI, estrae le azioni da fare e cerca in regolamenti e delibere; l'AI è inclusa nei €2 per unità/anno. [V] | https://www.multidomus.it/ | Alta |
| F5 | "Danea ha già un portale web (MioCondominio)" come ostacolo all'hub 1→N | Gemini | **Superato dai fatti:** dal 1° ottobre 2026 MioCondominio non è più acquistabile dai nuovi clienti Domustudio Cloud. Questo apre un varco di mercato, **ma non lo dimostra**: l'adozione di un portale è comunque una decisione dell'assemblea (§3 T2). [V] | https://www.danea.it/software/domustudio/prezzi/ | Media |
| F6 | Gestim "€600–1.800/anno" accostato a Faloosa "€120–840/anno" | Copilot | Cifre corrette ma **non omogenee**: i €600 e €1.800 sono per **5 utenti** (€120 e €360 a utente/anno; Platinum €35 a listino, €30 in promo fino al 31 ottobre). Faloosa è a prezzo singolo. Per utente Gestim è molto più economico di Faloosa Premium (€839,88/anno). [V] | https://www.gestim.it/prezzi · https://www.faloosa.it/ | Bassa |
| F7 | Faloosa Lite €9,99/mese | Copilot | Corretto, ma **omette** che Lite è attivo solo in Lombardia con attività svolte da professionisti selezionati da Faloosa. Il prodotto comparabile con Dimora è Premium (€69,99/mese con fatturazione annuale; €87,49 mensile). [V] | https://www.faloosa.it/ | Media |
| F8 | "ImmoDoc: primo immobile gratuito" | Copilot | La pagina dice che creare un fascicolo è gratis, senza carta; non dice "solo il primo". Il listino non è pubblico. [V] | ImmoDoc | Bassa |
| F9 | HomeZada PRO $99/proprietà, sharing $49, branding $5 | Copilot | **Confermato**: Gift/Transfer $99 per proprietà; il cliente riceve un anno Premium "a $99 value", poi $99/anno oppure piano Essential gratuito; sharing $49/proprietà/anno; branding $5 per cliente/anno; 300 crediti AI per $25. **Resta valido il caveat di Copilot**: è un listino, non una prova di vendite o conversioni. [V] | https://www.homezada.com/professionals/pricing | — |
| F10 | Maintego, Getrix, DokiCasa, HomeBinder, Chimni, Home Owner's Passport | Entrambi | Non verificati da me: il sito Maintego non è consultabile dai miei strumenti (robots), per gli altri non ho riaperto le fonti. Trattare come **[ND]**: vendor ≠ prova indipendente. | — | — |
| F11 | Consultazione del Garante sui dati condominiali | Copilot | **Confermata** nella sostanza: provvedimento n. 209 del 10 aprile 2025, in consultazione; l'adozione di strumenti digitali (cloud, portali documentali) è una decisione dell'assemblea; per l'uso di email e telefoni personali serve in generale il consenso. Non l'ho letto alla fonte primaria, solo in un riepilogo. [V parziale] | https://www.diritto.it/privacy-gestione-condominiale-nuove-linee-guida/ | — |

### 3.2 Economici

| ID | Affermazione | Chi | Esito |
|---|---|---|---|
| E1 | "Break-even sviluppo €18.000 con 39 agenzie" | Gemini | L'aritmetica unitaria è corretta (ricavo €708 − AI €144 − Gift 5,4×€4,50 = €24,30 − supporto €80 = **€459,70**, 64,9%; dopo CAC €350 = **€109,70**; payback del CAC ≈ 9,1 mesi). Ma 18.000 / 459,70 = 39,2 ⇒ **40 agenzie, in regime, per un anno intero, senza CAC**. Con il suo stesso CAC il recupero in anno 1 richiede **165 agenzie**. Con 100 agenzie il primo anno chiude a **−€7.030**: €10.970 di contributo netto contro €18.000 di sviluppo; il solo CAC (€35.000) vale quasi il doppio dello sviluppo. Il repo aveva già segnalato "~164" (`GEMINI_PARTNER_ROUND2_REVIEW_20261012.md`): confermo. |
| E2 | Sviluppo MVP €18.000 = 1,5 mesi-uomo | Gemini | Il costo implicito è €12.000 per mese-uomo. Lo scope dichiarato (area partner, inviti, Gift con token, riscatto, export, billing) richiede componenti che nel repo non esistono [V §1]. **Sottostimato di un ordine di grandezza [I].** Con 6 e 12 mesi-uomo agli stessi €12k: €72.000 e €144.000, quindi **157 e 314 agenzie in regime** (senza CAC), oppure **657 e 1.313 con CAC nel primo anno**. |
| E3 | Gift attivati 45% | Gemini | Contraddice il suo stesso "20–35% tipico" (senza fonte). Con redemption 20% / 28% / 35% / 45% i casi attivi per agenzia sono 2,4 / 3,3 / 4,2 / 5,4. L'effetto sui costi è piccolo, ma è il parametro che conta per il valore del Gift e **non è mai stato osservato**. |
| E4 | Rinnovo B2C 8% × €35 | Gemini | Per proprietario attivato: **€2,80/anno di ricavo atteso contro €4,50/anno di costo di servizio** ipotizzato dallo stesso Gemini ⇒ negativo (−€1,70) se tutti gli attivati restano serviti; +€2,44 se si servono solo i paganti. In totale: 100 agenzie ⇒ 43 paganti ⇒ ~€1.512/anno, cioè **2,1% dei €70.800 di ricavo B2B**. Irrilevante per giustificare l'investimento, in linea con il mandato. |
| E5 | Piano gratuito: "perdita €94/agenzia" (2 Gift × €25 − €144) | Gemini | Artefatto: i €144 di AI/infrastruttura sono fissi e **non scalano con il volume**. Con 12 €/pratica e 2 pratiche il costo è €24 e il saldo è circa **+€26**, prima di supporto e costi del Gift. La conclusione "il piano gratuito perde" non regge; vale l'inverso per un cliente ad alto volume, il cui costo reale potrebbe superare i €144. |
| E6 | Costo variabile per pratica | Gemini (implicito) | AI €12 + Gift €2,03 + supporto €6,67 ⇒ **€20,69 a pratica** [S]. Nessuna misura nel repo [ND]. È il numero che governa ogni prezzo a pratica ed è il primo da misurare. |
| E7 | Posizionamento a €59/mese | Gemini | Faloosa Premium costa €69,99/mese e include CRM, firma OTP, antiriciclaggio; Gestim Platinum €30/utente/mese (promo) include il workflow documentale; ImmoDoc crea il fascicolo gratis. Dimora a €59 propone **un sottoinsieme** a ~85% del prezzo di Faloosa Premium e circa **il doppio di un posto Gestim Platinum**. Serve un risparmio misurabile maggiore, non dimostrato (§4.1). |
| E8 | Budget di test €4.000–12.000 per 15 pratiche | Copilot | €267–800 a pratica contro ricavi teorici di €735–2.235 in totale: il test costa **1,8–16,3 volte** il suo ricavo massimo. Non è un errore (è un costo di apprendimento), ma gran parte può essere evitata chiedendo un impegno scritto prima del concierge (§6). |
| E9 | Soglia "almeno 3 agenzie su 5" | Copilot | **Non discrimina.** Intervallo di confidenza 95% del 60%: 23–88%. Se la vera propensione fosse 40%, il test passa il 32% delle volte; se fosse 60%, solo il 68%. Stesso problema per "activation ≥30%" su 15 acquirenti: 5/15 ⇒ intervallo 15–58%. |
| E10 | Config 2: "processo manuale non sotto 60 minuti per unità" come soglia di abbandono | Copilot | A €40/ora [S] 60 minuti costano €40, ossia **82% di €49** e 40% di €99: la soglia accetta margini quasi nulli. Analogamente "correzioni AI/back office >30% del prezzo" vale ≈22 minuti a €49, ≈45 a €99, ≈67 a €149. |
| E11 | Formula P\* = F / [Ps + T·a·(Pg − Cv) − Con − CACp] | Copilot | Il fattore di attivazione `a` moltiplica anche il **ricavo** (Pg): confonde Gift **venduto** e Gift **riscattato** (già segnalato nell'intake). Se l'agenzia paga la pratica completata, `a` deve moltiplicare solo il costo di erogazione. Inoltre `Con` e `CACp` sono una tantum ma stanno dentro un termine annuo per partner. |
| E12 | Volume per agenzia (12 pratiche/anno) | Gemini | **Non supportato da fonti.** Il dato di mercato verificato è un altro: circa 767.000 compravendite residenziali nel 2025 (+6,5%), fonte FIAIP "Monitora Italia" ripresa da Teleborsa [V, https://www.teleborsa.it/AMP/News/2026/07/24/immobiliare-767mila-compravendite-nel-2025-31.html]. La quota intermediata da agenzie e il numero di agenzie e di amministratori attivi **non li ho trovati in fonti verificabili** [ND]. |

### 3.3 Tecnici e di conformità

| ID | Affermazione | Chi | Esito |
|---|---|---|---|
| T1 | "Con il riscatto la titolarità del fascicolo passa integralmente al proprietario; l'accesso agenzia decade" | Gemini | Non dice **chi decide cosa passa**. Il fascicolo di una pratica contiene dati del venditore (documento d'identità, antiriciclaggio, mandato, provvigione), atti con nominativi di terzi, ipoteche e mutui. Un "trasferimento" della pratica sposta dati che non sono dell'acquirente. Copilot lo tratta correttamente (selezione e rimozione dei dati personali). **Soluzione più sicura: copia selettiva (copy-on-handover), non trasferimento** (§4.4). |
| T2 | Flusso B: "l'amministratore emette inviti ai condòmini" | Gemini | Usa i contatti dei condòmini per un servizio di terzi. Secondo il provvedimento 209/2025 (in consultazione) gli strumenti digitali sono una decisione dell'assemblea e le email personali richiedono in genere consenso [V parziale]. Copilot richiama inoltre l'art. 1123 c.c. (riparto delle spese comuni) e il portale condominiale deliberato dall'assemblea; ricordo il testo dell'art. 71-ter disp. att. c.c. in questo senso ma **non l'ho riaperto in sessione** [ND]. Per un Gift ai singoli proprietari resta una questione di chi paga: non si può presumere che i fondi condominiali lo coprano. |
| T3 | "Accuratezza percepita >90% necessaria all'adozione" | Gemini | Soglia plausibile ma priva di misura: l'accuratezza di Dimora **non è stata misurata** [ND] (§1). |
| T4 | DiCo/DiRi "per evitare contestazioni" | Gemini | Funzione utile ma vicina a un'attestazione di conformità. Il principio di prodotto è "nessun claim di certificazione": l'interfaccia deve dire *presente / mancante / da verificare*, mai *conforme*. |
| T5 | La provenienza nel passaggio | Entrambi | Non trattata da nessuno. In `AssetFieldProvenance` il campo è "confermato da un utente". Se i dati vengono confermati dall'agenzia o dal venditore e poi copiati, il nuovo proprietario **non li ha confermati**: la copia deve portare un'etichetta del tipo "ricevuto dalla pratica, non verificato dal proprietario" e il principio "l'AI propone, l'utente conferma" va rispettato anche lì. |

---

## 4. I cinque challenge

### 4.1 Chi ha ragione sul pricing?

**Nessuno dei due è validato. Ha ragione Copilot sulla struttura, nessuno sul livello.**

**Equivalenze (aritmetica, non mercato).** €59/mese = €708/anno equivale a €59 per pratica se l'agenzia ne fa 12; a 4 pratiche l'anno costa €177 a pratica, a 24 costa €29,50. Il canone **penalizza le agenzie a basso volume** e premia quelle ad alto volume, ma il numero di pratiche per agenzia è l'incognita che nessuno dei due ha misurato.

**Quanto tempo deve far risparmiare per giustificare il prezzo** (solo tempo, a €40/ora [S] di costo pieno di un agente o back office):

| Prezzo | Minuti da risparmiare a pratica |
|---|---|
| €49 a pratica | ≈ 74 |
| €59 a pratica (canone Gemini a 12 pratiche/anno) | ≈ 89 |
| €99 a pratica | ≈ 149 |
| €149 a pratica | ≈ 224 |

La stessa soglia minima che Gemini pone per l'adozione, 45 minuti a pratica, vale a 12 pratiche/anno circa **€360/anno di tempo**, meno dei **€708** del canone: **il canone costa più del beneficio minimo che Gemini stesso richiede**. Il caso "20 PDF in 3 minuti invece di 2 ore" che usa a sostegno è, per sua ammissione, un esempio ipotetico.

Il risparmio di tempo non è l'unico valore possibile (meno pratiche che saltano, migliore percezione verso il venditore), ma **non è misurato**.

**Cosa tenere e cosa togliere:**
- **Tenere** di Copilot: Lite gratuito e pagamento a pratica completata, impegno scritto prima di costruire, rinnovi B2C esclusi dal caso base.
- **Tenere** di Gemini: la formula per il contributo per agenzia (corretta), l'idea che il B2B sia l'unica leva economica credibile.
- **Togliere €149 dal test.** Richiederebbe oltre tre ore risparmiate a pratica: servirebbe un servizio aggiuntivo (ad esempio richieste ai tecnici) che nessuna delle due ricerche ha dimostrato.
- **Rimandare il canone** finché non si sa quante pratiche l'agenzia passa su Dimora.
- **Ancoraggio:** ImmoDoc crea il fascicolo gratis e monetizza altrove (la pagina indica che le richieste ai tecnici possono essere pagate dall'agenzia, dal venditore o dall'acquirente) [V]. Dimora non può partire a pagamento con la sola raccolta documenti: deve dimostrare un risparmio **sopra** una concorrenza gratuita.

**Contributo annuo per agenzia nel pagamento a pratica** (con costo variabile di €20,69, senza CAC, quindi limite superiore):

| Prezzo | 4 pratiche | 8 pratiche | 12 pratiche | 24 pratiche |
|---|---|---|---|---|
| €49 | €113 | €226 | €340 | €679 |
| €99 | €313 | €626 | €940 | €1.879 |

### 4.2 Quale utilità professionale giustifica l'adozione?

**Competitor — cosa ho verificato e cosa implica**

| Strumento | Cosa fa (verificato) | Prezzo (verificato) | Implicazione per Dimora |
|---|---|---|---|
| **ImmoDoc** [V] | Checklist per tipo di immobile, link senza registrazione con permessi per ruolo (venditore, acquirente, notaio, banca, tecnici), richieste di documenti a una rete di tecnici, consegna all'acquirente col marchio dell'agenzia, log degli accessi | Creazione fascicolo gratuita; listino non pubblico | **Concorrente più vicino sul lavoro e sul passaggio.** Dimora non può vincere per "il fascicolo che passa"; deve vincere per velocità, semplicità e continuità dopo il rogito. |
| **Faloosa** [V] | Dossier immobile, raccolta guidata con AI (Premium), firma OTP, antiriciclaggio, modulistica, CRM, e-commerce di servizi catastali (solo Lite) | Lite €9,99/mese annuale (solo Lombardia); Premium €69,99/mese annuale | Concorrente sulla raccolta guidata. Premium ha un perimetro molto più ampio di quello che propone Dimora. |
| **Gestim** [V] | CRM, immobili, marketing; Platinum con workflow documentale per due diligence | Professional €10/utente/mese (fino a 5); Gold €20; Platinum €30 in promo fino al 31/10 (prima €35); Personal €30 | Il documento in sé non è un varco: è già in un CRM che molte agenzie hanno. Dimora non deve sostituire il CRM. |
| **Domustudio (Danea)** [V] | Contabilità e gestione, "Gestione attività (guasti, sopralluoghi…)", "Gestione parti comuni"; MioCondominio non più venduto ai nuovi clienti dal 1/10/2026 | Cloud One €288/anno, Cloud Pro €576/anno + IVA | Il presidio tecnico-amministrativo esiste già. |
| **Multidomus** [V] | Ticket, comunicazioni, fornitori con DURC, dashboard scadenze, studio, AI su verbali/delibere, integrazione nativa con Domustudio/Brainware | €2,00 per unità/anno, AI e DURC inclusi | Copre l'estrattore contratti/sintesi assembleare di Gemini a un prezzo più basso. |
| **Maintego** [ND] | Non consultabile dai miei strumenti (robots). Copilot e Gemini lo descrivono come fascicolo del fabbricato e manutenzione programmata | — | Non uso nessuna conclusione che dipenda da quel che dicono i due agenti. |

**Agenzie — i tre workflow in cui Dimora potrebbe essere preferibile** (miglioramento, non unicità):

| # | Workflow | Alternativa oggi | Dove potrebbe vincere Dimora | Metrica |
|---|---|---|---|---|
| **W1** | **Raccolta guidata dal venditore, da telefono, senza account**, con classificazione ed estrazione AI e conferma umana | WhatsApp/email; ImmoDoc (link senza registrazione); Faloosa Premium (raccolta guidata AI); Gestim Platinum | Meno attrito per il venditore; l'estrazione e la conferma esistono già nell'alpha; lo stesso lavoro alimenta Home | Minuti attivi dell'agente a pratica; numero di solleciti; documenti corretti senza modifica |
| **W2** | **Vista "pronta / mancante / incoerente / da verificare" con fonte per campo**; da questa nascono gli export per notaio e banca | Checklist di ImmoDoc/Faloosa/Gestim | La fonte e lo stato per campo (la provenienza esiste già) rendono la vista verificabile; l'export di Gemini diventa un'uscita di W2 | Completezza media a T−14 giorni dal rogito; richieste di integrazione dopo l'avvio |
| **W3** | **Consegna all'acquirente** in un Dimora Home già popolato per asset, interventi e garanzie, non solo per documenti | Cartella/ZIP; ImmoDoc handover col marchio | Il dopo-rogito: promemoria, garanzie, storico. **Valore per il proprietario più che per l'agente**; per l'agente è ritenzione del rapporto, non misurata | Riscatto a 30 giorni; primo documento confermato; ritorno a 90 giorni |

**Amministratori — le uniche tre opzioni residue, e cosa ne resta:**

| # | Idea | Giudizio |
|---|---|---|
| A1 | **Rispondere alla richiesta di documenti per una vendita** (regolamento, tabelle millesimali, attestazione spese/lavori/liti, elementi che anche Copilot elenca dal Notariato) con un link di caricamento una tantum, dentro la pratica dell'agenzia | **Si integra in Config 1, non è un prodotto a parte.** Il dolore (richieste ripetute di copie) è affermato da Gemini senza fonte [ND]. |
| A2 | Scadenzario tecnico delle parti comuni da verbali ascensore e impianti | **HOLD.** Sovrapposto a Domustudio (parti comuni, attività) e Multidomus (scadenze); l'estrazione AI delle scadenze potrebbe essere migliore, ma una scadenza sbagliata ha conseguenze legali e Gemini stesso nota che l'amministratore dovrebbe fidarsi "ciecamente". |
| A3 | Estrattore contratti fornitori / sintesi assembleare | **NO GO.** Multidomus lo fa già, incluso nel prezzo (F4). |
| — | Hub documentale 1→N con inviti ai condòmini | **NO GO** per ora: serve delibera, base legale per i contatti e un pagante; vedi T2. |

### 4.3 Il Gift crea valore incrementale?

**Confronto sugli stessi workflow, con e senza Gift** (il Gift qui è la consegna a Dimora Home, W3):

| Dimensione | Senza Gift (W1+W2) | Con Gift (W1+W2+W3) | Evidenza |
|---|---|---|---|
| Adozione da parte dell'agenzia | Guidata dal risparmio di tempo | **Nessun effetto dimostrato**; Gemini stesso scrive che senza Gift l'agenzia potrebbe pagare per il solo triage | [ND] |
| Disponibilità a pagare | Stessa | **Nessun effetto dimostrato.** Copilot: un Gift senza lavoro utile ha "valore debole". Non c'è evidenza di acquisti indotti. | [ND] |
| Percezione di valore per l'agenzia | Pratica più rapida | Possibile: **permanenza del marchio** nella casa del cliente (HomeZada vende il rinnovo del branding a $5/cliente/anno, quindi qualcuno ne vede il valore) [I]; non misurata per il mercato italiano | [I] |
| Costo per Dimora | Costi di pratica | + erogazione Home (€4,50/anno attivo in Gemini, ipotesi) + supporto del riscatto + **privacy e trasferimento** (la parte più costosa e rischiosa) | [S] |
| Complessità | Media | **Alta** (consenso del venditore, selezione, copia, riscatto, revoca; §4.4) | [V §1] |
| Valore per il proprietario | Nullo (non entra in Home) | **Alto sul piano teorico** (Home già popolato), subordinato all'attivazione | [I] |

**Conclusione:** il Gift **non dimostra di indurre acquisti**: è un **meccanismo di distribuzione e un formato di output** del lavoro dell'agenzia, che ne fa un costo finché non si prova il contrario. Le implicazioni:

1. **Non si vende da solo** (NO GO come prodotto).
2. **Si include nella pratica**, non in un canone.
3. Va misurato come **braccio A/B** (pratica pronta, con e senza consegna a Home), non assunto.
4. Va sempre contato in quattro stadi distinti. Nel funnel di Gemini, per 100 agenzie × 12 = 1.200 Gift: 540 riscattati (45%), un numero **non specificato** di proprietari attivi, ~43 rinnovi a pagamento.

| Stadio | Definizione operativa proposta |
|---|---|
| Gift **venduto** | La pratica è completata e il partner ha pagato (o è dovuto) il prezzo |
| Gift **riscattato** | L'acquirente ha creato l'account dal codice di consegna |
| Proprietario **attivo** | Almeno un documento o un dato confermato entro 30 giorni; ritorno a 90 giorni |
| Proprietario che **rinnova a pagamento** | Pagamento effettivo a 12 mesi. **Nessuno dei due ha un dato; non entra nel caso base.** |

### 4.4 La sinergia Partner → Home è realmente fattibile?

**Sì, ma solo come copia selettiva decisa dal venditore, non come "trasferimento" di una pratica.** Dove nascono i dati e che cosa può passare:

| Dato | Nasce | Chi lo ha | Permesso | Passa a Home? |
|---|---|---|---|---|
| **Dati tecnici dell'immobile non personali**: classe energetica e scadenza APE, impianti (tipo, anno, marca, modello, seriale da DiCo/libretti), dati catastali non nominativi (foglio, particella, sub, categoria), planimetria | Raccolta venditore/tecnici | Venditore, agenzia | Consenso del venditore al trattamento per la pratica **e** scelta esplicita di cosa consegnare | **Sì, dopo scelta** [I] |
| Documenti personali del venditore: identità, codice fiscale, antiriciclaggio, mandato, provvigione, proposte | Pratica | Agenzia | Rapporto agenzia–venditore | **Mai** |
| Atto di provenienza, visure con nominativi, ipoteche e mutui | Pratica | Venditore, agenzia | Contengono dati di terzi e finanziari | **Default no**; passano al più i dati dell'immobile estratti, non il documento |
| Regolamento e tabelle millesimali | Amministratore | Amministratore, condominio | Richiesta della vendita | Plausibile, [ND] da verificare con un professionista |
| Verbali assembleari | Amministratore | Amministratore | Contengono dati di altri condòmini | **No** |
| Attestazione dell'amministratore su spese, lavori, liti | Amministratore, per la singola unità | Amministratore | Richiesta della vendita | Plausibile, [ND] |
| Comunicazioni agente–venditore | Pratica | Agenzia | — | **Mai** |
| Dati dell'acquirente e del mutuo | Pratica | Agenzia, banca | — | **Mai** nel fascicolo del venditore |

**Quali componenti nuove servirebbero** (nessuna esiste, §1):

1. identità e area del partner, con elenco delle sue pratiche;
2. **pratica** come contenitore distinto dalla casa del proprietario;
3. link di caricamento per il venditore, senza account;
4. schermata di **scelta del venditore** con registro del consenso;
5. **copia alla consegna** in una nuova casa dell'acquirente, con provenienza rietichettata (T5);
6. codice o QR di riscatto;
7. conservazione e cancellazione dei dati della pratica;
8. definizione dei ruoli GDPR tra agenzia, Dimora e acquirente (**da validare con un legale**, io non lo sono).

**Perché la copia semplifica:** l'agenzia non "perde l'accesso" a una casa che era anche sua; la pratica resta separata e il proprietario riceve una **nuova casa**. Con gli stessi modelli già presenti (`House`, `HouseMembership`, `Document`, `Asset`, provenienza) il percorso minimo non richiede, in teoria, né multi-tenant né ruoli MEMBER/VIEWER [I]. **Resta però sviluppo di dimensione "L"** (§8) e non lo avvio.

**Rischio specifico: il venditore non ha più incentivo a scegliere cosa consegnare dopo il rogito.** La scelta va quindi chiesta **all'incarico** (consenso preventivo con elenco di cosa verrà consegnato), non al momento del rogito.

### 4.5 Quale canale massimizza la distribuzione?

**Non si può dichiarare un vincitore con le evidenze attuali.** Il confronto qui separa le dimensioni; i giudizi sono **[I]** salvo dove indicato.

| Dimensione | Agenzie | Amministratori | Installatori / manutentori |
|---|---|---|---|
| **Ruolo plausibile** | Distributore **e** possibile pagante | Fonte documentale e, al più, distributore gratuito; **non** pagante | Distributore; pagante improbabile |
| **Capacità distributiva** | Evento discreto con un destinatario chiaro (l'acquirente). Mercato: ~767.000 compravendite residenziali/anno [V]; quota intermediata e numero di agenzie [ND] | Elevata per numero di unità, ma ogni invio dipende da delibera e consensi | Frequenza alta (interventi, manutenzioni annuali), ma mercato frammentato [ND, nessuna fonte verificata] |
| **Incentivo del partner** | Pratica più rapida; marchio nella casa del cliente | **Basso**: nessun beneficio proprio, rischio di doppioni e di richieste dei condòmini | Moderato: promemoria di manutenzione = lavori ripetuti; meno carta per le garanzie [I] |
| **WTP professionale** | **Contesa**: ImmoDoc gratis, Gestim €10–30/utente/mese, Faloosa €10–70/mese; nessuna prova per Dimora | **Bassa**: già paga Domustudio (€288–576/anno) o Multidomus (€2/unità/anno) | **Bassa come software [I]**; non testata |
| **Acquisto del Gift** | Come voce della pratica, non separata | Molto bassa; i fondi condominiali non si possono presumere (T2) | Bassa |
| **Attivazione del proprietario** | Media: il nuovo proprietario ha bisogno di documenti in un momento di cambiamento | Bassa-media: invito dall'amministratore con questioni di consenso | **Potenzialmente la più alta**: asset, garanzia e DiCo appena emessi, con un'esigenza immediata di conservarli [I] |
| **Costo di acquisizione** | Vendita B2B a PMI frammentate. Il CAC €350 di Gemini non ha fonte [ND] | Non stimabile | Numero elevato di micro-partner [ND] |
| **Evidenza** | La più ampia (concorrenti verificati, listino HomeZada) | Contraria come pagante (Copilot, e F4/F5) | **Nessuna** in entrambe le ricerche |

**Indicazione operativa:** agenzie per il test di pagamento a pratica (evento chiaro, concorrenti noti, ruolo pagante testabile); installatori per il test più economico di **attivazione**; amministratori come fonte di documenti dentro la pratica dell'agenzia e **non** come canale autonomo. Il distributore **non** coincide col pagante: i pagatori alternativi (il proprietario con Premium, uno sponsor come un finanziatore o un produttore, coerente con l'ADR #77) **non sono stati testati**.

---

## 5. Le due configurazioni sopravvissute

### Configurazione 1 — "Pratica pronta" (agenzie → Dimora Home)

- **Proposta di valore per l'agenzia:** meno tempo a inseguire il venditore e ad assemblare documenti; un unico stato di avanzamento verificabile; un output di consegna all'acquirente che porta il marchio dell'agenzia (da verificare se l'agenzia lo valuta). **Non è un CRM**.
- **Workflow:** (1) l'agente crea la pratica; (2) manda il link al venditore, che carica dal telefono; (3) l'AI classifica ed estrae, il venditore o l'agente conferma; (4) vista pronta/mancante/da verificare; (5) per i documenti condominiali, link di caricamento all'amministratore (A1); (6) **consenso alla consegna chiesto all'incarico**, scelta finale al rogito; (7) l'acquirente riscatta e riceve Home con dati dell'immobile e provenienza "dalla pratica".
- **Relazione con Home:** la consegna è l'**uscita naturale** del lavoro, non un regalo a sé. Home è il record di lunga durata; la pratica resta separata.
- **Costi:** variabile **€20,69 a pratica** [S, non misurato], più costo del test. Sviluppo post-validazione dimensione "L" (§8).
- **Rischi:** incumbent con prodotto gratuito o già in uso (ImmoDoc, Faloosa, Gestim); doppio inserimento; errori AI su date e conformità; ruoli GDPR; interesse del venditore alla scelta dopo il rogito; attivazione dell'acquirente; ADR #77 non riaperto.
- **Dati necessari:** pratiche per agenzia l'anno (**oggi sconosciute**); quota di pratiche passate su Dimora; minuti attivi a pratica rispetto alla base dichiarata dall'agenzia; tasso di correzione AI; solleciti; consenso del venditore alla consegna; riscatto, attivazione a 7/30/90 giorni.
- **Test di pagamento:** lettera d'intenti firmata con pratica nominata e data, più acconto o pagamento a consegna a €49 o €99 (§6). Un'adesione verbale o un "interessante" **non contano**.

### Configurazione 2 — "Passaporto d'intervento" (installatori/manutentori → Dimora Home)

**Livello di evidenza: il più basso. Sopravvive perché è l'unica alternativa non contraddetta dalle prove e perché il suo test costa quasi nulla.** Si collega alla direzione "Renovation" già registrata nell'ADR #77, ma nulla qui la modifica.

- **Proposta di valore per il professionista:** consegnare al cliente un rapporto d'intervento ordinato (DiCo, libretto, rapportino, garanzia) senza carta, con promemoria della manutenzione successiva (possibile lavoro ripetuto) [I].
- **Workflow:** (1) dopo il lavoro il tecnico carica i documenti da telefono; (2) l'AI propone asset, intervento e garanzia; (3) il tecnico conferma; (4) il proprietario riceve l'invito a Home già popolato, con provenienza "confermato dal tecnico".
- **Relazione con Home:** la più diretta. I dati sono a livello di asset e nascono dal professionista che li ha prodotti; **non c'è il problema dei dati personali del venditore** della Config 1. Asset, interventi e garanzie sono già i moduli solidi dell'alpha.
- **Costi:** simili per pratica; supporto probabilmente più alto per utenti poco digitali [I]. Sviluppo post-validazione: identità del tecnico e un percorso d'invito (dimensione "M").
- **Rischi:** mercato frammentato, bassa propensione a pagare e ad adottare software; doppio inserimento rispetto al gestionale o a WhatsApp; il proprietario non vuole un'altra app; responsabilità sull'accuratezza dei dati tecnici (nessuna certificazione).
- **Dati necessari:** lavori per tecnico a settimana, documenti già prodotti per lavoro, quota di clienti che accetta l'invito, ritorno a 90 giorni.
- **Test di pagamento:** non un canone. Primo obiettivo: 5 interviste e **3 interventi reali per ciascuno dei tecnici che aderiscono**, con un passaporto prodotto a mano. Il pagamento da testare è chi paga (tecnico a consegna, proprietario con Premium, sponsor): in questa fase si registra solo cosa il tecnico dichiara di essere disposto a pagare, con impegno scritto, **senza fissare prezzi di listino**.

**Esclusi come configurazioni:** Amministratore come pagante, hub 1→N, Partner Lite a canone, Partner Pro. Motivo nelle sezioni precedenti.

---

## 6. Esperimento minimo senza sviluppo

**Principio:** la prova di pagamento viene **prima** del concierge. Il budget di Copilot (€4–12k) si spende solo per chi ha firmato. Si riusano i materiali già nel repo: `discovery/B2B_BUYER_DISCOVERY_PLAN_20261012.md`, `PARTNER_DISTRIBUTION_INTERVIEW_SCORECARD_v0.1.md`, `INTERVIEW_TEMPLATE.md`, `PARTNER_ONEPAGER_AGENCIES_v0.1.md`.

### Fase 0 — Impegno prima del prodotto (circa 2 settimane)

1. **Reclutare:** 10 agenzie indipendenti che dichiarano almeno 3 pratiche residenziali l'anno, 5 installatori/manutentori, 3 studi di amministrazione.
2. **Intervista sugli ultimi tre casi reali di ciascuno** (non su ipotesi): minuti attivi, solleciti, strumenti usati, chi paga i servizi aggiuntivi. Vietato "pagheresti X?" come segnale unico.
3. **Mostrare due output costruiti a mano con dati fittizi:** (a) il report "pratica pronta"; (b) una schermata di un Home dell'alpha popolata con gli stessi dati. Nessuna promessa di funzionalità non disponibili.
4. **Chiedere un impegno:** lettera d'intenti per **una pratica nominata** (agenzie) o per **3 interventi** (tecnici), con un prezzo per pratica **a €49 oppure €99, assegnato a sorte a metà del campione**, pagabile alla consegna.
5. **Domande Gift (agenzie):** "se potessi tenere una sola versione, quale?"; "quanto delta di prezzo accetteresti per la consegna a Home?"; "il tuo marchio nella casa del cliente, vale qualcosa per te?".

### Fase 1 — Concierge solo per chi ha firmato (4–6 settimane)

- Pratica gestita a mano con cartella condivisa, checklist e l'alpha esistente per il lato proprietario. **Nessuna modifica al prodotto.** Prima di toccare dati reali di clienti: **parere legale su consenso, informativa e ruoli** (gate).
- **Misure:** minuti attivi (agente, venditore, team Dimora); solleciti; tasso di correzione AI; completezza della vista; pagamento effettivo dopo la consegna; riscatto, attivazione a 7/30/90 giorni.
- **Braccio A/B:** agenzie con consegna a Home contro senza. Con n piccolo il confronto è solo **direzionale**: si registra e non si "dimostra".
- **Tetto di spesa proposto: ≤ €1.500 in contanti** [S], più tempo, contro i €4.000–12.000 di Copilot. Il resto si sblocca solo dopo le soglie.

### Soglie (regole decisionali del progetto, **non** benchmark)

La soglia è scelta con la probabilità reale di passarla: **almeno 3 su 10** (non 3 su 5).

| Vera propensione a firmare | 10% | 20% | 25% | 40% | 60% |
|---|---|---|---|---|---|
| Probabilità di ottenere ≥ 3 su 10 | 7% | 32% | 47% | 83% | 99% |
| (a confronto, ≥ 3 su 5) | 1% | 6% | 10% | 32% | 68% |

- **Config 1 — continuare** se ≥ 3 agenzie su 10 firmano per una pratica nominata entro 14 giorni; **HOLD** se 1–2; **stop** se 0.
- **Config 2 — continuare** se ≥ 2 tecnici su 5 si impegnano a 3 interventi e almeno metà dei clienti coinvolti accetta l'invito.
- **Fermarsi in Fase 1** se: la correzione AI + back office supera il 30% del prezzo (≈22 minuti a €49, ≈45 a €99 a €40/ora [S]); il risparmio dichiarato dall'agente è sotto i 30 minuti a pratica; un blocco privacy non risolvibile; il riscatto dell'acquirente è sotto il 20%. Con 15 acquirenti il 30% di Copilot (5/15) ha un intervallo 15–58%: va letto come "continua verso il test successivo", **non** come prova.

### Cosa **non** fa questo test (da dichiarare)

Non misura la retention a 12 mesi, né il rinnovo a pagamento, né il CAC reale. Non dimostra che il Gift sposti il pagamento. Misura soltanto se esiste un impegno a pagare per il lavoro utile e se il passaggio a Home è tecnicamente e legalmente praticabile.

---

## 7. Verdetti: TEST / HOLD / NO GO

| # | Ipotesi | Verdetto | Motivo |
|---|---|---|---|
| H1 | Agenzie: "Pratica pronta" + consegna a Home, pagamento a pratica completata | **TEST** | Evento chiaro, concorrenti noti, nessuna prova di WTP ma testabile con impegno scritto. |
| H2 | Installatori/manutentori: passaporto d'intervento verso Home | **TEST** (interviste e passaporti a mano, 3 interventi per tecnico aderente) | Più basso livello di evidenza, miglior legame con i moduli esistenti, test quasi senza costo. |
| H3 | Lite gratuito + pagamento a pratica (struttura di Copilot) | **TEST** | Riduce l'impegno richiesto prima del valore; rivela il volume reale. Scala €49/€99. |
| H4 | Partner Lite €59/mese con 12 Gift inclusi (Gemini) | **HOLD** | Prezzo vicino a Faloosa Premium e doppio di Gestim Platinum per un sottoinsieme; il canone costa più del risparmio minimo che Gemini richiede (§4.1). Rivalutare solo con dati di volume. |
| H5 | Gift incluso nell'output della pratica | **TEST** | È l'unico legame con Home. |
| H6 | Gift come driver di acquisto o di WTP | **HOLD** | Nessuna evidenza; si misura come braccio A/B. |
| H7 | Gift venduto come prodotto separato / "regalo vuoto" | **NO GO** | Entrambi gli agenti concordano; nessun caso internazionale lo prova. |
| H8 | Amministratori come clienti paganti | **NO GO** | Domustudio, Multidomus, Maintego presidiano; AI già inclusa a €2/unità. |
| H9 | Amministratori come distributori gratuiti / referral | **HOLD** | Incentivo debole, consenso e delibera, nessuna prova; tenere solo come fonte documentale dentro Config 1 (A1). |
| H10 | Hub 1→N con inviti ai condòmini (flusso B di Gemini) | **NO GO** | Delibera, contatti personali, nessun pagante, fondi condominiali non presumibili. |
| H11 | Estrattore contratti fornitori / sintesi assembleare | **NO GO** | Multidomus lo include già. |
| H12 | Scadenzario tecnico delle parti comuni | **HOLD** | Sovrapposto agli incumbent; responsabilità sulle scadenze. |
| H13 | Export notarile/bancario come prodotto | **HOLD** | È un'uscita di W2; si produce a mano nel test. |
| H14 | Rinnovi B2C come giustificazione dell'investimento B2B | **NO GO** | Nessun dato; €2,80 di ricavo atteso a proprietario in anno 2 nel modello di Gemini (§3 E4). |
| H15 | Sviluppo di Partner completo (multi-tenant, RBAC, dashboard multi-agenzia, audit) | **NO GO** ora | Nulla di tutto ciò esiste e nulla è validato. |

---

## 8. Cosa sviluppare **solo dopo** la validazione

Scala di sforzo (**qualitativa, mia, non basata sulla velocità del team**; nel repo non c'è dato di velocità): **S** 2–4 settimane · **M** 1–2 mesi · **L** 3–5 mesi · **XL** oltre 6 mesi di uno sviluppatore. A €12.000 per mese-uomo (il costo implicito di Gemini) [S]: S €6–12k, M €12–24k, L €36–60k, XL >€72k.

| Candidato | Sforzo | Condizione di sblocco | Rischio principale |
|---|---|---|---|
| Link di caricamento per il venditore (token, senza account), pratica con più documenti | M | Config 1 passata e ≥30 minuti risparmiati a pratica | Abuso del link; file di terzi |
| Vista "pronta / mancante / da verificare" con fonte | S–M | Come sopra | Interpretazione come "conformità" |
| Consegna selettiva con **copia** e registro del consenso, codice di riscatto | L | Riscatto ≥20% nel concierge **e** parere legale favorevole | Dati di terzi; ruoli GDPR |
| Account partner minimale (identità + elenco pratiche; **non** multi-tenant completo) | M | ≥5 partner che pagano | Nuovo sistema di identità |
| Fatturazione a pratica (IVA e fatture italiane) | M | Primi pagamenti reali | Contabilità |
| Passaporto d'intervento per tecnici | M | Config 2 passata | Basso adottato dai professionisti |
| Export notarile/bancario | S | Richiesto nella metà delle pratiche | Responsabilità sulla completezza |
| Multi-tenant, ruoli, audit professionale | XL | Più utenti per organizzazione che chiedono accessi diversi | Il costo più alto per il beneficio più incerto |

**Convenienza:** quante pratiche pagate servono per ripagare lo sviluppo con il solo contributo (prezzo − €20,69), senza CAC e senza costi fissi.

| Sviluppo | Pratiche a €99 | Agenzie-anno a 12 pratiche | Pratiche a €49 |
|---|---|---|---|
| €36.000 (L basso) | 460 | 39 | 1.272 |
| €72.000 (L alto) | 920 | 77 | 2.544 |
| €144.000 (XL basso) | 1.839 | 154 | 5.087 |

**Non sviluppare** in nessun caso come conseguenza di questo report: CRM, pubblicazione sui portali, valutazione, firma elettronica, antiriciclaggio, marketplace di tecnici, "certificazione di conformità", portale per condòmini, estrattore di contratti fornitori, dashboard multi-agenzia.

---

## 9. Limiti, non verificato, da validare

**Non verificato in questa sessione [ND]:** Maintego (sito non consultabile dai miei strumenti); Getrix, DokiCasa; HomeBinder, Chimni, Home Owner's Passport (conferme di Copilot non riaperte); numero di agenzie, di amministratori e di installatori attivi in Italia, e quota di compravendite intermediate; art. 1123 c.c. e art. 71-ter disp. att. c.c. (citati, non riaperti); testo integrale del provvedimento 209/2025 (solo un riepilogo); costo reale dell'AI per documento e accuratezza di estrazione (mai misurati).

**Limite delle fonti di input:** il testo di Gemini è una trascrizione, non una riproduzione verbatim: la nota del trascrittore dice che le tabelle sono state riformattate e alcune formulazioni compattate. Cifre e affermazioni sono state confrontate sul testo ricevuto; non posso escludere differenze rispetto all'originale.

**Ipotesi mie, non fatti [S]:** €40/ora di costo pieno; €20,69 a pratica (derivato da Gemini); scale di sforzo e costi di sviluppo in §8; tetto di €1.500 per il test.

**Da validare con persone reali:** pratiche per agenzia l'anno; risparmio di tempo misurato; disponibilità a firmare a €49/€99; valore del marchio nella casa del cliente; riscatto e attivazione dell'acquirente; disponibilità dei tecnici; ruoli GDPR e consensi.

**Nota di processo:** `AGENTS.md` chiede a fine sessione di aggiornare changelog, roadmap e backlog. Non l'ho fatto perché il mandato di Round 3 vieta di modificare roadmap, ADR e backlog; questo report è l'unico file aggiunto.

**Fonti** (consultate il 2026-10-12): [ImmoDoc](https://www.immodoc.it/fascicolo-di-compravendita) · [Faloosa](https://www.faloosa.it/) · [Gestim, prezzi](https://www.gestim.it/prezzi) · [Domustudio, prezzi](https://www.danea.it/software/domustudio/prezzi/) · [Multidomus](https://www.multidomus.it/) · [HomeZada, professionisti](https://www.homezada.com/professionals/pricing) · [Teleborsa su dati FIAIP](https://www.teleborsa.it/AMP/News/2026/07/24/immobiliare-767mila-compravendite-nel-2025-31.html) · [Garante, linee guida condominio (riepilogo)](https://www.diritto.it/privacy-gestione-condominiale-nuove-linee-guida/). Repository: `backend/prisma/schema.prisma`, `backend/src/auth/auth.service.ts`, `backend/src/access-control/access-control.service.ts`, `backend/src/houses/houses.service.ts`, `frontend/src/config.ts`, `docs/mvp-v1.md`, `docs/HANDOFF.md`, `docs/backlog.md` (B12, B39), `docs/decisions.md` §77, `docs/alpha-ai-label-measurement.md`, `docs/competitive-intelligence/strategy/*`.
