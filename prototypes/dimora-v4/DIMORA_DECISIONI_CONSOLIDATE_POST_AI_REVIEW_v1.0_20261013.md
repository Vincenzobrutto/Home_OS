# Dimora — Decisioni consolidate post UX/AI Review v1.0
**Data:** 13 ottobre 2026  
**Stato:** decisioni di prodotto approvate dal committente; non attestano implementazione né validazione tecnico-economica.  
**Ambito:** Home, Partner Agenzie, Partner Amministratori, modello commerciale, prototipo e interazioni.  
**Precedenza:** in caso di conflitto con i documenti UX/catalogo del 12 ottobre 2026, prevalgono le decisioni esplicitamente registrate qui. Le specifiche precedenti restano riferimenti per il dettaglio non modificato. 

## 1. Posizionamento e principi non negoziabili
- **Home:** memoria digitale persistente dell'abitazione e dell'unità immobiliare, controllata dal proprietario; non software di contabilità personale, certificazione, gestione lavori o marketplace.
- **Partner Agenzie:** fascicolo progressivo dall'incarico, raccolta documentale, verifica di completezza e segnalazione di incoerenze, dossier ad accesso graduato, consegna Gift Home; non CRM.
- **Partner Amministratori:** memoria tecnica dell'edificio, documenti e scadenze, pubblicazioni selettive alle Home; non replica del gestionale o della contabilità condominiale.
- Sviluppo **parallelo delle tre esperienze** approvato esplicitamente (D06), con componenti condivisi e controllo rigoroso del perimetro di ciascuna.
- «AI propone, l'utente conferma»; provenienza e versioni conservate; nessuna promessa di conformità, certificazione, perizia, integrazione con registri pubblici o riconoscimento tecnico verificato non disponibile.
- Distinguere sempre **documentato / dichiarato / stimato / da verificare**. Privacy, permessi e selezione dei dati precedono condivisione, ricerca e retrieval AI.

## 2. Decisioni UX D01–D10 (approvate)
| ID | Decisione | Implicazione |
|---|---|---|
| D01 | Onboarding **document-first**, manuale/ambienti alternativi | Primo valore subito, percorso Gift Home prepopolato, no censimento obbligatorio |
| D02 | Home **ibrida, dinamica, casa al centro** | Ambienti/foto adattivi e attenzioni contestuali, niente dashboard vuota o solo lista attività |
| D03 | Inbox operativa unica **«Da rivedere»** | AI, mancanze, conflitti ed errori distinguibili; **«Suggerimenti»** facoltativi separati |
| D04 | Revisione AI graduata secondo rischio | Conferme massive per dati a basso impatto, esplicite per norme/finanza/trasferimenti; mai sovrascrivere correzioni umane |
| D05 | Proprietà/provenienza e trasferimenti differenziati | Home personale; copie curate Agency→Gift con manifesto di consegna; Admin→Home pubblicazione versionata; seller→buyer copia selettiva; esclusione privata predefinita |
| D06 | **Home + Agenzie + Amministratori in parallelo** | Core condiviso ma tre percorsi e tre prodotti reali in scope di pianificazione |
| D07 | Motore normativo **progressivo** | Solo primo sottoinsieme verificato; fonte/versione/applicabilità; «Da verificare» in caso di incertezza |
| D08 | Prototipo esteso a **due livelli** | 3 journey completi con stati errore/revisione/permessi; avanzati come demo esplicitamente simulata |
| D09 | Bottom navigation **Casa / Attività / Documenti / Spese** | Ricerca globale persistentemente accessibile in alto; «+» globale per aggiungere; scadenze e «Da rivedere» dentro Attività |
| D10 | Notifiche **in-app + email + push** personalizzabili | Urgenti individuali, ordinarie in digest, informative distinte, limiti antirumore; regole senza AI a ogni alert |

**D10 e B18:** la decisione di prodotto supera la precedente indicazione di notifiche esterne sospese; non modifica automaticamente ADR/backlog né prova fattibilità o disponibilità in codice. Necessari consenso/preferenze, opt-out, tutela dati e verifica dei costi dei canali.

