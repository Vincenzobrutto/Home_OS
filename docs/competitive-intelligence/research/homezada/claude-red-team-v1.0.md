# HomeZada — Red team indipendente (Claude) v1.0

**Data:** 2026-10-12 · **Autore:** Claude (revisore indipendente) · **Stato:** challenge, non dossier consolidato. **Nessuna modifica** a roadmap, backlog o registro decisioni.

## 0. Limite dichiarato prima di tutto

I testi **integrali** dei due dossier non sono nel repository né nella cartella di progetto: ci sono solo le schede di acquisizione (`copilot-intake.md`, `gemini-intake-2026-10-12.md`) e il confronto `copilot-gemini-comparison-v0.1.md`. Il PDF Copilot (20 pagine) e il testo Gemini (265 righe) restano nelle chat originali.

Conseguenza: questo red team verifica **le affermazioni riportate nelle schede e nel confronto**, sulle fonti originali HomeZada e di terzi, consultate il 12/10/2026. Non posso dire se il testo integrale contenga sfumature o errori ulteriori; dove questo conta lo segnalo come `[ND – testo integrale]`. Caricati i due file, una v1.1 può chiudere il gap.

Etichette: **[V]** verificato su fonte indicata · **[V-vendor]** verificato ma dichiarato dal venditore (prova che lo dice, non che funzioni) · **[I]** inferenza · **[S]** stima con ipotesi · **[ND]** non trovato (non significa assente).

---

## 1. Sintesi in 8 righe

1. **I prezzi riportati da entrambi sono giusti** sulla pagina prezzi attuale: Premium $99/anno o $15,95/mese, Deluxe $189/anno, professionista $99 per immobile, Share $49/immobile/anno, branding $5/cliente/anno. [V]
2. **La contraddizione FAQ $25 vs $49 segnalata da Copilot è reale** ed è ancora pubblicata. Gemini non la vede. [V]
3. **Esiste una seconda contraddizione che nessuno dei due riporta**: copia del fascicolo per l'acquirente a **$90** nella FAQ contro **$99** nella pagina prezzi consumer. [V]
4. **"Gift" e "Transfer" non sono due prodotti diversi**: la pagina prezzi li chiama "Transfer (Gift)", un'unica operazione. Copilot lo tratta già così ("Gift/Transfer"); è la lettura "quattro modelli" a essere sbagliata: i modelli professionali reali sono tre (Transfer, Share, Branding). [V]
5. **Non c'è nessuna prova pubblica di adozione**: zero numeri utenti, zero clienti PRO nominati, nessuna recensione su TrustRadius, app Android con circa 14.900 download, voto 2,37/5 e **ultimo aggiornamento marzo 2024**. [V]
6. **Dimensione dell'azienda**: 5 dipendenti nel 2026 e circa $2,4M raccolti in 15 anni (PitchBook). È un prodotto vivo ma piccolo, non un caso di successo del modello B2B2C. [V, fonte secondaria]
7. **Per Dimora**: HomeZada è utile come **avvertimento** ("il regalo dell'agente da solo non crea uso"), non come modello da copiare. In Italia lo spazio "fascicolo dell'immobile tramite agenzia" è già presidiato da Immodoc (gratuito per il proprietario, passaggio al rogito dichiarato) e Faloosa (lato agenzia). [V-vendor]
8. **Conflitto interno aperto**: le ipotesi "agenzia regala il fascicolo" contraddicono l'ADR #77 (16/09/2026), che ha scelto Renovation + Financing e scartato la Transaction Readiness. Va deciso da Vincenzo, non dal benchmark.

---

## 2. Matrice delle affermazioni importanti

