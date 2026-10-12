# Dimora — Master Functional Catalog v0.3
**Data:** 13 ottobre 2026 · **Stato:** fonte funzionale di concept consolidata per UX V5, non specifica di codice né promessa di rilascio.  
**Branch:** `prototype/dimora-partner-home-v4`  
**Sostituisce come riferimento corrente:** `MASTER_FUNCTIONAL_CATALOG_v0.2_20261012.md`. La v0.2 rimane archivio storico.

## 1. Visione, pubblico e confini
Dimora è la **memoria digitale dell'immobile**, capace di organizzare documenti, impianti, asset, interventi, scadenze e dati economici e di far circolare in modo controllato informazioni fra attori diversi.
- **Home:** memoria privata e permanente della singola abitazione sotto controllo del proprietario. Non certifica, non eroga servizi tecnici/dispatch, non sostituisce contabilità familiare.
- **Partner Agenzie:** fascicolo dall'incarico, documentazione raccolta e organizzata, dossier acquirente controllato e Home Gift. Non sostituisce CRM e portali annunci.
- **Partner Amministratori:** memoria tecnica dell'edificio e distribuzione selettiva ai proprietari. Non sostituisce gestionale né contabilità condominiale.
**D06 approvata:** sviluppo **parallelo delle tre esperienze** a partire da un core riusabile. Non significa sviluppare subito tutte le funzionalità futuribili né lanciare senza validazione. **D08 approvata:** prototipo V5 a due livelli, tre user journey completi e moduli evolutivi marcati come demo.

## 2. Regole condivise di prodotto e dato
- «**AI propone, utente conferma**»: revisione a rischio graduato, batch per suggerimenti innocui, conferma esplicita per normative, finanza, autorizzazioni e trasferimenti. Una correzione umana non è sovrascritta silenziosamente.
- Conservare **documento originale, fonte, versione, timestamp, attore e natura del dato**: documentato, dichiarato, stimato, proposto o da verificare. Disponibilità ≠ correttezza ≠ completezza ≠ conformità.
- Modelli distinti per **Casa/unità**, **Pratica di agenzia**, **Edificio condominiale**, **Asset/impianto**, **Documento**, **Pubblicazione**, **Identità e diritti di accesso**. Collegate ma non sinonime; non duplicare file quando un documento interessa più oggetti.
- Isolare ruoli, organizzazioni, unità e documenti privati; autorizzazioni **prima** di ricerca, retrieval AI, condivisione e aggregazione.
- Proposta normativa solo da **sottoinsieme progressivo di regole verificate** con fonte, versione, territorio, applicabilità. Incertezza: «Da verificare». Mai certificazione tecnica, legale, catastale o urbanistica.
- Notifiche target prodotto **in-app, email e push personalizzabili** (D10); urgenti individuali, ordinarie in digest e informative discrete. Regole prevalentemente deterministiche, consent/opt-out e limiti. Precedente standby B18 superato **come decisione prodotto**, non come autorizzazione automatica a cambiare ADR, backlog o codice.

## 3. Capacità comuni configurabili
| Dominio | Home | Agenzie | Amministratori | Requisito comune |
|---|---|---|---|---|
| Inventario | Ambienti, pertinenze, asset | Immobile della pratica | Edifici/impianti comuni | Identità e provenance |
| Archivio | Documenti personali | Fascicolo / dossier | Memoria tecnica e pubblicazioni | Deduplica file, versioni, permessi |
| Acquisizione | Foto, PDF, mobile share, email secondo piano | Batch e link terzi | Batch e import da gestionali compatibili | File originali, stati lavoro, guardrail AI |
| Revisione | «Da rivedere» per immobile | Per pratica | Per edificio e portafoglio | Conflitti, rischio e conferma |
| Eventi e attività | Interventi e scadenze | Richieste/documentazione | Attenzioni tecniche | Senza creare secondo gestionale |
| Condivisione | Familiari, pacchetti, vendita | Accessi dossier e Gift | Pubblicazioni verso Home | Autorizzazioni e manifesto |
| Ricerca | Classica Free; AI Pro | Per pratica e portafoglio | Per impianto e portafoglio | Enforcement permessi |
| Economia | Storico costi, bollette, ricorrenti e semplici proiezioni | KPI operativi | KPI tecnici, analisi Premium ipotetiche | No causalità e risparmi inventati |
| Multiutenza | Familiari con privilegi | Team/reti multisede | Collaboratori studio | Audit e separazione organizzativa |

