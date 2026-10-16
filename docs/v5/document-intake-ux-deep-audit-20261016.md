# Documenti — audit approfondito e confronto Codex / Claude

16 ottobre 2026. Comportamento applicativo baseline 7ea6700; commit successivi solo documentali. Nessuna modifica al codice, alla specifica approvata o alle configurazioni. Sono stati creati soltanto dati sintetici nell'account di collaudo esistente, file di prova e rapporti. Nessun documento personale usato nelle nuove prove.

## Esito

Le garanzie funzionali provate reggono: originali integri, deduplica, privacy, scelte persistenti, conferma parziale, sostituzione esplicita e recupero di errori. L'usabilità richiede invece interventi: azioni che salvano una bozza sembrano definitive, stato dell'analisi poco aderente all'aiuto disponibile, chiusura ambigua, ingresso e recupero troppo frammentati. Non emergono motivi per riscrivere il backend o rinunciare alle protezioni.

Non si dichiara di avere provato ogni combinazione possibile: la matrice Claude contiene 58 scenari pairwise/ad alto rischio, alcuni restano dedotti o da verificare. Le prove sotto distinguono browser reale, test UI simulati, API/DB e parser. Non sostituire questa distinzione con «tutto collaudato».

## Esecuzioni di questa sessione

| Livello | Prove e risultato | Limite |
|---|---|---|
| UI/container/ricerca | 70 test verdi in 8 file: `src/document-intake`, `src/intake-integration`, `routes/documentSearch.test.tsx` | jsdom e trasporto simulato, non prova visiva o server reale |
| Regole/parser | 10 test verdi, `document-intake.test.cjs` e `intake-classifier.test.cjs` | PDF sintetici e parser locale, nessuna AI esterna |
| API/DB | 39 test verdi: manifest, upload, organizzazione, analisi; DB locale verificato 127.0.0.1:55432/dimora_v5_product_dev | Storage simulato in queste suite, errori/race iniettati nei test |
| Browser/app/storage | Chrome con account Collaudo C1 Mittente e casa sintetica; nuovi PDF fisici e scanner/storage del prodotto | Nessun test con persone; rete persa/revoche/concorrenza provate dalle suite, non interrompendo rete o permessi reali |
| Mobile | Flusso eseguito a 390×844 e riepilogo/conferma a 320×740; misure DOM a 320 senza overflow orizzontale; Tab verso un campo e focus visibile | Viewport simulato, non telefono fisico; catture Chrome instabili in alcuni casi, non dichiarare tutte le immagini valide |

Log fuori Git: `outputs/intake-deep-audit-{frontend,offline,db}.log`. Evidenze nuove: `outputs/intake-deep-audit-20261016/`. Non sono state ripetute build/lint perché non è cambiato codice. Le suite sono state eseguite una volta per la nuova campagna di audit, senza ripetizioni verdi.

## Percorso reale eseguito

1. Documenti della casa sintetica → Carica documenti → selezione di **un APE**. Verificato input multiplo, upload acquisito e URL persistente.
2. **Aggiunta di altri otto file** allo stesso lotto: multiparte APE+CILA+agibilità, schema impianto, regolamento, ricevuta, testo ignoto, PDF senza testo, visura non certificativa e copia byte-identica dell'APE. Vecchio file conservato; copia riconosciuta. Il PDF vuoto coincide anche con un precedente originale sintetico: gestito come copia, non come nuovo documento.
3. Consenso e **analisi locale dei nove elementi**. Fonti e tipi proposti per i casi riconosciuti; schema da scegliere; testo ignoto pronto ma senza proposta; PDF vuoto non leggibile, pur mantenendo in lista lo stato prevalente di copia.
4. APE: proposta titolo/tipo e raccolta Energia già visibili nel dialogo; salvataggio produce «Scelta pronta», non organizzazione applicata.
5. Multiparte: tre tipi preselezionati, raccolte Energia e Pratiche edilizie, originale unico. Su mobile l'originale e gli estratti precedono i campi; Tab raggiunge le selezioni, senza overflow DOM osservato.
6. Schema: tentativo di salvare senza destinazione respinto; elenco schede consultato (include un oggetto non pertinente: non sono raccomandazioni di matching), poi scelta Solo alla casa e salvataggio.
7. Regolamento salvato per la casa; ricevuta rimandata. Verificata presenza del passaggio dedicato alla ricevuta, senza avviarlo né creare costi/oggetti.
8. Testo ignoto: titolo inizialmente vuoto, aggiunta contenuto Altro documento e destinazione casa manuali. Il documento compare poi in «Da organizzare» pur essendo confermato: semantica della raccolta da chiarire.
9. PDF senza testo già presente: scelta Organizza il documento esistente, titolo e tipo SCIA manuali, nessuna fonte inventata. È classificazione sintetica scelta dall'auditor, non risultato automatico di lettura.
10. Visura: proposta corretta «Visura agibilità (non certificato)». Modifica del titolo → «Chiudi senza modificare» → riapertura: **la modifica resta nella bozza locale**. Poi titolo ripristinato e scelta salvata. Nessuna prova di scrittura dell'organizzazione prima della conferma: la contraddizione è tra etichetta e conservazione della bozza.
11. Copia APE: nessuna scelta duplicato preselezionata, poi riuso esplicito; stato «Originale riusato · organizzazione invariata». Ricaricamento della pagina conserva scelte, rimando e riuso, ma riporta alla schermata lotto.
12. Riepilogo: sette scelte pronte; schema escluso e ricevuta già rimandata. Conferma effettiva di **sei scelte** da viewport 320px. Esito: sei organizzati, due da rivedere; copia già riusata separatamente.
13. Archivio: verificati filtri Energia, Pratiche edilizie e Condominio. Multiparte nelle due raccolte; regolamento Solo io; un solo originale APE; titolo manuale conservato.
14. APE confermato → Riorganizza senza ricaricare: nuovo lotto di una fonte esistente. Cambio titolo senza consenso bloccato, Mantieni ripristina il titolo, sostituzione esplicita poi conferma applicano il nuovo titolo. Nessun nuovo originale.
15. Nuova selezione **PDF valido + file zero byte**: intera selezione respinta, nessun nuovo lotto, messaggio generico sui limiti senza indicare il file vuoto. Conferma reale del rilievo R7 di Claude.
16. Nuova selezione **PDF valido + falso PDF con byte non PDF**: lotto creato, valido deduplicato e file corrotto fallito separatamente. I file buoni non vengono ripetuti. Il messaggio globale non nomina il file; la riga offre retry. Nessuna modifica per migliorarlo fatta ora.