| # | Affermazione (chi la fa) | Verdetto | Cosa dice davvero la fonte | URL di verifica |
|---|---|---|---|---|
| C1 | Essentials gratis; Premium $99/anno o $15,95/mese; Deluxe $189/anno (C, G) | **Confermata** [V] | Essentials: inventario, documenti, contatti, 10 chat AI, 5 foto AI. Premium aggiunge manutenzione, progetti, finanze, report, riconoscimento AI da video. Deluxe: fino a 3 immobili e "Home Marketing" | homezada.com/homeowners/pricing |
| C2 | Professionista: Gift $99 per immobile, una tantum (C, G) | **Confermata** [V] | "$99 per property", "one-time transaction fee"; il cliente riceve 1 anno di Premium (valore $99) | homezada.com/professionals/pricing · homezada.com/faq |
| C3 | Share $49/immobile/anno (C, G) | **Confermata, ma contraddetta dal venditore stesso** [V] | Pagina prezzi e FAQ "How much does it cost?" dicono $49; un'altra FAQ ("can my clients login…") dice $25 | homezada.com/faq |
| C4 | Discrepanza FAQ $25 vs $49 (solo C) | **Confermata** [V] | Ancora online al 12/10/2026. Attenzione: $25 è anche il prezzo del pacchetto di 300 crediti AI, possibile fonte di confusione per chi legge di fretta | homezada.com/faq |
| C5 | Branding renewal $5/anno (C, G) | **Confermata** [V] | "$5.00 per client per year", rinnovo scelto cliente per cliente dopo il primo anno. Il contenuto dell'annuncio non è descritto | homezada.com/professionals/pricing |
| C6 | Gift/Transfer e Share sono distinti (C) | **Confermata** [V] | "Transfer (Gift)" è **una** operazione: si copia l'immobile al cliente, che riceve Premium per un anno. Share è diversa: accesso condiviso continuativo (pensato per property manager), a pagamento annuo | homezada.com/professionals/pricing · homezada.com/faq |
| C7 | Dopo il primo anno il cliente paga o torna al gratuito (implicito in C e G) | **Confermata** [V] | "After one year, your client can choose to remain on HomeZada Premium for a $99.00 annual fee", altrimenti Essentials gratis | homezada.com/professionals/pricing |
| C8 | Zada File (scheda pubblica della casa in vendita) e trasferimento all'acquirente (C, G) | **Confermata come offerta, debolissima come uso** [V] | Pubblicazione $75 per 6 mesi; copia per l'acquirente $90 (FAQ) o $99 (pagina prezzi). L'elenco pubblico mostra **10 Zada File**, uno marcato "Sample Listing", uno con numero MLS segnaposto, prezzi e anni compatibili con annunci vecchi | homezada.com/listings · homezada.com/faq |
| C9 | Major Asset Forecasting, novità 2026 (C); "previsioni manutenzione a 5 anni" (G) | **C confermata, G non verificata** [V] | Comunicato del 29/04/2026: stima anno e costo di sostituzione dei grandi impianti, grafico a barre per anno futuro. L'orizzonte di 5 anni **non** è scritto. Il piano che lo include non è indicato | homezada.com/press/homezada-launches-ai-powered-major-asset-forecasting-… |
| C10 | AI da foto/documenti (C, G) | **Parziale** [V-vendor] | Il forecasting legge marca, modello, seriale da foto delle targhette. La pagina funzioni cita "Homeowner AI" e "Visual Design AI"; **non** cita un'AI che legge documenti/fatture | homezada.com/homeowners · comunicato 29/04/2026 |
| C11 | Fondata nel 2011 (G); divergenza 2011/2012 (C) | **Aperta, irrilevante** | PitchBook dice 2011; il sito non lo dice. Non cambia nessuna conclusione | pitchbook.com/profiles/company/64889-11 |
| C12 | 5 dipendenti, $2,4M raccolti (G) | **Confermata su fonte secondaria** [V] | PitchBook: 5 dipendenti (2026), $2,4M, seed ottobre 2014, transazione secondaria nov. 2025. Il comunicato di HomeZada parla di seed "$2,1M": la differenza non è spiegata | pitchbook.com/… · homezada.com/press/homezada-closes-a-two-million-seed-round-of-investment |
| C13 | Recensioni mobile negative (C) | **Confermata, e peggiore del previsto** [V] | Google Play: circa 14.900 download, 2,37/5 su 56 voti, ultima versione 2.3.2 del **05/03/2024**. Lamentele: paywall, login, crash, assistenza. Le recensioni riflettono la versione attuale perché **non ne esistono di più recenti** | chrome-stats.com/d/com.homezada.mobile (dato al 11/10/2026) |
| C14 | Il modello B2B2C funziona / genera referral (tono G) | **Non provata** [ND] | Pagina agenti e blog (16/10/2025) promettono referral e "top of mind" ma **non citano un solo numero**. Nessun cliente PRO nominato. TrustRadius: 0 recensioni | homezada.com/professionals/real-estate · zen.homezada.com/2025/10/16/… · trustradius.com/products/homezada/reviews |
| C15 | Mancano dati di attivazione, retention, conversione gift→pagante (C, G, confronto) | **Confermata** [ND] | Nessuna fonte pubblica trovata. Nel 2019 il cofondatore dichiarava solo "utenti in tutti i 50 stati" | carriermanagement.com/news/2019/06/26/194912.htm |
| C16 | Lavoro del professionista: crea profilo, aggiunge branding, crea immobili, personalizza, invita (implicito C) | **Confermata** [V-vendor] | I 5 passi sono nella FAQ della pagina agenti. "Clients choose what information they add" | homezada.com/professionals/real-estate |
| C17 | Il professionista conserva una copia (non citato) | **Nuovo, confermato** [V] | Il professionista mantiene una copia in sola lettura di tutti gli immobili e Zada File creati | homezada.com/faq |
| C18 | Export dati e cancellazione (domanda aperta C) | **Parziale** [V] | Export inventario in foglio di calcolo + ZIP di foto e documenti. Cancellazione account sì, ma **cosa succede ai dati dopo non è scritto** | homezada.com/faq |
| C19 | Prezzo storico del programma agenti (non citato) | **Nuovo, confermato** [V] | Nel 2013 l'agente pagava $40 per cliente/anno, minimo 3. Oggi $99. Prezzo più che raddoppiato, nessun segno di volumi | inman.com/2013/04/04/homezada-pro-offers-agents-digital-home-profiles-for-buyers |
| C20 | Fee italiana 20–30 € per agenzia (G) | **Ipotesi senza prova** [S] | Nessun dato di disponibilità a pagare in Italia. Il dossier Agente 3 trova gli stessi servizi a 0 € per il proprietario (Immodoc) | immodoc.it/fascicolo-digitale |
| C21 | Amministratori di condominio come canale "bulk" (G) | **Ipotesi senza prova** [I] | HomeZada non ha nulla del genere: è una proposta di Gemini, non un'evidenza dal benchmark | — |
| C22 | Distribuzione B2B Dimora "Sì (modello da validare)" (G) | **Errata come stato** | Nessun canale B2B è operativo. Condivisione multiutente (B12) e trasferimento (B39, EPIC 11) non sono iniziati | `docs/backlog.md` B12, B39 · `docs/product-backlog.md` EPIC 11 |
| C23 | "Massimizza i rimborsi", "evita rotture" (G) | **Claim del venditore** [V-vendor] | Formule di marketing, nessuna misura. Non riportabili come benefici | — |

