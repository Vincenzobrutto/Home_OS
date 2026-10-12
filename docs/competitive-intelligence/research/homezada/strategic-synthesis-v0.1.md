# HomeZada — Sintesi strategica Dimora v0.1

**Data:** 2026-10-12  
**Stato:** pre-decisione, non roadmap approvata.  
**Base:** Copilot Researcher (20 pp.), Gemini Deep Research (265 righe), red team Claude v1.1 (PR #2; non ancora confluita nel branch). Le evidenze da HomeZada sono per lo più dichiarazioni del vendor, NON conferme di utilizzo o successo commerciale.

## Executive verdict
HomeZada è un **benchmark di architettura prodotto e configurazione commerciale**, non evidenza sufficiente della sostenibilità B2B2C. I modelli PRO esistono a listino, ma retention, conversione, numero di professionisti paganti e reale utilizzo non sono pubblicamente documentati.

## Correzioni rispetto a un'interpretazione superficiale
1. HomeZada **ha** OCR e riconoscimento foto/video con conferma: il differenziale Dimora da dimostrare riguarda estrazione di dati strutturati, provenienza, relazione documento–asset–intervento–garanzia, non il generico uso di AI.
2. Il modello PRO 'Transfer (Gift)' e 'Share' sono diversi; professionista può tenere una copia read-only secondo FAQ; valore relazionale ottenuto da branding + 2 email automatiche/mese, con questioni privacy da rivalutare per l'Italia.
3. Listini pubblicati: Premium $99/anno, Deluxe $189/anno; PRO Transfer(Gift) $99 una tantum/immobile; Share $49/anno secondo listino (FAQ discordante $25); branding renewal $5/cliente/anno. Pubblicazione Zada File $75, trasferimento listing discordante $90/$99, probabilmente vecchia FAQ. **Non provano WTP italiana.**
4. Gemini non fornisce link risolti nel testo ricevuto e sovrastima alcune funzionalità Dimora ('B2B già sì', inventario AI video e notifiche complete). La fonte per questi stati è il repository, non le tabelle competitor.
5. App iOS e Android con aggiornamenti non recenti / valutazioni deboli sono indicatori qualitativi, ma non prova da soli di fallimento economico.

## Candidati da validare, non da sviluppare automaticamente
| ID | Candidato | Valore da provare | Rischio | Next step |
|---|---|---|---|---|
| HZ1 | Primo valore nella private alpha: documento → estrazione → conferma → recupero | Ripetizione volontaria d'uso | utenti piccoli e motivati; utenti che non tornano | misurare caricamenti ripetuti a 7/30 gg e qualità di estrazione |
| HZ2 | Stima di quando/quanto sostituire impianti | decisione finanziaria / lavori concreta | falsa precisione; dati costi italiani scarsi; WTP partner nulla | colloqui con banca/impresa/installatore (B74) prima di sviluppare |
| HZ3 | Attivazione attraverso agenzia con vantaggio operativo immediato | meno inseguimenti documenti oppure owner retention reale | competitor Immodoc/Faloosa; sforzo agente; privacy; pagamento incerto | test concierge, SOLO dopo decisione su ADR #77 |

## Gating decision
La decisione ADR #77 (2026-09-16) orienta il B2B2C a Renovation + Financing, scartando Transaction Readiness. È registrata, ma non validata da mercato. **Le nuove evidenze non la abrogano.** Occorre decisione umana esplicita se riaprire il canale agenzie come wedge prioritario.

## Red team — punti verificati/corretti da Claude
- v1.1 rilegge gli originali, corregge la v1.0: Copilot aveva già notato copia read-only e programma affiliate; il prezzo $90 era documentato nel 2015; HomeZada supporta OCR; distingue forecast sostituzione impianti da forecast finanziario triennale.
- La v1.1 è ancora in PR #2 draft; rileggere la versione definitiva prima di promuovere claim a 'consolidati'.

## Raccomandazione di percorso
Continuare alpha MVP e misurare uso effettivo. Non monetizzare o implementare un 'gift' B2B2C solo perché HomeZada ha pubblicato un listino. Mantenere in shortlist la stima sostituzione asset se prove partner reali la supportano. Usare risultati Agenzie + Condominiums come ipotesi canale, non come validazione.

## Materiali di riferimento
- Copilot: `research/homezada/copilot-intake.md` e PDF originale nella conversazione.
- Gemini: `research/homezada/gemini-intake-2026-10-12.md` e testo originale nella conversazione.
- Claude v1.1: `claude/homezada-red-team-v1.1.md` sulla PR #2: https://github.com/Vincenzobrutto/Home_OS/pull/2
- Confronto preliminare: `research/homezada/copilot-gemini-comparison-v0.1.md`.
- Agente 3: dossier agenzie branch `claude/project-thread-swk101`; condominio intake nel branch research.

**Nessun aggiornamento automatico a** `docs/roadmap.md`, `docs/decisions.md`, `docs/backlog.md`.
