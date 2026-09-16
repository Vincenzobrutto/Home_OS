# Market Landscape

**Fonte grezza — la sintesi aggiornata è in [`docs/market-strategy.md`](market-strategy.md).** Questo file resta il riferimento per il dettaglio (tabelle, numeri, fonti) del panorama competitivo e del precedente normativo francese; non è più il punto di ingresso per capire "cosa pensiamo oggi del mercato" — quello si legge in `market-strategy.md`, che concilia questo documento con `market-research-funding-2026.md`.

Ultimo aggiornamento: 16 settembre 2026 · Prossima revisione consigliata: dicembre 2026

---

## Perché questo documento esiste

Questo file raccoglie ciò che sappiamo del mercato in cui Dimora si colloca. Non è materiale commerciale: è il contesto che deve essere riletto **prima** di prendere decisioni di posizionamento, di aprire una nuova direttrice di prodotto o di dare priorità a una feature (elenco completo degli obblighi di rilettura in `market-strategy.md`).

**Natura delle informazioni.** Raccolte tramite ricerca pubblica a settembre 2026. Le cifre di raccolta e i prezzi sono dichiarati da fonti giornalistiche o dai siti dei prodotti, non verificati direttamente. Vanno riverificati prima di essere citati all'esterno.

---

## 1. Panorama competitivo

### 1.1 Consumer — categoria matura, nessun vincitore

| Prodotto | Paese | Dal | Perimetro | Modello |
|---|---|---|---|---|
| HomeZada | USA | 2011 | inventario, manutenzione, progetti, finanze | consumer + professionisti |
| Homer | Svezia | — | inventario, garanzie, ricevute, manuali, promemoria, chat AI sul manuale | freemium, ~5 $/mese |
| HomeVaultHQ | UK | — | documenti, rinnovi, garanzie, "Home Passport", timeline | consumer |
| House:ID | Svezia | 2019 | informazioni su immobile e contenuto | investitore: rete di agenzie immobiliari |
| ZYYAH | USA | 2018 | dati, documenti, collegamento a fornitori | lead generation |
| HomeKey Systems | USA | 2018 | app proprietario + strumenti costruttori | ~0,6 M$ raccolti |
| Myr.ai | Francia | 2019 | immobili, fornitori, occupanti | vicino al facility management |

**Implicazione per il prodotto.** Homer copre già gran parte del perimetro funzionale di Dimora — inventario, garanzie, documenti, promemoria ricorrenti, riconoscimento automatico dei manuali — a 5 dollari al mese, ed è lì da anni senza aver conquistato il mercato.

Quindici anni di tentativi nella categoria "memoria della casa" non hanno prodotto un'azienda grande. **Da questo discende un criterio operativo: una feature che Homer ha già non è un differenziale.** Prima di investire in qualcosa che rientra in quel perimetro, va chiarito cosa aggiunge rispetto a un prodotto maturo e più economico.

**Il differenziale verificato di Dimora è uno solo: lo strato normativo territoriale.** Nessuno dei prodotti sopra sa dire che in Lombardia il controllo è biennale e in Piemonte quadriennale. Tutti fanno promemoria generici da raccomandazioni del costruttore.

### 1.2 Dove va il capitale: al canale, non all'app

| Azienda | Raccolta dichiarata | Chi paga | Consegna al proprietario |
|---|---|---|---|
| Digs | 25,3 M$ (Builders FirstSource) | costruttore | alla consegna della casa |
| Hint | 10 M$ seed | da verificare | home management |
| Smart Bricks | 5 M$ pre-seed | operatori immobiliari | B2B |
| House:ID | minoranza corporate | — | investitore = agenzie |
| HomeKey Systems | 0,6 M$ | costruttori | via costruttore |

**Digs — il caso di riferimento.** Vende posti ai costruttori (Digs Pro 59 $/mese, add-on DigsCare 17 $/mese); proprietari e artigiani entrano come collaboratori invitati. Alla consegna il proprietario riceve un record digitale completo: planimetrie, prodotti, manuali, garanzie, manutenzione. Il round proviene da un distributore di materiali con 565 sedi in 43 stati: integrazione verticale, non capitale finanziario.

Il loro meccanismo di ritorno è la manutenzione preventiva basata sui prodotti effettivamente presenti in casa.

**Implicazione.** Su cinque aziende su cinque, il capitale segue chi ha un canale. La domanda che conta non è quanto paga un proprietario, ma **chi paga perché la memoria si formi**.

### 1.3 Italia — il software esiste, sull'altro lato del mercato