## 3. Home — perimetro economico e documentale
**Economia V1, opzione B:** costi documentati e manuali collegati a documenti/interventi/asset; costi ricorrenti, bollette, confronti per periodo e semplici proiezioni deterministiche con ipotesi visibili. Estrarre dai documenti quando possibile e autorizzato. Mutui e polizze archiviabili, senza motore finanziario né confusione tra capitale e spesa. Non promettere risparmi o stime attendibili senza basi.  
**Evoluzione C:** pianificazione pluriennale avanzata, efficientamento, valutazione investimenti, simulazioni e valore indicativo immobile: concept/demo, non impegno V1. Le precedenti sezioni che descrivono forecast a cinque anni o AVM come se fossero V1 vanno lette alla luce di questa decisione.  
**Planimetria B:** file archiviabile in V1; **planimetria navigabile/interattiva solo futura**, opzionale, illustrabile in demo; ambienti e schede restano il percorso principale.

### Acquisizione multicanale
- App: foto, scansione, upload; da dispositivo: condivisione PDF/foto ove supportata; email dedicata per immobile come obiettivo di prodotto con implementazione progressiva.
- Su Free caricamento manuale e condivisione dal device; l'**email dedicata Free non è ancora deliberata**: valutare limiti o riserva a Pro in base ai costi.
- Ricezione da email con inbox, antispam, limiti di formato/dimensione, provenienza e mittenti autorizzati. Comportamento di base: archiviazione/triage prima dell'AI.
- **Regole automatiche su mittenti ricorrenti ed estrazione AI automatica riservate a Pro**, con quota, tetto di spesa e stop al limite; mai acquisti extra impliciti.
- WhatsApp: solo esplorazione futura, non V1.
- Nessun documento ricevuto acquista lo stato «verificato» senza processo coerente con rischio e responsabilità.

### Condivisione
Pacchetti **predefiniti ma modificabili** per intervento tecnico, compravendita/consegna e sinistro. Anteprima contenuti, aggiunta/rimozione e approvazione esplicita del proprietario; informazioni personali e finanziarie escluse in default. Permessi granulari, scadenza/revoca per accessi via link; revoca non recupera copie già scaricate. Nessuna certificazione o completezza garantita.

## 4. Pricing Home — decisione finale che supera alternative precedenti
| Offerta | Regola approvata | Non incluso nella V1 |
|---|---|---|
| **Home Free** | Gratuita permanente; archivio, consultazione, modifica, export, ricerca classica e gestione manuale; scadenze essenziali. Quota AI iniziale **una tantum**, limitata economicamente, se sostenibile. | AI continuativa gratuita, regole automatiche email Pro |
| **Home Pro** | Abbonamento facoltativo; elaborazione AI aggiuntiva, assistente e automazioni, analisi premium, quote/cap trasparenti e verificabili | Elaborazioni o costi illimitati senza consenso |
| **Downgrade Pro→Free** | Stop automazioni Pro; dati e risultati esistenti restano consultabili, modificabili ed esportabili; riattivazione senza reinserimento | Cancellazione automatica dei dati o accesso forzato a Pro |

**Crediti AI a consumo:** **eliminati dal modello commerciale iniziale**; precedenti proposte di microacquisto sono superate.  
**Event Pass:** **non previsti nella prima release**; sola ipotesi futura e previa verifica di sovrapposizione con offerta Partner.  
**Limiti Free/Pro:** quote di storage/documenti/AI e prezzi NON fissati; calcolare prima costi effettivi, scenari d'uso, archiviazione e margini. Al superamento delle quote, non bloccare accesso/modifica/export dei dati esistenti. Eventuali ampliamenti Gift finanziati dal Partner restano ipotesi, non approvazione. Nessun upsell coercitivo in onboarding.

## 5. Pricing Partner e relazioni tra prodotti
**Agenzie:** **modello ibrido approvato**: singolo fascicolo/pacchetto prepagato per bassi volumi oppure abbonamento con volumi inclusi per uso ricorrente. Scheda preliminare gratuita; pagamento su attivazione operativa; Home Gift Free inclusa nel costo B2B, senza ulteriore addebito al proprietario. Prezzi, definizione puntuale di attivazione e quote ancora da testare.  
**Amministratori:** mantenere le opzioni del catalogo (per edificio attivo o piani studio; Premium eventuale) come **ipotesi ancora da deliberare**. Non derivare automaticamente il modello agenzia.  
**Trasferimenti:** Agency e Admin non mantengono accesso illimitato alla Home; selezione autorizzata e manifesto di provenienza/versioni; aderenza ai diritti di trattamento e conservazione da validare legalmente.

