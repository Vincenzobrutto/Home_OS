# Building Asset Intelligence — Red Team indipendente

**Data:** 2026-10-12 · **Stato:** analisi di ricerca per decisione umana. **Non modifica** roadmap, backlog, ADR o changelog. Non autorizza sviluppo.
**Oggetto:** due diligence Copilot (PDF, 22 pagine, `due_diligence_dimora_homeos_building_asset_intelligence_20261012_105334.pdf`), letta integralmente, e brief `BUILDING_ASSET_INTELLIGENCE_RESEARCH_BRIEF_v1.md`.
**Mandato:** non confermare la ricerca; cercare le ragioni per cui il business potrebbe non funzionare.

## Legenda delle evidenze

| Tag | Significato |
|---|---|
| **[F]** | Fatto verificato direttamente: file del repository, comunicato societario, pagina letta da me |
| **[VD]** | Dichiarazione del vendor (pagina ufficiale letta da me). Non è prova di uso, qualità o ricavi |
| **[SEC]** | Fonte secondaria o professionale (articolo giuridico, forum di settore) |
| **[I]** | Inferenza mia |
| **[S]** | Stima mia, con ipotesi esplicite. Non è un dato di mercato |
| **[ND]** | Non verificabile da me. *Non trovato non significa assente* |

---

## 0. Verdetto in breve

**TEST ristretto e declassato. NO GO a qualsiasi sviluppo. Non supera installatori e ristrutturatori nella priorità di Dimora.**

1. La tesi di Copilot regge su un punto: "memoria tecnica + scadenzario" è già coperta dai gestionali. Su tutto il resto è più ottimista di quanto le prove permettano.
2. Il business, così com'è descritto, è **una società di consulenza tecnica assistita dall'AI**, non una startup software. Il lavoro umano necessario (soprattutto il sopralluogo) supera il ricavo plausibile per un abbonamento per edificio (vedi §3).
3. Il buyer "studio di amministrazione" ha il peggior rapporto tra problema e disponibilità a pagare: paga già un gestionale a €288–576/anno per l'intero studio, e un nuovo abbonamento per edificio sarebbe un multiplo di quella cifra (vedi §4).
4. Il riuso dell'architettura Dimora è **molto inferiore** a quanto afferma Copilot ("molto alto"). Il motore documentale si riusa, ma il modello dei dati è pensato per una singola abitazione. Serve un prodotto in gran parte nuovo (vedi §9).
5. Sopravvivono due ipotesi, entrambe come servizio da testare senza sviluppo (vedi §11).

---

## 1. Maintego e GeCoMAX: la differenziazione di Copilot esiste?

### Cosa ho verificato

| Elemento | Evidenza | Tag |
|---|---|---|
| Maintego è un "software per la manutenzione condominiale e la sicurezza degli edifici", integrato con GeCoMAX | Pagina ufficiale `maintego.it` | [VD] |
| Dichiara: piano pluriennale di manutenzione; ciclo di vita che tiene conto di esposizione, localizzazione e vita utile degli elementi; schede diagnostiche (stato di salute e degrado); programma annuale per l'assemblea "tenendo conto dello storico degli interventi e delle scadenze di legge"; dashboard multi-fabbricato; fascicolo del fabbricato secondo UNI 10801:2024 | stessa pagina | [VD] |
| **Non compare** nella pagina: prezzi, metodo di calcolo, stima dei costi, previsione di spesa, saldo del fondo, scenari, clienti | stessa pagina | [ND] |
| GeCoMAX (pagina `gecomax.it`): manutenzione "ordinaria, straordinaria e periodica", conformità UNI 10801:2024 e UNI 11777:2020, assemblee semplificate. **Non compaiono** contratti, fondo lavori straordinari, multi-building, piano pluriennale, prezzi | pagina letta da me | [VD] |
| GeCoMAX è un prodotto di **T-Max Lab**, acquisita da **Dylog Italia** (comunicato del 30/05/2024): 34 dipendenti, oltre 500 studi serviti, oltre 10.000 condomìni gestiti, fatturato €2,4 milioni nel 2023 | comunicato Dylog | [F] |
| Quota rilevata: un utente di forum cita il 51%, ma il comunicato non la specifica | forum + comunicato | [SEC] / [ND] |

### Giudizio

