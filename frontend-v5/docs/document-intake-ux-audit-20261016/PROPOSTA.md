# Proposta — flusso Documenti

Due alternative concrete, la raccomandazione e i criteri di accettazione. **Nessuna modifica alla specifica approvata:** le voci che la toccano sono marcate «decisione del committente». I rilievi R1–R8 sono in `REPORT.md`.

**Obiettivo per il proprietario:** «carico i miei documenti e li ritrovo al posto giusto», con il minimo di passaggi e senza dover capire il modello interno. Restano fermi tutti i vincoli già decisi:
- originale unico e privato;
- nessun oggetto o costo implicito;
- consenso esplicito alla sostituzione;
- conferma parziale;
- esiti incerti senza reinvio.

## Alternativa A — Stesso flusso, meno passaggi e una conferma sola

Si tiene l'architettura attuale (lotto, revisione per file, conferma selettiva) e si tolgono gli attriti.

1. **Analisi locale automatica.** Con il solo motore locale e gratuito, l'analisi parte da sola quando l'originale è acquisito. La casella di consenso resta solo per un motore esterno o a pagamento (R2).
2. **Un solo verbo per confermare.** Nel dialogo il pulsante principale diventa **«Conferma questo documento»** e applica subito l'organizzazione di quel file.
   - Il riepilogo multiplo resta come scorciatoia «Conferma tutti i pronti (N)» per chi ha rivisto molti file.
   - «Salva e decidi dopo» diventa un'azione secondaria (R1).
3. **Il dialogo inizia dalla decisione** (R5):
   - in alto proposta, nome e destinazione;
   - le fonti come riga compatta «Trovato a pagina 1: "ATTESTATO DI PRESTAZIONE…"» con un link all'anteprima;
   - su mobile l'anteprima diventa una sezione apribile;
   - il pie' si riduce a due azioni («Conferma questo documento» e «Più tardi»), con «Chiudi» in alto.
4. **Azioni visibili su mobile.** Il pulsante che porta avanti sta in fondo allo schermo, fisso, oppure subito sotto il titolo (R1, R2).
5. **Parole del proprietario** (R4):

   | Oggi | Proposta |
   |---|---|
   | lotto | «caricamento del 16 ottobre» / «documenti caricati insieme» |
   | Originale acquisito | «Caricato» |
   | Usa solo il riferimento all'originale esistente | «È lo stesso file che hai già: tienilo com'è» |
   | Organizza il documento esistente | «È lo stesso file: aggiorna come è archiviato» |
   | Riorganizza senza ricaricare | «Correggi come è archiviato» |
   | Nuovi oggetti / spese 0 / 0 | «Non verranno create schede né spese» |

   Le rassicurazioni compaiono una volta, accanto al momento della scelta.
6. **Correzione da Documenti** (R6). Nel dettaglio documento c'è «Correggi tipo e nome». Nel filtro «Da organizzare» c'è «Organizza questi documenti» sulla selezione. Entrambi usano l'endpoint `batches/from-documents`, che esiste già.
7. **Selezione con un file fuori limite** (R7). I file validi si caricano. Quello escluso viene nominato con la causa: «Scansione_2019.pdf: 34 MiB, il massimo è 20 MiB».
8. **Recupero** (R8):
   - un solo avviso per ogni evento, con una sola azione;
   - il file da riselezionare viene nominato («Scegli di nuovo "Verbale_assemblea.pdf"»);
   - i PDF di esempio escono dal prodotto e restano nell'harness o nella documentazione.

**Costo stimato:** soprattutto UI e container. Le dipendenze sono nella tabella più sotto.

## Alternativa B — Senza «lotto»: si carica in Documenti e si conferma in una coda

Il concetto di lotto sparisce dall'interfaccia (resta tecnico).

- «Carica documenti» aggiunge subito i file all'archivio come **«Da confermare»**.
- In cima a Documenti compare la coda **«3 documenti da confermare»**, una scheda alla volta:
  - proposta in grande;
  - **Conferma** / **Correggi** / **Più tardi**;
  - avanzamento «2 di 3».
