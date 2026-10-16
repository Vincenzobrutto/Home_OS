# Home — arbitrato della rifinitura finale, 16 ottobre 2026

## Raccolta e attendibilità

Claude ha consegnato ef454e4, raccolto492622b, solo cinque artefatti autorizzati. Worktree Home-rifinitura pulito, baseline42a4b47;92112e1 successivo cambia solo test/documento. Nessuna sincronizzazione o codice esterno raccolti. Dirty preesistente preservato; fetch riuscito, origin/main non avanti al master.

Il report sostiene che non siano emersi P0/P1 nei tre scenari. Valutazione condivisibile nel perimetro provato, non certificazione di sicurezza o ricerca con utenti reali. Sono evidenze proprie di Claude le tre sequenze B-reale e la nuova consegna C1a completa; Codex non le dichiara riprodotte tutte. Claude distingue deduzioni, viewport via script e data/categoria con setter; questi ultimi passaggi non dimostrano usabilità dell'inserimento con tastiera. La frase «nessun DB toccato» della consegna va letta come nessun accesso/modifica diretta: i dati sintetici elencati sono stati realmente salvati tramite UI.

## Verdetti e decisioni

| ID | Verdetto | Natura / priorità | Decisione |
|---|---|---|---|
| HOME-FIN-001 | Confermato sulla descrizione e sul codice | Scelta UX,P2 | Nel backlog: distinguere il ritorno del destinatario senza casa dal primo accesso. La prima pagina dimostra solo presenza, mai assenza globale. In errore mantenere l'accesso all'elenco senza presentare il caso come «nessuna consegna». Nessun redirect né nuova lettura estesa implementati ora. |
| HOME-FIN-002 | Confermato con precisazione | Difetto,P2 | Corretto sulle quattro superfici. Recupero soltanto se il controllo ha lasciato il focus sul body; se un altro controllo è già attivo non spostarlo. Non basta «non body» come criterio: serve destinazione utile e percepibile. |
| HOME-FIN-003 | Confermato sul codice | Difetto di testo,P3 | Corretto «codice di verifica» in «codice di confronto», recapito noto. Protocollo invariato. |
| HOME-FIN-004 | Confermato come preferenza, non errore di navigazione | Scelta UX,P3 | Rinviato: le attuali etichette di pagina non promettono moduli che non aprono. Valutare azioni coerenti e promemoria durante la prova personale, evitando più comandi senza evidenza. Un parametro per aprire upload è scelta tecnica ordinaria, non richiede di per sé decisione del committente. |
| HOME-FIN-005 | Confermata posizione; impatto ipotizzato | Scelta UX,P3 | Rinviato: nessuna mancata conferma prima della scadenza misurata. Eventuale riga prioritaria condizionale da valutare insieme al riepilogo ricevute, senza duplicazioni o nuovo polling. |

HOME-CONS-009 residuo: evitare di equiparare conteggi aperti tutti zero a «nessun promemoria mai creato», oppure anno economico vuoto a «casa senza dati». Una futura semplificazione deve dire «nessun promemoria aperto» e «nessuna spesa attiva nel periodo», senza nuove scansioni. CONS012/013/014 restano rinvii facoltativi già registrati.

Scelta di chiusura: applicare difetti di interazione e terminologia; non aprire un'altra riprogettazione prima della prova con documenti personali. Nessuna guida, forecast o Agenzie sviluppata.

## Correzioni applicate

- Documenti: banner di upload riuscito focusabile e ref; dopo la chiusura del modulo focus sull'esito solo se rimasto sul body.
- Mittente e destinatario: useUpdateFocus sulla versione della singola consegna, target titolo pertinente; nessun focus al primo caricamento o se attivo un altro controllo. Stesso comportamento già usato per altre risorse.
- Codice rifiutato: dopo errore asincrono campo codice se editabile, oppure contenitore dell'errore se esito ignoto con modulo bloccato. Messaggio server associato al campo via aria-describedby. Nessun cambiamento di codice/TTL/consenso/idempotenza/permessi.
- Test estesi nei flussi esistenti; nuovo caso per non sottrarre focus durante upload a un controllo ancora attivo.

## Prove e limiti

Build e lint finali verdi. Entry490,24kB/gzip149,25; niente dipendenze o cambi API/backend. Log workspace outputs/Dimora-V5-Home-FIN-build-20261016.log e -lint-20261016.log.

Tre file mirati:43/44verdi inizialmente; falliva la simulazione del focus sul codice. jsdom mantiene il button disabilitato attivo e blur non riproduce il body osservato nel browser. Corretto il solo setup del test focalizzando esplicitamente body prima della risposta trattenuta. Prova finale2/2verde (codice errato e nuovo caso upload senza furto focus),37saltati intenzionalmente. In totale45casi distinti coperti positivamente nelle esecuzioni pertinenti: nessuna nuova suite completa45/45 o345/345 dichiarata. Conferma mittente e accettazione passate nel primo gruppo, compresi controllo body simulato e titolo finale, autorizzazioni ed esiti del flusso. Nessun timeout aumentato o controllo eliminato.

Log: outputs/Dimora-V5-Home-FIN-test-20261016.log e Dimora-V5-Home-FIN-focus-finale-20261016.log.

Browser Codex sul servizio reale, sessione sintetica già esistente:
- Upload della sola fixture invoice.pdf come «Prova focus upload · sintetica», privato; documento e2885207-ed48-4cc9-a9fc-ae14660e4105 nella casa8f7fff10. Focus osservato su DIV role=status «Documento caricato…», screenshot outputs/Dimora-V5-Home-FIN-upload-focus-20261016.png.
- Un solo codice volutamente non valido ZZZZZZZZZZ inviato nel normale modulo, consenso profilo esplicito. Risposta generica senza rivelazioni; focus osservato su INPUT codice. Nessuna nuova consegna o cambio destinatario.
- Conferma e accettazione dopo la correzione verificate da Codex nel harness, non riprodotte nel browser reale; il flusso reale precedente resta evidenza Claude.

Nessun dato personale caricato, AI a pagamento, modifica.env/quote/sicurezza, restart, push/main o DB legacy. Ulteriori scritture soltanto sintetiche tramite UI. Build/lint già verdi sulle modifiche runtime, non ripetere tutta la suite in assenza di nuovi difetti. Il report funzionale precedente e i suoi limiti restano validi.

## Prossimo passo per la prova personale

Prima dei documenti veri: preparare backup coerente del DB V5 dedicato e degli originali, verificarne il ripristino in una destinazione temporanea isolata, poi creare tramite normale UI un account del committente separato dai dati di prova. Questa preparazione **non è stata eseguita in questo incarico**. Avviare carichi piccoli Solo io, conservando originali esterni. Nessun invio dei documenti personali ad Anthropic finché non siano concordati file e budget. Non chiedere password o chiavi nella chat.

La raccolta Claude è conclusa, nessun altro incarico/background attivo per inferenza. Non serve assegnargli una nuova revisione generale prima della prova personale.
