# Home — arbitrato e correzioni, 16 ottobre 2026

## Stato e perimetro

Raccolto il commit Claude164e8fa come1792f20: soltanto audit, proposta della guida, demo e screenshot. Esclusi il suo dirty docs/v5/backend-status.md e video-promo/. Fetch origin eseguito: nessun aggiornamento remoto non integrato (HEAD171 avanti/0 indietro prima della raccolta); non esiste un branch main locale, quindi confronto eseguito con origin/main, senza crearne o modificarne uno. Dirty preesistente e legacy preservati.

L'audit è utile e sostanzialmente attendibile come valutazione esperta e collaudo locale. Non è ricerca con utenti medi reali: familiarità dell'autore con l'interfaccia, frequenza stimata dei problemi, clic via automazione e scenari sintetici limitano le conclusioni su abbandono e comprensione. Le prove di Claude sul browser sono sue evidenze, non tutte riprodotte da Codex. Nessun P0 dimostrato. Il costo di interazione del codice temporaneo non giustifica da solo di allungarne la validità.

## Verdetti sui 16 rilievi

B = browser reale Codex; C = codice letto da Codex; T = test frontend con backend simulato; S = specifica. Le osservazioni browser di Claude restano descritte nell'audit originale, preservato.

| HOME-CONS | Verdetto e natura | Base Codex | Priorità | Esito operativo |
|---|---|---|---|---|
| 001 | Confermato, orientamento di prodotto | B/C | P1 | Raccomandata scheda codice nella pagina senza case, prima del modulo casa. Nessun redirect automatico. Da applicare con il successivo assetto UX. |
| 002 | Confermato con riduzione, difetto di testo/contesto | B/C/T | P2 | Corretti testi generici e rimossa riga Caldaia se nessun assetLink. Nessuna API inversa aggiunta: mostrare l'oggetto collegato resta distinto. |
| 003 | Confermato con precisazione, difetto | B/C/T | P2 | Mappati motivi di indisponibilità, rimossi riferimenti alle sei chiamate/campagne dalle etichette modificate. Esempi visibili solo con fixture dichiarata attiva. La distinzione prova sintetica/AI reale deve restare esplicita: non eliminare ogni riferimento alla simulazione. |
| 004 | Confermato, difetto di interazione | B/C/T | P2 | Recupero del focus dopo rimozione del controllo: stato dell'attività, conteggio verifiche nella lista o titolo delle verifiche nella scheda. Stato/conteggio annunciabile. Nessun focus sottratto a un altro elemento già attivo. |
| 005 | Confermato, difetto di testo | C/T | P3 | Corrette etichetta di correzione, singolare registrazione, nota categorie pertinente, data italiana e visibilità Persone della casa. |
| 006 | Confermato con separazione | B/C/T/S | P1 | Difetto corretto: permessi futuri non elencati come azioni attive. Ordine di Casa e «Da fare ora» restano proposta UX da applicare dopo confronto con il committente. |
| 007 | Confermato, miglioramento di orientamento | C | P2 | Raccomandato avviso di condivisioni da confermare in Casa, senza contatore globale dedotto dalla sola prima pagina. Nessuna scansione automatica di tutte le pagine. |
| 008 | Confermato come rischio di comprensione, scelta di prodotto | C/S | P2 | Raccomandato aiuto nel tipo Riscaldamento verso la scheda caldaia. Non fondere oggetti manuali e dati tecnici come correzione nascosta. |
| 009 | Confermato con correzione della proposta, scelta UX | C | P2 | Semplificare solo il vero primo uso senza dati. Con filtri attivi o periodo vuoto conservare filtri e «Azzera»: zero risultati non dimostra che la casa sia vuota. |
| 010 | Rischio plausibile, non difetto del TTL | C/S | P2 per istruzioni | Conservati15minuti e protocollo. Raccomandato invitare la persona a preparare l'account prima di generare il codice. Abbandono/frequenza non misurati con utenti reali. |
| 011 | Proposta utile ma rinviabile | C | P3 | Ultima casa per account: non necessaria per chiudere i difetti di questo giro. Nessuna preferenza globale condivisa fra utenti. |
| 012 | Confermato con riduzione, scelta visiva | C | P3 | Chiudere eventualmente solo impronta/dettagli tecnici. Estratto, pagina, versione e apertura dell'originale devono restare facilmente disponibili durante la conferma. |
| 013 | Confermata la preselezione; scelta UX, non dato corrotto dimostrato | C | P3 | Proporre scelta esplicita del tipo o default Altro. Non cambiare retroattivamente gli oggetti esistenti. |
| 014 | Proposta successiva, non regressione dimostrata | C/S | P3 | Collegamenti inversi autorizzati documento/attività → oggetti da progettare separatamente. Evitare ricerca client su tutti gli oggetti. |
| 015 | Proposta successiva | C/S | P3 | Etichetta privata della consegna: richiede modifica di contratto, non introdotta in questo giro. |
| 016 | Proposta plausibile da validare | C | P3 | Dettagli delle bozze richiudibili senza nascondere importi, duplicati, consenso o fonti necessari alla decisione. Nessuna riprogettazione ora. |