## Verifica dati sintetici dopo il percorso

Controllo readonly con guard DB e scope esatto della casa/account sintetico, script `outputs/intake-deep-audit-20261016/verify-synthetic.cjs`, risultato `verification.json`:

- Lotto principale `6e9c98b8-1c2e-4e2c-88ec-240f8420ded3`: 9 elementi, **8 fonti distinte**, due righe duplicate (una riferita a un originale preesistente).
- Byte fisici delle otto fonti confrontati con hash ammessi del corpus: integri; tutte private.
- 9 job locali, 6 organizzazioni confermate; multiparte con raccolte energy/building, visura agibility_record/building, scansione manuale scia/building.
- Un oggetto e una spesa preesistenti restano tali, nessun nuovo oggetto o costo dal percorso.
- Due elementi principali ancora da lavorare: schema salvato ma non applicato e ricevuta rimandata. È uno stato intenzionale della prova parziale.
- Lotto di correzione `d3e6713c-ab96-47cd-b1df-011830b903c4` completato, titolo APE corretto verificato nel DB.
- Lotto errore fisico `9be5531e-a63d-4833-8a6e-850805dc820a` conserva la copia e la riga fallita; non cancellato né riprovato in automatico.

## Copertura per combinazioni e lacune

R = eseguito nell'app reale questa sessione; T = test automatici eseguiti questa sessione; H = misure harness di Claude; C = lettura del codice/contratto soltanto. Le combinazioni sono selezionate per rischio, non tutte le permutazioni.

