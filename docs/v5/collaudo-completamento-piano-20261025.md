# Compilazione: collaudo degli ingressi e del completamento

Incarico autonomo del 25 ottobre 2026, finestra indicativa 09:30–14:00 Europe/Rome. La finestra è un limite organizzativo, non un obbligo di introdurre modifiche o prolungare verifiche già concluse. Base remota `730b93d`, worktree nuovo e branch `codex/collaudo-completamento-20261025`. La PR #35 resta separata e non viene integrata senza approvazione.

## Ordine di lavoro

1. **09:30–10:30 — ingressi.** Confrontare compilazione dall’archivio con lotto valido, pagina diretta e ripresa della bozza. Verificare la distinzione fra tipo della bozza e organizzazione canonica del documento, usando dati del mock e leggendo il contratto backend senza contattarlo.
2. **10:30–12:00 — difetti confermati.** Scrivere riproduzioni che falliscano sul comportamento scorretto. Correggere soltanto le differenze dimostrate, mantenendo payload, versione/SHA, visibilità e idempotenza. Nessun ampliamento a backend, migrazioni, AI o parser.
3. **12:00–13:15 — regressioni.** Esercitare salvataggio della bozza contro conferma finale; ripresa con campi conservati; risposta persa/errore; fonte non disponibile o privata altrui; più articoli e documento senza oggetti. Gli assenti o ambigui restano da confermare, senza ripartizioni inventate degli importi.
4. **13:15–14:00 — consegna.** Test mirati, typecheck/lint/build e suite mock completa se cambia il prodotto; report con esiti e limiti, stato/roadmap/changelog, commit, push verificato e PR verso il consolidamento. Preparare una checklist breve per il committente. Se il lavoro termina prima, consegnarlo prima.

## Criteri di riuscita

- A parità di scelte, ingressi diversi non devono produrre risultati canonici incompatibili o perdere classificazione/dati.
- Una bozza salvata resta da completare; la conferma finale usa lo stato restituito dal server, senza simulare il completamento nel prodotto.
- Nessun nuovo oggetto, costo o contatto viene salvato entrando nella pagina o passando tra schede.
- Le operazioni incerte conservano chiave e corpo; nessun retry automatico o nuova AI.
- Una fonte non leggibile non mostra proposte o metadati recuperati da un altro contesto.
- I test simulano le risposte del server: non dichiarare una prova sul database reale o nel browser non effettuata.

## Perimetro e vincoli

Area riservata: `frontend-v5/src/object-onboarding/OnboardingPage.tsx` e nuovi helper/test di completamento, se necessari. `DocumentEditorWorkspace` e i test della PR #35 non vengono modificati; esclusi inoltre parser/OCR, ItemEditor, model, fakeBackend condiviso, AppShell/cestino e file dei lotti Claude.

Nessuna AI/email a pagamento o preflight; nessun DB/API/storage reale, documento personale aggiuntivo, `.env`, migrazione, salvataggio automatico, riavvio dell’app, main o branch Claude modificato. Nessun reset/clean, force push o rimozione worktree. I test usano esclusivamente il simulatore in memoria, ambiente ripulito e Vite con envDir vuoto; nessun aggiramento del blocco browser precedente.

Il merge della PR #35 e di eventuali nuove PR resta al committente. Non assumere che questa pianificazione autorizzi l’integrazione o l’aggiornamento dell’app reale.
