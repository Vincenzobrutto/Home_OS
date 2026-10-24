# Schede di compilazione — allineamento della presentazione al prototipo: piano, 24 ottobre 2026

Lotto Claude sul branch `claude/schede-presentazione-20261024`, dal consolidamento `2ab7570`. **Solo piano, in attesa di approvazione del committente: nessun codice scritto.** Revisione affidata a Codex.

Parte dal flusso a schede di Codex, già integrato ([PR #23](https://github.com/Vincenzobrutto/Home_OS/pull/23), [report](compilazione-schede-default-20261024.md)). La logica resta quella: passaggi, salti, convalide, unico salvataggio finale, ritorno alla pagina unica e parità del payload. Il committente preferisce la presentazione del prototipo Claude («Compilazione documento a schede»); questo lotto porta quella presentazione nel prodotto. [Specifica della proposta](compilazione-a-schede-proposta-20261024.md).

## Differenze da colmare

Rilevate sul backend simulato `mock-api --compilation` (demo sintetica a tre articoli), rotta `documenti/:id/oggetti`, confrontata con il prototipo.

| # | Oggi | Prototipo |
| --- | --- | --- |
| D1 | Il contenuto del passaggio sta direttamente nella pagina; piede separato | Una scheda unica per passaggio: riquadro con titolo, spiegazione, campi e piede |
| D2 | Barra con riquadri «3. Articolo 1» su più righe; nessuno stato fatto o da fare | Pastiglie con numero o spunta; corrente evidenziato, fatti cliccabili, da fare tratteggiati; «Articolo 1 di 2» |
| D3 | Titolo generico («Contenuto»), riga «Passo 2 di 7 · Contenuto» ripetuta, frase «Nessun dato viene registrato…» in cima | Piccola etichetta del passaggio, titolo a domanda («Cosa contiene la fattura?»), una riga di spiegazione; la frase sul salvataggio solo nel Riepilogo |
| D4 | «Torna alla pagina unica» come pulsante in evidenza sopra i passaggi | Link secondario in testata |
| D5 | Rotta autonoma: originale come link e riquadro chiuso in fondo | Pannello affiancato e richiudibile, come già nello spazio di lavoro documenti |
| D6 | Piede: «Salva bozza ed esci», «Indietro», «Avanti» tutti a sinistra | «Indietro» a sinistra; a destra «Passaggio N di M» e il pulsante principale; «Salva bozza ed esci» in testata |
| D7 | Contenuto: radio visibili dentro pulsanti, scelte in colonna su telefono | Pulsanti a scelta singola (`aria-pressed`) e frase su cosa succederà, come oggi nel testo |
| D8 | Riepilogo: testo di `SaveSummary` più una fila di «Modifica Documento», «Modifica Contenuto», … | Un blocco per area (Documento, Oggetti, Spese, Esclusi, Contatti), ognuno con il proprio «Modifica» |
| D9 | Telefono: stessa barra su più righe, piede non fisso | «Passaggio 3 di 6 · Articolo 1 di 2» con barra a segmenti; piede fisso con «Avanti · Articolo 2» |
| D10 | Scheda articolo: `ItemEditor` completo, con riquadri grigi e icone «i» | Campi essenziali in vista, il resto in «Altri dati facoltativi» |

## Perimetro

**Dentro**, solo presentazione:

- `frontend-v5/src/object-onboarding/CompilationSteps.tsx`, `CompilationStepper.tsx`, `CompilationContent.tsx`, `compilationSteps.module.css`;
- `compilationFlow.ts`, solo per aggiungere a ogni passaggio un titolo a domanda, una spiegazione e l'etichetta «Articolo i di n», senza cambiare la sequenza calcolata;
- un nuovo `CompilationSummary.tsx` a blocchi, che riusa i dati di `SaveSummary`;
- in `OnboardingPage.tsx`, il solo layout a due colonne con l'originale (`PdfPreview` già presente) quando la rotta non è nello spazio di lavoro;
- i test dei file toccati.

**Fuori**: logica di passaggi e convalide, costruzione del payload, salvataggio e recuperi (`DraftEditor`), backend, API, `UnifiedReview`, `model.ts`, `apparatusSuggestions.ts`.

**D10 su `ItemEditor`, condivisa con la pagina unica:** propongo di farlo in un secondo momento (fase B, sotto), per tenere questo lotto senza rischi sulla pagina unica.

## Fase A — questo lotto

1. **Scheda unica** (D1, D3, D6): un contenitore per il passaggio corrente con etichetta («Passaggio 2 · Contenuto»), `h2` a domanda che riceve il focus, una riga di spiegazione e il piede interno. «Passaggio N di M» sta accanto al pulsante principale, con `aria-live` come oggi. La frase sul salvataggio resta solo nel Riepilogo.
2. **Barra dei passaggi** (D2): pastiglie con badge (numero, spunta per i fatti), stato corrente con `aria-current="step"`, i passaggi non raggiunti disabilitati come oggi. Il nome accessibile resta «2. Contenuto» (`aria-label`), con lo stato in testo nascosto, per non rompere la navigazione da tastiera e da lettore di schermo.
3. **Testata** (D4, D6): titolo del documento, «Salva bozza ed esci» e «Mostra/Nascondi originale»; «Torna alla pagina unica» come link secondario. Nel piede su telefono, «Salva bozza» resta anche nel menu del piede.
4. **Originale affiancato nella rotta autonoma** (D5): due colonne su desktop, pannello richiudibile. Su telefono, il commutatore «Compila / Originale» già usato nello spazio di lavoro. Nello spazio di lavoro documenti non cambia niente: l'anteprima è già affiancata.
5. **Contenuto** (D7): pulsanti a scelta singola con `aria-pressed`, al posto delle radio visibili. Stesse azioni (`create`, `link`, `document_only`, `skip`) e stesse condizioni di disponibilità; frasi esplicative invariate.
6. **Riepilogo a blocchi** (D8): `CompilationSummary` con Documento, Oggetti (nuovi e collegamenti), Spese, Esclusi e Contatti, ognuno con «Modifica» verso il passaggio giusto. Sotto, «Prima di salvare» con i link ai problemi, come oggi. `SaveSummary` resta usato dalla pagina unica.
7. **Telefono** (D9): sotto i 480 px, barra compatta (testo più segmenti; l'elenco completo resta raggiungibile) e piede fisso, con area tattile di almeno 44 px, sopra la barra di navigazione inferiore.
8. **Evidenziazione nell'originale**: dove la proposta indica la pagina di provenienza, l'anteprima va a quella pagina. Non evidenzio la riga: l'anteprima PDF non ha coordinate di riga affidabili. Lo dichiaro come differenza dal prototipo.

## Fase B — da approvare dopo la A

Variante compatta di `ItemEditor` (`density='compact'`), usata solo dalle schede: nome, tipo, stanza, marca, modello e data di acquisto in vista; garanzia, seriale, arricchimento e dati tecnici in «Altri dati facoltativi». Tocca un componente condiviso: va fatta in un lotto a parte, con test di non regressione sulla pagina unica.

## Test

- Restano invariate le asserzioni su dati, payload (i quattro confronti deep-equal), convalide, focus, recuperi e idempotenza.
- Ci sono asserzioni testuali su testi che il lotto cambia: il titolo di livello 2 «Documento» e «Contenuto» diventa una domanda; «Passo N di M» diventa «Passaggio N di M»; la fila «Modifica …» nel Riepilogo. Verranno aggiornate al nuovo testo mantenendo lo stesso controllo, e ogni modifica di testo sarà elencata nel report per la revisione di Codex. Il nome «2. Contenuto» della barra resta invariato.
- Nuovi test:
  - stati della barra (fatto, corrente, da fare) e «Articolo i di n»;
  - titoli e spiegazioni per tipo di passaggio;
  - Riepilogo a blocchi con «Modifica» verso il passaggio giusto;
  - layout con l'originale nella rotta autonoma;
  - piede fisso sotto i 480 px (classe e struttura; il rendering reale va nel giro visivo).
- Verifica: typecheck, lint, build e suite mock completa, con due worker e senza retry aggiuntivi. Giro visivo su `mock-api --compilation`, su una porta propria, a 1280 e 390 px, con screenshot nel report.

## Vincoli

Solo `frontend-v5` e documentazione del lotto. Nessuna AI o email a pagamento, nessun DB/API/storage reale, nessun `.env`, nessun reset o force push. Nessun processo altrui fermato: il backend simulato di Codex sulla porta 3101 resta com'è. Merge al committente dopo la revisione di Codex.

## Domande al committente

1. Va bene fare ora solo la fase A (presentazione delle schede) e rimandare la scheda articolo compatta (fase B) a un lotto separato?
2. Nel prototipo la riga della fattura corrente era evidenziata; nel prodotto propongo solo il salto alla pagina giusta. Va bene?
