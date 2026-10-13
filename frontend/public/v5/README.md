# Dimora V5 — Blu architettura

Prototipo UX locale nuovo, creato il 13 ottobre 2026. Nessun componente, stile o struttura di frontend HomeOS è riutilizzato. I documenti V5 sono requisiti funzionali; il backend non è invocato.

**Baseline finale v9** (`app.js?v=20261013-9-final`, stato demo v3), con le correzioni dell'arbitrato del 13/10/2026: vedi `../dimora-v5-collaudo/ESITO_CORREZIONI_20261013.md`. La versione precedente è conservata in `../dimora-v5-backup-v20261013-3/`.

## Apri il prototipo

Con il dev server locale già attivo: [Dimora V5](http://127.0.0.1:5173/v5/index.html).

- La cartella è copiata in `Home_OS/frontend/public/v5` solo per servirla attraverso Vite.
- Il codice sorgente autonomo è questa cartella: HTML, CSS e JavaScript senza dipendenze di build.
- L'ingresso esatto è `/v5/index.html`. Non usare `/v5/`.
- Lo stato salvato dalla versione 1 viene ignorato: la demo riparte dagli esempi iniziali.

## Chi simula la barra demo

Il menu **«Persona Home»** fa entrare come persone diverse. Ognuna vede **solo la propria casa**.

| Persona | Ruolo nella storia |
|---|---|
| Giulia Leone | Proprietaria dell'unità A12 (Scala A, Via Roma 12); vende tramite Agenzia Nord |
| Marco Riva | Proprietario dell'unità B08 (Scala B), vicino di Giulia |
| Elena Conti | Proprietaria dell'unità V03, Residenza Verdi (altro edificio) |
| Luca Ferri | Acquirente di Via Roma 12: riceve il Home Gift e, dopo il cambio di titolarità, l'invito per l'unità A12 |

- Il profilo «Ex proprietario» della versione 1 non esiste più. Dopo il cambio di titolarità di A12, l'ex titolare è **Giulia**: perde accesso alla casa da Dimora; deve scaricare la documentazione prima della vendita.
- Il menu **«Scenario»** simula: normale, offline, errore di invio, permesso negato, quota AI esaurita, link scaduto. In offline ed errore le conferme, gli invii e le revoche non vengono completati; le bozze restano.

## Le cinque sequenze da provare

Prima di ogni sequenza usa **Ripristina demo**.

1. **Casa vuota → primo documento → revisione → memoria utile**
   - Mappa → «Svuota la casa di questo profilo».
   - Nome e indirizzo → «Carica i primi documenti».
   - Lotto demo → «Elabora con AI» → Da rivedere.
2. **Conferma parziale → residuo → ultima conferma → stato vuoto**
   - Come Giulia: Attività → Da rivedere.
   - Conferma le due grandezze.
   - Togli il modello e conferma solo la marca, poi apri la scheda caldaia.
   - Classifica il rapporto illeggibile e conferma il modello: compare «Nessuna verifica aperta».
3. **Scheda preliminare Agenzia → attivazione → dossier → Gift → Acquirente**
   - Agenzie → Via Roma → «Attiva fascicolo demo».
   - Documenti → «Apri il link di raccolta» → carica.
   - Da rivedere → controlla.
   - Dossier → Configura.
   - Home Gift → Prepara → «Apri l'invito come destinatario» → Accetta.
4. **Segnalazione Home → presa in carico → comunicazione → risposta all'autore**
   - Come Giulia: Condominio → Segnala.
   - Amministratori → Segnalazioni → Prendi in carico → Prepara comunicazione → Conferma.
   - Torna a Giulia e apri la segnalazione: vedi la comunicazione collegata.
   - Marco (Scala B) non la vede.
5. **Cambio titolare → accesso precedente terminato → nuova Home e collegamenti**
   - Amministratori → Condominio Roma → Unità → A12 → Cambio titolarità (scegli una data futura per vedere la programmazione).
   - «Simula data di efficacia».
   - Giulia: Casa mostra «Accesso alla casa terminato», anche aprendo Documenti o Spese.
   - Luca Ferri: Condominio → «Collega la mia Home».

## Confini

- Nessuna API, AI, autenticazione, pagamento, email/push, upload o condivisione reale.
- Il selettore file legge solo i nomi; le fonti sono testi sintetici.
- Lo stato è salvato in `localStorage`. I permessi sono illustrati lato browser e non sono controlli di produzione.
- Pubblicato, consegnato e letto restano stati distinti.
- Prezzi e quote non sono inventati.
- Il confine scheda preliminare / fascicolo operativo dell'agenzia è un'**ipotesi** (decisione arbitrale A-02), da confermare prima di introdurre addebiti reali.
- Planimetria interattiva ed economia avanzata sono marcate come concept futuro.

## Ciclo di vita aggiornato

Vendita, finestra agenzia di 60 giorni e cessazione del mandato: regole e sequenze in [decisioni consolidate](../Dimora-V5-ciclo-di-vita-consolidato.md). Questa revisione supera A-01 sulla permanenza dell’archivio dell’ex proprietario. Gli export sono JSON sintetici; nessun PDF reale.

## Revisione finale chiusa

I sette rilievi R2 sono corretti: bozze per persona/casa, report legati alla Home, destinazione Gift esplicita, 22 originali coerenti, nuova casa bloccata offline/errore, schede Gift confermabili e inviti sconosciuti senza fallback. 21 controlli automatici e 64 verifiche browser registrate. Le cinque sequenze finali sono nel documento guida ../DIMORA_V5_MASTER.md; verbale ../Dimora-V5-esito-revisione-finale.md.

La versione 2 dello stato viene migrata conservando i dati delle case. Le bozze ambigue precedenti sono ignorate. Le case cedute restano inaccessibili; le altre case dell’account si selezionano dal menu Casa nella barra demo quando presenti. Il Gift richiede una destinazione e una conferma esplicita; una scheda ricevuta resta in Da rivedere finché confermata. Per una prova pulita usa Ripristina demo.

## Validazione guidata — correzione v9.1
Il committente ha confermato la scomparsa delle verifiche e la persistenza dopo ricarica, poi ha segnalato il libretto ancora marcato «Da verificare». Corretto lo stato visualizzato in lista e dettaglio: «Dati estratti da verificare» se manca interpretazione, marca o modello; «Dati estratti confermati» solo quando tutte queste verifiche sono concluse. Nessuna certificazione dell'originale e nessuna modifica dei dati salvati. Cache applicazione aggiornata a v9.1.
Verifica sul codice: 22 controlli superati (21 regressioni precedenti e un controllo aggiuntivo per stato aperto/parziale/completo, lista/dettaglio, ricarica e documenti estranei). Le 64 prove browser del rapporto rimangono evidenze della v9, non nuove prove della v9.1.
SHA-256 app.js v9.1: 54A1258D1D876A2D8FB1868E2D4EE7EA71A0D7A9DFC8FBD1CBA55D8A3AB69F75

## Validazione guidata — accesso condominio v9.2
Il committente ha rilevato che l'accesso alla segnalazione dalla Casa dipendeva dal pulsante Leggi di una comunicazione. Ora il riquadro Dal tuo condominio espone sempre Vai al condominio e, per una casa collegata a uno studio attivo, Invia segnalazione. Le singole comunicazioni mantengono Leggi; nessuna lettura obbligatoria per segnalare. Nessun cambio ai dati salvati. Controllo sintattico e 22 controlli di regressione sul codice superati; verifica guidata visiva della nuova azione ancora da confermare. SHA-256 app.js: 90948DEEC59E1E9302F443D861EAE79D50A44469FEEE9BFDF4B3C55601FF7316

## Validazione guidata — invio segnalazione v9.3
Il committente ha inviato una segnalazione nuova e rilevato il pulsante Segnala comunque non pertinente. Ora l'azione è sempre Invia segnalazione. Il riquadro Comunicazioni del condominio chiarisce che i messaggi non sono abbinati automaticamente al problema e possono essere consultati facoltativamente. Nessun cambiamento alle segnalazioni salvate. Sintassi e 22 controlli di regressione sul codice superati; non dichiarata nuova verifica browser. SHA-256 app.js: F75863DCA6C224822CB552D39457D12A62635F4F613173759E5A8A051F639552

## Validazione guidata — comunicazioni leggibili in Home v9.4
Precisazione del committente: il contenuto della comunicazione condominiale deve apparire direttamente in Dal tuo condominio, indipendentemente dall'autore della segnalazione. Il riquadro ora mostra anche il testo pubblicato e autorizzato, senza aprire Dettagli. La chiusura privata di un report non viene pubblicata automaticamente: lo studio deve pubblicare una comunicazione di esito. Il blocco di aggiornamenti privati inizialmente proposto non è stato adottato. Restano invariati i destinatari e la separazione fra report privato e comunicazione. Sintassi e 23 controlli sul codice superati, incluso contenuto pubblico in Home, assenza delle note private e esclusione Scala B. Prova visiva guidata ancora da confermare. SHA-256 app.js: 658D02C254AFF53B21D47B239AC55C13838BD71CE5CE03E70DC85AF804D30231

## Validazione guidata — stato pubblico e icone v9.5
Scelta approvata dal committente: stato comunicato esplicito dello studio. Opzioni Comunicazione informativa, Preso in carico, Intervento programmato, Problema risolto; cerchio informativo, orologio, cerchio con spunta verde. Icona accompagnata sempre dalla dicitura. Stato mostrato in Home, Condominio, archivio pubblicazioni e manifesto. Salvato nella versione pubblicata e riproposto nelle rettifiche. Nessuna inferenza dal testo o dalla chiusura privata; comunicazioni legacy senza stato restano informative. Stato di pubblicazione e stato del problema sono campi distinti. 24 controlli sul codice superati, inclusi persistenza e rettifica. Nel browser del committente verificati nuova Home e selettore della rettifica v2; lasciata aperta la rettifica senza pubblicarla né assegnare automaticamente Problema risolto. SHA-256 app.js: 21DF7373E6858F0D4FEAE929CE05600681B3E690522574AE7DF29A8629965953