| Combinazione | Prova | Esito / limite |
|---|---|---|
| Singolo → aggiunta multipla persistente | R + T | Stesso lotto, solo nuovi file acquisiti |
| Drag&drop singolo/multiplo | T | Callback File corretta; non simulato trascinamento nativo in Chrome |
| Limiti manifest/numero/byte concorrenti | T | Rollback/quote atomiche; non tutti i limiti ripetuti nel browser |
| Valido + zero byte | R | Tutto rifiutato con messaggio non specifico |
| Valido + errore sui byte fisici | R + T | Stato per file, valido preservato |
| Copia nello stesso lotto e contro archivio | R + T | Stesso originale, nessuna deduplica da nome |
| Copia con Altro e proposta migliore | T | Draft da proposta, dati confermati protetti |
| Copia con organizzazione uguale/diversa | T + R sulla riorganizzazione | Confronto/consenso; non ripetute tutte le varianti di copia nel browser |
| Nome uguale, contenuto diverso / nuova versione | T per matcher hash, C per UX | Nessuna funzione esplicita di versione validata; proposta futura separata |
| APE e titolo dal testo | R + T | Raccolta Energia, fonte vera |
| Visura che menziona certificati | R + T | Non proposta come certificato |
| PDF multiparte e raccolte diverse | R + T | Un originale, più raccolte |
| Parti manuali/range invalidi/modifica proposta | T + R manuale semplice | Validazioni e conservazione parti; range complessi non ripetuti a mano |
| Tipo ignoto | R + T | Editor manuale, ma badge «Pronto» ambiguo |
| PDF senza testo e immagini non analizzabili | R per PDF, T per non-PDF | Manuale senza fonti; OCR non disponibile |
| Documento caricabile ma oltre limiti parser | T per bounded parser/regole, C per UX | Non caricato un PDF reale di 30 pagine in questa sessione |
| Schema senza selezione/destinazione casa | R + T | Nessuna associazione arbitraria |
| Una/più schede e versioni/permessi target | T; R elenco reale una scheda | Non creati nuovi oggetti solo per moltiplicare candidati |
| Regolamento e privacy | R + T | Classificazione non condivide |
| Ricevuta con oggetto/costo già presenti o assenti | T + R passaggio/rimando | Nessuna nuova estrazione o chiamata provider |
| Chiudi/riapri bozza ed Esc/focus | R per chiusura e Tab, T per focus trap/Esc | Etichetta chiusura incoerente con bozza conservata |
| Conferma totale/parziale/rinvio/reload | R + T | Sei applicati, escluso/rimandato riprendibili; correzione singola completata |
| Consenso sostituzione/mantieni/versione cambiata | R primi due + T versione | Nessuna sovrascrittura silenziosa |
| Fonte o membership revocata, ruolo sola lettura | T | Redazione/blocco verificati senza cambiare permessi reali |
| Risposta persa/lease/concorrenza/late response | T | Recupero/replay e isolamento, non disconnessa la rete del PC |
| Mobile 320/390, desktop | R + H | DOM e azioni reali; screenshot alcuni scartati per cattura inaffidabile |
| Screen reader, contrasto, telefono fisico, persone | Non eseguito | Nessuna conformità WCAG o comprensione senza assistenza dichiarata |

## Nuovi rilievi e rettifiche rispetto alla prima analisi

### Evidenze visive accettate di questa sessione

Le immagini sono fuori Git, nel workspace locale. Le schermate rappresentano i passi indicati, non l'intera matrice di errori. Le prime catture mobile compresse e la cattura del riepilogo con ripetizioni di viewport sono state scartate come evidenze visive; le verifiche DOM e l'esecuzione delle azioni rimangono distinte.

![Passo 1 — ingresso reale nella casa sintetica](../../../outputs/intake-deep-audit-20261016/01-ingresso.png)

![Passo 2 — file acquisiti e analisi locale esplicita](../../../outputs/intake-deep-audit-20261016/02-lotto.png)

![Passo 3 — proposte del lotto misto](../../../outputs/intake-deep-audit-20261016/03-proposte-miste.png)

![Passo 4 — originale e proposta APE affiancati](../../../outputs/intake-deep-audit-20261016/04-revisione-ape.png)

![Passo 5 — campi multiparte raggiunti da tastiera su mobile](../../../outputs/intake-deep-audit-20261016/06-multiparte-campi-390.png)

![Passo 12 — esito parziale su layout mobile](../../../outputs/intake-deep-audit-20261016/08-esito-parziale.png)

![Passi 13–14 — archivio sintetico e correzione applicata](../../../outputs/intake-deep-audit-20261016/15-archivio-finale.png)

### Rilievi

1. **Alta — salvare non è applicare.** Confermato nell'app; serve un verbo coerente con l'effetto. È il principale punto comune con Claude R1/R3.
2. **Alta — lo stato non dice quale aiuto è disponibile.** File testuale ignoto etichettato pronto ma con titolo vuoto e nessun tipo; copia senza testo nasconde in lista lo stato dell'analisi. Distinguere stato upload, aiuto disponibile e lavoro residuo con una priorità comprensibile.
3. **Alta — un file invalido blocca la selezione senza identificarlo.** Confermato con zero byte. Per gli errori fisici successivi l'indipendenza per file funziona: non generalizzare il difetto a tutti gli errori.
4. **Media — chiusura ambigua.** «Chiudi senza modificare» conserva la modifica locale fino a riapertura; scegliere tra «Chiudi, conserva bozza» e vero «Scarta modifiche», senza due promesse incompatibili.
5. **Media — stato concluso e raccolta residua ambigui.** «Da organizzare» include Altro confermato. Esito con zero rimanenti conserva «Riprendi le decisioni rimaste». Lotto riaperto mostra analisi di zero file. Separare «Altro» da «Da rivedere», oppure spiegare esplicitamente la semantica senza promettere una coda inesistente.
6. **Media — mobile mette il controllo dopo una lunga anteprima.** Osservato e coerente con misure Claude. Proposta/destinazione e azione vanno rese raggiungibili prima, conservando l'originale consultabile.
7. **Media — modifica dal documento.** Confermata la necessità di tornare alla storia dei caricamenti per la correzione; azione dal dettaglio può riusare l'endpoint esistente.
8. **Leggibilità righe.** Difetto visto nella precedente cattura reale a larghezza intermedia, soprattutto su confermati con due pulsanti. Non riprodotto nelle righe semplici a desktop largo: testare esplicitamente larghezze intermedie e nomi lunghi, non dire che tutte le righe sono rotte.

