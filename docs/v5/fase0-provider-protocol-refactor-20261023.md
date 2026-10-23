# R08 — protocollo del provider separato

23 ottobre 2026, branch codex/fase0-ai-quality-v3. Seguito del lotto R04 conferma 0571817.

## Confini

anthropic-provider conserva preparazione, autorizzazione, trasporto e diagnostica del rifiuto. provider-schema contiene schema e adattamento per modalità; provider-wire espande la rappresentazione compatta; provider-prompt contiene versione e istruzioni. Gli export storici dal provider restano disponibili. Nessuna dipendenza nuova né chiamata esterna.

La stringa del prompt è identica byte per byte e lo schema JSON identico, incluso ordine delle proprietà. Versione invariata document-understanding-v29-semantic-roles: nessuna revisione semantica o nuova misura AI. Hash UTF-8 prompt `5e30d7b65b73256ecb38a5aeb647450474cb8bda1e30add6e292c42116329afe`; hash JSON schema `69b36e4827eb5eb3e6b5cd67e2edeaa0191db968f164c09e63f08ef80142c535`. I tre nuovi sorgenti entrano nel freeze delle future autorizzazioni; un test rifiuta l'alterazione di ciascun hash. Autorizzazioni e ricevute storiche non riscritte né riattivate.

## Verifica

- Confronto contro modulo prima dell'estrazione: 15 schemi (testo/immagine/PDF e selezioni pagine), 507 risposte compatte valide/malformate con stessi output/errori/effetti sull'input; 12 richieste preparate e contatori di autorizzazione identici, incluse lettura progressiva e planimetrie. Trasporto solo in memoria.
- Build/lint, onboarding 300/300, qualità offline 24/24, guardie 16/16. Nessuna asserzione o timeout esistente cambiato; un test nuovo sul freeze.
- Nessuna nuova suite DB dichiarata per questo lotto: R04 precedente ha verificato 495/495 sul proprio cluster. Collaudo complessivo di chiusura da registrare separatamente.
- Nessuna AI/email, DB reale, .env, gold o consenso modificato. I corpi di prepare/decode e documentScope restano identici.

R08 completato come separazione strutturale; miglioramenti semantici, riduzione di token o accuratezza richiedono lavoro distinto e non sono dichiarati.