- **"Il piano pluriennale non è un white space" è giusto**: Maintego lo dichiara esplicitamente [VD].
- **Ma Copilot sbaglia nel dire che "report assembleari e fondo straordinario" sono verificati in GeCoMAX.** Sulla pagina che ho letto non compaiono. Potrebbero stare in altre pagine (Copilot cita una nota [3] che non posso risolvere), quindi: non verificato, non smentito.
- **La parte economica del piano (costi futuri, scenari, saldo del fondo) non è dichiarata da Maintego** sulla pagina letta [VD]. Questo è l'unico spazio di differenziazione realistico, ma "non dichiarato" non vuol dire "non esistente": va verificato con una demo reale, non con il sito.
- **Dato scomodo per la tesi:** T-Max/GeCoMAX/Maintego sono una società di 34 persone con circa 10.000 condomìni [F]. Se, dopo anni di presenza, un prodotto di piano pluriennale è un'appendice di una base così piccola, è un indizio che la domanda italiana per questo prodotto sia **debole** [I]. Non ho dati sull'adozione di Maintego [ND]: va chiesto direttamente agli studi.
- Per i grandi concorrenti internazionali, ho verificato **Spacewell**: piani 10/20/50+ anni, libreria componenti con cicli e importi standard, punteggi di condizione NEN 2767 da ispezioni, scenari di budget, vista portfolio, app di ispezione [VD]. È costruito sulla codifica olandese NL/SfB, quindi non è localizzato per l'Italia [I]. Non ho verificato FMX, Planon, Archibus, Siemens Predictor, MaintainX, UpKeep, Limble/Fiix, mainsim, Fracttal/Infraspeak e i loro prezzi: restano affermazioni di Copilot [ND].

---

## 2. Alternative: perché aggiungere Dimora al processo?

| Alternativa | Cosa fa già | Perché Dimora non è ovviamente necessaria |
|---|---|---|
| **Excel** | Inventario, anni, costi, scenari manuali | Gratuito, flessibile, sotto il controllo del professionista; l'AI lo rende più veloce da compilare [I]. Condomani offre import/export Excel [Copilot], Danea Cloud Pro esporta in Excel [VD] |
| **Amministratore + gestionale** | Danea Domustudio: interventi, fornitori, scadenziario, allegati; Multidomus: ticket, fornitori, storico, dashboard, sincronizzato nativamente con Domustudio e Brainware | Il gestionale resta il sistema di riferimento; ogni nuovo strumento deve evitare il doppio inserimento. Multidomus: €2/unità/anno [VD] |
| **Ingegneri/geometri/periti** | Sopralluogo, relazione, capitolato, stima: il valore vero | Il piano è già un loro prodotto. Dimora non sostituisce il sopralluogo [I] |
| **Manutentori** | Rapportini, anomalie, proposte di rinnovo | Hanno interesse commerciale a proporre lavori. Un piano indipendente li disturba |
| **CMMS/CAFM** (MaintainX, UpKeep, mainsim ecc.) | Work order, asset, manutenzione preventiva | Sono pensati per chi esegue la manutenzione, non per chi decide i fondi [Copilot, non verificato] |

**Perché qualcuno aggiungerebbe Dimora:** solo se riduce in modo misurabile le ore del tecnico o produce una decisione migliore all'assemblea. Nessuna delle due cose è oggi dimostrata. L'unico vantaggio plausibile è "pre-compilare l'inventario dai documenti", cioè un risparmio di tempo, non un nuovo risultato [I].

---

## 3. Economics: il margine rimane positivo?

**Premessa:** nessuno di questi numeri è un dato di mercato. Sono stime mie, con ipotesi dichiarate, da sostituire con misure reali nel test.

**Ipotesi [S]:** edificio da 20 unità, 8–12 gruppi di impianti/componenti comuni, 40–80 documenti disponibili, costo orario misto (amministrativo + tecnico) €40–80.

| Fase del lavoro | Ore stimate [S] |
|---|---|
| Raccolta documenti dallo studio | 2–4 |
| Revisione e conferma di ciò che l'AI estrae | 2–3 |
| Sopralluogo, rilievo quantità, valutazione dello stato (inclusi spostamenti) | 4–8 |
| Stima costi, vita residua, scenari | 3–6 |
| Documento per l'assemblea e validazione | 2–4 |
| **Totale primo anno** | **13–25 ore → €520–2.000 per edificio** |
| Aggiornamento annuale | 2–4 ore → €80–320 per edificio |

