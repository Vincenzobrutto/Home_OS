# Mockup proprietario completo — navigazione da validare

14 ottobre 2026. Il committente non riusciva a distinguere la Home dalla sola vista economica; richiede prova completa del proprietario prima dello sviluppo. Sorgente standalone frontend-v5/public/mockup-proprietario-v5.html; dati sintetici separati dal mockup S1 e dall'app reale. È proposta navigabile, non implementazione backend.

## Gerarchia

Quattro voci principali desktop/mobile: Casa, Attività, Documenti, Spese. Casa dà accesso ad ambienti/oggetti e condominio; nessun Oggetti che sostituisca Attività nella navigazione principale. Altro della casa: condivisioni (anteprima C1), storia, impostazioni/piano/ciclo di vita. Su mobile menu secondario distinto dalla bottom nav.

Casa: originali/import, oggetti manuali, contatori documenti/verifiche/attività, ambienti, verifiche, prossime attività, pubblicazioni condominiali direttamente leggibili, accesso spese. Economia non domina la homepage.

Attività: da fare, completate/annullate, creazione manuale e Da rivedere con sole verifiche aperte. Conferma una verifica alla volta senza chiudere le altre; tecnici 24kWutile/28kWnominale conservabili distinti; fonti e storia accessibili; nessun obbligo normativo o costo automatico.

Documenti: archivio generale (manuali/libretti/APE/contratto riservato/fatture/bollette), ricerca nome, visibilità, dettaglio fonte simulata; accesso oggetto, registrazione manuale costo e condivisione selettiva. Non più un picker soltanto di bollette. Import simula pacchetto di originali, non leggendone i contenuti dal PC; non crea oggetti/costi in automatico.

Spese: elenco essenziale 2026, manuale e accesso nuovo modulo Economia. Economia: storico/categorie/filtri/confronto, costi per oggetto e lavori, bozza da documento e conferma/esistente. Stesso record nel mockup, nessuna copia in scheda oggetto. Originale economico analizzato simulato compare anche nell'archivio generale.

Scheda oggetto: Sintesi, Documenti, Attività, Costi, Storia con conteggi coerenti. Ritorno da documento o costo al contesto di apertura via ritorno hash; nav primaria distingue pagina corrente, evitando spostamenti involontari nell'area economica. Dati tecnici e proposte esemplificativi, non riscrittura di G1/M3 reali.

Condominio: pubblicazioni programmazione e risoluzione distinguibili, visibilità Scala A esplicita; segnalazioni private con ingresso indipendente; nessun invio reale/AI/gestione SLA. Condivisioni C1: selezione esplicita, privati esclusi default, manifesto, conferma/revoca solo simulate; non implica implementazione/approvazione API C1. Vendita: simula perdita accesso dell'entità Home e blocco dei percorsi, reset reversibile senza cambiare proprietà reali.

## Verifica eseguita

Browser su QA separata: entrambe conferme caldaia, card sparita individualmente, fonti consultabili e badge senza residui dopo tutte conferme; attività completata con totale costi 2177,90 EUR invariato; accesso Spese->Economia->Costi per oggetto->scheda->documenti; ritorno documento alla sezione Lavatrice/Documenti; oggetto manuale collocato in Cucina e persistente dopo reload; import3originali nell'archivio senza nuove spese; segnalazione privata senza testo «invia comunque»; condivisione documento scelto/manifesto/revoca simulata; vendita e pagina documenti entrambe bloccate; reset solo QA elimina nuovo oggetto e ripristina dati; viewport320x780 scrollWidth305, bottom nav Casa/Attività/Documenti/Spese; zero errori console. Sintassi JS verificata. Il dialogo reset è HTML, evita il dialogo nativo che rallentava CDP.

Non verificati in questo mockup: backend/API/autenticazione/permessi reali, pagamento/forecast, OCR, importPDF reale, streaming provider, scheduler, inviti/email. Condivisioni e vendita sono anteprime UX, non nuovi moduli attivati. Nomi di nuovi ambienti/oggetti unici per la semplificazione della prova; i contratti reali conservano le proprie regole. Multi-casa e onboarding account non rappresentati: profilo proprietario con una Home già esistente.

Nessun dato reale/legacy/main modificato. Stile Blu architettura, nessun asset/font esterno o API prodotto. Storage dimora-owner-ux-mock-v1 e suffisso QA separato; non cancellare le chiavi Dimora reali. Versione portabile in outputs/Dimora-V5-Home-proprietario-mockup.html. Valutare utilità e complessità della navigazione prima congelamento S1; questo mockup non decide da solo nuove funzioni di prodotto.