## Correzioni applicate

Rilievo aggiuntivo **HOME-ARB-001 (P2, C/T)**: il riepilogo Da rivedere chiamava tutte le proposte «analisi di test» e mostrava un badge globale di simulazione anche con proposte Anthropic. Osservato sul codice; l'audit senza provider reale non lo evidenziava. Corretto in testo neutro, lasciando il provider effettivo su ogni proposta. Regressione aggiunta al percorso misto del harness M4, senza chiamate a provider reali.

Componenti e testo frontend soltanto; nessuna dipendenza nuova, backend, migrazione, modifica ai diritti o riavvio necessario.

- useUpdateFocus confronta risorsa/versione e interviene solo se il controllo rimosso ha lasciato il focus sul body. Non sposta il focus al primo caricamento, al cambio risorsa o quando l'utente è già su un altro controllo. Usato in attività, review e scheda caldaia. La cache server resta autorità; nessun successo ottimistico inventato.
- Attività senza collegamento M3 non mostrano «Caldaia: Nessuna caldaia collegata». Modulo e storia parlano degli oggetti/impianti in modo generico. Il selettore facoltativo delle schede caldaia resta tale: non finge di comprendere anche collegamenti G1 non forniti dalla API.
- disabledReason economico sconosciuto o libero non passa più nel testo della pagina; stesso principio per opzioni M4. I codici conosciuti hanno messaggi comprensibili, inclusi limiti di analisi distinti dai limiti monetari. Costi/consenso veri rimangono visibili; non è stato nascosto un addebito.
- Esempi M3 condizionati alla capability della fixture, compresa la compatibilità con il vecchio formato M3. Nessun flag locale può abilitare il provider. Non sostituire un errore di capabilities con «nessun dato».
- In Casa elenco ridotto ai permessi utilizzabili oggi e testi coerenti con contenuti personali. Gestione accessi/vendita restano esplicitamente future; modello/permessi del server invariati.

## Tre proposte da valutare insieme

1. **Casa orientata all'azione**: riepilogo utile in cima, scadenze/verifiche da gestire, ingressi per documento/spesa/oggetto; dati anagrafici e spiegazioni del ruolo in dettagli richiudibili. Non duplicare tutti i contatori delle sezioni né caricare in blocco ogni elenco per indovinare se una casa è vuota.
2. **Percorso destinatario distinto**: «Hai ricevuto un codice?» subito visibile senza creare una casa; inviti esistenti segnalati con numero esatto solo se il server/paging consente di conoscerlo. Mantenere anche l'ingresso alla creazione della propria casa.
3. **Guida breve in pagina, tre passi, saltabile e riapribile**: raccomandata rispetto a overlay bloccante o tour con frecce. Nel primo incremento solo preferenza locale per account/versione; nessuna analytics nuova e nessuna promessa di sincronizzazione tra dispositivi.