**Ricavi plausibili per edificio, ancorati a prezzi pubblici verificati [VD]:**
- Multidomus: €2/unità/anno → **€40/anno** per 20 unità.
- Condomani: €212/anno per un condominio con unità illimitate, gestionale completo incluso (pagina letta; Copilot riporta €208, probabile aggiornamento di prezzo).
- Danea Cloud Pro: €576/anno per l'intero studio, condomìni illimitati; Cloud One €288/anno fino a 10 condomìni.

**Conseguenza aritmetica [S]:** anche a 3–5 volte il prezzo di Multidomus (€120–200/anno per edificio), il ricavo annuo è **pari o inferiore** al costo di aggiornamento (€80–320), prima di assistenza, hosting e costi AI. Il margine è positivo solo se:
1. si fattura **un costo di avvio di circa €1.000–2.000 per edificio** (cioè un prezzo da perizia, non da software), oppure
2. il lavoro umano viene svolto e fatturato da un professionista terzo (white-label) e Dimora incassa solo una quota del tempo risparmiato.

Se l'accettabilità di quel prezzo di avvio è reale è **[ND]**: Copilot stesso ammette che la disponibilità a pagare non è dimostrata.

Un effetto di apprendimento sul portafoglio (componenti standardizzati, libreria costi) potrebbe ridurre le ore, ma è un'ipotesi non verificata [I].

---

## 4. Buyer: lo studio paga davvero?

| Segmento | Giudizio Red Team | Motivo |
|---|---|---|
| **Studio di amministrazione piccolo/medio** | **Improbabile come pagante ricorrente** | Il gestionale (€288–576/anno per studio) è già una spesa pesante; un secondo abbonamento per edificio sarebbe un multiplo. Il valore del piano pluriennale va al condominio, non all'amministratore, che non ne ricava ricavi diretti [I] |
| **Singolo condominio** | Pagante problematico | Serve una delibera di assemblea per ogni spesa; budget frammentato. Per i lavori straordinari l'assemblea deve costituire un fondo speciale pari al costo dei lavori (art. 1135 c.c., confermato su fonte secondaria [SEC]; il testo di Normattiva non era raggiungibile). Non esiste, per quanto ho verificato, un obbligo analogo di accantonamento pluriennale preventivo [I]: la domanda è discrezionale |
| **Grande amministratore/property manager** | Migliore economic buyer teorico | Ma procurement, sicurezza e integrazione sono onerosi; e **non è dimostrato** che esistano in Italia molti operatori con quel profilo [ND] |
| **Società di manutenzione/FM multi-cliente** | Più coerente con la forza di Dimora (documenti → asset → interventi) | Ma ha conflitto di interesse: vende lavori. Copilot la giudica "molto promettente" senza prove di disponibilità a pagare |
| **Studi tecnici (ingegneri, geometri, periti)** | **Dimenticati da Copilot**, pur essendo chi già vende questi servizi | Hanno il sopralluogo, la firma e la responsabilità. Per loro un tool che riduce le ore ha un valore diretto e misurabile. È il buyer più coerente con "chi ha già il lavoro" |

**Conclusione:** lo studio di amministrazione è più plausibile come **canale** (chi apre la porta) che come **cliente pagante**. Conviene concentrarsi su chi **vende già** il servizio: studi tecnici e manutentori/FM.

---

## 5. Modello di business

| Modello | Plausibilità | Motivo |
|---|---|---|
| **Servizio una tantum per edificio** | **Alta come strumento di test**, media come attività | Il prezzo è ancorato a una perizia, non a un software; è l'unico modo per coprire le ore di lavoro. Non scala senza personale |
| **Abbonamento SaaS per edificio** | **Bassa** | Gli ancoraggi di prezzo verificati (€2/unità, €212/condominio) non coprono l'aggiornamento annuale (vedi §3) |
| **Prezzo per portafoglio** | Media, ma solo dopo la prova | Ha senso per pochi grandi operatori; ciclo di vendita lungo, nessuna evidenza di domanda |
| **White-label per manutentori/studi tecnici** | **Più plausibile come modello durevole** | Il professionista si assume lavoro e responsabilità e usa Dimora per risparmiare ore; Dimora incassa per pratica o per postazione. Il rischio: dipendenza da pochi clienti e rischio che copino la funzione |

---

## 6. Validità del forecast

