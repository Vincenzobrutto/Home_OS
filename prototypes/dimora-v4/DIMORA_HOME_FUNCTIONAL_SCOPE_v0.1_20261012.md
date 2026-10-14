# Dimora Home — Perimetro funzionale consolidato v0.1
Data: 12 ottobre 2026 | Stato: decisioni di concept e prototipo, NON requisiti di sviluppo.

## Registro delle 20 decisioni
| # | Ambito | Decisione | Evoluzioni e limiti |
|---|---|---|---|
| 1 | Identità immobile | Profilo completo fisico, catastale, energetico, ambienti, impianti e storia | Rappresentazione spaziale avanzata futura |
| 2 | Inventario | Guidato e progressivo con foto targhette, carico massivo documenti/cartelle e ricerca autorizzata in email di fatture e ordini | AI propone, utente conferma; un ordine non dimostra installazione |
| 3 | Memoria documentale | Archivio attivo con classificazione, versioni, deduplica, fonti, segnalazioni di lacune e incongruenze | Nessuna attestazione automatica |
| 4 | Interventi | Cartella clinica completa: lavori, componenti, tecnici, fatture, foto, costi, garanzie e guasti ricorrenti | Contributo diretto tecnico non obbligatorio |
| 5 | Manutenzioni | Piano proattivo e suggerimenti; controllo caldaia contestualizzato territorialmente, visibile tra le manutenzioni | Motore normativo distinto, fonti e condizioni verificate; niente predizione guasti |
| 6 | Spese e consumi | Storico luce, gas, budget, forecasting, benchmark abitazioni comparabili e analisi economiche di efficientamento/incentivi territoriali | Non comparatore offerte o broker energia; dataset/validità incentivi da provare |
| 7 | Assistente AI | Proattivo, estrae, collega, trova, risponde e propone suggerimenti con fonti | Agente autonomo che opera verso terzi solo possibile evoluzione |
| 8 | Esterni | A evoluta: proprietario importa fatture/rapporti e riceve contributi senza richiedere al tecnico l'uso dell'app | Collaborazione diretta opzionale futura; no marketplace/dispatch |
| 9 | Proprietà | Passaggio selettivo autorizzato e nuova Home acquirente prepopolata; privati esclusi | Memoria permanente indipendente da tutti i proprietari da valutare |
| 10 | Contratti | Mutuo, polizze e utenze con estrazione dati, premi/rate, scadenze e impegni integrati nel budget | No consulenza bancaria; debito residuo non presunto corrente |
| 11 | Locazioni | Dal punto di vista del proprietario: contratto, canone, deposito, verbali, spese, scadenze e interventi | Inquilino non deve avere account; non un PMS completo |
| 12 | Famiglia | Accesso per comproprietari/familiari con permessi differenziati e documenti finanziari privati | Richiede autorizzazioni reali per prodotto, non operative nella demo |
| 13 | Parti comuni | Proprietario inserisce documenti e spese; amministratore Partner può contribuire in modo autorizzato | Non dipende dall'adozione dell'amministratore; evitare doppio budget |
| 14 | Notifiche | Personalizzabili per canale, categoria, anticipo, frequenza, con anomalie e opportunità proattive | Lo sviluppo di notifiche esterne resta in standby nel backlog B18 |
| 15 | Assicurazioni | Polizze, coperture, massimali, franchigie, inventario beni con prove d'acquisto e dossier sinistro | Prezzo acquisto diverso da valore assicurabile/indennizzo; pratica sinistro completa futura |
| 16 | Documenti ufficiali | Guida a reperimento: documento, motivazione, fonte/procedura e stato richiesta | Hub servizi con partner futuro, dopo customer base e prova del business model |
| 17 | Valore di mercato | Storico investimenti/migliorie, stima indicativa basata su comparabili e suo andamento | Non perizia; costo degli interventi diverso da incremento valore |
| 18 | Portafoglio | Più immobili, riepilogo aggregato valori indicativi, spese, debiti, scadenze e investimenti | Non gestione patrimoniale professionale |
| 19 | Domande sulla casa | Q&A su documenti e record con fonti, incertezza e assenza dati dichiarate | Analisi complesse on demand non incluse, forecast #6 sì |
| 20 | Completamento | Suggerimenti contestuali per colmare lacune; azioni piccole, rimandabili e ignorabili | Niente checklist coercitive o punteggi dominanti |

## Tassonomia documentale logica, non UI
- Proprietà, rogito, visure, planimetrie e catasto.
- Mutuo, piani ammortamento e surroghe.
- Polizze, coperture, quietanze e documenti di sinistro.
- Utenze e contratti di luce, gas, acqua e internet.
- Impianti, certificazioni, APE, libretto, RCEE, manuali.
- Fatture d'acquisto, garanzie, ordini e fotografie degli asset.
- Lavori e manutenzioni: contratti, preventivi, rapporti, fatture, foto.
- Condominio: regolamento, verbali, riparti, documenti pertinenti alle parti comuni.
- Tributi e locazioni: IMU, TARI, contratti d'affitto, depositi, verbali.
- Documenti personali e riservati, sempre separati dagli elementi condivisibili.

## Principi non negoziabili
1. La memoria cresce progressivamente; non chiedere dati già disponibili nelle fonti autorizzate.
2. AI propone, utente conferma; fonti e provenienza sempre leggibili.
3. Home utile anche senza Partner; niente obbligo di partecipazione dei manutentori.
4. Essere familiari o comproprietari non abilita a vedere documenti personali non autorizzati.
5. Custodia del documento e diritto di condividerlo sono separati; handover per copia selettiva.
6. Norme, incentivi, stime AVM, consumi comparabili e risparmi richiedono fonti e ipotesi verificabili.
7. Non fare brokeraggio energetico, marketplace o gestione di un'impresa di manutenzione.
8. Nessuna scelta definitiva di UX/UI: l'ipotesi casa-centrica con azioni visibili è solo orientativa.

## Evoluzioni tenute aperte, non approvate ora
- Rappresentazione spaziale/3D; integrazione sensori.
- AI agente che opera verso l'esterno.
- Collaborazione diretta tecnico/proprietario e permessi professionali.
- Memoria immobiliare permanente multi-passaggio.
- Servizi commerciali per reperimento documenti mediante partner.
- Gestione integrale sinistri, PMS professionale, analisi patrimoniale professionale.
- Predizione guasti e comparazione dati senza dataset qualificati.

## Tracciabilità e confini
Deriva dalle 20 scelte espresse in chat il 12 ottobre 2026 e dal precedente FUNCTIONAL_CATALOG_v0.1.md.
Molte capacità sono concept, non implementate nell'alpha. Il repository ha componenti esistenti non tutte esposte ai beta user: confrontare documenti vision, mvp-v1, backlog.
ADR #77 (Renovation+Financing) resta invariata. B18 notifiche esterne resta sospesa. Nessuna nuova API, backend, roadmap, backlog o decisione tecnica approvata.

## Prossime tappe
1. Analisi funzionalità Partner Agenzie, Amministratori e altri canali, distinguendo lavoro del partner e contributo Home.
2. Consegna al UX/Product Designer specializzato del perimetro di prodotto completo, non delle schermate attuali come prescrizione.
3. Prototipazione e test; solo dopo discovery e validazione, specifiche ingegneristiche.