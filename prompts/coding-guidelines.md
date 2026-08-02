# Coding guidelines

Regole di comportamento per chi (umano o assistente AI) scrive codice in questo repository. Le convenzioni di stile/sintassi concrete sono in `conventions.md`; qui ci sono i principi.

## Principi di dominio da rispettare sempre

Questi non sono preferenze di stile: violarli rompe garanzie che l'utente si aspetta dal prodotto (vedi `docs/decisions.md` per il ragionamento completo dietro ognuno).

1. **L'AI propone, l'utente conferma.** Nessun codice che estrae dati (Claude, scansione Gmail/Drive) deve scrivere direttamente su `Asset`/`AssetCustomField`/cronologia. La scrittura reale passa sempre da un'azione utente esplicita (`confirm`, non `analyze`).
2. **Riempi solo i campi vuoti.** Quando un flusso automatico propone di aggiornare un campo strutturato dell'Asset, non sovrascrivere un valore già presente — vedi `applyFieldsToAsset` in `documents.service.ts` come riferimento.
3. **`status` dell'Asset è sempre calcolato**, mai un campo che un endpoint accetta in scrittura diretta.
4. **Ambienti (Room) non hanno documenti/garanzie propri** — quel dato appartiene sempre a un Asset (o alla casa, per i documenti `houseLevel`).
5. **Bassa confidenza → nessun suggerimento**, non un suggerimento arbitrario mostrato come se fosse affidabile.

Se un nuovo task sembra richiedere di violare uno di questi punti, è un segnale per fermarsi e chiedere conferma esplicita all'utente prima di procedere, non per implementare in silenzio.

## Cosa evitare

- **Non introdurre astrazioni per un solo caso d'uso.** Questo repo preferisce codice diretto e ripetuto una volta in più a un helper generico usato una sola volta — vedi come `documents.service.ts` gestisce i tre rami di `confirm` (assetId / createAssetType / linkToHouse) senza una factory.
- **Non aggiungere state management esterno** (Redux/Zustand/React Query) senza discuterne prima — è una scelta deliberata, non una dimenticanza (vedi `docs/architecture.md` §3).
- **Non validare scenari che non possono accadere.** Fidarsi dei tipi TypeScript e dei vincoli Prisma lato interno; validare solo ai bordi (input utente, risposta AI, upload file).
- **Non aggiungere fallback silenziosi** per errori che dovrebbero invece essere visibili (es. un'estrazione AI fallita non deve produrre un Asset con campi vuoti senza che l'utente lo sappia).

## Commenti nel codice

Scrivere un commento solo quando il *perché* non è ovvio dal codice stesso: un vincolo nascosto, un workaround per un bug specifico, un comportamento che sorprenderebbe chi legge. Non descrivere il *cosa* (il codice con nomi chiari lo dice già) né riferirsi al task che ha originato la modifica ("aggiunto per la richiesta di X") — quel contesto appartiene al changelog/decisions, non al codice, e marcisce quando il codice evolve.

Esempio reale dal repo (`documents.service.ts`, sul matching documento→asset):
```ts
// MVP: primo asset dello stesso tipo. Da rivedere se emergono
// casi reali con asset duplicati dello stesso tipo in una casa.
```
Questo commento era corretto quando scritto (spiegava una scelta deliberata e il suo limite) — ed è stato proprio quel limite esplicitamente segnalato a materializzarsi come bug reale in una sessione successiva (vedi `docs/decisions.md` #7). Buon esempio di *perché* utile da lasciare scritto.

## Prima di aggiungere una feature

1. Controlla `docs/domain-model.md` e `docs/decisions.md` — la regola che sembra mancante potrebbe essere già una scelta deliberata con una motivazione scritta.
2. Se tocchi la pipeline documentale (`documents.service.ts`, `Inbox.tsx`), rileggi il flusso in `docs/architecture.md` §4 prima di modificarlo — i due endpoint `analyze`/`confirm` separati non sono un dettaglio implementativo, sono il punto 1 di questo documento.
3. Se la modifica implica una decisione di design non banale (nuova dipendenza, nuovo pattern, scelta tra alternative), aggiungi una voce a `docs/decisions.md` con motivazione e alternative scartate — non solo il codice.
