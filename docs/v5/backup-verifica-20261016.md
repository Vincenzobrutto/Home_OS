# Backup locale V5 — verifica del 16 ottobre 2026

## Ultima copia dopo recupero account

`backups/dimora-v5-20261016T083531Z/` è la copia più recente verificata:43tabelle,262originali, conteggi e SHA/dimensioni identici dopo ripristino isolato. Include migrazione13 e nuovo account del committente dopo verifica/reset riusciti. Dump SHA256 `c6af56e2eed5c0503803518f171443f7844ca869e7719428ef392727df2b47da`. Cluster55439 fermato; API non collegata al restore. Log `outputs/Dimora-V5-backup-post-recovery-20261016.log`, dettagli `account-recovery-esito-20261016.md`. Configurazione Brevo e .env non copiate; nessuna email inviata dal restore. Le sezioni successive descrivono la copia precedente073731Z, ancora valida per il suo snapshot.

## Copia verificata

Workspace: `C:\Users\07704017\Documents\Codex\2026-10-13\referenced-chatgpt-conversation-this-is-an`.

Backup valido: `backups/dimora-v5-20261016T073731Z/`.
- `database.dump`: formato custom PostgreSQL, solo database `dimora_v5_product_dev` su127.0.0.1:55432, senza owner/ACL del server.
- `originals/`:255file registrati in StoredFile, nomi opachi `.bin`.
- `manifest.json`: SHA256 del dump e di ogni copia, dimensioni, conteggi delle tabelle e risultato del ripristino.
- Script ripetibile, esterno al checkout: `outputs/Dimora-V5-backup-verify.mjs`.
- Log sintetico esito: `outputs/Dimora-V5-backup-verify-result.log`.

SHA256 dump: `8a77fb14d6cfe142d6fc424cc72228522835744345556592a5f781ec2b421f52`.

## Consistenza e risultato

Snapshot PostgreSQL esportato da una transazione repeatable-read: pg_dump, conteggi e lettura dei riferimenti originali usano lo stesso snapshot. StoredFile e DocumentVersion in SHARE lock soltanto durante dump/copia, per evitare variazioni dei riferimenti ai file. File referenziati copiati e verificati byte per byte tramite hash. Blocchi rilasciati prima della prova di ripristino. Nessuna modifica dati applicativa o copia di .env/chiavi.

Ripristino realmente eseguito tramite pg_restore --exit-on-error in un cluster NUOVO e separato, directory `work/backup-restore-20261016T073731Z/pgdata`, porta55439, autenticazione scram e password casuale temporanea. Nessuna API collegata al cluster di verifica.

Esito:
- 41tabelle ripristinate, conteggi uguali allo snapshot;
- 255originali referenziati dalle versioni ripristinate: presenti, dimensioni e SHA256 corrispondenti;
- ANALYZE riuscito;
- cluster temporaneo spento, porta55439libera;
- API3001 PID3648 e PostgreSQL attivo55432 PID15364 preservati, nessun riavvio.

Log tecnico in `work/backup-restore-20261016T073731Z/verification.log`. Password di inizializzazione temporanea eliminata; nessuna credenziale nei manifest o rapporti. Il dump conserva i dati necessari del DB, inclusi dati di autenticazione: non va pubblicato o aggiunto a Git.

## Tentativi precedenti e limiti

Prima protezione del launcher backup ha rifiutato il riavvio perché nella configurazione esiste un flag AI abilitato: nessun processo fermato né flag modificato. Scelto invece il backup online con snapshot/blocchi temporanei; nessuna analisi è stata avviata.

La copia `backups/dimora-v5-20261016T064903Z/` NON è quella verificata: il primo controllo pg_ctl su Windows tratteneva le pipe del processo server e andava in timeout, pur avviando il cluster. Cluster pulito e spento nel finally; manifest verified=false preservato. Corretti gli handle stdout/stderr a file, quindi ripetuta con successo l'intera prova nella nuova directory valida sopra. Non confondere il primo dump con una verifica riuscita.

Questa è una copia sullo **stesso PC**, non una protezione dal guasto o dalla perdita del disco. Una copia separata/dispositivo di destinazione va concordata prima di usarla come unica salvaguardia. Gli originali esterni del committente vanno conservati.

Provato il ripristino SQL e la coerenza di tutti gli originali, non un avvio completo dell'applicazione contro i dati ripristinati. Non salvate dipendenze, binari runtime, chiavi provider o configurazioni personali nel dump: per un recupero su un altro PC servono runtime compatibile, codice/migrazioni e nuova configurazione locale. Mai eseguire un restore di prova sul DB attivo.

## Ripetizione

Dal workspace, `node outputs/Dimora-V5-backup-verify.mjs` crea una nuova destinazione senza sovrascrivere le precedenti e ripete il controllo isolato. Rifiuta DB diverso dal dedicato e porta temporanea occupata. Prima di carichi reali voluminosi andranno ricalibrati spazio, timeout e durata dei blocchi; l'esito attuale riguarda il dataset locale esistente. Nessun servizio pianificato o automazione aggiunti.

Backup/ripristino della Fase0 verificati. Gli altri prerequisiti del nuovo piano di release non sono per questo automaticamente conclusi.

## Snapshot 085607Z e seconda copia cifrata
43 tabelle,267 originali, restore isolato verificato e spento. Copia cifrata AES256 su Drive privata, ricevuta e limiti in fase0-file-control-esito-20261016.md. Ancora necessaria custodia chiave separata dal PC. Nessun restore sul DB attivo.