## 6. Specifica prototipo a due livelli
**Livello 1 — navigabile end-to-end**, per ciascun journey includere stati senza dati, loading, errore, conflitto, revisione AI, permesso negato, conferma ed esito:
1. **Home:** ingresso via documenti o Gift → primo archivio/ambienti/asset → «Da rivedere» → scadenze/Attività → ricerca/Documenti/Spese → condivisione e preferenze; Free/Pro/downgrade chiari.
2. **Agenzie:** apertura incarico → raccolta documenti/link senza account → revisione completezza/incongruenze → dossier con livelli di accesso → consegna Gift selettiva.
3. **Amministratori:** attivazione edificio → acquisizione batch e inventario tecnico → scadenze/attenzioni → pubblicazione selettiva versionata alle unità Home.
**Livello 2 — dimostrativo e marcato «concept/non disponibile»**: planimetria interattiva, modelli di previsione economica avanzata, valore immobile, moduli assicurativi/finanziari avanzati e altre capacità evolutive. Non simulare certificazioni o permessi come già garantiti dal backend.
**Scelte visual:** Home adattiva con casa/ambienti e «Da sapere oggi»; tab Casa/Attività/Documenti/Spese; search persistente in alto, add «+» senza doppio floating button; desktop Partner orientato a portafoglio e pratiche/edifici. Testare efficacia delle etichette, senza presupporre che mockup equivalga a UI validata.

## 7. Matrice stato decisioni / next validation
| Punto | Stato | Prossima verifica |
|---|---|---|
| UX D01–D10, tre esperienze in parallelo | **APPROVATO — Product** | Project plan, ruoli, autorizzazioni, sviluppo condiviso |
| Home Free+Pro, niente crediti/Event Pass V1 | **APPROVATO — Commerciale concettuale** | Prezzo, cap, downgrade/storage, billing |
| Economica B V1, C prospettica; planimetria B | **APPROVATO — Scope** | Data model, edge case, fattibilità e effort |
| Condivisione pacchetti modificabili | **APPROVATO — UX** | Permessi, audit, retention, legal review |
| Notifiche email/push e ingestione email | **APPROVATO — Direzione** | Deliverability, costi, privacy, consent e fattibilità tecnica |
| Email dedicata Home Free | **APERTO** | Limiti o accesso solo Pro |
| Monetizzazione amministratori | **APERTO** | Interviste e willingness-to-pay |
| Prezzi e quote Home/Partner | **APERTO** | Unit economics misurati |
| Funzioni evolutive in demo | **CONCEPT** | Non dichiararle funzionalità disponibili |
| ADR/backlog e software esistente | **NON MODIFICATI** | Valutare modifica solo con piano e autorizzazione separata |

## 8. Allineamenti rispetto ai documenti precedenti
- Sostituire nella progettazione **«In sospeso»** con **«Da rivedere»**, mantenendo tipologie di stato interne. «Suggerimenti» resta distinto.
- Sostituire la vecchia bottom bar **Casa / Scadenze / Documenti / Spese** con **Casa / Attività / Documenti / Spese**; aggiungere ricerca globale persistente in header.
- Sostituire alternative B/C del prezzo Agenzie con **ibrido a consumo + abbonamento**.
- Sostituire proposta **crediti AI ed Event Pass V1** con **Free + Pro**.
- Interpretare il piano economico come **B nella V1 / C evoluzione**; planimetria interattiva **non V1**.
- D10 supera lo standby di prodotto sulle notifiche esterne ma **non** sblocca automaticamente codice/ADR.
- D06 supera qualunque raccomandazione «solo Amministratori» o «solo Home»: **tre esperienze parallele**.

## 9. Artefatti successivi (non prodotti da questa decisione)
Wireframe mobile/desktop comparati, test task-based, data & permissions matrix, pricing cost model, acceptance criteria e backlog tecnico. Prima del rilascio: legal/privacy assessment, security review, verifica delle fonti normative e test su utenti reali.

**Nota:** questo documento registra decisioni di prodotto approvate in conversazione e aggiorna la direzione UX. Non afferma che esistano già pipeline email, notifiche push, classificazioni AI, bilanci economici o trasferimenti di dati sicuri nel codice.