**Non ricavabile dai documenti [I]:** stato reale dei componenti, vita residua, quantità e accessibilità, difetti latenti, costo locale completo, dipendenze tra lavori (es. un solo ponteggio per facciata e copertura), saldo del fondo, capacità di contribuzione e morosità (dati contabili sensibili, nel gestionale), disponibilità dell'assemblea ad accantonare. Anche la tabella di Copilot lo ammette: lo stato richiede "sopralluogo/condition assessment".

**Dipendenza dalle ispezioni:** totale per stato e vita residua. Senza ispezione il risultato è una stima di libreria basata sull'età, cioè un calcolo che il tecnico potrebbe fare in un foglio Excel [I].

**Standard CAI citati da Copilot:** ho letto un articolo di Association Reserves (2019) sugli standard nazionali: tre livelli di servizio (Full Reserve Study, Update con sopralluogo, Update senza sopralluogo), elenco componenti con vita utile, vita residua e costo di sostituzione, almeno 20 anni di dettaglio [SEC]. **Non ho trovato** nella fonte letta le affermazioni di Copilot su "orizzonte minimo trentennale" e "visita in sito almeno ogni terzo anno" [ND]: non confermate. Inoltre sono standard statunitensi per HOA, in un quadro giuridico diverso dall'Italia [I].

**Responsabilità professionale [I, non è consulenza legale]:** chi firma il piano risponde delle stime. Dimora non deve firmare né promettere "previsioni certificate". Il progetto stesso lo esclude (`PROJECT_CONTEXT.md`: evitare claim di certificazione). Aggiungo un limite tecnico verificato nel repository: la conferma dell'utente rende un dato "accettato nel proprio record", **non verificato da terzi**, e la versione 1 **non conserva lo storico delle versioni**, ma un solo valore per campo sovrascritto a ogni modifica (`docs/domain-model.md`, sezione provenienza) [F]. Per un professionista che firma una stima serve invece una tracciabilità completa di chi ha cambiato cosa e quando.

---

## 7. Difendibilità

- **L'AI documentale non è un fossato.** Dimora estrae con Claude tramite una chiamata diretta (`docs/architecture.md`) [F]: la stessa tecnologia è disponibile a tutti.
- **Gli incumbent hanno la distribuzione, il sistema di riferimento e le API** [I]. Multidomus (Multidialogo con TeamSystem) è nativamente collegato a Domustudio e Brainware [VD]; Dylog ha acquisito T-Max Lab [F]. Per loro basta aggiungere un pulsante "importa documenti con AI", non servono nuove startup.
- **Un limite a favore della tesi:** la base di GeCoMAX/Maintego è piccola (circa 10.000 condomìni [F]) e l'azienda è di 34 persone, quindi il loro incentivo a sviluppare un motore di previsione sofisticato è discutibile [I].
- **L'unico fossato ipotizzabile** è un archivio comparabile di costi e cicli di vita su molti edifici. Richiede volume, diritti sull'uso dei dati dei clienti e anni di accumulo: **non esiste oggi** [I].

---

## 8. Scalabilità: startup software o consulenza?

**Oggi è consulenza tecnica assistita dall'AI.** Il lavoro che crea valore (sopralluogo, giudizio sullo stato, assunzione di responsabilità) è umano e non scala [I]. Diventa un business software solo se vale **una** di queste condizioni, nessuna delle quali dimostrata:
1. la validazione la fa e la fattura un professionista esterno, e Dimora vende lo strumento (white-label);
2. l'AI + una libreria di cicli e costi riduce le ore del tecnico di molto più di metà;
3. un archivio di costi multi-edificio diventa un prodotto a parte.

Lo stress test di Copilot (§11 del PDF) elenca condizioni di insostenibilità (oltre un terzo dei dati ricopiato a mano, assenza di API, validazione riga per riga ecc.): lo condivido, ma sono **proprio le condizioni che il mercato italiano rende più probabili** (API non provate [Copilot], dati non standard) [I].

---

## 9. Coerenza con Dimora: il riuso è reale?

Ho letto lo schema dati, `domain-model.md`, `mvp-v1.md`, `architecture.md` e i documenti di strategia nel repository [F].