- Copie e scansioni compaiono nella stessa coda con la domanda giusta: «È lo stesso file che hai già» oppure «Che documento è?».
- **Pro:**
  - un solo luogo, Documenti, con un modello mentale semplice («ho dei documenti da confermare»);
  - ripresa naturale dopo un reload o il giorno dopo;
  - anche il «Da organizzare» storico entra nella coda.
- **Contro:**
  - richiede un elenco degli elementi in attesa **trasversale ai lotti** e un aggancio stabile fra documento e revisione (contratto);
  - ridisegna l'ingresso approvato nel mockup;
  - è più lavoro e più rischio di regressione.

## Raccomandazione

**Alternativa A adesso, con il punto 6 come ponte verso B.**

**Perché:**
- Risolve i tre rilievi ad alta gravità (R1, R2, R3) senza toccare il modello dati o le garanzie già collaudate.
- Riusa endpoint esistenti.
- Lascia aperta B: se i test con utenti mostrano che «lotto» e «Lotti salvati» restano un ostacolo, la coda di B si costruisce sopra la correzione da Documenti del punto 6.

**Effetto atteso sul conteggio (stima da verificare):** per un APE singolo da 11 a **5 interazioni**:

1. Carica documenti
2. Scelta del file
3. Rivedi
4. Conferma questo documento
5. Vai ai Documenti

## Percorso felice (A)

1. Documenti → **Carica documenti** → scelta di 3 PDF.
2. Righe «Caricamento…» → «Caricato» → «Proposta pronta». L'analisi parte da sola, una pagina dice «Stiamo leggendo i documenti: puoi già iniziare».
3. Prima riga → **Rivedi**: in alto «Attestato di prestazione energetica · Energia · Solo alla casa» e «Trovato a pagina 1» → **Conferma questo documento**. La riga diventa «Archiviato in Energia».
4. Ripetere per le altre righe, oppure **Conferma tutti i pronti (2)** dopo averle aperte.
5. A lotto finito: «3 documenti archiviati. Vai ai Documenti». Il link apre il filtro della raccolta usata.

## Casi difficili (A)

| Caso | Comportamento proposto |
|---|---|
| Copia identica | Domanda unica «È lo stesso file che hai già (APE_Casa.pdf)». Azioni «Tienilo com'è» / «Aggiorna come è archiviato». Se cambiano titolo o tipo, resta la casella di consenso alla sostituzione |
| Scansione o immagine | «Non riusciamo a leggere il testo: dicci che documento è». Il menu del tipo è in primo piano, il nome è precompilato dal tipo e modificabile, la destinazione «Solo alla casa» è preselezionata solo se la specifica lo consente (decisione del committente) |
| Più contenuti nello stesso PDF | Elenco «Questo PDF contiene: CILA (pag. 1–10), Agibilità (pag. 11–14)» con «Modifica» per ciascuno; le pagine sono visibili, non nascoste in `details` |
| Destinazione ambigua | Resta senza preselezione. La domanda è in alto: «A cosa si riferisce questo schema?» |
| Conflitto con dati confermati | Invariato (consenso esplicito), ma con il confronto «Prima / Dopo» su due righe |
| Esito incerto | Un solo avviso nel punto dell'azione: «Non sappiamo se è stato salvato. Controlla», nessun reinvio. La pagina intera non si ricarica |
| File fuori limite | Escluso singolarmente e nominato; gli altri proseguono |
| Ricevuta | «Questa è una ricevuta: vuoi registrare la spesa?». L'azione porta al percorso ricevuta; archiviarla soltanto resta possibile |
| Ruolo in sola lettura | Invariato |

## Schermate e azioni

**Da conservare:**
- stati per file con testo;
- filtri del lotto con conteggi;
- fonti con pagina;
- consenso alla sostituzione;
- esito per file;
- «Più tardi»;
- protezioni su esiti incerti e cambio di contesto;
- dialogo accessibile da tastiera.