## 4. Dimora Home — struttura UX approvata
### 4.1 Avvio e rappresentazione Casa
- **D01 document-first**: valorizzare subito il primo upload, con ambienti/asset manuali come strade equivalenti; Gift offre casa già popolata senza nuovo censimento forzato.
- **D02 Casa dinamica e adattiva**: su Home vuota guida all'avvio, popolata mostra ambienti/asset, con attenzioni urgenti mostra priorità senza trasformarsi in task manager. Foto ambienti facoltative, illustrazioni neutre se mancanti.
- Navigazione mobile **Casa · Attività · Documenti · Spese** (D09); **ricerca globale sempre accessibile in header**, pulsante globale «+» per documenti/foto/ambienti/asset/interventi. Attività include scadenze e l'unica inbox operativa «Da rivedere»; suggerimenti facoltativi separati.
- Casa può essere mono/multi-immobile; stanza e pertinenze, asset multiambiente e «Da collocare». Asset schede: identità, ubicazione, dati tecnici, file collegati, costi, storico, manutenzioni e attentions.

### 4.2 Documenti, ingestione e AI
- Originali conservati se AI fallisce, deduplica file per hash senza AI, versioni e conflitti con fonte. Documenti singoli collegabili a più asset/spese senza duplicazione di costo.
- Importazione massiva con stati acquisito/archiviato/in analisi/proposta/non leggibile, riepilogo prima della revisione dettagliata, revisione per **oggetti e priorità**.
- **Asset provvisori** creati immediatamente dall'AI dopo riconoscimento, marcati «Da confermare»; pochi misti all'inventario, numerosi raggruppati in «Elementi da confermare», verifiche in «Da rivedere». Non attivano obblighi o notifiche automatiche.
- Duplicati: nessuna unione automatica di asset già confermati; stessa marca/modello non dimostra stessa unità fisica. L'AI propone accorpamento di schede provvisorie con fonti e conferma.
- Conflitti: confrontare anche **significato tecnico della grandezza** (per es. diverse potenze per caldaia), non scegliere un numero senza sapere il parametro; mantenere dati e origini, sospendere inferenze normative non fondate.
- La schermata conclusiva conferma contenuti creati/collegati, verifiche residue e **prossima azione suggerita non obbligatoria**.
- Metodi di acquisizione: app (foto, scansione, batch), condivisione da device ove supportata, indirizzo email dedicato per casa come direzione di prodotto con rilascio progressivo. **Automazioni ricorrenti per mittente e analisi AI email solo Pro** con autorizzazione, antispam e cap; disponibilità e limite email in Free **aperti**. WhatsApp futuro eventuale.

### 4.3 Scadenze, interventi, norme e altre capacità
- Scadenze e consigli distinti: data documentata, regola verificata, promemoria utente, manutenzione suggerita e «Da verificare». Rinviare una notifica non rinvia l'obbligo legale.
- Interventi e ristrutturazioni come storia/progetti con allegati, non gestionale lavori. Guasti: ricerca veloce manuale, fattura, garanzia, storico; nessuna diagnosi/dispatch certificato.
- Garanzie commerciali/legali/estese distinte e condizioni da verificare. Dossier assicurativo esportabile senza promettere copertura.
- Familiari e destinatari con ruoli granulari; finanziari privati di default; accessi temporanei con revoca che non annulla copie già scaricate.
- Condominio personale autonomo se admin non usa Dimora. Se collegato, sezione **Condominio** dentro Casa e pubblicazioni pertinenti anche in Attività, Documenti e Spese; no sovrascrittura dei dati del proprietario.
- Planimetria **documento in V1**; interattiva opzionale **futura/demo**. Energia da bollette/dati periodici, senza sensori né monitoraggio real-time. Mutui/polizze e modalità locatore come memoria privata, non motore bancario o portale inquilini.

### 4.4 Economia: B iniziale, C prospettica
**Perimetro iniziale B:** costi manuali/documentati e collegati a asset/interventi, spese ricorrenti, bollette, confronti fra periodi e semplici previsioni deterministiche con assunzioni visibili; dati incompleti evidenziati. Il capitale residuo di un mutuo non è una spesa.
**C futura/demo:** pianificazione pluriennale avanzata, simulazioni di efficientamento/investimenti, stime indicative di mercato o valore immobile solo con presupposti espliciti; mai perizia né risparmio garantito.

