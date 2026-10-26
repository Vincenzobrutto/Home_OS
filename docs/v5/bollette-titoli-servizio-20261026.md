# Uniformare i titoli generici delle bollette già caricate

## Diagnosi e ambito

Il committente chiede nomi uniformi a video anche per i documenti già caricati, mantenendo invariati titoli salvati, originali e spese. Verifica della UI esistente in sola lettura: nei casi con titolo «SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO» il fornitore era già correttamente presente nella spesa collegata; il blocco era la protezione del titolo salvato, trattato come qualsiasi titolo personalizzato. Il mese fattura era assente in un caso consultato: non viene ricavato dal periodo dei servizi. Nessuna correzione del fornitore salvato necessaria per quel caso.

Prima della verifica UI, controllo offline della prima pagina del PDF già fornito tramite la skill PDF: il lettore attuale identifica correttamente il fornitore sia dal testo sia con il layout e i contatti. Nel log solo indicatori booleani; nessun testo personale copiato nel repository. Questo controllo non basta da solo a concludere che tutti i file dell'archivio abbiano lo stesso fornitore. La UI ha consentito di distinguere l'ipotesi iniziale di dato fornitore errato dal problema effettivo di presentazione. Nessuna scrittura, nuova compilazione o chiamata AI; l'apertura del dettaglio ha mostrato l'anteprima già prevista dall'app.

Lotto `codex/bollette-titoli-servizio-20261026`, base del consolidamento `b1f3953`, registrazione `a18ea06` prima del codice, fonte prodotto verificata `c62cdac`. Solo frontend e documentazione; esclusi backend/API/schema, parser/OCR, file Claude e modifiche ai dati reali. Nessuna lettura automatica degli originali introdotta nel prodotto.

## Regola generale

- Solo completati, una parte Bolletta, filename originale disponibile e una sola spesa personale attiva con fornitore utilizzabile.
- Un titolo esattamente corrispondente a una descrizione generica del servizio può usare il nome parlante dal fornitore già confermato: energia elettrica, gas naturale, acqua, telefonia/internet, con prefissi servizio/fornitura/bolletta e indicazione del mercato libero/tutelato. Il riconoscimento è ancorato all'intera frase; annotazioni dell'utente come «Energia elettrica della mia cucina» restano preservate.
- Le descrizioni generiche non vengono interpretate come nomi di aziende. Nessun catalogo fornitori, associazione da servizio a marca o deduzione da altri documenti della casa. Un'azienda chiamata «Servizio Elettrico Nazionale» resta un nome, non una descrizione del servizio.
- Nei soli alias delle bollette, i suffissi societari terminali S.p.A./S.r.l./S.r.l.s. vengono omessi se puntati oppure espressi come sigla tutta maiuscola. È formattazione visuale, non identificazione o fusione di aziende; valori salvati, soggetti e ID restano invariati. Nomi come «Spa Natura», «Hotel Spa», sigle non puntate ambigue o una ragione sociale che diventerebbe soltanto una descrizione generica conservano la forma originale.
- Titolo generico senza fornitore univoco: resta il titolo salvato. Nessuna scelta tra più spese, nemmeno concordanti. Per i titoli basati su filename, una descrizione generica salvata nel campo fornitore viene ignorata come azienda: restano mese esplicito o filename secondo la regola progressiva. Nessun mese inferito da emissione o servizi.

Esempio sintetico: titolo «SERVIZIO ENERGIA ELETTRICA MERCATO LIBERO» e fornitore confermato «Fornitore Prova S.p.A.» → «Bolletta Fornitore Prova», eventualmente con mese fattura esplicito. Titolo e fornitore salvati restano visibili nei rispettivi dettagli. La lista usa esclusivamente il contesto personale già proiettato; zero nuove API/query/fetch per riga. Ricerca, ordinamento, export e dettaglio senza proiezione conservano i valori canonici come nei precedenti lotti.

## Verifiche e consegna

Mirata **101/101 in9file**, di cui **23 nuovi** (22 regole pure e un percorso archivio). Il percorso verifica l'alias da titolo generico/fornitore legale, titolo salvato e filename originali nei dettagli, titoli specifici e documenti incompleti preservati, link invariato, zero scritture oltre al login e zero letture per documento. Regole pure: descrizioni e nomi reali distinti, suffissi solo terminali, ambiguità non risolta arbitrariamente, fonte/completamento e non mutazione.

