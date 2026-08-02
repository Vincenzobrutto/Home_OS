# HomeOS — test di estrazione documentale

Script minimo per testare dal vivo l'estrazione AI su documenti reali (fatture, certificati, manuali), usando la Claude API. Nessuna dipendenza esterna: usa il `fetch` nativo di Node.

## 1. Requisiti

- Node.js 18 o superiore (`node -v` per controllare)
- Una API key Anthropic da [console.anthropic.com](https://console.anthropic.com) — **non** il tuo abbonamento Claude.ai, sono due prodotti separati

## 2. Imposta la chiave (mai dentro al codice)

**Mac / Linux, nel terminale, prima di lanciare lo script:**
```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```
Questo vale solo per la sessione di terminale corrente. Per non doverlo ripetere ogni volta, puoi aggiungere quella riga al tuo `~/.zshrc` o `~/.bashrc`.

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxx"
```

## 3. Esegui il test

```bash
node extract.js percorso/al/documento.pdf
```

Formati supportati: PDF, PNG, JPG, WEBP.

Lo script stampa a schermo tipo di documento, asset suggerito (tra quelli già noti al modello dati di HomeOS), confidenza, campi estratti, e una stima del costo della singola chiamata. Salva anche il risultato in un file `.estratto.json` accanto al documento originale.

## 4. Cosa aspettarsi di costo

Con il modello di default (Sonnet), un documento tipico (fattura, certificato di 1-2 pagine) costa nell'ordine di **pochi millesimi di dollaro** a chiamata. Per abbattere ulteriormente il costo in fase di test puoi cambiare la riga `const MODEL` in `extract.js` da `"claude-sonnet-5"` a `"claude-haiku-4-5-20251001"`.

## 5. Nota di sicurezza

Non condividere mai `extract.js` con la chiave scritta dentro, non fare commit della chiave su Git, e imposta un tetto di spesa mensile nella dashboard della Console Anthropic mentre fai i test.
