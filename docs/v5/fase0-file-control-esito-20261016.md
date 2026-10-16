# Fase 0 — controllo dei nuovi file, 16 ottobre 2026

## Comportamento attivo

I nuovi upload PDF/JPEG/PNG vengono scritti in staging privato, controllati con Microsoft Defender e ammessi soltanto dopo esito valido e hash invariato. Due controlli concorrenti al massimo; riserva disco di 1 GiB più il file. Nessuna nuova dipendenza o modifica alle impostazioni Windows.

Il controllo richiede Windows, servizio/protezioni attive, firme non più vecchie di sette giorni e binario firmato Microsoft. Usa una scansione personalizzata report-only: non ripara il contenuto. Timeout, scanner non disponibile, firme non valide, errore o esito non zero bloccano il caricamento con 503 file_check_unavailable; non viene creato un documento. Spazio insufficiente: 503 storage_capacity_low. Nessun output dello scanner o percorso restituito al client. La selezione dei moduli PowerShell è limitata ai moduli Windows PowerShell, evitando l'incompatibilità con i moduli ereditati da PowerShell 7.

DocumentVersion conserva fileControlEngine, fileControlCheckedAt e fileControlSignature, nullable. Migrazione 20261016120000_file_control applicata al solo DB V5 locale. Gli originali precedenti rimangono invariati, con ricevuta assente: non sono dichiarati retroattivamente controllati. Contratto pubblico delle risposte invariato.

## Prove e limiti

- Backend build e lint passati; 22/22 test unitari storage/documenti e controllo file. Guasti simulati: scanner indisponibile/esito non zero, contenuto alterato, digest/percorso invalido, concorrenza e spazio insufficiente.
- Prova nativa con PDF sintetico: microsoft_defender, firme 1.461.43.0, hash identico, zero file .part residui. Nessun malware di prova utilizzato.
- API/PostgreSQL/storage reali: 11 scenari e relativo contenitore (12 test Node) passati. PDF/JPEG/PNG, ricevuta DB, idempotenza, concorrenza, isolamento, revoca, ZIP integro, rifiuto formati/CSRF e originale temporaneamente mancante. Solo account e file sintetici di questa suite; il requisito email viene esercitato prima di marcare verificati esclusivamente gli account fixture nel setup DB. Nessuna email o chiamata AI.
- API registrata riavviata con launcher -Resume dopo la migrazione/build; frontend e PostgreSQL preservati.

Non è una certificazione di innocuità né una verifica di leggibilità/OCR. La politica Windows esistente può usare protezione cloud/invio campioni Microsoft: il fatto che il comando sia locale non garantisce che nessun dato lasci il PC. MAPS e invio campioni non sono stati modificati. Prima della prova con documenti personali va chiarito questo limite. Il controllo non è un servizio antimalware portabile per una futura infrastruttura pubblica.

Riferimento primario: https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus . Il codice 2 non distingue in modo affidabile rilevamento e errore: l'applicazione non lo presenta come diagnosi di malware.

## Altri gate

Export JSON personale ancora in proposta in fase0-export-design-20261016.md: nessun nuovo endpoint. ZIP selettivo esistente invariato. Nessuna cancellazione di documenti o retention introdotta.

Seconda destinazione scelta dall'utente: Google Drive, cartella backup SW DIMORA, ID 13odF0onNb18vYMMkFEcDa09nGzplxWhh; ricerca del connettore shared=false. Nessun file trasferito. La copia deve essere cifrata prima del trasferimento e il materiale di recupero conservato separatamente dal PC e dal backup. Backup locale verificato precedente: 20261016T083531Z, 43 tabelle e 262 originali; è anteriore alla migrazione e alle nuove fixture di questa sessione.

Incarico Claude docs-only predisposto in outputs/Dimora-V5-incarico-Claude-Fase0-file-export-20261016.md (workspace): UX upload/errori/export e revisione indipendente corpus P01–P24. Avvio del nuovo incarico non ancora confermato. Nessuna modifica alle sue aree.

## Seconda copia eseguita

Nuovo snapshot coerente 20261016T085607Z: 43 tabelle, 267 originali e rispettivi hash verificati con restore isolato; cluster di verifica spento. Cifratura GnuPG AES256 con segreto casuale di 256 bit: archivio tar in streaming, nessun tar in chiaro intermedio. Decifratura locale verificata byte per byte tramite SHA256 e dimensione del flusso. Archivio cifrato 542877 byte, SHA256 43a536bd1c3f1cc27490be8009e5155be330d4abc715b9f9eaa1eefd41555b79.

Caricato soltanto il file .tar.gpg nella cartella privata scelta; readback metadati shared=false, solo owner, dimensione e parent corretti. Anche fetch raw del connettore riuscito, ma il riferimento remoto non è stato materializzato localmente e ricalcolato: non si dichiara una prova di ripristino della copia riscaricata da Drive. File: https://drive.google.com/file/d/1nOVWy5fMy1RCP7XnWFvGJrr9XbHo_8vi/view . Nessuna chiave di cifratura, .env o configurazione Brevo trasferita. Il dump include dati di autenticazione: la cifratura e la custodia separata della chiave sono necessarie.

Chiave locale corretta: work/backup-recovery-keys/dimora-v5-20261016T085607Z-1792141067630.recovery-key.txt nel workspace, non nel repository. Deve essere conservata dall'utente fuori dal PC e separata dal backup; senza questo passaggio la protezione dalla perdita del PC resta incompleta. I tentativi di cifratura precedenti non verificati sono rimasti locali e non sono stati caricati: incompatibilità percorsi MSYS e home GPG troppo lunga, risolte con percorsi /c e home temporanea corta. Agente temporaneo GPG della prova riuscita fermato. Script outputs/Dimora-V5-backup-encrypt.mjs; nessuna esecuzione pianificata automatica.