Rettifica importante al primo audit: il dialogo corrente **mostra già la raccolta sotto ciascun tipo proposto**, e il riepilogo mostra i conteggi per raccolta. UX-05 va quindi ridotto a continuità dopo conferma/leggibilità dei conteggi multiparti, non implementato come informazione completamente mancante. Il riconoscimento della visura ha funzionato nella prova reale. Non diagnosticare un errore di classificazione dove la scelta era riuso senza applicazione.

## Consegna Claude raccolta

Claude ha dichiarato PRONTO il commit `b37aa72`, raccolto nel master come **a772354**. Solo 4 documenti e 3 screenshot sintetici in `frontend-v5/docs/document-intake-ux-audit-20261016/`, nessun sync/codice. Checkout verificato pulito. La consegna documenta 58 scenari e misure su componenti reali con container finto; non ha aperto l'app reale per un blocco permessi. Non trattare le sue misure come prove su API/DB. Non ha letto l'audit Codex, mantenendo indipendenza. Non inviate nuove istruzioni a Claude.

## Confronto e proposta da validare

| Tema | Convergenza / differenza | Raccomandazione Codex dopo le prove |
|---|---|---|
| Bozza/conferma | Entrambi: «Usa» è ambiguo e il singolo PDF paga troppi passaggi | Un'azione che si chiama Conferma deve applicare; eventuale solo draft deve chiamarsi Salva scelta |
| Area di lavoro | Codex preferiva lista unica per caricamento; Claude A mantiene il contenitore, B propone coda trasversale più costosa | Area unica per i documenti appena caricati, niente coda trasversale ora; riusare modello persistente esistente |
| Singolo/multiplo | Claude preferisce conferma immediata per file e riepilogo opzionale; prima proposta Codex privilegiava applicazione finale del lotto | Prototipare conferma del singolo dal dialogo; per più documenti consentire scelte salvate e applicazione esplicita dei soli rivisti. Evitare «Conferma tutti i pronti» se pronti significa solo analizzati |
| Analisi locale | Claude raccomanda autostart; Codex non lo aveva incluso nella prima preferenza | Ha senso proporlo, dopo approvazione dell'emendamento all'attuale analisi esplicita. Solo locale gratuito e dichiarato; provider esterno mai avviato per equivalenza implicita |
| Copie | Entrambi: rendere la scelta centrata sul risultato | «Mantieni com'è» / «Aggiorna titolo e tipo», originale unico garantito; confronto dati attuali/proposti e consenso sostituzione invariati |
| Mobile | Entrambi: ridurre anteprima iniziale e conferme lontane | Decisione in alto, originale espandibile o alternabile; azione principale raggiungibile. Non obbligare a leggere tutti gli estratti prima dei campi |
| Pagine multiparte | Claude propone maggiore visibilità; utente aveva approvato pagine facoltative | Mostrare i riferimenti già rilevati; editor pagine facoltativo, espandibile. Non ripristinare campi sempre aperti per un semplice documento |
| Errori/ripresa | Entrambi: un messaggio e una prossima azione precisa | Nominare file problematico; validi proseguono dove possibile; unico recupero, nessun reinvio automatico su esito incerto |
| Documenti già archiviati | Entrambi: correzione direttamente dall'archivio/dettaglio | «Modifica organizzazione» dal documento, preparazione revisione nascosta come dettaglio tecnico |
| Materiale dimostrativo | Entrambi: distrae dal lavoro personale | Spostarlo in aiuto/area di prova in una successiva modifica approvata |

### Ordine proposto, senza implementazione

1. Validare il modello di conferma e l'avvio locale: sono decisioni di comportamento, non semplici rinomine.
2. Un mockup sintetico compatto del singolo documento e del lotto misto, con duplicato/ignoto/conflitto e telefono, per confrontare il percorso scelto.
3. Migliorie prioritarie: stato onesto, conferma coerente, file invalidi nominati, layout leggibile e correzione dal dettaglio.
4. Integrazione dopo approvazione, mantenendo idempotenza/versioni/consenso/recovery. «Salva e conferma» richiede gestire due richieste e lo stato intermedio o un contratto atomico dedicato: non chiamarlo modifica solo grafica.
5. Prova con alcune persone non guidate e telefono reale prima di dichiarare l'usabilità consolidata.

Rimandare coda globale tra caricamenti, gestione esplicita delle nuove versioni, OCR e AI esterna: non introdurli per risolvere problemi di testo/layout. Nessun cambiamento prodotto applicato in questa consegna.
