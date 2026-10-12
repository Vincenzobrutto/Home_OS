# Agente 3 — Real Estate Agency Intelligence
## Dossier: Gestim, gestionali per agenzie immobiliari in Italia e nicchie per Dimora

**Data:** 12 ottobre 2026 · **Autore:** Agente 3 (Claude) · **Stato:** proposta di ricerca, **nessuna voce è approvata** (serve decisione umana, vedi `RESEARCH_PROTOCOL.md`).
**Allegati:** [`opportunities.csv`](opportunities.csv) (matrice opportunità) · [`features.csv`](features.csv) (matrice funzionalità).

### Come leggere le etichette
- **[V] Verificato**: letto direttamente su una fonte indicata, con data di consultazione (12/10/2026 salvo diversa indicazione). Se la fonte è il venditore stesso lo dico: *dichiarato dal venditore* non significa *dimostrato*.
- **[I] Inferenza**: mia deduzione ragionata da fatti verificati.
- **[S] Stima**: numero calcolato da me, con le ipotesi scritte accanto.
- **[ND] Non disponibile**: non l'ho trovato. *Non trovato non vuol dire che non esista.*

---

## 0. In breve (per chi ha 2 minuti)

1. **Il mercato dei gestionali per agenzie in Italia è in mano ai due grandi portali.** Gestim e Miogest appartengono a idealista dal 2020; Getrix, Youdomus (visure e controlli) e Genio Diligence appartengono al gruppo Immobiliare.it. Competere sul gestionale (CRM, annunci, incroci, agenda) è senza senso per Dimora. [V]
2. **Gestim è un CRM economico e completo per il lavoro commerciale** (da circa 10 a 30 € per utente al mese), con un modulo "workflow documentale per la due diligence" e un'"area proprietari" solo nei piani alti. Non fa il lavoro "casa per casa" sui documenti: li archivia come allegati, non li capisce. [V per l'offerta; I per il giudizio]
3. **Il problema costoso e irrisolto non è vendere, è arrivare al rogito con i documenti in ordine.** Documenti sparsi del venditore, verifiche urbanistiche/catastali avviate tardi, rogiti bloccati, e una responsabilità dell'agente che la Cassazione continua a discutere caso per caso. [V per norme e sentenze; ND per la frequenza in numeri]
4. **Ma su questo problema si stanno già muovendo altri:** Immodoc (fascicolo digitale con rete di tecnici, nato nel 2026), Faloosa (gestione pratiche per agenzie), RogitoSubito (verifica conformità), oltre ai moduli di Gestim e Youdomus. La finestra esiste ma non è vuota. [V]
5. **Tre nicchie candidate da VALIDARE (non da costruire subito):**
   - **N1 — "Fascicolo venditore pronto al rogito"**: l'agenzia, quando prende l'incarico, invita il proprietario su Dimora; il proprietario carica i documenti, Dimora li riconosce e mostra cosa manca. L'agente guarda, non digita.
   - **N2 — "Libretto della casa consegnato all'acquirente"**: al rogito l'agenzia regala all'acquirente il fascicolo della casa; in cambio ottiene un contatto vivo nel tempo (passaparola, futura rivendita, lavori di ristrutturazione).
   - **N3 — Testa di ponte: case ereditate e immobili datati**: il caso in cui il venditore sa meno della casa e il rischio documentale è più alto. È il segmento su cui provare N1 per primo.