Regressioni area **260/260 in 27 file**, un worker/retry0 e zero fallimenti/saltati, sulla fonte definitiva. Typecheck/lint/build verdi. Prima area260/260, poi hardening del formatter per preservare Spa/Srl ambigui non puntati: intero gruppo ripetuto sulla versione finale, senza modificare asserzioni o timeout. Suite mock completa non ripetuta: verificato il gruppo di presentazione/archivio/ricerca interessato. Nessuna modifica delle asserzioni precedenti o dei timeout. Nessuna nuova prova browser del candidato rivendicata; la consultazione reale sopra è soltanto diagnosi della versione già attiva. Evidenze locali nel task: `work/provider-uniformity-local-check.cjs`, `work/service-title-new.log/json`, `-focus.log/json`, `-checks.log`. Nessun contenuto personale nel repository.

## Attività del committente

Build finale9,05s. Prima area in `work/service-title-focus.log` e `-focus-before-hardening.json`, area definitiva in `-focus-final.log` e `-focus.json`, entrambe260/260. Nessun test fallito o asserzione precedente modificata in questo lotto. Diff e link locali verificati, push verificato con `git ls-remote`; codice dopo i test invariato. Consegna nella [PR #59](https://github.com/Vincenzobrutto/Home_OS/pull/59), pronta per revisione; nessun merge o aggiornamento app implicito.

Approvare la PR del lotto per merge e attivazione del frontend. La regola si applicherà anche ai documenti già caricati al successivo caricamento della lista: non servono upload, nuove compilazioni, modifiche alle spese o conferme duplicate. Gli altri titoli personalizzati restano preservati; un titolo generico senza fornitore univoco non viene attribuito a un'azienda per somiglianza.

## Rilascio autorizzato

PR #59 integrata su approvazione a e95f8fd4468a89e8015293d24367d1a4d223eb17, hash remoto verificato. Solo frontend ricompilato e attivato; 23/23 controlli HTTP statici/anonimi verdi. Verifica aggiuntiva dell’archivio reale in sola lettura: i due titoli generici consultati mostrano ora «Bolletta Sorgenia»; suffisso societario TIM omesso nel solo alias. API, PostgreSQL, main e dati salvati preservati. Nessuna AI/email, migrazione, upload o salvataggio automatico.

Runtime detached `Dimora-V5-runtime-titoli-servizio-20261026`, fonte e95f8fd, albero frontend identico alla punta approvata 0d3ddf4 e backend identico alla API attiva a8de901. Lock verificato e build verde in 8,72 s. Fermato soltanto il precedente frontend16808 dopo verifica fresca di identità, creazione, comando e listener; nuovo frontend13740 su loopback5174. API15744 su3011 e PostgreSQL22924 su55432 mantenuti con identità e listener invariati. Header `roma-consolidata-a8de901-no-ai` e risposta anonima401 verificati; nessun cambiamento alle guardie. Main remoto invariato a cdbb318ddb56e764ad4b111a71560e3e71c7a033.

I23 controlli statici/anonimi comprendono formatter, alias, dettagli del file, rilettura locale, mese fattura, tracciabilità/classificatore, asset PDF/OCR e API anonima. Separatamente, archivio consultato da una scheda nascosta in sola lettura senza interrompere la pagina del committente: verificata la sostituzione dei titoli generici già esistenti, senza aprire originali o avviare nuove compilazioni. Nessun contenuto personale copiato nel repository. I260/260 test area e typecheck/lint/build della punta approvata restano l’evidenza funzionale offline; suite mock completa non ripetuta in questo rilascio perché il codice verificato è invariato. Evidenze locali `work/service-title-release-build.log`, `-runtime-proof.json`, `-runtime-http-proof.json` e metadata runtime canonici.

PR #57 aggiornata con la sola documentazione dei tre rilasci. Consolidamento riportato nel branch documentale con merge, senza rebase; preservate le consegne precedenti nei conflitti di stato/roadmap/changelog. Nessun altro codice prodotto.

### Attività del committente dopo il rilascio

Aggiornare la pagina Documenti. Non ricaricare file né riconfermare spese o oggetti. Restano preservati i titoli personalizzati; documenti senza fornitore univoco non vengono attribuiti a un’azienda. Rimane soltanto l’approvazione documentale della PR #57, che non condiziona l’app già attiva.
