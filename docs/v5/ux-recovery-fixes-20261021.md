# Recupero bozze visibile e collegamento Ambienti stabile — 21 ottobre 2026

## Intervento

Due rilievi riprodotti nell’audit Product Design della chat, autorizzati dall’utente.

- Il fallimento di Salva bozza ed esci mostra l’avviso e **Riprova salvataggio** nella barra di salvataggio sempre visibile. Il riepilogo di errore riceve il focus senza riportare la pagina all’inizio ed è annunciabile come alert. Durante l’errore sostituisce i pulsanti di conferma e il generico richiamo ai campi mancanti. Un altro fallimento riporta il focus allo stesso riepilogo.
- Con esito incerto, il pulsante recupera la richiesta esistente con payload/chiave invariati; nessun retry automatico e nessuna nuova analisi. Con rifiuto HTTP definitivo modificabile, i campi restano modificabili e il nuovo salvataggio esplicito usa gli input correnti e una nuova chiave. Conferma canonica e salvataggio bozza rimangono distinti. Dopo il recupero riuscito si torna all’elenco; Riprendi compilazione ripristina anche valori incompleti.
- Nel dettaglio oggetto la spiegazione della collocazione è sempre visibile: non compare più al focus spostando Gestisci ambienti. Apertura con un solo clic e uso da tastiera preservati. Nessuna modifica della stanza implicita.

Frontend soltanto: nessun endpoint, schema, budget, dato canonico o consenso modificato. Altri rilievi dell’audit (sintesi bolletta/spesa e densità dei filtri) esclusi da questo intervento.

## Verifica

86 test frontend con API simulate superati: compilazione/bozze, onboarding, oggetti e guardia di uscita del workspace. Inclusi errore prima della registrazione, risposta persa, errore ripetuto, focus sull’alert, assenza di invii automatici, payload/chiave invariati, rifiuto definitivo con correzione degli input, nessuna creazione canonica. Due aspettative degli oggetti preesistenti erano obsolete rispetto al menu già approvato: sezione Ambienti attiva anziché Casa e selettore preciso del link di ritorno anziché quello ambiguo con la nuova voce laterale. Corrette solo queste aspettative.

Browser:

- Bozza fittizia, errore di rete da metà modulo: avviso e pulsante nel viewport su desktop 1440×1000, mobile 390×844 e 320×740. Alert con focus; pulsante alto 44 px e nessun overflow orizzontale nelle viste provate. Tab e Invio completano il recupero. Riapertura con fornitore e importo incompleto 12, conservati; zero conferme e zero invii AI.
- App reale in lettura: Gestisci ambienti apre la destinazione al primo clic su desktop/mobile. Su mobile la coordinata verticale del link prima e dopo il focus rimane 390,0625 px. Nessun salvataggio di collocazione, oggetto o ambiente.

Screenshot nella chat: `outputs/ux-recovery-fixes-20261021/`. Simulatore separato chiuso al termine; viewport ripristinato. L’avviso jsdom su scrollTo non implementato non sostituisce la verifica geometrica nel browser.

Build e lint frontend verificati. Avviso Vite preesistente sul bundle principale oltre 500 kB. Nessuna prova DB o chiamata AI live; dati reali e modifiche legacy locali preservati.