---

## 3. Dove Copilot e Gemini concordano senza prove indipendenti

L'accordo tra due AI qui non vale come conferma: entrambi hanno letto **le stesse pagine del venditore**.

- **Prezzi**: concordano e sono giusti, ma la fonte è una sola (homezada.com). Prova che è il listino pubblicato, non che qualcuno lo paghi.
- **"Retention plausibile" grazie a promemoria, progetti, previsioni**: entrambi lo deducono dall'elenco funzioni. Nessuno dei due ha un dato. L'unica evidenza esterna (app ferma dal 2024, voto 2,37) va nella direzione opposta.
- **"Branding e touchpoint post-rogito danno valore all'agente"**: è la promessa della pagina agenti, riportata da entrambi. Zero numeri, zero testimonianze verificabili.
- **"5 dipendenti, $2,4M, 2011"**: Gemini li cita, il confronto li accetta. Vengono tutti da PitchBook, cioè da un aggregatore, non dall'azienda.
- **"Il modello USA non è automaticamente trasferibile"**: corretto ma generico. Nessuno dei due quantifica perché (vedi §8).

---

## 4. Contraddizioni e omissioni

### Risolte
| Tema | Esito |
|---|---|
| FAQ $25 vs $49 per lo Share | Reale, ancora online. Copilot ha ragione, Gemini l'ha mancata |
| Gift vs Transfer | Sono la stessa operazione ("Transfer (Gift)"). Da correggere ovunque si parli di quattro modelli |
| Forecast "5 anni" (G) vs "calendario per anno" (C) | La fonte descrive un grafico per anno futuro, senza orizzonte fisso. Vale la descrizione di Copilot |
| Distribuzione B2B Dimora "Sì" (G) | Errata: è un'ipotesi, nessun canale attivo |
| Recensioni negative "forse vecchie" (C) | Non c'è una versione più nuova: l'app Android è ferma al 05/03/2024 |

