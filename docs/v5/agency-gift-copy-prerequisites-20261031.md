# Gift v1 — prerequisiti verificati della copia nella casa

31 ottobre 2026. La prosecuzione oltre le23 è autorizzata da Vincenzo. Questo incremento prepara la copia,ma NON completa accettazione,job durevole o creazione della Home. Invito/claim e offerta annuale full-access restano come nel ledger precedente.

## Dati della casa e identità della richiesta

parseGiftAcceptanceCommand richiede un nome e un indirizzo confermati esplicitamente dal proprietario (80/200code point,come CreateHomeDto),chiave e versione attesa. Non deriva indirizzi dall'etichetta della pratica o dall'atto storico. Non accetta accountId,homeId o benefit dal client. Digest canonico lega testo normalizzato/versione/key;servirà al futuro job per retry e risposta persa. Sono controlli di un modulo puro,non un endpoint già disponibile.

## Ammissione di un nuovo originale

stageGiftOriginal prende un lettore già autorizzato e una prova selezionata dal server. Copia Buffer/prova,verifica SHA e dimensione,tipo reale e nome sicuro;usa LocalFileStorage.writeVerified con il controllo file esistente e rilegge il nuovo oggetto indipendente. Il receipt restituito è quello dell'adapter di ammissione,non un controllo attribuito ad AgencyVault. Nei test storage/scanner sono stub sintetici:nessuna scansione reale dichiarata.

Non scrive Document,Home o receipt di accettazione. Una chiave nuova e verificata va subito referenziata nel futuro staging durevole. Fallimento write di esito incerto:nessun cleanup a intuito;fallimento dopo chiave nuova nota:cleanup solo di quella chiave prima della pubblicazione. Il worker futuro dovrà coordinare queste referenze con il cleanup24ore.

La revisione ha corretto il pass-through di HttpException arbitrarie:ora si ricostruiscono soltanto errori pubblici ammessi e PracticeError noti,tutto il resto è storage_unavailable generico. Test negativi impediscono di propagare percorsi o diagnostica privata anche dentro un codice ammesso.

## Provenienza Document e client

Nuova colonna nullable Document.giftProvenance,migrazione20261031212500_gift_document_origin. Fonte/versione/SHA,origine ricevuta/prodotta,autore/titolo dichiarati e metodo/qualifica/caveat restano separati dalla versione locale del documento. Il serializer controlla che lo SHA della copia coincida con la prova,mostra source=agency_gift e include la provenienza dettagliata solo nel dettaglio. Documenti manuali con valore assente/nullo restano compatibili.

Backend e client hanno parser mirati:metadati malformati,campi privati/certificazioni inventate e stime senza caveat vengono rifiutati. Le autorizzazioni precedono la proiezione. Upload manuale scrive campi espliciti e non può iniettare questo campo. La migrazione è stata applicata SOLO a cluster di test nuovi;nessun database prodotto o servizio esistente modificato.

La revisione ha individuato anche il purge:ora l'eliminazione definitiva cancella giftProvenance con SQLNULL,mentre cestino/ripristino la mantengono. Verificato sul vero TrashService con fixture DB e storage stub. Non rimangono titolo/autore/caveat nel campo Home dopo il purge;non si sostiene che questo sia già un copier o una policy completa dei futuri ledger di accettazione.

## Verifiche eseguite

- 742/742 backend ordinari,di cui83casi Gift;zero falliti/saltati. Prima revisione739prima dei3negativi privacy,poi suite finale742.
- 39/39 DB Gift:14metadata +19inviti +6provenienza (5sottocasi+contenitore). Nuovo cluster Uyfdk2 arrestato e stoplog verificato;anche il precedente SgWhTX arrestato.
- 1773/1773 frontend,174file,progetti mock e fixtures;typecheck/lint e build app completi verdi,output/cache privati.
- La prima regressione frontend è stata interrotta solo dopo verifica del PID del nostro test:asset worker PDF risolto fuori dal root tramite junction. Corretto il SOLO harness privato:worker copiato byte-per-byte con SHA uguale nella cache e alias esatto ?url;nessun ampliamento fs.allow o modifica alle guardie dell'app. Suite interessata21/21poi full1773/1773verdi. Nessun aumento timeout o asserzione indebolita.

Log nella cartella work/agency-gift-evidence-20261031 della chat:gift-copy-prerequisites-regression-2.log,gift-copy-prerequisites-db-2.log,gift-copy-prerequisites-frontend-2.log,gift-provenance-app-build.log. Nessun browser/mobile nuovo,file personale,servizio esterno,AI a pagamento o invio reale.

## Prossimo incremento

Job e item durevoli,lease e staging referenziato,poi commit atomico di Home,sola membership del destinatario,documenti/provenienza e ricevuta. Attivare l'anno full-access solo al successo della vera accettazione. Il completamento deve essere recuperabile senza rileggere permessi Agency dopo la copia accettata,senza duplicati o sovrascritture delle aggiunte del proprietario. Infine API/UI dal link e collaudo multi-sessione (un destinatario v1). Non sostituire questi passi con canAccept=true.
