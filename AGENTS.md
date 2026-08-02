# Istruzioni per assistenti AI

Questo file si applica a qualunque assistente AI (Claude Code, ChatGPT, altri) che lavora su questo repository. Se il tuo strumento legge un file diverso (es. `CLAUDE.md`), quel file rimanda qui — questa è la fonte unica.

## Prima di iniziare

1. Leggi [`README.md`](README.md) per orientarti nella struttura del repo.
2. Leggi [`docs/domain-model.md`](docs/domain-model.md) e [`docs/decisions.md`](docs/decisions.md) prima di modificare qualunque cosa relativa ad Asset/Room/Document — molte scelte che sembrano arbitrarie (es. "perché il matching richiede nome simile e non solo tipo") sono decisioni deliberate con una motivazione già scritta lì.
3. Leggi [`prompts/coding-guidelines.md`](prompts/coding-guidelines.md) — contiene i principi di dominio da non violare (es. "l'AI propone, l'utente conferma") e [`prompts/conventions.md`](prompts/conventions.md) per lo stile concreto.
4. **Fai `git fetch origin` e confronta `main` con `origin/main`.** Più di un assistente AI lavora su questo repository (repo GitHub: https://github.com/Vincenzobrutto/Home_OS) — se `origin/main` è avanti rispetto al tuo checkout locale, un altro assistente ha pushato dopo l'ultima volta che hai lavorato qui. `git pull` prima di continuare, e ripassa con l'utente (`git log`, `git diff`) cosa è cambiato prima di toccare aree che potrebbero sovrapporsi — non procedere alla cieca su codice che non hai ancora visto.

## Durante lo sviluppo

- Se prendi una decisione di design non banale (nuova dipendenza, nuovo pattern, scelta tra alternative reali), aggiungi una voce a [`docs/decisions.md`](docs/decisions.md) **nella stessa sessione**, non a posteriori — motivazione + alternative scartate, seguendo il formato delle voci esistenti.
- Se scopri o correggi un bug che rifletteva una scelta di design ormai superata, aggiorna la voce di `decisions.md` collegata (se esiste) invece di lasciarla in contraddizione con il codice.
- Se una feature cambia cosa l'utente può fare, aggiorna [`docs/vision.md`](docs/vision.md) (funzionalità principali) e/o [`docs/roadmap.md`](docs/roadmap.md).
- Se aggiungi un endpoint, aggiornalo in [`docs/api.md`](docs/api.md) nella stessa sessione in cui lo scrivi — non rimandare.
- Se lo schema Prisma cambia (nuovo campo, nuova entità, nuova relazione), aggiorna [`docs/domain-model.md`](docs/domain-model.md) in coerenza.
- Se scopri un problema fuori scope rispetto al task corrente (bug, debito tecnico, cosa mancante), aggiungilo a [`docs/backlog.md`](docs/backlog.md) invece di risolverlo di nascosto o di lasciarlo non tracciato.

## Alla fine di ogni sessione di sviluppo

Prima di chiudere, aggiorna:
1. [`docs/changelog.md`](docs/changelog.md) — una nuova voce in cima, sotto la data odierna, con le modifiche rilevanti della sessione (non ogni singolo file toccato, ma cosa è cambiato nel comportamento dell'app o nel modello dati).
2. [`docs/roadmap.md`](docs/roadmap.md) — sposta le feature completate dalla sezione "prossimi passi" a quella raggiunta, se applicabile.
3. [`docs/backlog.md`](docs/backlog.md) — aggiungi eventuali nuove voci scoperte, rimuovi/segna risolte quelle chiuse in questa sessione.
4. [`docs/decisions.md`](docs/decisions.md) — verifica che ogni decisione non banale presa in sessione abbia una voce (di solito già fatto durante lo sviluppo, non solo alla fine).

Poi genera un breve **handoff** in chat (non serve un file separato salvo richiesta esplicita) con:
- **Cosa è stato completato** — elenco puntato.
- **File modificati** — percorsi principali.
- **Problemi aperti** — cosa non è stato risolto o richiede input umano.
- **Prossimi passi consigliati** — cosa affrontare nella prossima sessione, con riferimento a `docs/backlog.md` se applicabile.

## Cosa non fare

- Non spostare `backend/`/`frontend/` dentro un `/src` comune "per conformità a un template" — è una deviazione intenzionale, vedi `docs/architecture.md` §1.
- Non scrivere CSS in file separati o CSS-in-JS: questo repo usa solo stile inline + `theme.ts`, unica eccezione `MOBILE_CSS` — vedi `prompts/conventions.md`.
- Non far scrivere dati AI-estratti direttamente su Asset senza conferma utente — vedi `prompts/coding-guidelines.md` punto 1.
- Non eseguire `git push --force`, `git reset --hard`, o altre operazioni distruttive senza conferma esplicita dell'utente in chat, anche se sembrano necessarie per risolvere un conflitto.