### Ancora aperte
| Tema | Perché resta aperta | Come chiuderla |
|---|---|---|
| Anno di fondazione 2011/2012 | Solo PitchBook | Registro California Secretary of State. Bassa priorità |
| Seed $2,1M (comunicato) vs $2,4M (PitchBook) | Possibile somma di più tranche | Non serve per la strategia |
| Copia acquirente $90 vs $99 | Due pagine del venditore in conflitto | Contatto diretto con HomeZada o account di prova |
| Cosa vede e conserva l'agente dopo il regalo, cosa succede ai dati alla cancellazione | Non documentato | Account PRO di prova |
| Contenuto reale del "branding ad" | Non descritto | Account PRO di prova, screenshot |
| Piano che include il Major Asset Forecasting | Non dichiarato | Account Essentials di prova |
| Quale versione iOS è attiva e con che voto | App Store non leggibile da qui | Controllo manuale su iPhone |

### Omissioni di entrambi
1. Seconda discrepanza di prezzo ($90/$99).
2. Il professionista **conserva una copia** in sola lettura del fascicolo regalato: punto delicato per la privacy, rilevante per l'Italia.
3. L'**affiliate program** come alternativa per l'agente: commissione sugli abbonamenti, senza comprare account. Indica che il venditore stesso offre una strada più leggera.
4. Il prezzo agenti è passato da $40 (2013) a $99: un listino che sale senza numeri di adozione non indica un canale che scala.
5. Il marketplace Zada File ha 10 schede, di cui almeno una di esempio: la funzione "vendita" è sostanzialmente inattiva.
6. Nessuno dei due ha confrontato HomeZada con i **concorrenti italiani già attivi** (Immodoc, Faloosa, Gestim Area proprietari), mappati invece dall'Agente 3.

---

## 5. Funzionalità HomeZada disponibili oggi