**Da eliminare o ridurre:**
- casella «Autorizzo l'analisi» per il motore locale;
- il passaggio obbligatorio riepilogo → casella → conferma: diventa una scorciatoia facoltativa;
- «Chiudi senza modificare» duplicato nel pie';
- i banner duplicati del container;
- «PDF sintetici per provare il percorso» nel prodotto;
- «Lotti salvati» come elenco di date, sostituito da «Caricamenti da completare (N)».

## Dipendenze

| Modifica | Solo UI / container | Contratto o backend | Decisione del committente |
|---|---|---|---|
| Analisi locale automatica | Container: avvio dopo l'acquisizione | Nessuna (endpoint `analyses` esistente) | Sì: oggi la specifica chiede «Analisi esplicita» |
| «Conferma questo documento» | Container: review e poi confirmations per 1 elemento, con chiavi stabili e recupero combinato | Possibile endpoint unico «salva e conferma» per l'atomicità; senza, servono due richieste con gestione dell'esito intermedio | Sì: la specifica descrive riepilogo e conferma |
| Dialogo con la decisione in alto e pie' ridotto | Sì | — | — |
| Parole del proprietario | Sì | — | Revisione dei testi |
| Correzione da dettaglio e da «Da organizzare» | Pagine Documenti + navigazione al lotto preparato | `from-documents` esiste già | — |
| File fuori limite escluso singolarmente | Container (filtro e messaggio per file) | Da verificare: rifiuto per elemento del manifest | — |
| Un solo avviso per gli esiti incerti | Container + componente | — | — |
| Rimozione dei PDF di esempio dal prodotto | Container | — | — |
| Coda trasversale (B) | — | Elenco degli elementi in attesa fra i lotti | Sì |
| Nuova versione di un documento (D6) | — | Relazione fra versioni | Sì, fuori da questa fase |

## Criteri di accettazione (A)

Ogni criterio si verifica nell'app reale, con un account di collaudo e PDF sintetici, a 1280, 390 e 320 px.

1. **APE singolo:** da Documenti all'archiviazione in Energia in **≤ 5 interazioni** (conteggio come in `MATRICE.md`), senza scrivere nulla.
2. **Analisi automatica:** dopo il caricamento di 3 PDF testuali, senza azioni ulteriori, ogni riga arriva a «Proposta pronta» o a uno stato che spiega perché no.
3. **Una sola conferma:** dopo «Conferma questo documento» il documento compare nel filtro della raccolta **senza altri passaggi**. Una scelta solo salvata è distinguibile a colpo d'occhio, con testo e non solo colore, da una archiviata.
4. **Mobile:** a 320 × 640 e a 390 × 844 la proposta (tipo e destinazione) e il pulsante di conferma sono visibili **senza scorrere** all'apertura del dialogo di un PDF con una parte.
5. **Selezione con un file troppo grande:** con 5 file validi e 1 da 25 MiB, i 5 vengono caricati e il messaggio nomina il file escluso e il limite.
6. **Correzione senza ricaricare:** dal dettaglio di un documento confermato si arriva al dialogo di correzione in ≤ 2 interazioni. La correzione chiede il consenso se cambia titolo o tipo e non crea un nuovo originale (verificato via hash).
7. **«Da organizzare»:** selezionati 2 documenti, «Organizza questi documenti» apre la loro revisione. Nessun documento cambia senza conferma.
8. **Esito incerto** di conferma e di salvataggio: **un solo** avviso visibile e una sola azione di verifica; nessuna richiesta duplicata (verificato nei log di rete).
9. **Linguaggio:** nelle schermate del flusso non compaiono «lotto», «acquisito», «riferimento all'originale», «organizzazione» come termini senza spiegazione (controllo testuale automatico sulle stringhe).
10. **Invarianti non regrediti:** test esistenti verdi su consenso alla sostituzione, conferma parziale, contesto, fonti revocate, nessun oggetto o costo implicito, Condominio senza condivisione.
11. **Test con persone (ipotesi di R1–R5):** almeno 4 proprietari su 5 portano 1 PDF e poi 6 PDF sintetici allo stato archiviato senza aiuto.