## 5. Home Free/Pro — packaging definitivamente approvato a livello concettuale
| Elemento | Home Free | Home Pro |
|---|---|---|
| Permanenza | Gratuita senza scadenza | Abbonamento volontario |
| Dati e archivio | Lettura, modifica, gestione manuale, esportazione e ricerca testuale | Stessi diritti + funzionalità premium |
| Asset e scadenze | Inserimento manuale, essenziali deterministici | Revisione/AI e automazioni entro quota |
| AI | Dotazione introduttiva una tantum se economicamente sostenibile, non ricorrente | Elaborazione e assistente con limiti e quote trasparenti |
| Email automatica | Non inclusa come automazione; ricezione Free da decidere | Mittenti/regole ricorrenti ed estrazioni AI entro quota |
| Downgrade | Conserva consultazione/modifica/export e dati già elaborati | Sospende automazioni quando non più sottoscritto |
**Niente crediti AI a consumo** e **niente Event Pass nella prima release**: entrambi superati come offerta iniziale. Prezzi, storage, documenti, soglie e quota AI si fissano **solo dopo misurazione unit economics**, non arbitrariamente. Non cancellare automaticamente file già acquisiti o imporre blocco di export al downgrade. Extra Home Gift finanziati da partner ancora ipotesi.

## 6. Partner Agenzie — ambito e percorso UX
### 6.1 Workflow
- **Nuovo incarico:** scheda preliminare gratuita; il costo parte solo all'attivazione operativa del fascicolo.
- **Raccolta diretta:** caricamento di agente, proprietario e professionisti via link senza account obbligatorio; ogni upload entra direttamente nel fascicolo con provenienza e stato **ricevuto, non verificato**. Nessuna divulgazione automatica all'acquirente.
- **Checklist C+ dinamica e collaborativa:** dipende da immobile/operazione/dati disponibili, consente richieste assegnate con stati e non-applicabilità. Requisiti normativi verificati separati da raccomandazioni operative.
- **Apprendimento semplice nella singola agenzia V1:** utilizzi e richieste ricorrenti possono generare proposte di modifica template che l'agente **approva**. Nessun apprendimento cross-agency su dati proprietari in V1; aggregazioni future solo con condizioni privacy/diritti validate.
- **Controlli:** segnalare lacune e incongruenze, non certificare conformità urbanistica, catastale o tecnica. Richiesta a professionista non rende Dimora gestionale di pratiche.
- **Dossier 3 livelli:** (1) anteprima divulgabile, (2) dossier riservato con accesso graduato e autorizzazioni, (3) **Home Gift distinta** come consegna permanente di una copia selezionata.
- **Home Gift B:** trasferisce selettivamente **documenti + memoria strutturata** (asset/collegamenti/storico pertinente), non attiva automaticamente scadenze normative; manifesto con versioni, inclusioni/esclusioni e origine. Agenzia non ottiene accesso perpetuo alla Home.
- **Email nuovo proprietario:** agenzia inserisce indirizzo per predisporre invito, **non crea account attivo**. Utente verifica/accetta e crea Home Free oppure usa account esistente; non comunicare all'agenzia l'esistenza dell'account; gestire invito inviato/accettato/scaduto/revocato; email verificata non equivale a prova di titolarità.

### 6.2 Packaging Agenzie
**Modello ibrido approvato**: pagamento per singolo fascicolo o pacchetti prepagati e piani in abbonamento con volumi inclusi per utilizzatori frequenti. Scheda preliminare gratuita; attivazione operativa a pagamento. Gift Home Free inclusa nel costo B2B, nessun addebito per semplice attivazione del destinatario. Prezzi, scontistica, cap, Base/Premium e willingness-to-pay non convalidati.

**Funzioni dal catalogo v0.2 preservate:** portafoglio pratiche, utenti/team e reti multi-sede con permessi, co-branding, supporto generazione di bozze marketing approvate da agente senza posting automatico, KPIs operativi senza attribuzioni causali su tempi vendita, consegna Home anche indipendente dalla conclusione vendita quando autorizzata. CRM standalone con possibili interfacce, non secondo CRM.