Gestionali per centri di assistenza, installatori e manutentori (AP-Evolution, MaintenUP, EasyCloudPro, Infocad e altri) coprono già scadenziario, manutenzioni programmate e cicliche, storico impianti, documentazione tecnica e contratti, su caldaie, condizionamento, ascensori e antincendio.

**Doppia lettura, entrambe da tenere presenti:**
- *canale*: hanno già clienti, impianti censiti e scadenze in memoria
- *concorrente laterale*: sono a un passo dall'aggiungere un'app per il cliente finale; hanno il dato e la relazione, manca loro il prodotto consumer

Non risulta un operatore consumer italiano rilevante. **Da riverificare periodicamente.**

---

## 2. Il precedente francese — il dato più importante

La Francia ha reso obbligatorio per legge ciò che Dimora costruisce come prodotto.

**Carnet d'Information du Logement (CIL)** — loi Climat et Résilience del 22 agosto 2021, obbligatorio dal 1° gennaio 2023. Raccoglie memoria tecnica ed energetica dell'immobile: piani, materiali, attrezzature, lavori, diagnosi energetica, manuali di manutenzione, storico ristrutturazioni. In Francia è descritto come *carnet de santé du logement*.

Ambito: costruzioni nuove con permesso depositato dal 1/1/2023, e immobili esistenti oggetto di ristrutturazione energetica significativa. Nel nuovo lo compila il costruttore e lo consegna al primo proprietario; nelle ristrutturazioni lo costituisce il proprietario con il contributo dei professionisti che hanno eseguito i lavori.

