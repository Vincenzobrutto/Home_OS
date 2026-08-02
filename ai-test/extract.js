#!/usr/bin/env node
/**
 * HomeOS — test di estrazione documentale via Claude API
 *
 * Uso:
 *   ANTHROPIC_API_KEY=sk-ant-... node extract.js percorso/al/documento.pdf
 *
 * La chiave NON va mai scritta in questo file: viene letta solo dalla
 * variabile d'ambiente ANTHROPIC_API_KEY, impostata sulla tua macchina.
 *
 * Nessuna dipendenza esterna richiesta: usa il fetch nativo di Node 18+.
 */

const fs = require("fs");
const path = require("path");

const MODEL = "claude-sonnet-5"; // per volumi alti/documenti semplici: "claude-haiku-4-5-20251001"

// Stessa lista di tipi Asset usata nel prototipo HomeOS — tenerla allineata
// a mano finché prototipo e script non condividono un unico file di config.
const ASSET_TYPES = [
  "caldaia", "elettrico", "idraulico", "fotovoltaico",
  "clima", "tetto", "finestre", "elettrodomestico",
];

const SYSTEM_PROMPT = `Sei il motore di estrazione documentale di HomeOS, un'app che collega documenti della casa (fatture, certificati, manuali) agli Asset a cui si riferiscono.

Analizza il documento e rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, con questa forma esatta:

{
  "docType": "tipo di documento in italiano, es. Fattura, Certificato di conformità, Manuale",
  "suggestedAssetType": "uno tra: ${ASSET_TYPES.join(", ")} — oppure null se non riconducibile a nessuno di questi",
  "confidence": numero 0-100 che rappresenta quanto sei sicuro dell'estrazione (bassa se il documento è manoscritto, sfocato, o ambiguo),
  "fields": [["Etichetta campo", "Valore"], ...]
}

Regole:
- Nei "fields" includi solo dati realmente presenti nel documento: fornitore, date, importi, numeri di certificazione, modelli, garanzie. Non inventare mai un valore assente.
- Se il documento sembra riferirsi a un tipo di asset non nella lista, imposta "suggestedAssetType" a null e descrivi comunque i campi trovati.
- "confidence" deve riflettere onestamente la leggibilità del documento, non solo la sua completezza.`;

function mediaTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return { kind: "document", mediaType: "application/pdf" };
  if (ext === ".png") return { kind: "image", mediaType: "image/png" };
  if (ext === ".jpg" || ext === ".jpeg") return { kind: "image", mediaType: "image/jpeg" };
  if (ext === ".webp") return { kind: "image", mediaType: "image/webp" };
  throw new Error(`Formato non supportato: ${ext}. Usa PDF, PNG, JPG o WEBP.`);
}

async function extract(filePath) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Errore: variabile ANTHROPIC_API_KEY non impostata.");
    console.error("Esempio: ANTHROPIC_API_KEY=sk-ant-... node extract.js documento.pdf");
    process.exit(1);
  }

  const { kind, mediaType } = mediaTypeFor(filePath);
  const base64Data = fs.readFileSync(filePath).toString("base64");

  const contentBlock = kind === "document"
    ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64Data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: "Estrai i dati da questo documento secondo le istruzioni." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Nessuna risposta testuale ricevuta dal modello.");

  let parsed;
  try {
    // Rimuove eventuali blocchi ```json che il modello potrebbe aggiungere comunque
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Risposta del modello non era JSON valido:");
    console.error(textBlock.text);
    process.exit(1);
  }

  return { parsed, usage: data.usage };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: node extract.js percorso/al/documento.pdf");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`);
    process.exit(1);
  }

  console.log(`Analizzo ${path.basename(filePath)}...\n`);
  const { parsed, usage } = await extract(filePath);

  console.log("— Risultato —");
  console.log(`Tipo documento:      ${parsed.docType}`);
  console.log(`Asset suggerito:     ${parsed.suggestedAssetType ?? "(nessun match)"}`);
  console.log(`Confidenza:          ${parsed.confidence}%`);
  console.log("Campi estratti:");
  for (const [label, value] of parsed.fields) {
    console.log(`  - ${label}: ${value}`);
  }

  if (usage) {
    // Stima costo approssimativa per questa singola chiamata (prezzi Sonnet: $3/$15 per milione di token)
    const costUsd = (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
    console.log(`\nToken usati: ${usage.input_tokens} input / ${usage.output_tokens} output (~$${costUsd.toFixed(4)})`);
  }

  const outPath = filePath.replace(/\.[^.]+$/, "") + ".estratto.json";
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`\nSalvato anche in: ${outPath}`);
}

main().catch((err) => {
  console.error("Errore:", err.message);
  process.exit(1);
});