## 7. Partner Amministratori — ambito e percorso UX
- **Proposta valore C:** memoria tecnica degli edifici, attenzione agli elementi da gestire e distribuzione controllata alle Home; efficienza e riduzione delle richieste sono da misurare, non da affermare come fatti.
- **Dashboard C:** attenzioni a livello di portafoglio + elenco/filtri degli edifici, senza confondere numero documenti con conformità.
- **Onboarding C:** edificio con identificativi minimi, poi import massivo consigliato oppure censimento impianti.
- **Memoria tecnica C:** viste collegate per impianti e documenti, più «Da rivedere» per edificio e portafoglio. Storico interventi solo dove non costringe a doppio gestionale.
- **Pubblicazione C:** selezione autorizzata di contenuti/pacchetti/destinatari, distinzione archiviazione interna vs pubblicazione, versioni, audit. Informazioni comuni pubblicate aggiornano la vista condivisa Home; dati che cambierebbero schede private/scadenze/responsabilità restano **proposte in «Da rivedere»**; niente sovrascrittura Home.
- **Collegamento C:** invito email o link/codice temporaneo associato all'**unità e ai diritti**, con accettazione del destinatario e verifica dei titoli ove necessaria.
- **Cambio proprietario C:** procedura con data di efficacia, revoca accessi riservati del precedente ove applicabile, invito nuovo titolare, storico e retention documenti secondo diritti; non trasferire la Home privata del precedente.
- **Home Condominio C:** funzionamento personale manuale anche senza partner; vista comune quando collegato, superfici trasversali per Attività/Documenti/Spese, origine e versione sempre leggibili.
- **Integrazioni C:** prima release standalone con massivo e **import file esportati da gestionali quando compatibili**; architettura pronta per API/connettori, ma svilupparli solo previa verifica domanda, accesso tecnico, costi e privacy. Nessuna integrazione vendor già garantita.

**Funzioni del catalogo storico preservate:** collaboratori/studi con isolamento, piano suggerito impianti tecnici, verifica prevalentemente di completezza, portale condominiale solo opzionale e non duplicativo, export e continuità patrimonio tecnico subordinati ai diritti, KPI di utilizzo, Premium analitiche come possibile evoluzione.

**Pricing amministratori NON deliberato:** modello per edificio attivo vs piano studio con moduli Premium sono alternative da validare. Referral fee all'amministratore su Home Pro è ipotesi non approvata e richiede verifiche legali/commerciali.

## 8. Prototipo V5 a due livelli e handoff UX
**Livello 1, navigabile e osservabile:**
1. Home: casa vuota/Gift → import batch → asset provvisori → «Da rivedere» → scheda impianto e fonti → Attività, Documenti, Spese → condivisione e Free/Pro.
2. Agenzie: pratica preliminare → attivazione fascicolo → checklist C+ e upload link → dossier anteprima/riservato → invito email e manifesto Gift.
3. Amministratori: portafoglio → edificio → ingestione/inventario → memoria tecnica/scadenze → pubblicazione versionata → invito Home, cambio proprietario e sezione Condominio.
Per ogni journey: casi assenza dati, errore, quota esaurita, permesso negato, documento duplicato, conflitto, invito scaduto, revisione e successo.
**Livello 2, solo demo distinta:** planimetria interattiva, modelli economia C/valore, automazioni evolute e integrazioni non reali. Evitare CTA che fingano invii, conformità, consegne o controlli autorizzativi reali.
**UX priorità:** mobile first Home; desktop first Partner; componenti visivi coerenti, sistemi di permessi distinti. Successive attività: design system, low-fi/high-fi, test task-based per target, backlog/ADR soltanto dopo scoping tecnico.

## 9. Stato delle decisioni e questioni aperte
| Tema | Stato | Azione necessaria |
|---|---|---|
| D01–D10 e UX successive Home/Partner | **APPROVATO A LIVELLO PRODOTTO** | Tradurre in criteri tecnici e test UX |
| Tre esperienze parallele | **APPROVATO** | Definire capacity plan e sequenziamento rilasci senza ridurre il target a un solo verticale |
| Home Free/Pro senza crediti/Event Pass | **APPROVATO** | Validare price, quote, downgrade |
| Agenzie pricing ibrido | **APPROVATO** | Simulare economia e interviste |
| Amministratori pricing | **APERTO** | Validare pricing e volumi |
| Email ingestione Free, push, delivery | **PARZIALMENTE APERTO** | Privacy, costi, scope rilascio e feasibility |
| Perimetro reale normative e controlli | **DA VALIDARE** | Fonti/territorialità/versioning e responsabilità |
| Sicurezza pubblicazione, titolarità e conservazione | **DA VALIDARE** | Policy, threat model, GDPR, implementazione |
| Integrazioni CRM/gestionali specifiche | **FUTURO CONDIZIONATO** | Discovery con provider |
| V5 schermate dimostrative | **CONCEPT** | Non dichiarare implementazione |
| Codice applicativo, ADR #77, backlog tecnico | **NON MODIFICATI** | Pianificare separatamente |