Guida: bene la distinzione Casa/Attività/Documenti/Spese e la scelta di una prima azione che non crea dati da sola. Prima dell'integrazione precisare «i tuoi nuovi caricamenti partono da Solo io» invece di una promessa generale su tutti i documenti già presenti. «Lo farò dopo» deve significare guida vista/chiusa, non azione prodotto completata. Un'eventuale misura di completamento deve distinguere fine lettura e prima azione; non aggiungere tracciamenti per inferenza. Nessun tour Home per destinatario senza case; aiuto consegne contestuale separato.

La demo resta una proposta separata in frontend-v5/docs/proposta-home-guida/dimora-home-guida.html. Codex ha verificato in browser passo1→2→3, focus sui titoli e scelte; non è UI di onboarding reale già integrata. Le23prove e gli screenshot mobile nella consegna sono evidenze di Claude. Non si dichiara conformità WCAG o collaudo con utenti reali.

## Prove e limiti

Build TypeScript/Vite e lint finali riusciti. Entry487,79kB/gzip148,72kB; nessuna nuova dipendenza. Log workspace outputs/Dimora-V5-Home-consolidamento-build.log e Dimora-V5-Home-consolidamento-lint.log.

Suite completa: **331/332** in28file; l'unico fallimento era una vecchia aspettativa di testo in s1c-consent («Nuova campagna non abilitata»). Aggiornata all'indisponibilità comprensibile, verificata assenza del testo interno: caso mirato **1/1 verde**, senza cambiamento del runtime. Log Dimora-V5-Home-consolidamento-finale.log e Dimora-V5-Home-consenso-mirato.log. Non dichiarare una seconda suite completa332/332 mai eseguita.

Dopo l'ultima correzione HOME-ARB-001: **42/42 verdi** nei file review e anthropic, comprendono focus dopo rimozione proposta, provenienza mista, provider spenti e fixture condizionata. Log Dimora-V5-Home-review-finale.log. Le altre aree del runtime finale non sono cambiate dopo la suite completa. Non si sommano i42 ai332 come casi diversi.

Prima verifica mirata:137/143, sei aspettative sul testo vecchio o sul messaggio quando tutti i provider erano spenti; riallineate senza aumentare timeout o cambiare regole di sicurezza. Lint iniziale ha segnalato propagazione della ref nell'oggetto props: risolta con destrutturazione, senza disabilitare regole. Prove mirate ripetute solo dopo queste correzioni. Backend/DB suite non ripetute: nessun cambiamento backend. Nessuna chiamata Anthropic, reset quota o modifica.env.

Browser reale Codex, account/casa nuovi e sintetici: creazione tramite UI, promemoria senza caldaia, completamento con stato e storia persistiti, focus osservato su DIV role=status «Completata da te / Chiusa». Apertura Nuova analisi: limite espresso senza dettaglio sulle sei chiamate; nessuna analisi avviata. Casa8f7fff10-910f-4593-bc23-6f89607f35ec, attività6de1cd95-0154-4a28-a6a0-b33f627e5f9d. Account `home-cons-20261016-001@example.test`; credenziale sintetica non inclusa nel report. Tentativo iniziale di accesso al vecchio mittente C1 non riuscito: non modificata/reset alcuna password, usata nuova fixture tramite registrazione locale. Nessuna conclusione sull'esistenza dei vecchi dati dedotta da quell'esito.

Evidenze nel workspace: outputs/Dimora-V5-Home-attivita-focus-20261016.png e outputs/Dimora-V5-Home-guida-revisione.png. Focus delle proposte in lista verificato nei test con backend simulato; non dichiarato riprodotto da Codex con una nuova analisi reale. Nessuna prova screen reader o dispositivo fisico in questo giro.