| Parte | Riusabile? | Stato attuale verificato |
|---|---|---|
| Caricamento documento → proposta AI → conferma utente | **Sì** | Funziona per l'abitazione; la regola "l'AI propone, l'utente conferma" è un principio di progetto |
| Provenienza del dato e stato di evidenza | **In parte** | Esiste per Asset e profilo casa; non c'è storico multi-versione |
| Interventi, garanzie, piani di manutenzione ricorrenti | **In parte** | Esistono per Asset/impianto termico di una casa |
| Tipi di documento riconosciuti | **No** | Sono quattro: documento di un asset, planimetria, bolletta elettrica, profilo immobile. Mancano rapportino, verbale, capitolato, preventivo, contratto di manutenzione |
| Tipi di asset | **No** | Pensati per la casa: caldaia, impianto elettrico, idraulico, fotovoltaico, clima, tetto, finestre, elettrodomestico. Mancano ascensore, antincendio, facciata, fognature, impianti comuni |
| Edificio con più unità, parti comuni, millesimi | **Non esiste** | L'entità centrale è la singola casa; l'alpha è limitata a una casa per utente |
| Studio/organizzazione con più edifici e più utenti | **Non esiste** | Esiste solo l'appartenenza di un utente a una casa |
| Stato di conservazione, vita residua, costi, scenari, fondo | **Non esiste** | C'è un campo "anno di sostituzione stimato" non popolato in automatico; il punteggio della casa è deterministico e diverso |
| Relazione/PDF per l'assemblea, export verso gestionali | **Non esiste** | L'export attuale è un archivio ZIP dei dati dell'utente |
| Cifratura delle credenziali, requisiti per clienti professionali | **Da completare** | I token OAuth sono ancora in chiaro (backlog B10) |

**Giudizio [I]:** la tabella di Copilot ("riuso Dimora: molto alto" per gli amministratori) è **smentita dal repository**. Si riusa il motore di lettura documenti e i principi di conferma e provenienza; il resto è un prodotto sostanzialmente nuovo (modello dati multi-edificio e multi-utente, nuovi tipi di documento e asset, motore di stima, reportistica). Questo contraddice anche il principio del progetto di non costruire cinque moduli separati prima di una domanda validata (`B2B2C_BUYER_STRATEGY_REVIEW_v0.1`, §5).

---

## 10. Confronto con installatori, ristrutturatori e banche

Fonti interne: `B2B2C_BUYER_STRATEGY_REVIEW_v0.1_20261012.md`, ADR #77 (Renovation + Financing), backlog B74 [F]. Nessuna disponibilità a pagare raccolta per nessun buyer: il confronto è qualitativo.