Ecosistema formale: Association des Opérateurs de CIL (QUALITEL Solutions, NRGYS, Mon Suivi Logement, PMB Software, Groupe EX'IM), con osservatorio annuale.

**Il risultato.** L'osservatorio di giugno 2026 conclude che il dispositivo si impone progressivamente come standard nel nuovo, ma l'adozione resta molto limitata nel parco esistente.

### Tre conseguenze dirette per Dimora

1. **L'obbligo normativo da solo non genera adozione.** Se una legge nazionale con tre anni e mezzo di vigenza non ha mosso il parco esistente, la conformità non può essere la proposta di valore principale. Resta cuneo e differenziale difendibile — coerente con quanto già scritto in `compliance-spec.md` §1.1.
2. **Il momento dei lavori è l'innesco che funziona.** Dove il CIL ha attecchito è dove qualcuno consegna o ristruttura.
3. **In Italia il canale "costruttore" non esiste in scala**, perché il nuovo è marginale. Il corrispettivo è l'impresa dopo una ristrutturazione, che produce già fatture, comunicazione ENEA, dichiarazioni di conformità, APE e libretto aggiornato.

---

## 3. Quadro normativo europeo — passaporto di ristrutturazione

Direttiva EPBD IV (UE 2024/1275), in vigore dal 28 maggio 2024: gli Stati membri devono introdurre entro il **29 maggio 2026** uno schema nazionale di passaporto di ristrutturazione secondo l'Allegato VIII.

Caratteristiche rilevanti:
- documento digitale con roadmap di ristrutturazione per fasi
- **volontario** per il proprietario, salvo che il recepimento nazionale lo renda obbligatorio
- rilasciato da un **esperto certificato**, che carica la documentazione sul registro digitale degli edifici e nella banca nazionale delle prestazioni energetiche
- può essere emesso contestualmente all'APE

**Stato italiano:** trasposizione avviata solo a febbraio 2026; procedura d'infrazione aperta il 12 marzo 2026 per il mancato invio del Piano Nazionale di Ristrutturazione. Coerente con quanto già registrato in `compliance-spec.md` §9.2.

### Rischio da presidiare

Se il recepimento produce un registro digitale pubblico degli edifici alimentato da certificatori accreditati, **una parte del valore che Dimora costruisce diventa un servizio pubblico gratuito.**

Non tutto: il passaporto è una roadmap di lavori futuri, non una memoria di manutenzioni e garanzie, e serve solo il secondo dei tre momenti della verità.

**Posizionamento di riferimento:** Dimora non compete con il passaporto. È lo strato che lo alimenta e che sopravvive fra un passaporto e l'altro — il passaporto lo redige un professionista ogni tot anni, la memoria si forma a ogni intervento.

Questo va rivisto se e quando il recepimento italiano definisce l'architettura del registro.

---

## 4. Criteri operativi che ne discendono

Da applicare quando si valuta una feature o una direzione di prodotto.

**C1 — Test di commodity.** Se una funzione rientra nel perimetro già coperto da Homer o HomeVaultHQ, non è un differenziale. Va costruita solo se serve alla promessa, mai presentata come vantaggio competitivo.

**C2 — Test di canale.** Prima di investire in acquisizione consumer diretta, verificare se la stessa funzione può essere consegnata attraverso chi già entra in casa: impresa di ristrutturazione, agenzia, manutentore.

**C3 — Test di sopravvivenza al pubblico.** Se una funzione diventerebbe inutile nel momento in cui lo Stato attiva il registro digitale degli edifici, non può essere il fulcro del prodotto.

**C4 — Il cuneo non è la promessa.** Il modulo Conformità serve ad acquisire; garanzie, documenti ed elettrodomestici servono a trattenere. Coerente con `compliance-spec.md` §1.1: se una scelta costringe a sacrificarne uno, si sacrifica il cuneo.

---

## 5. Domande aperte

Da chiudere prima di decisioni strategiche rilevanti.

| # | Domanda | Perché conta |
|---|---|---|
| M1 | Modello e clienti di Hint e Smart Bricks | Completano il quadro sui modelli di ricavo |
| M2 | Esiste un operatore consumer italiano non emerso? | Rischio di scoprirlo durante una presentazione |
| M3 | Metriche di ritenzione reali della categoria | Nessuno le pubblica; si ricavano da colloqui |
| M4 | Stato mensile del recepimento EPBD IV in Italia | Variabile esterna più impattante |
| M5 | Gli operatori francesi del CIL guardano all'estero? | Unici con esperienza operativa su questo esatto prodotto |
| M6 | Valore reale del canale agenzie immobiliari in Italia | Dolore noto e concentrato al rogito |
| M7 | Disponibilità a pagare di un proprietario italiano | Mai verificata, da nessuno |

---

## Appendice A — Righe da aggiungere a `docs/decisions.md`

> **ADR — Il differenziale di prodotto è lo strato normativo territoriale, non la memoria in sé**
> Contesto: la categoria "memoria della casa" esiste dal 2011 e conta prodotti maturi e più economici che coprono inventario, garanzie, documenti e promemoria senza aver conquistato il mercato. Il precedente francese del CIL mostra inoltre che nemmeno un obbligo di legge produce adozione nel parco esistente.
> Decisione: Dimora non rivendica come vantaggio competitivo funzioni già coperte da prodotti consumer esistenti. Il vantaggio rivendicabile è la conoscenza normativa territoriale. Vedi `docs/market-landscape.md` §1.1 e §2.
> Conseguenza: ogni feature va valutata con i criteri C1–C4 di `market-landscape.md` §4.

> **ADR — Il canale è una variabile di prodotto, non solo commerciale**
> Contesto: le aziende capitalizzate della categoria vendono a chi consegna la casa, non al proprietario. In Italia il canale costruttore non esiste in scala; il corrispettivo è l'impresa di ristrutturazione.
> Decisione: il modello dati e l'onboarding devono restare compatibili con una consegna mediata da un professionista, senza presupporre che il primo utilizzatore sia il proprietario.
> Nota: non implica costruire ora funzionalità B2B. Implica non precludersele.

## Appendice B — Voci da aggiungere a `docs/backlog.md`

- **M1** — Approfondire Hint e Smart Bricks (modello, clienti, chi paga)
- **M2** — Ricognizione periodica di operatori consumer italiani
- **M4** — Monitoraggio mensile del recepimento EPBD IV e dell'architettura del registro digitale degli edifici
- **M6** — Valutare il canale "impresa di ristrutturazione" come consegna della memoria: quali documenti produce già, in che formato, chi li consegna oggi
- **M7** — Test di disponibilità a pagare, da abbinare ai colloqui della Fase 0 di `compliance-spec.md`

## Appendice C — Riga da aggiungere a `docs/vision.md`

Nella sezione sul confine della promessa:

> Il contesto competitivo e normativo che giustifica questo confine è in `docs/market-landscape.md`. In particolare: il passaporto di ristrutturazione europeo potrebbe rendere pubblica una parte di ciò che Dimora costruisce, e il posizionamento scelto è di alimentarlo, non di competervi.

---

*Fonti: Commercial Observer, HousingWire, LBM Journal, Digital Commerce 360, digs.com, aiforproptech.com, CB Insights, AlternativeTo, App Store, homevaulthq.com, Service-Public.gouv.fr, Batinfo (Observatoire CIL 2026), Hellio, Selectra, GlobalABC, Edilportale, Rinnovabili, PMI.it, siti dei gestionali italiani citati.*