6. **Red team in una riga:** l'idea regge solo se (a) l'agenzia paga davvero o porta clienti paganti, (b) il proprietario non vede Dimora come "un modulo dell'agenzia" ma come casa sua, e (c) Dimora sa offrire una soluzione ai documenti mancanti senza diventare uno studio tecnico. Inoltre **contraddice la decisione del 16/09/2026 (ADR #77)** che aveva scartato la "transaction readiness" per l'Italia: va portata ad A2 e a Vincenzo come scelta esplicita, non introdotta di nascosto.

---

## 1. Contesto Dimora usato (fonti interne)

Letto dal repository `Vincenzobrutto/Home_OS` (branch `main` e `research/dimora-four-agent-intelligence-20261012`):

- **Cosa è Dimora**: "Property Digital Record", la memoria digitale strutturata della singola casa; principio "l'AI propone, l'utente conferma"; ogni dato con provenienza (`docs/vision.md`, `PROJECT_CONTEXT.md`).
- **Cosa esiste oggi** (`docs/mvp-v1.md`, `docs/vision.md`):
  - *Implementato e in alpha*: caricamento/foto documento → estrazione AI → conferma → Asset, interventi, garanzie; ricerca; provenienza dei dati; export e cancellazione.
  - *Implementato ma nascosto in alpha*: profilo casa catastale/APE/agibilità (B36), Gmail/Drive, manutenzioni, check-up.
  - *Non implementato*: condivisione multi-utente con ruoli (manca l'interfaccia di invito, B12), **trasferimento del record al nuovo proprietario** (visione futura), record "verificato/certificato" (escluso).
- **Decisioni che pesano su questo dossier**:
  - ADR #73: il modello deve restare compatibile con una consegna mediata da un professionista (impresa, **agenzia**, manutentore). → *favorevole*.
  - ADR #77 (16/09/2026): wedge B2B2C prioritario = **Renovation + Financing**; **Transaction readiness scartata per l'Italia**; niente rete tecnici propria. → *in tensione con le nicchie N1–N3* (vedi §9 e §10).
  - `docs/market-landscape.md` M6: "valore reale del canale agenzie in Italia — dolore noto e concentrato al rogito" era rimasto domanda aperta. Questo dossier risponde in parte.
- **Non accessibili**: Master Venture Document, Canvas e conversazioni precedenti citate in `PROJECT_CONTEXT.md` [ND]. Non le ho potute leggere.

---

## 2. Il mercato in numeri (pochi e prudenti)

| Dato | Valore | Etichetta e fonte |
|---|---|---|
| Compravendite di abitazioni 2024 | circa 720.000 | [V] idealista/news, 19/12/2025 ([link](https://www.idealista.it/news/node/297870)), che riporta OMI |
| Compravendite 2025 | stime 750.000–780.000 (dato annuale ufficiale non letto) | [V] stesse fonti; il dato OMI annuale definitivo è [ND] per me |
| Compravendite IV trimestre 2025 | poco più di 218.000 (+0,4%) | [V] OMI via LavoriPubblici, 11/03/2026 ([link](https://www.lavoripubblici.it/news/mercato-immobiliare-residenziale-statistiche-omi-quarto-trimestre-2025-37610)) |
| Agenzie immobiliari in Italia | circa 50.000 | [V] fonte secondaria, blog di settore aggiornato 06/09/2026 ([link](https://www.charliecinolo.it/post-aggregazione.html)); dato ufficiale InfoCamere [ND] |
| Quota di acquisti tramite agenzia | 63% | [V] ma **vecchio (2018)** e con metodologia non leggibile ([link](https://www.infobuild.it/acquisti-immobili-agenzie-immobiliari/)) |
| Compravendite medie per agenzia all'anno | **circa 9–14** | [S] 720.000 × 63% ÷ 50.000 ≈ 9; se tutte passassero da agenzia ≈ 14. Media che nasconde grandi differenze |
| Agenzie con fatturato > 1 M€ | 262 (meno dell'1%) | [V] fonte secondaria su dati Wikicasa Top Agency 2026 (stesso link sopra) |

**Cosa significa per Dimora [I]:** la tipica agenzia è piccola e chiude **una vendita al mese o meno**. Un prodotto che si usa "per immobile" verrà usato poche volte l'anno per agenzia: l'agenzia deve riuscire a usarlo senza formazione, e il prezzo per immobile probabilmente funziona meglio di un abbonamento.

---

## 3. Mappa del mercato: 20 operatori

### 3.1 La struttura: due "campi" guidati dai portali [V]

- **Campo idealista**: idealista ha comprato il 100% di **Gestim** (San Benedetto del Tronto) e **Miogest** (Como) nel giugno 2020; insieme avevano circa 4.000 clienti ([idealista/news 26/06/2020](https://www.idealista.it/news/node/141264); [OnlineMarketplaces 28/06/2020](https://www.onlinemarketplaces.com/articles/idealista-buys-up-two-italian-agent-software-companies/)). Il sito Gestim oggi indica che Gestim Italy srl è soggetta a direzione e coordinamento di Idealista S.A. ([gestim.it](https://www.gestim.it)).
- **Campo Immobiliare.it**: Getrix (gestionale), Youdomus (acquisito nel febbraio 2022: visure, controlli su persone e società, monitoraggio variazioni catastali), Genio Diligence (verifica documentale con AI, oggi rivolta soprattutto a banche e mediatori creditizi), Insights (dati), Mutui ([Immobiliare.it chi siamo](https://www.immobiliare.it/info/chi-siamo/); [OnlineMarketplaces 16/02/2022](https://onlinemarketplaces.com/articles/immobiliare-it-acquires-agent-tools-platform-youdomus)).
- **Conflitto tra i campi**: a luglio 2020 Immobiliare.it ha chiuso il flusso annunci dei **nuovi** clienti Gestim e Miogest; in precedenza aveva chiuso l'integrazione Getrix per i clienti idealista ([idealista/news 08/07/2020](https://www.idealista.it/news/node/148060)). La pagina ufficiale dei software integrati con Immobiliare.it oggi elenca solo Getrix ([immobiliare.it](https://www.immobiliare.it/en/info/software-immobiliare/)). **Se il blocco sia ancora in vigore oggi: [ND].**

**Implicazione [I]:** chi si mette *dentro* un gestionale sceglie un campo. Dimora deve stare **accanto** a entrambi, senza dipendere dall'integrazione con nessuno.

### 3.2 Elenco operatori (20)

Legenda sovrapposizione con Dimora: **Alta** = fa già cose simili su documenti/casa; **Media** = tocca il tema; **Bassa** = altro mestiere.

| # | Operatore | Categoria | Proprietà / buyer | Prezzo pubblico | Sovrapp. | Fonte |
|---|---|---|---|---|---|---|
| 1 | **Gestim** | Gestionale/CRM | idealista; agenzie, reti | 10–30 €/utente/mese (annuale) [V] | Media | [prezzi](https://www.gestim.it/prezzi/) |
| 2 | **Getrix** | Gestionale/CRM | Immobiliare.it; agenzie | Non pubblicato [V] | Bassa (Media con Youdomus) | [getrix.it](https://www.getrix.it) |
| 3 | **Youdomus** | Visure, controlli, monitoraggio | Immobiliare.it; agenzie | Non pubblicato [V] | Media | [youdomus.it](https://www.youdomus.it) |
| 4 | **Genio Diligence** | Verifica documentale AI | Immobiliare.it (gruppo); banche, mediatori creditizi | Non pubblicato [V] | Bassa oggi, **capacità tecnica alta** | [geniodiligence.it](https://www.geniodiligence.it/) |
| 5 | **Miogest** | Gestionale | idealista; agenzie piccole | 499 €/anno + IVA [V] | Bassa | [miogest.com](https://www.miogest.com) |
| 6 | **onOffice** | Gestionale (tedesco) | agenzie; 40.000+ utenti dichiarati | Non pubblicato | Bassa | [it.onoffice.com](https://it.onoffice.com/) |
| 7 | **GestionaleRE** | Gestionale | agenzie; 1.600+ installazioni dichiarate | Su preventivo | Bassa | [gestionalere.it](https://www.gestionalere.it/) |
| 8 | **Cometa Immobiliare** | Gestionale | agenzie | Non pubblicato | Bassa | [cometaimmobiliare.it](https://www.cometaimmobiliare.it/) |
| 9 | **AGIM** | Gestionale | agenzie; 3.000+ dichiarate (fonte terza) | 456–1.668 €/anno (fonte terza) | Bassa | sito "non attivo" il 12/10/2026 [V]; prezzi da [Ivemind](https://ivemind.com/en/blog/real-estate-management-software-guide/) |
| 10 | Realgest/Reasoft, Kiwi, AgestaNET, DataDomus, Portali24 | Gestionali minori | agenzie piccole | vari | Bassa | [Ivemind](https://ivemind.com/en/blog/real-estate-management-software-guide/), [Bancadellecase](https://www.bancadellecase.it/integrazioni-gestionali-e-portali) |
| 11 | TreePlat, MAXimizer, Iconacasa, GestiFIAIP | Gestionali di rete/associazione | Gabetti-Grimaldi-Professionecasa, RE/MAX, Iconacasa, FIAIP | riservati | Bassa (ma **canale** interessante) | stesse fonti |
| 12 | **DokiCasa** | Contratti, firma, registrazioni, antiriciclaggio | agenzie e privati; 45.000+ utenti dichiarati | Non pubblicato in home | Media | [dokicasa.it](https://dokicasa.it) |
| 13 | **Faloosa** | Pratiche e documenti dall'incarico al rogito | agenzie | 9,99–69,99 €/mese (annuale) [V] | **Alta** | [faloosa.it](https://faloosa.it/) |
| 14 | **Immodoc** (Domodeus srl) | Fascicolo digitale + rete tecnici | proprietari, agenzie, notai | Base gratis 1° immobile; "Salva Rogito" 229 € + IVA [V] | **Alta** | [immodoc.it](https://www.immodoc.it), [fascicolo](https://www.immodoc.it/fascicolo-digitale) |
| 15 | **RogitoSubito** | Verifica conformità urbanistica | venditori, acquirenti, agenzie | Non pubblicato | Media | [rogitosubito.it](https://rogitosubito.it/) |
| 16 | Studi tecnici locali / protocolli Collegio Geometri–FIMAA | Verifiche tecniche | agenzie, venditori | Da poche centinaia a oltre 1.000 € | Media (sono il "concorrente" reale) | [edilizia.com](https://www.edilizia.com/leggi-normative/relazione-tecnica-di-compravendita-cose-quando-e-obbligatoria-quanto-costa/), [UnioneProfessionisti](https://www.unioneprofessionisti.com/blog/compravendite-catastali-accordo-tra-geometri-e-agenti-immobiliari/15259/) |
| 17 | **Switcho** (partner onOffice) | Volture e attivazioni luce/gas post-rogito | acquirenti via agenzia | Gratis per l'utente | Bassa | [switcho.it](https://www.switcho.it/blog/news/partnership-switcho-onoffice/) |
| 18 | Casafari | Dati e CRM (Europa) | agenzie | [ND] (sito non leggibile) | Bassa | [ND] |
| 19 | **HomeZada PRO** (USA) | Record casa regalato dal professionista | agenti, gestori | 99 $/immobile; condivisione 49 $/anno [V] | Alta (modello) | [homezada.com](https://www.homezada.com/professionals/pricing) |
| 20 | **HomeBinder** (USA) | Record casa regalato da ispettori/agenti/lender | partner | Gratis per il proprietario; ricavi partner [ND] | Alta (modello) | [homebinder](https://pages.homebinder.com/) |

Escluso dopo verifica: **REAG4docs** (data room per investitori istituzionali, notizia del 2015): non pertinente per le agenzie residenziali ([Bluerating](https://www.bluerating.com/mercati/659908/reag4docs-arriva-in-italia-il-servizio-per-la-digitalizzazione-nel-real-estate)).

---

## 4. Dossier approfonditi (7)

### 4.1 Gestim — il riferimento richiesto

**Chi è [V]:** Gestim Italy srl, controllata da idealista dal 2020; "oltre 2.500 agenzie" e "più di 20 anni" dichiarati sul sito; "oltre 18.000 utenti" dichiarati su Capterra, dove ha voto 4,7/5 su 118 recensioni ([Capterra](https://www.capterra.it/software/1062880/gestim)).

**Buyer e utilizzatore:** titolare d'agenzia (paga), agenti e segreteria (usano). Anche reti e franchising (versione Enterprise su misura). C'è una convenzione con FIMAA ([pagina](https://www.gestim.it/convenzione-fimaa/)) [V: esistenza della pagina; contenuto non letto].

**Prezzi pubblicati [V] ([gestim.it/prezzi](https://www.gestim.it/prezzi/)), IVA esclusa, fatturazione annuale, contratto annuale senza tacito rinnovo:**

| Piano | €/utente/mese | Utenti | Cosa aggiunge |
|---|---|---|---|
| Personal | 30 | 1 | App iOS/Android, fino a 80 immobili e 1.000 clienti, marketing email/SMS/WhatsApp, Google Calendar, AI di base |
| Professional | 10 | 5 inclusi | Illimitati immobili/clienti, supporto telefonico, centralino VoIP |
| Gold | 20 | 5–20 | Censimento di zona, fotoritocco, invii pianificati, **privacy con Firma Elettronica Avanzata** |
| Platinum | 30 (barrato 35) | 5–20 | AI avanzata, email automatiche di incrocio, dominio landing, **workflow documentale per la due diligence**, import Excel |
| Enterprise | su misura | da 20 | reti e franchising |

Nota: il prezzo Personal (30 €) più alto del Professional (10 €) è coerente con il fatto che il Professional richiede 5 utenti; costo minimo Professional ≈ 50 €/mese [S]. Una fonte terza riporta 9,50–25 € ([Ivemind](https://ivemind.com/en/blog/real-estate-management-software-guide/)): i prezzi cambiano spesso.

**Limiti per piano dalla tabella comparativa 2026 [V, con colonne del PDF non perfettamente leggibili]** ([PDF](https://www.gestim.it/tabellacomparativa_rev1_2026.pdf)): spazio documenti da 1 GB (Personal) a 100 GB (Platinum) e illimitato (Enterprise); file fino a 8–50 MB; **workflow documentali limitati a 10 nei piani bassi, illimitati nei piani alti**; **area proprietari limitata a 5 nei piani bassi**; descrizioni AI da 5/mese a illimitate; moduli a pagamento per siti di terzi e API web; SMS a pacchetti.

**Funzionalità rilevanti [V] ([panoramica](https://www.gestim.it/panoramica-delle-funzioni/))**
- *Commerciale*: anagrafiche, richieste, **incroci automatici** immobile↔richiesta, agenda, pubblicazione su portali italiani ed esteri, controllo qualità annunci, traduzioni automatiche, statistiche e ROI pubblicitario, censimento di zona.
- *Documenti*: "Allegati in libertà: carica i tuoi allegati e abbinali a clienti, proprietari e immobili"; "Workflow Documentale: gestisci con facilità il processo di inserimento dei documenti e semplifica le attività di due diligence".
- *Proprietario*: "Area Proprietari: condividi col proprietario dell'immobile informazioni sulle attività svolte e gli esiti" (statistiche e mini-sito delle attività).
- *Firma*: FEA per la raccolta dei consensi privacy (piano Gold e superiori).
- *Dati*: backup notturno; export dei propri dati **in formato Excel** ([sicurezza dati](https://www.gestim.it/sicurezza-dei-dati/)). Nessuna API pubblica documentata [ND]; nessuna certificazione di sicurezza dichiarata (ISO 27001 ecc.) [V: assente dalla pagina].

**Cosa NON ho trovato documentato [ND]:** gestione incarichi e proposte come contratti strutturati, antiriciclaggio, coordinamento con notaio e tecnico, consegna documenti all'acquirente, post-vendita. Il dettaglio del "workflow documentale" (quali documenti, se c'è una checklist, se il proprietario carica da solo) non è descritto pubblicamente; il centro assistenza richiede login.

**Recensioni [V]:** lodi soprattutto per assistenza e semplicità; critiche su lentezza e problemi di accesso ("difficoltà nel primo accesso della giornata"). Nessuna recensione letta parla dei documenti.

**Giudizio [I]:** Gestim è ottimo per **vendere e comunicare**, e ha iniziato a toccare i documenti, ma come *archivio di allegati agganciati alla scheda immobile*. Non capisce i documenti, non tiene la storia tecnica della casa, e il dato appartiene all'agenzia, non al proprietario. Il rischio che Gestim estenda il workflow documentale verso una checklist di vendita completa è **reale** (ha già il modulo e la proprietà di idealista).

### 4.2 Getrix + Youdomus + Genio Diligence (gruppo Immobiliare.it)

- **Getrix [V]**: gestionale più diffuso secondo Immobiliare.it; "oltre 16.000 clienti" in un punto del sito, "14.000 installazioni" in un altro (incoerenza del sito). Moduli: clienti, richieste e incroci, acquisizione annunci privati, valutazione, collaborazioni MLS, agenda, tour virtuali, sito web. App = app Immobiliare.it. Prezzi non pubblicati ([getrix.it](https://www.getrix.it)).
- **Youdomus [V]**: ricerca su persone, società e immobili; dossier di rischio (protesti, fallimenti, pregiudizievoli, segnalazioni antiriciclaggio); visure e atti acquistati da banche dati ufficiali e salvati per persona o immobile; **monitoraggio delle variazioni catastali**. Dopo l'acquisizione il gruppo annunciava di completare l'offerta con antiriciclaggio e un registro di locazioni e preliminari ([OnlineMarketplaces 2022](https://onlinemarketplaces.com/articles/immobiliare-it-acquires-agent-tools-platform-youdomus)).
- **Genio Diligence [V]**: estrazione, validazione e arricchimento automatico dei documenti con integrazioni a Catasto, Agenzia delle Entrate e InfoCamere ("DocFlow"); oggi venduto a banche e mediatori creditizi, non ad agenzie.

**Giudizio [I]:** il gruppo Immobiliare.it **possiede già tutti i mattoni** per fare un "fascicolo di vendita" automatico (visure + AI documentale + gestionale con 14–16 mila agenzie). Se decide di farlo, lo distribuisce in un giorno. È il rischio competitivo numero uno.

### 4.3 DokiCasa — contratti e adempimenti

[V, dichiarato dal venditore] ([dokicasa.it](https://dokicasa.it); [guida contratti 2026](https://dokicasa.it/?p=5298)): oltre 40 modelli di contratto (locazione, vendita, scritture), firma elettronica (FES/FEA/FEQ), registrazione telematica delle locazioni, pagine dedicate ad antiriciclaggio e privacy per agenzie, cambio utenze, calcolo canone concordato. "Oltre 10.000 pratiche al mese", "45.000+ utenti", 4,8 su 493 recensioni Google.
La sua guida descrive sei passaggi documentali dall'incarico al rogito e indica come **errori tipici** delle agenzie: firme incollate come immagine, file firmati tenuti in cartelle locali o caselle email, scansioni mandate via WhatsApp.
**Giudizio [I]:** copre bene la parte *contrattuale* (incarico, proposta, preliminare, firma). Non copre i documenti *della casa*. È più un potenziale partner che un concorrente.

### 4.4 Faloosa — il concorrente più diretto lato agenzia

[V, dichiarato dal venditore] ([faloosa.it](https://faloosa.it/)): gestionale di pratiche "dall'incarico al rogito": archivio con modelli, **"Dossier Immobili" con passi guidati per raccogliere i documenti di ogni incarico**, istruttoria notarile con un professionista dedicato, antiriciclaggio e privacy con firma OTP, contratti (incarico, proposta, locazione), condivisione con proprietari, acquirenti e notai, chatbot AI (Premium), e-commerce di servizi per sanare difformità urbanistiche/catastali (solo Lombardia).
Prezzi: LITE 9,99 €/mese annuale (solo Lombardia), PREMIUM 69,99 €/mese annuale. Società: Afa Solving srl, Milano, capitale 10.000 €.
**Giudizio [I]:** dimostra che **il problema "documenti dall'incarico al rogito" è riconosciuto e qualcuno lo fa pagare alle agenzie**. Ma è agency-centrico (il fascicolo serve all'agenzia, non resta al proprietario) e piccolo/locale. Trazione [ND].

### 4.5 Immodoc (Domodeus srl) — il concorrente più diretto lato proprietario

[V, dichiarato dal venditore] ([immodoc.it](https://www.immodoc.it); [fascicolo digitale](https://www.immodoc.it/fascicolo-digitale); [intervista 16/09/2026](https://www.influentpeople.it/documentazione-immobiliare-digitale-la-visione-di-immodoc-per-il-futuro-delle-compravendite/)):
- "Il primo fascicolo digitale immobiliare in Italia": categorie predefinite (catastali, urbanistici, atti, impianti, utenze, assicurazioni), **indice di completezza**, versioni dei documenti, avviso scadenze.
- **Condivisione con notaio, banca, tecnici e agenzia** con permessi granulari e link revocabili; "Fascicolo di compravendita".
- **Passaggio del fascicolo al nuovo proprietario al rogito "con un click"**, descritto come già attivo.
- 39 servizi tecnici in 8 categorie (visure 3 €, planimetrie 15 €, conformità, accesso agli atti, APE con ApeFacile; "Salva Rogito" APE + accesso atti a 229 € + IVA fino a 200 m²) eseguiti da una rete di "oltre cento professionisti".
- Fondata nel 2026, sede a Tivoli; linea dedicata alle agenzie in lancio; pilota in Emilia-Romagna e Toscana. Nessun dato di trazione.
- Promette un "gemello digitale 3D" con inventario elettrodomestici e storico manutenzioni come **"in arrivo"**.

**Giudizio [I]:** Immodoc sta costruendo **quasi esattamente la visione Dimora + le nicchie N1/N2**, con in più ciò che a Dimora manca per scelta (ADR #77): una rete di tecnici che *risolve* i documenti mancanti e un modello di ricavo sui servizi. Il punto debole di Immodoc è l'opposto: niente AI che capisce i documenti dichiarata, niente memoria tecnica degli impianti oggi. **Va monitorato da vicino** (B69 in `docs/backlog.md` lo prevede per i player consumer italiani).

### 4.6 RogitoSubito e i tecnici locali — chi risolve davvero il problema

- **RogitoSubito [V]**: verifica di conformità urbanistica per venditori, acquirenti e un servizio "Check Up agenzie" che promette meno vendite perse e protezione da contestazioni; prezzi non pubblicati ([rogitosubito.it](https://rogitosubito.it/)).
- **Protocolli locali [V]**: es. accordo Collegio Geometri Lecco–FIMAA Lecco per verifiche urbanistiche, edilizie e catastali con attestazione da allegare al rogito ([fonte](https://www.unioneprofessionisti.com/blog/compravendite-catastali-accordo-tra-geometri-e-agenti-immobiliari/15259/)); protocollo di Forlì-Cesena aggiornato nel 2026 ([edilizia.com](https://www.edilizia.com/leggi-normative/relazione-tecnica-di-compravendita-cose-quando-e-obbligatoria-quanto-costa/)).
- **La relazione tecnica non è obbligatoria a livello nazionale**, ma diventa di fatto necessaria se richiesta da preliminare, notaio, agenzia, banca o protocollo locale; costa da "poche centinaia" a oltre 1.000 €; l'accesso agli atti comunali **può richiedere settimane** ([edilizia.com](https://www.edilizia.com/leggi-normative/relazione-tecnica-di-compravendita-cose-quando-e-obbligatoria-quanto-costa/)) [V].
- **Il vero concorrente è il geometra di fiducia dell'agenzia**: lo dice anche Immodoc nella sua intervista [V].

### 4.7 HomeZada PRO e HomeBinder (USA) — i modelli da cui imparare

- **HomeZada PRO [V]** ([prezzi](https://www.homezada.com/professionals/pricing)): 99 $ per immobile; il professionista regala al cliente un anno di Premium (poi 99 $/anno o versione gratuita); condivisione 49 $/immobile/anno; 5 $/cliente/anno per mantenere il proprio marchio. Non sono dimostrati uso attivo né ritenzione (vedi anche `research/homezada/copilot-intake.md`).
- **HomeBinder [V]** ([pagina](https://pages.homebinder.com/)): gratis "a vita" per il proprietario, distribuito da ispettori, lender e agenti; 950.000+ proprietari dichiarati; affianca un "Assistant" per confrontare e attivare utenze e servizi. Chi paga e quanto: [ND]. **[I]** probabile ricavo dalle attivazioni di servizi, non dagli agenti.
- **Dati USA sul passaparola [V]** ([NAR 2025 via Virginia Realtors](https://virginiarealtors.org/2025/12/08/key-takeaways-from-nars-2025-profile-of-home-buyers-and-sellers)): il 66% dei venditori ha trovato l'agente tramite referenza o rapporto precedente; permanenza mediana in casa 11 anni. **Dati italiani equivalenti: [ND].**

**Lezione [I]:** il "regalo del libretto casa" esiste da anni negli USA ma **nessuno dimostra che il proprietario lo usi nel tempo**. Il modello che regge economicamente sembra essere quello in cui paga qualcuno con un interesse diretto (servizi, utenze, lavori), non l'agente per gratitudine.

---

## 5. Il percorso di una vendita, fase per fase

Legenda strumenti: G = Gestim, Gx = Getrix, Y = Youdomus, D = DokiCasa, F = Faloosa, I = Immodoc.

| Fase | Compiti e documenti | Attori | Strumenti oggi | Lacune e costi | Coperto? |
|---|---|---|---|---|---|
| **1. Prospezione** | Trovare proprietari che vendono, censire la zona | Agente | G (censimento di zona), Gx (annunci privati), Y (monitoraggio catastale) | Concorrenza fortissima tra agenzie [I] | **Sì, commodity** |
| **2. Acquisizione incarico** | Valutazione, contratto di incarico, privacy, antiriciclaggio (adeguata verifica, conservazione) | Agente, venditore | G (FEA privacy), Gx (valutazione), D, F (contratti, firma), Y (dossier di rischio) | Convincere il venditore a dare l'esclusiva; documenti ancora sconosciuti a questo punto [I] | Sì per contratti; **no per "quanto è pronta la casa"** |
| **3. Raccolta documenti** | Atto di provenienza, visura e planimetria catastale, titoli edilizi, agibilità, APE, conformità impianti, documenti condominiali (regolamento, spese, verbali) | Venditore, agente, geometra, amministratore | G (allegati, workflow nei piani alti), F (dossier guidato), I (fascicolo + tecnici), Y (visure) | **Documenti sparsi; il venditore non sa cosa ha; l'agente insegue per email e WhatsApp; l'accesso agli atti richiede settimane** [V fonti §4.6, §5-note] | **Parziale e frammentato** |
| **4. Preparazione vendita** | Classe energetica nell'annuncio, foto, planimetria, descrizione | Agente, tecnico APE | G/Gx (annunci, AI descrizioni) | L'agente risponde se l'informazione energetica è sbagliata (Cass. 24534/2022) [V] | Sì per annunci; no per verifica coerenza dati |
| **5. Trattativa** | Visite, domande dell'acquirente, invio documenti, proposta d'acquisto | Agente, acquirente, venditore | G/Gx (agenda, incroci), D/F (proposta e firma), email/WhatsApp per i documenti | **Documenti inviati in modo disordinato; scoperte tardive di irregolarità che riaprono il prezzo** [I] | Parziale |
| **6. Preliminare e rogito** | Preliminare, registrazione, mutuo, perizia banca, controlli notaio, conformità catastale, titoli edilizi in atto | Notaio, banca, agente, tecnici | D (preliminare), F (istruttoria notarile), Genio Diligence (lato mutuo) | **Rogiti bloccati per difformità; sanatorie dell'ultimo minuto; sconti di prezzo** [V qualitativo, §6; frequenza ND] | Parziale |
| **7. Consegna** | Chiavi, libretto caldaia, manuali, garanzie, volture utenze | Venditore, acquirente, agente | Switcho (utenze), I (passaggio fascicolo dichiarato) | **Nessuna consegna strutturata dei documenti tecnici della casa**; l'acquirente riparte da zero [I] | **Quasi assente** |
| **8. Post-vendita** | Recensione, passaparola, futura rivendita, lavori | Agente, acquirente | CRM (contatto), newsletter | L'agente non ha nulla di utile da offrire dopo il rogito [I]; dati italiani su referral [ND] | **Assente** |

**Note di riferimento normativo [V tramite le fonti citate, da far confermare a un legale prima di usarle in materiale esterno]:**
- Il notaio controlla che i titoli edilizi siano citati e formalmente coerenti, non la conformità sostanziale; gli atti senza titoli sono nulli (art. 46 DPR 380/2001); la conformità catastale è in generale richiesta (art. 29 L. 52/1985); le piccole tolleranze (art. 34-bis DPR 380/2001) vanno dichiarate; per le difformità sanabili esiste la via semplificata del "Salva Casa" ([idealista/news 13/02/2026](https://www.idealista.it/news/finanza/fisco/2026/02/13/320974-difformita-urbanistica-al-rogito-quando-la-compravendita-si-blocca)).
- La statistica "80% delle case ha irregolarità" che circola dal 2024 **non è affidabile**: il CNI ha chiarito che veniva da un questionario a ingegneri del Superbonus e che **non esistono dati attendibili** sulla percentuale reale ([Ediltecnico 11/04/2024](https://ediltecnico.it/irregolarita-edilizie-equivoco-statistica-chiarimento-cni/)). Non usarla.

---

## 6. Problemi specifici, frequenti e costosi non risolti

Ordinati per forza dell'evidenza.

**P1 — Le irregolarità scoperte tardi costano soldi e trattative. [V qualitativo; frequenza ND]**
Il caso deciso da Cass. ord. 32264/2025 ne è un esempio concreto: incarico del 2011, titolo edilizio del 1978 recuperato solo *dopo* il preliminare, stanza mancante nel progetto, sconto di circa 19.000 € concesso all'acquirente e causa fino in Cassazione ([Studio Calvello 05/02/2026](https://www.studiolegalecalvello.it/responsabilita-agente-immobiliare-difformita-urbanistiche-sentenza-cassazione-32264-2025/)). L'accesso agli atti può richiedere settimane: chi inizia a pochi giorni dal rogito rischia ([edilizia.com](https://www.edilizia.com/leggi-normative/relazione-tecnica-di-compravendita-cose-quando-e-obbligatoria-quanto-costa/)).

**P2 — La responsabilità dell'agente è incerta e pesa sulla provvigione. [V]**
- Cass. 11371/2023: il mediatore che tace un'irregolarità urbanistica che conosceva o *avrebbe dovuto conoscere* risponde verso l'acquirente, che può rifiutare la provvigione e chiedere i danni ([Studio Pagliai](https://www.studiotecnicopagliai.it/irregolarita-edilizie-agente-immobiliare-responsabile-per-mancata-informazione/)).
- Cass. 24534/2022: l'agente che pubblicizza la classe energetica deve aver visto il certificato; persa la provvigione e condannato ai danni ([Ecnews 13/12/2022](https://www.ecnews.it/legale/diritto-civile/diritti-reali-e-condominio/obblighi-informativi-del-mediatore-immobiliare-ed-attestazione-energetic/)).
- Cass. 7178/2015: dovere di verificare le informazioni ottenibili con diligenza professionale, colpa presunta ([Studio Cataldi](https://www.studiocataldi.it/articoli/18257-sull-agente-immobiliare-incombe-l-obbligo-di-controllare-la-liberta-dell-immobile-da-gravami.asp)).
- **In senso opposto**, Cass. 32264/2025: l'agente **non** è tenuto a verifiche tecnico-legali sulla conformità **se l'incarico non le prevede espressamente**.
- Un'intervista cita una Cass. 7972/2026 che equiparerebbe una dichiarazione di conformità inesatta a una mancante: **[ND] non ho letto la sentenza**.
**[I] Conseguenza:** l'agente ha bisogno di **documentare cosa ha ricevuto, quando e da chi**, senza però assumersi il compito di certificare. Questo è un bisogno preciso e poco coperto.

**P3 — Raccogliere i documenti dal venditore è lavoro manuale, lento e disordinato. [I, supportato da indizi V]**
Indizi: Faloosa e Immodoc esistono proprio per questo; Gestim ha introdotto un "workflow documentale"; DokiCasa elenca come errori tipici WhatsApp, email e cartelle locali. **Quanto tempo costa per pratica: [ND]** (l'unico numero trovato, "40–90 minuti risparmiati per pratica", è di DokiCasa ed è riferito ai contratti, non ai documenti della casa).

**P4 — Dopo il rogito si perde tutto. [I]**
Né i gestionali né i servizi contrattuali consegnano all'acquirente la storia tecnica della casa (impianti, libretti, garanzie, interventi). L'unico che dichiara il passaggio del fascicolo è Immodoc, appena nato. L'acquirente, che spesso fa lavori subito dopo l'acquisto, riparte da zero.

**P5 — L'agente non ha un motivo per restare in contatto. [I; dati Italia ND]**
Negli USA due venditori su tre arrivano da referenze o rapporti precedenti (NAR 2025). Se in Italia vale qualcosa di simile, un oggetto utile che resta nelle mani del cliente ha valore commerciale. **Non dimostrato per l'Italia.**

**Problemi esaminati e scartati (già risolti dai gestionali):** pubblicazione annunci, incroci, agenda, marketing, valutazione, contratti e firme, privacy, antiriciclaggio, visure, volture utenze, reportistica al proprietario sulle attività di vendita.

---

## 7. Opportunità valutate (dettaglio in `opportunities.csv`)

Per ognuna: beneficio agenzia / beneficio proprietario / chi paga / doppio inserimento / rischio competitivo / esperimento.

| ID | Opportunità | Beneficio agenzia | Beneficio proprietario | Chi paga | Doppio inserimento | Rischio competitivo | Esito |
|---|---|---|---|---|---|---|---|
| A3-01 | **Fascicolo venditore pronto al rogito** | Meno inseguimenti, scoperte anticipate, traccia di cosa ha ricevuto; argomento per ottenere l'esclusiva | Sa subito cosa manca; i documenti restano suoi | Agenzia per immobile, oppure venditore tramite servizi tecnici | **Basso** se carica il proprietario e l'agente solo consulta; alto se l'agente deve ricopiare in Gestim | **Alto** (Faloosa, Immodoc, Gestim Platinum, gruppo Immobiliare.it) | **Validare** |
| A3-02 | **Libretto casa consegnato all'acquirente** | Contatto duraturo, immagine, referenze | L'acquirente parte con la storia della casa | Agenzia per transazione (modello HomeZada) o partner (lavori, utenze) | Nullo se riusa A3-01 | Medio (Immodoc lo dichiara) | **Validare** (dipende dal trasferimento, oggi non implementato) |
| A3-03 | **Testa di ponte: case ereditate e datate** | Pratiche più rischiose rese gestibili | Eredi che non conoscono la casa | come A3-01 | come A3-01 | Medio (Immodoc ha un fascicolo "successione") | **Validare** come segmento di partenza |
| A3-04 | Check documentale gratuito per acquisire l'incarico | Arma commerciale | Orientamento iniziale | Agenzia | Basso | Medio | Validare **solo dentro** A3-01, con attenzione legale (vedi red team) |
| A3-05 | Promemoria manutenzione firmati dall'agenzia dopo la vendita | Visibilità periodica | Utile | Agenzia | Nullo | Basso | Validare dopo A3-02 |
| A3-06 | Ricavo da attivazione utenze/servizi post-rogito | Nessuno diretto | Comodità | Fornitori | Nullo | Alto (Switcho gratuito con onOffice) | **Scartare** come cuneo |
| A3-07 | CRM, annunci, incroci, valutazione | — | — | — | — | Commodity, presidiato dai portali | **Scartare** |
| A3-08 | Contratti, firma, antiriciclaggio, privacy | — | — | — | — | DokiCasa, Gestim, Faloosa, Youdomus | **Scartare** (eventuale partnership) |
| A3-09 | Visure e documenti ufficiali | — | — | — | — | Youdomus, Immodoc (3 €) | **Scartare** come prodotto; integrare via partner |
| A3-10 | Report attività di vendita al proprietario | — | — | — | — | Gestim "Area proprietari" | **Scartare** |

---

## 8. Le nicchie raccomandate (massimo tre), in ordine

### N1 — "Fascicolo venditore pronto al rogito" (A3-01) · stato: **VALIDARE**

**Il lavoro concreto per cui l'agenzia pagherebbe:** sapere **all'inizio dell'incarico** cosa c'è e cosa manca, senza inseguire il venditore, e avere una traccia datata di cosa il venditore ha fornito.

**Come funziona (proposta, nulla di questo esiste oggi oltre al nucleo upload → AI → conferma):**
1. L'agente, nel momento in cui prende l'incarico, invia al proprietario un link Dimora (da qualunque gestionale: è solo un link).
2. Il proprietario fotografa o carica ciò che ha. Dimora riconosce i documenti (visura, planimetria, atto, APE, libretto caldaia, conformità impianti, documenti condominiali) e li mette in ordine.
3. Dimora mostra una **lista di completezza orientativa** ("presente / mancante / da verificare con il tecnico"), **mai** un giudizio di conformità.
4. L'agente vede la lista e scarica un pacchetto PDF/ZIP da allegare in Gestim o Getrix. **Non ricopia nulla.**
5. I documenti mancanti vengono indirizzati al tecnico scelto dall'agenzia (il suo geometra di fiducia), non a una rete Dimora.

**Perché è complementare al gestionale [I]:** il gestionale gestisce *la vendita*; Dimora gestisce *la casa*. Il dato è del proprietario (coerente con il principio Dimora), l'agenzia ne è ospite.

**Perché proprio Dimora [I]:** il cuore già costruito è esattamente "carica un documento, l'AI lo riconosce, tu confermi, ogni dato ha una provenienza". Il profilo casa con catasto, APE e agibilità esiste (B36), anche se nascosto in alpha.

**Chi paga — ipotesi da testare [S]:**
- (a) agenzia, **per immobile**, 29–49 €: è pari a 1–4 mesi di un utente Gestim, quindi un ordine di grandezza che un'agenzia piccola conosce;
- (b) gratis per l'agenzia, pagato dal venditore solo se compra un servizio tecnico tramite il tecnico dell'agenzia (Dimora prende una fee di segnalazione: **in tensione con ADR #77**, che esclude un layer di esecuzione ma ammette "software + referral");
- (c) rete/franchising che lo adotta per tutte le agenzie affiliate.

**Prerequisiti mancanti in Dimora [V da `docs/vision.md`, `docs/mvp-v1.md`]:** accesso di un secondo soggetto con permessi (B12), vista "agente" in sola lettura, lista di completezza per la vendita, pacchetto di esportazione per pratica.

**Esperimento di validazione (concierge, 6–8 settimane):**
- 10 agenzie indipendenti (metà Gestim, metà Getrix), 3 incarichi nuovi ciascuna = 30 fascicoli.
- Il team Dimora usa il prototipo attuale + lavoro manuale per produrre lista di completezza e pacchetto.
- Misure: % di venditori che caricano almeno 5 documenti entro 7 giorni (soglia 60%); documenti mancanti scoperti **prima** della proposta (contare); minuti dell'agente per pratica (intervista prima/dopo); **quante agenzie pagano** un secondo lotto a 39 €/immobile (soglia: almeno 4 su 10).
- **Criterio di stop:** meno di 3 agenzie su 10 pagano, oppure meno del 40% dei venditori carica documenti.

### N2 — "Libretto della casa consegnato all'acquirente" (A3-02) · stato: **VALIDARE dopo N1**

**Il lavoro concreto:** dare all'acquirente, al rogito, la storia della casa (documenti, impianti, garanzie, manutenzioni) con il marchio dell'agenzia, e restare utile al cliente negli anni.

**Perché ha senso solo dopo N1 [I]:** se il fascicolo venditore esiste già, la consegna non richiede lavoro aggiuntivo. Senza N1, l'agenzia dovrebbe crearlo da zero: doppio lavoro.

**Valore per Dimora oltre l'agenzia [I]:** l'acquirente è un **nuovo proprietario che arriva già con dati**, e spesso fa lavori nei primi mesi: è un ponte naturale verso il wedge scelto **Renovation + Financing (ADR #77)**. Questo è il principale punto di sinergia da portare ad A2.

**Chi paga [S]:** agenzia per transazione (riferimento USA: 99 $ HomeZada) oppure partner interessati ai lavori (ristrutturazione, finanziamento). Da testare.

**Prerequisiti mancanti:** **trasferimento del record** al nuovo proprietario, oggi solo "visione futura" e "subordinato a identità, permessi, separazione dati e verifica legale" (`docs/vision.md`); **consenso del venditore** alla consegna dei suoi documenti; separazione tra dati personali del venditore e dati della casa.

**Esperimento:** su 20 rogiti delle agenzie di N1, consegna del libretto all'acquirente. Misure: % acquirenti che attivano l'account (soglia 50%), % che aggiungono almeno un documento entro 60 giorni (soglia 25%), % agenzie disposte a pagare per transazione dopo aver visto questi numeri.

### N3 — Testa di ponte: **case ereditate e immobili datati** (A3-03) · stato: **VALIDARE come segmento di partenza di N1**

**Perché questo segmento [I]:** chi vende una casa ereditata spesso non conosce la casa, non ha i documenti, e l'atto di provenienza è una successione; negli immobili più vecchi la storia edilizia è più lunga e l'accesso agli atti più lento. Qui il dolore documentale è massimo, il valore di "mettere in ordine" è più evidente e la disponibilità a pagare dovrebbe essere più alta.
**Evidenze:** Immodoc ha un "fascicolo di scopo" dedicato alle successioni [V]; il caso Cass. 32264/2025 riguarda una casa ricevuta in donazione con titolo del 1978 [V]. **Quanta parte delle vendite riguarda case ereditate: [ND]**.
**Esperimento:** dentro lo stesso test di N1, chiedere alle 10 agenzie di includere almeno un incarico di casa ereditata o ante 1990, e confrontare tempo, documenti mancanti e disponibilità a pagare con gli altri incarichi.

**Se gli esperimenti falliscono:** va dichiarato che **non esiste una nicchia sostenibile a pagamento** per le agenzie, e il canale agenzia resta al più un canale di **segnalazione gratuita** verso i proprietari (canale asimmetrico, punto 6 di `AGENT_2_STRATEGY.md`).

---

## 9. Red team finale

Provo a smontare le mie stesse raccomandazioni.

1. **"I gestionali lo faranno da soli."** Gestim ha già un workflow documentale e un'area proprietari; il gruppo Immobiliare.it ha visure (Youdomus), AI documentale con collegamenti al Catasto (Genio Diligence) e 14–16 mila agenzie su Getrix. Se uno dei due portali decide che il "fascicolo di vendita" è strategico, Dimora viene superata in distribuzione in poche settimane. *Difesa possibile:* il fascicolo Dimora è del proprietario e sopravvive alla vendita; i portali non hanno interesse a dare il dato al proprietario. *Debolezza della difesa:* all'agenzia questo interessa poco.
2. **"Immodoc è già lì."** Fascicolo digitale, indice di completezza, condivisione con permessi, passaggio al nuovo proprietario, rete di oltre 100 tecnici, prezzi chiari, linea agenzie in lancio. Dimora arriverebbe seconda su un mercato piccolo. *Difesa:* AI che capisce i documenti e memoria tecnica degli impianti (punti di forza Dimora non dichiarati da Immodoc). *Rischio:* sono vantaggi che contano per il proprietario negli anni, non per l'agenzia nelle 6 settimane della vendita.
3. **"All'agenzia serve che il problema sia risolto, non elencato."** Una lista di documenti mancanti senza chi li produca lascia il lavoro all'agente. ADR #77 esclude una rete di tecnici propria. Faloosa e Immodoc vendono anche la *soluzione*. Dimora rischia di essere "una bella checklist".
4. **"Le agenzie pagano pochissimo il software."** Gestim parte da circa 10 €/utente/mese; Miogest 499 €/anno. Un costo per immobile si scontra con questa abitudine. Il venditore, di solito, paga già i documenti tecnici, e il tecnico dell'agenzia non vuole un intermediario.
5. **"Il check può aumentare la responsabilità dell'agente."** Cass. 32264/2025 esclude l'obbligo di verifiche tecniche *se l'incarico non le prevede*. Un'agenzia che usa uno strumento di "controllo documenti" potrebbe trovarsi a doverne rispondere. Dimora deve dire sempre "presente/mancante", **mai** "conforme", e l'agenzia deve presentarlo come raccolta, non come verifica. Serve un parere legale prima di qualunque materiale commerciale.
6. **"Il valore duraturo va al proprietario sbagliato."** Il venditore lascia la casa: il suo fascicolo vale per lui solo per qualche settimana. Il valore duraturo va all'acquirente, ma il trasferimento non esiste ancora, richiede consenso del venditore e separazione dei dati personali (GDPR). Senza N2, N1 non costruisce la memoria a lungo termine che è la promessa Dimora.
7. **"Pochi utilizzi, alto costo di attivazione."** 9–14 vendite l'anno per agenzia [S]: l'agente userà Dimora una volta al mese, dimenticando come funziona. Il costo commerciale per agenzia può superare il ricavo.
8. **"Contraddice una decisione presa."** ADR #77 (16/09/2026) ha scartato la Transaction readiness per l'Italia. Queste nicchie la riaprono. Non è un errore in sé, ma **è una decisione che spetta a Vincenzo**, informata dall'integrazione di A2, non da questo dossier.
9. **"Distrae dall'alpha."** L'alpha è per 15–20 proprietari e mostra solo Home, Documenti, Asset, Cerca. N1 richiede inviti multi-utente, vista agente, esportazioni: lavoro che non serve all'alpha.
10. **"Le prove sono deboli."** Molti numeri sono dichiarati dai venditori (utenti, pratiche, risparmi). Il dato sulla quota di vendite via agenzia è del 2018. Non ho trovato alcuna misura italiana di quante trattative saltano o si riaprono per problemi documentali, né del tempo che l'agente dedica ai documenti. La statistica "80% di case irregolari" va esplicitamente evitata.
11. **"La guerra dei portali può toccare anche Dimora."** Nel 2020 Immobiliare.it ha chiuso i flussi ai software di idealista. Se Dimora diventasse rilevante e vicina a un campo, l'altro potrebbe ostacolarla. *Mitigazione:* nessuna integrazione obbligatoria, solo link ed export.

**Verdetto del red team:** le nicchie N1–N3 **non vanno adottate**. Vanno **validate** con l'esperimento concierge di N1, che costa poco e risponde alle domande decisive (le agenzie pagano? i venditori caricano?). Se la risposta è no, la conclusione onesta è che le agenzie sono per Dimora **un canale di segnalazione, non un cliente**.

---

## 10. Cose da passare ad A2 (Strategy Integrator)

- **Conflitto da risolvere:** N1–N3 riaprono la Transaction readiness scartata da ADR #77. Proposta: trattare N2 (consegna all'acquirente) come **ingresso** al wedge Renovation + Financing, non come wedge alternativo.
- **Sinergia potenziale con A4 (amministratori):** i documenti condominiali (spese, regolamento, verbali) servono alla vendita e li produce l'amministratore. Da verificare se A4 trova un flusso comune.
- **Nucleo dati comune:** fascicolo della casa con provenienza + lista di completezza per "scopo" (vendita, mutuo, lavori). Immodoc usa già la logica dei "fascicoli di scopo".
- **Concorrente da aggiungere alla mappa trasversale:** Immodoc/Domodeus (nato nel 2026, tocca proprietario, agenzia e notaio).

---

## 11. Lacune e domande di validazione

**Non disponibile [ND] — da cercare o chiedere:**
1. Quota attuale di compravendite intermediate da agenzie in Italia (dato del 2018 non sufficiente).
2. Quante trattative si bloccano, si riaprono o si scontano per problemi documentali (nessuna statistica affidabile trovata).
3. Minuti/ore che un agente dedica alla raccolta documenti per pratica.
4. Come funziona davvero il "workflow documentale" Gestim e quanti clienti lo usano (serve una demo).
5. Prezzi di Getrix e Youdomus.
6. Se il blocco Immobiliare.it verso Gestim/Miogest è ancora attivo.
7. API pubbliche di Gestim (non documentate).
8. Trazione reale di Immodoc e Faloosa.
9. Dati italiani su referenze e ritorno dei clienti alle stesse agenzie.
10. Testo della Cass. 7972/2026 citata da Immodoc.

**Domande per le interviste (15 agenti, 5 notai, 5 geometri):**
- "Nell'ultimo incarico, quando hai scoperto il primo documento mancante? Quanto è costato?"
- "Chi paga oggi la relazione tecnica e quando viene chiesta?"
- "Pagheresti 39 € per immobile per ricevere dal venditore i documenti già ordinati? E se lo pagasse il venditore?"
- "Cosa consegni all'acquirente al rogito, oltre alle chiavi?"
- "Quanti clienti ti richiamano per rivendere o ti segnalano qualcuno?"

---

## 12. Fonti (consultate il 12/10/2026)

**Interne:** `AGENTS.md`; `docs/vision.md`; `docs/mvp-v1.md`; `docs/market-strategy.md`; `docs/market-landscape.md`; `docs/decisions.md` (ADR #73, #77); branch `research/dimora-four-agent-intelligence-20261012`: `PROJECT_CONTEXT.md`, `RESEARCH_PROTOCOL.md`, `AGENT_3_AGENCIES.md`, `AGENT_2_STRATEGY.md`, `research/homezada/copilot-intake.md`.

**Gestionali e operatori:**
- Gestim: https://www.gestim.it · https://www.gestim.it/prezzi/ · https://www.gestim.it/panoramica-delle-funzioni/ · https://www.gestim.it/tabellacomparativa_rev1_2026.pdf · https://www.gestim.it/sicurezza-dei-dati/ · https://www.gestim.it/versione-enterprise/ · https://www.capterra.it/software/1062880/gestim
- Acquisizioni e portali: https://www.idealista.it/news/node/141264 (26/06/2020) · https://www.onlinemarketplaces.com/articles/idealista-buys-up-two-italian-agent-software-companies/ (28/06/2020) · https://www.idealista.it/news/node/148060 (08/07/2020) · https://www.immobiliare.it/en/info/software-immobiliare/ · https://www.immobiliare.it/info/chi-siamo/ · https://onlinemarketplaces.com/articles/immobiliare-it-acquires-agent-tools-platform-youdomus (16/02/2022)
- Getrix: https://www.getrix.it · Youdomus: https://www.youdomus.it · Genio Diligence: https://www.geniodiligence.it/
- Miogest: https://www.miogest.com · onOffice: https://it.onoffice.com/ · GestionaleRE: https://www.gestionalere.it/ · Cometa: https://www.cometaimmobiliare.it/ · Elenco integrazioni: https://www.bancadellecase.it/integrazioni-gestionali-e-portali · Guida con prezzi (fonte di un venditore, Ivemind): https://ivemind.com/en/blog/real-estate-management-software-guide/
- DokiCasa: https://dokicasa.it · https://dokicasa.it/?p=5298 (agg. 25/05/2026)
- Faloosa: https://faloosa.it/
- Immodoc: https://www.immodoc.it · https://www.immodoc.it/fascicolo-digitale · https://www.influentpeople.it/documentazione-immobiliare-digitale-la-visione-di-immodoc-per-il-futuro-delle-compravendite/ (16/09/2026)
- RogitoSubito: https://rogitosubito.it/
- Switcho–onOffice: https://www.switcho.it/blog/news/partnership-switcho-onoffice/ (08/04/2026)
- HomeZada: https://www.homezada.com/professionals/pricing · HomeBinder: https://pages.homebinder.com/
- REAG4docs (escluso): https://www.bluerating.com/mercati/659908/reag4docs-arriva-in-italia-il-servizio-per-la-digitalizzazione-nel-real-estate (2015)

**Mercato:** https://www.idealista.it/news/node/297870 (19/12/2025) · https://www.lavoripubblici.it/news/mercato-immobiliare-residenziale-statistiche-omi-quarto-trimestre-2025-37610 (11/03/2026) · https://www.charliecinolo.it/post-aggregazione.html (06/09/2026) · https://www.infobuild.it/acquisti-immobili-agenzie-immobiliari/ (2018) · https://virginiarealtors.org/2025/12/08/key-takeaways-from-nars-2025-profile-of-home-buyers-and-sellers

**Norme e sentenze (fonti secondarie, da far confermare a un legale):** https://www.idealista.it/news/finanza/fisco/2026/02/13/320974-difformita-urbanistica-al-rogito-quando-la-compravendita-si-blocca · https://www.studiolegalecalvello.it/responsabilita-agente-immobiliare-difformita-urbanistiche-sentenza-cassazione-32264-2025/ · https://www.studiotecnicopagliai.it/irregolarita-edilizie-agente-immobiliare-responsabile-per-mancata-informazione/ · https://www.studiocataldi.it/articoli/18257-sull-agente-immobiliare-incombe-l-obbligo-di-controllare-la-liberta-dell-immobile-da-gravami.asp · https://www.ecnews.it/legale/diritto-civile/diritti-reali-e-condominio/obblighi-informativi-del-mediatore-immobiliare-ed-attestazione-energetic/ · https://www.edilizia.com/leggi-normative/relazione-tecnica-di-compravendita-cose-quando-e-obbligatoria-quanto-costa/ · https://www.unioneprofessionisti.com/blog/compravendite-catastali-accordo-tra-geometri-e-agenti-immobiliari/15259/ · https://ediltecnico.it/irregolarita-edilizie-equivoco-statistica-chiarimento-cni/ · https://www.ingenio-web.it/articoli/quali-certificazioni-servono-per-vendere-casa-quali-sono-i-documenti-obbligatori-la-due-diligence-immobiliare/

**Pagine non leggibili il 12/10/2026:** Casafari (errore), sito AGIM ("non attivo"), pagina Youdomus su getrix.it (bloccata), discussioni immobilio.it su Genio Diligence (errore), pagina agenzie di Immodoc (errore), centro assistenza Gestim (richiede login).

---

## Changelog
- 2026-10-12 — Prima versione (Agente 3). Nessuna ipotesi precedente da aggiornare: è il primo dossier A3.