| Criterio | **Building Asset Intelligence** | **Installatori / manutentori** | **Imprese ristrutturazione** | **Banche** |
|---|---|---|---|---|
| Allineamento con la decisione esistente (ADR #77) | Nessuno: nuovo segmento | Sì (rete installatori) | Sì (wedge scelto) | Sì (wedge scelto) |
| Riuso del prodotto Dimora | **Basso/medio** (§9) | Alto (asset + interventi + garanzie) | Alto | Medio |
| Lavoro umano per cliente | **Alto** (13–25 h a edificio, [S]) | Basso/medio | Medio per pratica | Alto per integrazione |
| Chi ha un problema urgente e budget | Poco chiaro: l'amministratore ha il problema ma non il budget | Chiaro: visite inefficaci, dati mancanti | Chiaro: preventivi e sopralluoghi | Poco chiaro fuori dal credito |
| Incumbent diretti | **Molti e già presenti** (Maintego, gestionali, CAFM) | CMMS e strumenti di field service | Strumenti di progetto | Sistemi bancari core |
| Frequenza dell'uso | Piano annuale + eventi | Quotidiana | A evento | Bassa |
| Costo per testarlo | Alto (richiede edifici reali, tecnico, 3+ settimane) | Basso (interviste e 3 visite reali) | Basso (interviste e brief) | Medio (interviste, ciclo lungo) |
| Prova economica oggi | Nessuna | Nessuna | Nessuna | Nessuna |

**Conclusione:** Building Asset Intelligence **non merita di superare installatori e ristrutturatori**. Ha riuso inferiore, più lavoro umano per cliente, più incumbent e un test più costoso. Dal Red Team di Copilot sul canale amministratori (già nel repository) emergeva lo stesso segnale: canale distributivo più che pagante.

**Cosa può fare invece:** aggiungere, a basso costo, una o due conversazioni con studi tecnici e società FM **dentro le interviste già pianificate per B74**, senza sottrarre tempo ai segmenti prioritari.

---

## 11. Opportunità che sopravvivono (massimo due)

### O1 — Back-office white-label per studi tecnici che già vendono piani e perizie condominiali
- **Buyer:** ingegneri, geometri, periti con clienti condominiali; pagano per pratica o per postazione.
- **Perché sopravvive:** hanno già sopralluogo, firma e responsabilità; il risparmio di ore è misurabile; il costo di vendita è basso. Il "decision pack" per l'assemblea diventa un *output* del professionista, non un prodotto separato.
- **Rischio principale:** potrebbe bastare un foglio Excel con un assistente AI generico; moat debole.

### O2 — Storico interventi di manutentori/FM multi-cliente → passaporto tecnico dell'edificio e proposta di rinnovi
- **Buyer:** società di manutenzione/FM; ha già rapportini, anomalie e costi (il materiale di cui Dimora è forte).
- **Perché sopravvive:** coincide con il segmento già in testa alla sequenza di validazione (installatori/service network) e non richiede una nuova narrativa.
- **Rischio principale:** conflitto di interesse (il manutentore vende i lavori che propone); frequenza d'uso per cliente bassa.

**Non sopravvivono:** abbonamento per edificio venduto agli studi di amministrazione; "Capital Plan Readiness" come prodotto software autonomo; dossier assembleare come linea di prodotto separata.

---

## 12. Esperimento commerciale minimo, senza sviluppo

**Durata:** 3 settimane. **Tetto di impegno:** circa 15–20 ore totali del team. **Nessun codice, nessun nuovo schema, nessuna integrazione.**

1. **Settimana 1 — ricerca clienti.** Contattare 6 professionisti (3 studi tecnici, 3 società manutenzione/FM) per parlare dei loro **ultimi tre piani o interventi reali**, non di ipotesi. Chiedere: ore impiegate, chi ha pagato, quanto, quali strumenti usano e **se Maintego/GeCoMAX/Danea li ha già soddisfatti** (chiedendo una demo, non il sito).
2. **Settimana 2 — prova su casi reali.** Ottenere documenti anonimizzati o autorizzati di 3–4 edifici (circa 15–40 documenti ciascuno). Passarli per la pipeline attuale di Dimora dove possibile, oppure estrarli manualmente in un foglio di calcolo. Cancellare nomi, millesimi individuali, morosità e dati personali prima di usare qualunque strumento AI. Misurare: percentuale di campi inventario compilata, minuti di conferma, errori di abbinamento. Il risultato è un foglio con inventario, dati mancanti e una forbice di vita residua **che il tecnico valida**, non una "previsione".
3. **Settimana 3 — prova di pagamento.** Prima di consegnare, proporre un prezzo: per pratica (es. €300–500) o per postazione, da pagare alla consegna. Registrare ore reali, risposta e motivazioni.

**Cosa si registra:** ore totali per edificio (professionista + operatore), percentuale di compilazione automatica, tempo di validazione contro tempo da zero, risposta al prezzo, se il documento ha cambiato una decisione (tempo, priorità, fondo).

---

## 13. Condizioni precise per abbandonare l'ipotesi

Soglie proposte da me, non standard validati. Abbandonare (o congelare) se **anche una sola** di queste si verifica:

1. **Domanda:** su almeno 6 conversazioni qualificate, **meno di 2** professionisti chiedono un'offerta per un edificio reale, oppure **nessuno** paga o firma un impegno con prezzo.
2. **Economia:** prezzo accettato per edificio ÷ ore totali mediane **< €60/ora** (cioè sotto il costo orario misto stimato).
3. **Vantaggio dell'AI:** i documenti compilano **meno del 40%** dei campi dell'inventario che il tecnico altrimenti inserirebbe, oppure la validazione richiede **più del 70%** del tempo di una compilazione da zero.
4. **Doppio inserimento:** oltre **un terzo** dei dati va ricopiato a mano dal gestionale e non esiste export utilizzabile (soglia ripresa dal criterio di Copilot).
5. **Incumbent:** **almeno 2** professionisti dimostrano dal vivo che Maintego, GeCoMAX o Danea già producono quanto serve.
6. **Responsabilità:** **nessun** professionista accetta di firmare un piano che usa dati strutturati da Dimora, o l'assicurazione professionale lo esclude.
7. **Valore percepito:** l'unico uso apprezzato è lo scadenzario.
8. **Costo opportunità:** le interviste B74 con installatori o ristrutturatori producono per prima un impegno pagato; in quel caso questa ipotesi si congela.
9. **Tempo:** si superano le 20 ore totali senza rispettare nessuna delle condizioni di avanzamento.

---

## 14. Dove mi discosto da Copilot

| Punto | Copilot | Red Team |
|---|---|---|
| Fonti | 23 note a piè di pagina | Nel PDF non c'è l'elenco delle fonti: le note non sono verificabili dal solo documento |
| GeCoMAX: report assemblee e fondo lavori | Affermato come presente | Non trovato sulla pagina letta; non confermato [ND] |
| Maintego: differenziazione | "White space falso" sul piano pluriennale | Giusto sul piano; ma costi, scenari e fondo non risultano dichiarati: spazio possibile, da verificare con demo |
| CAI "30 anni" e "visita ogni 3 anni" | Attribuiti agli standard CAI | Non trovati nella fonte consultata [ND] |
| Prezzi Condomani | €104 / €208 | Pagina attuale: €106 / €212 |
| Riuso Dimora per amministratori | "Molto alto" | Smentito dal repository (§9) |
| Buyer | Società di manutenzione/FM "molto promettente" | Nessuna prova di pagamento; manca del tutto il buyer "studio tecnico" |
| Test | 9 edifici, almeno 2 gestionali | Troppo pesante per la capacità di discovery: ridotto a 3–4 edifici |

---

## 15. Cosa non ho potuto verificare

- Il testo dell'art. 1135 c.c. su Normattiva (pagina in errore); verificato solo su una fonte giuridica secondaria.
- Gli standard CAI/NRSS originali; letto un articolo che li descrive.
- Prezzi, funzioni e clienti di Maintego; funzioni di GeCoMAX oltre la pagina principale; il censimento impianti e i "15 campi personalizzabili" di Danea (la pagina di prodotto non li descrive); la "novità di ottobre 2026" di Multidomus.
- FMX Capital Planner, Planon, Archibus, Siemens Predictor, MaintainX, UpKeep, Limble/Fiix, mainsim, Fracttal/Infraspeak e relativi prezzi.
- Quota esatta di Dylog in T-Max Lab; numero di amministratori e condomìni in Italia (le stime trovate non hanno una fonte primaria chiara, e non le uso come TAM).
- Qualunque disponibilità a pagare, durata dei cicli di vendita, tempo reale di sopralluogo: sono tutti ipotesi da misurare.

## 16. Ipotesi mutate e punti aperti (secondo il protocollo di ricerca)

- **Mutata:** "Building Asset Intelligence è una nicchia con white space" → "è un servizio ad alta intensità di lavoro in un mercato con incumbent presenti; sopravvive solo come strumento per professionisti".
- **Mutata:** "riuso molto alto" → "riuso del motore documentale; modello dati in gran parte nuovo".
- **Aperta:** adozione reale di Maintego; accesso API/export dei gestionali; diritto di riutilizzo dei dati condominiali; esistenza di un mercato di studi tecnici che vendano piani pluriennali.
- **Decisioni umane richieste:** se inserire 1–2 conversazioni con studi tecnici/FM nelle interviste B74; se autorizzare il test di 3 settimane; chi tiene il tempo di discovery.

**Stato di roadmap, backlog, ADR e changelog: invariato. Nessun codice modificato.**

## Fonti consultate il 2026-10-12

- Documento Copilot (PDF, 22 pp.), brief e intake nel repository (`docs/competitive-intelligence/`), `docs/domain-model.md`, `docs/mvp-v1.md`, `docs/architecture.md`, `docs/market-strategy.md`, `backend/prisma/schema.prisma`.
- Maintego (pagina ufficiale `maintego.it`), GeCoMAX (`gecomax.it`), T-Max Lab (`tmaxlab.it`), comunicato Dylog su T-Max Lab (30/05/2024).
- Multidomus (`multidomus.it`), Danea Domustudio (`danea.it/domustudio`), Condomani (`condomani.it/prezzi`).
- Spacewell Maintenance Planning (`spacewell.com`).
- Association Reserves, articolo sugli standard nazionali (`reservestudy.com`).
- Studio Cataldi, fondo speciale art. 1135 c.c.; Filodiritto (stime sul numero di condomìni e amministratori, 15/06/2021); forum Condominioweb (opinioni di utenti, solo come indizio).
