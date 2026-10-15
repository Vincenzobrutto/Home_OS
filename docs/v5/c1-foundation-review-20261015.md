# C1 — avvio e base di policy, 15 ottobre 2026

## Completato da Codex

- Proposta funzionale `c1-sharing-spec.md`, con manifesto, accettazione, scadenza/revoca e separazione file/derivati economici.
- Disegno API `c1-sharing-api-design.md` esplicitamente non congelato: protocollo preview/conferma e confini d'autorizzazione prima del runtime.
- Policy offline `backend-v5/src/sharing/policy.ts`: selezione limitata, soli originali propri, fatti canonici server, membership corrente di mittente/destinatario, esclusione viewer come mittente, manifesto immutabile e conferma vincolata al suo fingerprint. Cambio destinatario/durata/versione/contenuto invalida la vecchia conferma.
- Accesso consentito soltanto al destinatario accettante, entro scadenza e con fonti/diritti ancora validi; revoca, vendita/membership cessata o originale sostituito negano l'accesso. La policy non registra endpoint e non concede effettivamente diritti nel database.
- Nove test offline di autorizzazione e integrità, aggiunti anche allo script ordinario backend. Build TypeScript e lint riusciti. Ripetuto il mirato dopo aver reso il fingerprint indipendente dall'ordine delle chiavi JSON (necessario per una futura persistenza JSONB).

## Claude e responsabilità

Incarico `outputs/Dimora-V5-incarico-Claude-C1-UX.md` nel workspace. Il committente ha confermato l'avvio nell'app desktop. Claude produce esclusivamente mockup standalone e rapporto nel checkout separato, senza modificare il runtime o i contratti. Codex non ha effettuato invii UI né chiamate alla API Anthropic e non ha un processo Claude CLI avviato da questi strumenti.

Attesa consegna: `frontend-v5/docs/C1-UX-CONSEGNA-20261015.md`, mockup `frontend-v5/docs/proposta-c1/dimora-condivisione-claude.html`. Verificare file/commit prima di raccogliere; nessun cherry-pick automatico o riscrittura dei file di Claude.

## Stato reale e gate successivo

C1 **non è ancora una funzione eseguibile**. Nessuna migrazione, endpoint, invito, download condiviso, nuova membership o modifica a M2/G1/S1. Nessun riavvio dei servizi e nessuna modifica a `.env`, database o contatori AI. L'interfaccia Spese esistente resta invariata.

Punto di progetto aperto: la prima verticale proposta same-Home usa destinatari account canonici già membri; esterni richiedono verifica d'identità/consegna che oggi non esiste. Il mockup deve chiarire se la sequenza proposta è utile o se occorre anticipare tale verifica. Non trattare email non verificata o link anonimo come prova di destinatario. Non congelare la sequenza contro l'esito della revisione UX.

Alla consegna: arbitrato dei rilievi Claude, navigazione mockup, aggiornamento/congelamento contratto e nuovo incarico frontend reale; Codex implementa quindi persistenza/API con test DB/HTTP e collaudo browser. Non dichiarare verifiche DB/HTTP C1 già eseguite. Nessuna automazione o lavorazione Codex in background creata da questo avvio.
