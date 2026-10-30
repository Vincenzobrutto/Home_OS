# Atti: testo fidato dal PDF e doppia autorizzazione

30 ottobre 2026, ciclo diurno autorizzato fino alle18:00 Europe/Rome. Incremento tecnico interno; requisiti commerciali da validare con un’agenzia reale.

## Collegamento reale implementato

`AgencyDeedTextDecoder` in `backend-v5/src/agency-practices/deed-text.ts` collega i byte del PDF al contratto testuale degli atti. Riutilizza `PdfTextExtractor.parse` e il suo worker locale disposable già esistente; nessuna libreria installata, provider AI, chiamata a pagamento, credenziale o snapshot Home inventato.

Prima del parser:

1. ID fonte/versione/SHA richiesti e limite10MiB.
2. Firma del file e SHA calcolati sui byte dal server; media effettivo PDF, coerente con i metadati.
3. Copia posseduta dei byte e dei riferimenti prima di ogni await: modifiche del chiamante non cambiano il documento autorizzato.

Il parser esegue davvero lettura pagine e contenuto testuale tramite PDF.js nel processo separato, senza chiavi API. Limiti ereditati20pagine/100.000codepoint,10secondi, buffer output2MiB e heap Node256MiB. Non è un sandbox OS di memoria nativa. File cifrati/invalidi/testo assente restano errori, non occasioni per un fallback AI o OCR implicito.

Il decoder restituisce `TrustedDeedText` con pagina fisica1-based, parserVersion `agency-pdf-text-v1`, fonte/versione/SHA. Verifica i limiti anche sul risultato di una porta parser iniettata. Non produce candidati, diritti, proprietari attuali o documenti precompilati.

## Accesso e invalidazione

`loadAuthorizedDeedText` usa lo store/vault Agenzie esistenti, cattura scope e selezione, legge il file con autorizzazione aggiornata, decodifica fuori dalla transazione e ripete la lettura autorizzata prima di restituire il testo. Revoca, ritiro o sostituzione durante il parser scartano il risultato. Controlla anche che il decoder non abbia sostituito la prova fonte/versione/SHA.

È una porta interna; non aggiunge route, salvataggio dei testi o stato di estrazione. La futura route non deve accettare testo pagina o Actor come attestazioni del browser. Per controllare una risposta di estrazione deve acquisire anche il contesto corrente del dominio e chiamare `reviewDeedExtraction`, che richiede classificazione deed/succession. Il semplice decoder non classifica il documento e non invia nulla a un modello.

## Prove e limiti

Fixture PDF sintetiche generate in memoria, realmente decodificate dal worker: due pagine testuali e citazione verificata dal contratto sul testo della prima pagina, pagina vuota rifiutata, file malformato rifiutato,21pagine rifiutate. Altri test sulle porte: SHA/limiti/media prima del parser, copie di byte/prove, limiti testo, revoca/sostituzione dopo parsing, scope non retargetabile e decoder con prova sostituita.

Test di autorizzazione su store finto esplicito, non una nuova prova HTTP/DB. Nessun documento personale. PDF con immagini senza testo e PDF misti con pagine vuote non sono supportati dal parser riusato: `pdf_text_unavailable`, nessun OCR. Date italiane/quote/diritti e significato delle citazioni restano fuori dall’adapter lessicale.

Ancora mancanti per il flusso prodotto: persistenza del risultato/proposte e binding umano con unità/soggetti, UI fonti/dati/finding, provider atti e consenso/budget dedicati, API e collaudo completo del verticale. Nessun nuovo invio AI autorizzato da questo incremento.

## Continuità

Nuovi file indipendenti dal cablaggio concorrente. Nessuna modifica al decoder generico già usato da Home o ai suoi limiti. Test aggiunti al profilo findings esistente per non cambiare il runner condiviso in lavorazione. Esito finale: build e lint mirato verdi, mirato51/51 e regressione ordinaria547/547. Continuita in agency-day-worklog-20261030.md. Demo Alessio e servizi esistenti invariati; nessun merge/deploy o installazione nella junction.
