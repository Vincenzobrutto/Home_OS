# Collaudo browser Spese, solo simulatore

Il runner compila i componenti dell'app con `FakeBackend` in memoria. Non avvia server, database o proxy. Usa un profilo Chrome/Chromium di test separato e conserva screenshot e risultati. Nel browser sono ammesse soltanto risposte statiche locali sull'origine `http://127.0.0.1:5197/spese-browser/`; tutte le altre destinazioni, API HTTP e metodi diversi da GET/HEAD sono bloccati. Il server eventualmente presente sulla porta non viene contattato né riavviato.

Prerequisiti: dipendenze frontend già installate, Node supportato dal progetto e un modulo Playwright/Chromium già disponibile localmente. Il runner non installa né scarica browser. Se Playwright è risolvibile dal progetto, basta:

```powershell
npm run test:spese-browser
```

Per usare un'installazione locale separata e Chrome già installato:

```powershell
npm run test:spese-browser -- --playwright-module "<cartella locale di playwright>" --chrome "<percorso di chrome.exe>" --output "<cartella artefatti fuori dal repository>"
```

Senza `--chrome` viene usato Chromium già installato per Playwright. Senza `--output` viene creata una cartella temporanea dedicata, riportata nell'output. Nessuna rimozione automatica di file o profili. Build e browser figli ricevono l'ambiente ripulito con la policy offline del repository; Vite usa la directory `environment`, priva di configurazione dell'app. Non aggiungere credenziali o originali personali al harness.

Verifiche automatiche a 1440, 873, 390 e 320 px:

- anello visibile, tre mesi, nessun overflow di pagina; elenco mobile prima di 1100 px;
- espansione allineata ai mesi recenti, senza cambiare il periodo, mantenuta al cambio filtro;
- drill da tastiera con tre mesi di contesto e mese selezionato, secondo clic senza nuova cronologia, Indietro con focus e dettaglio ripristinati;
- Bollette → settembre → Internet, una registrazione da 32,90 euro in elenco/anello/barre;
- confronto di febbraio 2025 fino al 28 febbraio 2024, esclusione del 29 esplicitata;
- errori mensili 503/403 senza vecchie barre, nessun Riprova sul 403;
- zero errori JS, destinazioni esterne e mutazioni dopo seed/login sintetici.

I JSON attestano le asserzioni; gli screenshot vanno anche ispezionati visivamente. Non è un test di Safari/iPhone fisico, screen reader, backend reale o accessibilità completa. I test unitari/privacy/idempotenza e la suite mock/fixture restano verifiche distinte.