## 10. Riferimenti di dettaglio (complementari, non in conflitto)
- `DIMORA_DECISIONI_CONSOLIDATE_POST_AI_REVIEW_v1.0_20261013.md`
- `DIMORA_HOME_UX_CONSOLIDATED_v0.1_20261012.md` (per dettagli storici non superati)
- `DIMORA_HOME_FUNCTIONAL_SCOPE_v0.1_20261012.md`
- `DIMORA_HOME_IMPORT_REVIEW_UX_v0.1_20261013.md`
- `DIMORA_PARTNER_AGENZIE_UX_v0.1_20261013.md`
- `DIMORA_PARTNER_AMMINISTRATORI_UX_v0.1_20261013.md`
- `DIMORA_ADMIN_QUESTIONNAIRE_USER_20261012.md`
- `DIMORA_UX_CICLO_1_HANDOFF_20261013.md`

**Governo modifiche:** nuove proposte da utenti, colleghi o AI entrano come ipotesi e non annullano implicitamente le decisioni approvate. Questa versione è il riferimento funzionale integrale per iniziare Design System e prototipo V5; non è una specifica di engineering e non valida prezzi o risultati di mercato.

## 11. Segnalazioni intelligenti — integrazione approvata (13 ottobre 2026)
**Obiettivo:** ridurre le richieste informative ripetitive dei condòmini verso lo studio, senza ostacolare segnalazioni nuove e senza creare un secondo software di ticketing. Beneficio da validare, non riduzione già misurata.

### 11.1 Perimetro di prodotto
- **Livello 1 — prima release, consultazione:** nella sezione Condominio di Home mostrare, ai soli destinatari autorizzati, guasti noti, interventi programmati e aggiornamenti che l'amministratore ha effettivamente pubblicato. Nessuna risposta AI può inventare lo stato di un intervento.
- **Livello 2 — prima release, se sostenibile tecnicamente/economicamente:** quando il proprietario intende segnalare un problema, cercare fra le informazioni pertinenti già pubblicate per edificio, scala, impianto e periodo; proporre il relativo aggiornamento **prima** dell'invio. Il proprietario può sempre procedere con una nuova segnalazione o contattare l'amministratore, soprattutto se il problema permane o è differente.
- **Livello 3 — evoluzione futura:** ticketing completo, fornitori, SLA, assegnazioni, workflow di risoluzione e connettori ai gestionali. **Non inclusi nella V1**.

### 11.2 Guardrail e processo
- Distinguere chiaramente **comunicazione pubblicata**, **segnalazione del proprietario**, **presa in carico effettiva** e **risoluzione confermata**. Non presentare un guasto come risolto per inferenza.
- Le informazioni sono filtrate per permessi, edificio/scala/unità e visibilità; una segnalazione privata non è automaticamente condivisa con altri condòmini.
- Il suggerimento di una comunicazione esistente **non blocca** l'invio; per problemi di sicurezza o situazioni urgenti mostrare chiaramente i canali di emergenza appropriati senza attribuire a Dimora capacità di pronto intervento.
- Per l'invio effettivo verso lo studio serve un canale di destinazione deliberato e verificato (ad esempio email configurata o integrazione); in mancanza, fornire contenuto pronto da inoltrare, senza dichiarare che l'amministratore sia stato avvisato.
- Evitare elaborazioni AI obbligatorie per ogni richiesta: ricerca per categoria, entità e corrispondenza prima di eventuali spiegazioni AI con fonti. Nessun monitoraggio continuo gratuito senza limite di costo.
- Distinguere dal **«Da rivedere»** documentale/AI dello studio: la segnalazione del condòmino non è automaticamente una verifica normativa o tecnica.

### 11.3 UX di riferimento e misurazione
Home → Condominio → «Segnala un problema» → descrizione/impianto/scala → eventuali comunicazioni pertinenti consultabili → «Ho trovato la risposta» oppure «Invia comunque la segnalazione» → esito veritiero del canale usato. Partner Amministratori → pubblicazione stato guasto/lavoro e destinatari → consultazione dei contenuti pubblicati, non ticketing completo.
**Metriche di discovery:** visualizzazioni aggiornamenti, quota di sessioni che terminano con «Ho trovato la risposta», segnalazioni effettivamente inviate, feedback sul risultato, duplicati confermati e tempo operativo dello studio (misurato, non stimato come beneficio). Evitare di trattare la sola mancata trasmissione come segnalazione evitata con successo.

**Stato:** direzione funzionale approvata; livello 2 condizionato a feasibility e scoping della prima release. Non sono stati modificati codice applicativo, ADR o backlog tecnico.