| Funzione | Stato al 12/10/2026 | Evidenza |
|---|---|---|
| Inventario, documenti, contatti | Disponibile (gratis) | Pagina prezzi [V] |
| Manutenzione con promemoria, progetti, finanze, report | Disponibile (Premium) | Pagina prezzi e funzioni [V] |
| Homeowner AI (chat) e Visual Design AI | Disponibile, a crediti | Pagina prezzi [V] |
| Riconoscimento da foto/video | Dichiarato (Premium) | Pagina prezzi [V-vendor] |
| Major Asset Forecasting | Annunciato il 29/04/2026, piano non dichiarato | Comunicato [V-vendor] |
| Multi-immobile (fino a 3, poi $99/anno l'uno) | Disponibile (Deluxe) | Pagina prezzi [V] |
| Accesso famiglia gratuito | Disponibile | FAQ [V] |
| Zada File (scheda pubblica in vendita) | Disponibile ma quasi inutilizzata (10 schede) | homezada.com/listings [V] |
| Transfer (Gift) professionista | Disponibile | Pagina prezzi PRO [V] |
| Share professionista | Disponibile, prezzo incoerente | FAQ [V] |
| App mobile | Pubblicata ma non aggiornata dal 03/2024 (Android) | chrome-stats [V] |
| Lettura AI di fatture/documenti | **Non trovata** [ND] | — |

---

## 6. Come funzionano davvero Gift, Transfer, Share e Branding

| Modello | Chi paga | Quanto | Cosa succede | Dopo il primo anno |
|---|---|---|---|---|
| **Transfer (Gift)** | Professionista | $99 per immobile, una volta | Il professionista crea l'immobile nel suo account, lo compila, lo **copia** al cliente. Il cliente riceve Premium per un anno. Il professionista tiene una copia in sola lettura | Il cliente paga $99/anno o scende al gratuito |
| **Share** | Professionista | $49 (o $25, secondo la FAQ) per immobile/anno | Accesso **condiviso continuativo** allo stesso immobile tra professionista e cliente o dipendenti. Pensato per property manager | Si rinnova finché si paga |
| **Branding** | Professionista | Incluso il primo anno, poi $5 per cliente/anno | "Annuncio" del professionista visibile nell'app e nelle email del cliente | Rinnovo cliente per cliente |
| **Transfer del Zada File all'acquirente** | Venditore/agente o acquirente | $90 o $99 una tantum, più $75 per pubblicare | Solo chi ha pubblicato il Zada File può copiarlo all'acquirente. I dati personali del venditore restano nel suo account | — |

**Lettura critica [I]:** il "regalo" è sostanzialmente un **anno di abbonamento prepagato con il logo dell'agente**. Il valore operativo per l'agente durante la vendita è quasi nullo: il beneficio promesso arriva dopo il rogito ed è puramente relazionale.

---

## 7. Pricing: quanto è solido

- **Solido come listino**: tutte le cifre principali sono pubblicate e coerenti tra pagine, salvo le due eccezioni ($25/$49, $90/$99).
- **Debole come prova di mercato**: nessun numero dice quanti professionisti comprano, quanti clienti rinnovano dopo il regalo, quanti pagano Premium.
- **Segnale negativo [I]**: due errori di prezzo nelle FAQ non corretti, app ferma da 2,5 anni, 5 dipendenti. Indica un prodotto mantenuto con poche risorse, non un canale B2B2C in crescita.
- **Per l'Italia [S]**: con una provvigione tipica intorno al 3% per parte su una casa da 200.000 €, l'agenzia incassa circa 6.000 €. Un costo di 20–30 € (o 99 €) non è la barriera. La barriera è il **tempo** che l'agente deve dedicare e l'assenza di un beneficio prima del rogito. Un prezzo basso non risolve un problema di valore.

---

## 8. Adozione, retention, monetizzazione: evidenze reali

| Indicatore | Evidenza |
|---|---|
| Utenti totali | Nessun dato pubblico. Solo "utenti in tutti i 50 stati" (2019) |
| Clienti professionisti | Nessuno nominato |
| Download Android | ~14.900 in totale, +23 nell'ultima settimana |
| Voto app | 2,37/5 (56 voti) |
| Ultimo aggiornamento app | 05/03/2024 |
| Recensioni B2B | 0 su TrustRadius |
| Marketplace Zada File | 10 schede, almeno una di esempio |
| Organico | 5 persone (PitchBook, 2026) |
| Capitale | ~$2,4M in 15 anni |

**Conclusione [I]:** dopo 15 anni non c'è una prova pubblica che il regalo dell'agente generi uso duraturo o conversione a pagamento. Questo non dimostra che il modello fallisca, ma **non può essere usato come prova che funzioni**.

---

## 9. Lavoro richiesto durante l'onboarding

**Professionista** [V-vendor]: crea account PRO, carica il logo, crea l'immobile, inserisce l'indirizzo (HomeZada ricava anno di costruzione, metri quadri, lotto), personalizza i dati, invita il cliente. Quanto tempo serve: [ND]. Il valore del fascicolo dipende da quanto l'agente compila: se compila poco, il cliente riceve un guscio vuoto con un logo.

**Proprietario** [V-vendor]: riceve l'invito, entra, aggiunge da sé inventario, documenti, foto, manutenzioni. "I clienti scelgono cosa aggiungere". Tutto il lavoro di costruzione del record resta a lui.

**Lettura critica [I]**: è esattamente il problema già noto a Dimora. Chi distribuisce non ha incentivo a compilare; chi riceve non ha urgenza. Dimora ha un vantaggio concreto qui: la lettura AI dei documenti con conferma riduce il lavoro del proprietario, cosa che HomeZada non dichiara.

---

## 10. Cosa è trasferibile in Italia

| Elemento USA | Trasferibile? | Perché |
|---|---|---|
| Regalo di chiusura dell'agente | **Debole** [I] | Negli USA il "closing gift" è un'abitudine consolidata con budget proprio. In Italia non ho trovato evidenza di una prassi equivalente [ND] |
| Branding dell'agente nell'app del proprietario | **Rischioso** [I] | Contrasta con la promessa Dimora "la casa è tua" e richiede base giuridica per comunicazioni commerciali (GDPR) |
| Copia in sola lettura conservata dal professionista | **Da non copiare** [I] | Problema di minimizzazione e finalità dei dati in UE |
| Prezzo per immobile una tantum | **Trasferibile come forma**, non come cifra [S] | La forma "per pratica" è comprensibile per un'agenzia; la disponibilità a pagare è da provare |
| Share continuativo per property manager | **Possibile per amministratori** [I] | Ma è già coperto da portali condominiali e gestionali |
| Previsione costi di sostituzione impianti | **Trasferibile** [I] | Utile anche per il filone Renovation + Financing (ADR #77). Richiede dati di costo italiani |
| Accesso famiglia gratuito | **Trasferibile** | Coerente con B12 (multiutente) |

---

## 11. Confronto con lo stato reale di Dimora

| Proposta emersa dai dossier | Stato Dimora | Fonte |
|---|---|---|
| Lettura AI di documenti con conferma utente | **Implementata, in alpha** | `docs/mvp-v1.md` §1, §4 |
| Scheda Asset, interventi, garanzie, ricerca | **Implementata, in alpha** | `docs/mvp-v1.md` §4, §6 |
| Export ZIP e cancellazione dati | **Implementata, in alpha** | `docs/mvp-v1.md` §8 (B53, B54, B61, B62) |
| Piani di manutenzione e promemoria | **Implementata**, promemoria essenziali in alpha | `docs/roadmap.md` M1 |
| Profilo casa catastale/energetico | **Implementata, nascosta in alpha** | `docs/roadmap.md` M2 (B36) |
| Previsione costi di sostituzione impianti | **Ipotizzata** (affine al "renovation opportunity model") | `docs/decisions.md` #77 |
| Multiutente / accesso famiglia | **Pianificata** (dati pronti, UI mancante) | `docs/backlog.md` B12 |
| Libretto casa PDF | **Pianificata** | `docs/backlog.md` B23 |
| Trasferimento del record al nuovo proprietario | **Pianificata a bassa priorità**, prima serve specifica legale | `docs/backlog.md` B39, EPIC 11 |
| Canale agenzie (regalo, fascicolo pronto al rogito) | **Ipotizzata**, in tensione con ADR #77 | dossier Agente 3, `channel-cross-analysis-v0.1.md` |
| Canale amministratori bulk | **Ipotizzata** | `gemini-intake-2026-10-12.md` |
| Branding del professionista | **Ipotizzata**, mai discussa | — |
| Prezzo 20–30 € per agenzia | **Ipotizzata** | `gemini-intake-2026-10-12.md` |

---

## 12. Raccomandazioni premature, deboli o già presidiate

| Raccomandazione | Giudizio | Motivo |
|---|---|---|
| Fee agenzia 20–30 € (G) | **Prematura** | Nessuna prova di disponibilità a pagare; il prezzo non è la barriera (§7) |
| Amministratori come canale bulk (G) | **Prematura** | Nessuna evidenza nel benchmark; già annotato come "referral senza WTP" nel cross-analysis |
| Regalo dell'agente al rogito sul modello HomeZada | **Economicamente debole** | 15 anni di HomeZada senza prove di uso; nessun beneficio per l'agente prima del rogito |
| Libretto consegnato all'acquirente | **Già presidiato** | Immodoc dichiara "Al rogito, il fascicolo passa al nuovo proprietario", gratis per il primo immobile, con rete di tecnici |
| Raccolta documenti dall'incarico al rogito | **Già presidiato** | Faloosa (9,99–69,99 €/mese, Dossier Immobili, condivisione con proprietari e notai), Gestim Area proprietari |
| Branding dell'agente nell'app | **Da scartare per ora** | Indebolisce la promessa "sotto il tuo controllo" e porta problemi GDPR |
| Trasferimento del record come leva commerciale | **Prematura** | Non implementato (B39), richiede specifica legale; non promettibile |

---

## 13. Correzioni necessarie ai due dossier

**Copilot**
1. Esplicitare che "Gift/Transfer" è un'unica operazione ("Transfer (Gift)") e distinguerla dal Transfer del Zada File lato consumer ($90/$99), che è un'altra cosa.
2. Aggiungere la seconda discrepanza ($90 vs $99).
3. Aggiungere che il professionista conserva una copia in sola lettura.
4. Recensioni mobile: specificare che l'app Android non è aggiornata dal 05/03/2024 (non sono recensioni "vecchie", è l'app a essere vecchia).
5. Aggiungere prezzo storico ($40/cliente nel 2013) e l'affiliate program.
6. `[ND – testo integrale]` Verificare che i link numerati del PDF puntino alle pagine sopra.

**Gemini**
1. Rimuovere "5 anni" dalla previsione dei costi: l'orizzonte non è dichiarato.
2. Distribuzione B2B Dimora: da "Sì" a "Ipotesi, nessun canale attivo".
3. Sostituire i segnaposto [cite: n] con URL; senza URL le etichette [V] vanno declassate a [ND].
4. Indicare PitchBook come fonte di 5 dipendenti / $2,4M / 2011 e segnalare il $2,1M del comunicato.
5. Riformulare "massimizza rimborsi", "evita rotture" come dichiarazioni del venditore.
6. Fee 20–30 € e amministratori bulk: marcarli come [S] / ipotesi Gemini, non come lezioni del benchmark.
7. Aggiungere la discrepanza $25/$49.

**Confronto v0.1**
1. Al punto "Gift PRO $99… Share $49" aggiungere che lo Share ha un prezzo incoerente nella FAQ.
2. Divergenza 8 (forecast): chiusa a favore di Copilot.

---

## 14. Le 5 evidenze più importanti per la strategia Dimora

1. **Nessuna prova pubblica che il regalo dell'agente generi uso o pagamento** in 15 anni (§8). Chi propone il modello deve portare dati nuovi, non citare HomeZada.
2. **HomeZada è un'azienda di 5 persone con app ferma dal 2024**. Il benchmark descrive un prodotto sopravvissuto, non un canale che ha vinto.
3. **In Italia lo spazio "fascicolo al rogito" è già occupato** da Immodoc (gratuito per il proprietario, passaggio al rogito, rete tecnici) e Faloosa (lato agenzia). Arrivare terzi con un regalo brandizzato non è un vantaggio.
4. **Il lavoro di compilazione è il vero collo di bottiglia**, sia per HomeZada sia per i concorrenti italiani. La lettura AI con conferma, già in alpha in Dimora, è l'unico elemento che ho trovato **non dichiarato** né da HomeZada né da Immodoc.
5. **La previsione dei costi di sostituzione impianti** (lanciata da HomeZada ad aprile 2026) è la funzione più vicina all'ADR #77 (Renovation + Financing): trasforma lo storico della casa in un'informazione utile a chi finanzia lavori.

---

## 15. Le 3 migliori opportunità da validare

### O1 — Primo valore senza intermediario
Verificare con la private alpha già prevista che il percorso "documento → conferma → ritrovamento" produca un secondo caricamento entro 7 giorni (soglia `mvp-v1.md`: 40%).
- **Perché prima di tutto**: se il proprietario non torna da solo, nessun canale (agenzia, amministratore, banca) lo farà tornare. È la lezione principale di HomeZada.
- **Rischi**: campione piccolo (15–20 utenti); utenti amici troppo motivati.

### O2 — Previsione costi di sostituzione impianti, all'interno del filone ADR #77
Mostrare al proprietario "quando e quanto" potrebbe costare sostituire caldaia, climatizzatore, ecc., usando dati già confermati (età, tipo, marca). Validare prima con colloqui (B74) se banca o impresa di ristrutturazione userebbero questa informazione.
- **Perché**: è coerente con la decisione già presa, riusa dati esistenti, e HomeZada la considera abbastanza importante da averla lanciata nel 2026.
- **Rischi**: costi di sostituzione italiani affidabili non disponibili; rischio di sembrare un consiglio tecnico; disponibilità a pagare del partner non provata.

### O3 — Agenzia come canale di attivazione, solo se supera tre condizioni
Test assistito (come N1 del dossier Agente 3) solo se Vincenzo decide di riaprire la Transaction Readiness scartata da ADR #77. Condizioni minime: l'agenzia riceve un beneficio **prima** del rogito; il proprietario non deve ricopiare nulla; nessun branding dell'agente nel record.
- **Perché**: è l'unico canale dove il momento del bisogno (vendita) è chiaro.
- **Rischi**: Immodoc e Faloosa già presenti; geometra di fiducia come vero concorrente; contraddizione con ADR #77; trasferimento del record non implementato (B39).

---

## 16. Conclusione: HomeZada è un buon benchmark B2B2C per l'Italia?

**No, come modello da imitare. Sì, come caso di avvertimento.**

HomeZada dimostra che si può costruire un prodotto completo per la casa e un programma per agenti con un listino chiaro. Non dimostra che gli agenti lo comprino in volume, né che i proprietari lo usino dopo il regalo. Le uniche evidenze pubbliche (app ferma dal 2024, voto 2,37, 10 schede Zada File, 5 dipendenti, nessun numero di clienti) suggeriscono un canale che non è decollato in 15 anni nel mercato dove la cultura del regalo di chiusura è più forte.

Per Dimora il benchmark è utile su tre punti precisi: la forma "pagamento per immobile", la previsione dei costi di sostituzione e la conferma che il collo di bottiglia è la compilazione del record. Per il canale agenzie italiano i riferimenti giusti sono Immodoc e Faloosa, non HomeZada. Qualunque scelta sul canale agenzie richiede prima una decisione esplicita su ADR #77.

---

## Fonti consultate (12/10/2026)

- https://www.homezada.com/homeowners/pricing
- https://www.homezada.com/buyers-sellers/pricing
- https://www.homezada.com/professionals/pricing
- https://www.homezada.com/professionals/real-estate
- https://www.homezada.com/faq
- https://www.homezada.com/homeowners
- https://www.homezada.com/listings
- https://www.homezada.com/press/homezada-launches-ai-powered-major-asset-forecasting-to-help-homeowners-predict-future-replacement-costs
- https://homezada.com/press/homezada-closes-a-two-million-seed-round-of-investment
- https://www.homezada.com/press/homezada-launches-homeowner-marketing-mobile-app-for-pros
- https://zen.homezada.com/2025/10/16/how-realtors-can-stay-top-of-mind-during-slow-seasons-and-give-the-gift-of-homezada/
- https://www.inman.com/2013/04/04/homezada-pro-offers-agents-digital-home-profiles-for-buyers/
- https://carriermanagement.com/news/2019/06/26/194912.htm
- https://pitchbook.com/profiles/company/64889-11
- https://chrome-stats.com/d/com.homezada.mobile
- https://www.trustradius.com/products/homezada/reviews
- https://www.immodoc.it/fascicolo-digitale
- https://faloosa.it/
- Interni: `docs/mvp-v1.md`, `docs/roadmap.md`, `docs/backlog.md`, `docs/product-backlog.md`, `docs/decisions.md` #72–#77, `docs/competitive-intelligence/strategy/channel-cross-analysis-v0.1.md`, dossier Agente 3 (`/mnt/project-files/agente3/dossier-agenzie-immobiliari.md`).

Non accessibili: App Store iOS (pagina non leggibile da qui), testi integrali Copilot e Gemini.
