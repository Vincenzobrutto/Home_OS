# Tipo documento nell'archivio — 25 ottobre 2026

Richiesta: Correggi tipo deve aprire un menu a tendina direttamente nella riga, senza passare dal dettaglio e dalla compilazione. Branch codex/tipo-documento-inline-20261025, worktree dedicato, base consolidamento dc58ada dopo fetch. Registrazione prima del codice.

Piano: nuovo componente contestuale e helper di conferma tramite IntakeClient/organizeDocuments esistenti; apertura e scelta senza scritture, Salva tipo esplicito. Riutilizzare catalogo tipi, versioni e idempotenza; rileggere fonte e classificazione, preservare titolo e intervalli delle parti, nessun oggetto/spesa/contatto o analisi. Se il documento è composto, mostrare scelte per parte senza collassare le pagine in un tipo unico. Nessuna risposta tardiva deve contaminare altra casa/account o modificare un'altra riga; esito incerto recuperabile con identico corpo/chiave, conflitti da rileggere.

Moduli previsti: frontend-v5/src/documents/ChangeDocumentType e relativo helper/test, singolo rendering in DocumentsPages; eventuale stile locale. Nessun backend/schema/API nuovo, nessun parser/OCR o ItemEditor. Test nel harness mock: apertura/annullamento senza scritture, sola classificazione, spesa/collegamenti conservati, parti multiple, fonte/permessi/versioni cambiati, esiti incerti e cambio account/casa. Typecheck/lint/build e mock completa prima della consegna. Nessuna AI/email, DB/API/storage reale o modifica .env; app aggiornata soltanto dopo decisione di merge del committente.

Stato: pianificato e registrato; implementazione e risultati ancora da aggiungere. Il report di attivazione del cestino precedente è incluso come documentazione, senza ulteriori modifiche alla sua implementazione.
