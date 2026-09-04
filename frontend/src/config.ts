// Flag di navigazione per la private alpha (MVP v1, vedi docs/mvp-v1.md e
// decisions.md #51). Una singola costante, non un sistema di flag
// per-utente: sproporzionato per una coorte di 15-20 persone. Per tornare
// al prodotto completo basta impostarla a false — nessuna funzionalità
// nascosta viene rimossa dal codice.
export const ALPHA_MODE = true;

// Le uniche 3 regole Home Detective che restano visibili in "Da tenere
// d'occhio" durante l'alpha (vedi mvp-v1.md §5, tabella Home Detective).
// GENESIS_INCOMPLETE è esclusa a prescindere: l'alpha completa Genesis in
// automatico alla creazione della casa (vedi Bootstrap.tsx), quindi non ha
// mai motivo di comparire. ASSET_WITHOUT_ROOM non esiste più (B44). Le 4
// regole di B49 (Intervention/Warranty/Contact) citano concetti che
// l'alpha nasconde altrove (Rubrica, interventi strutturati) e restano
// escluse per ora.
export const ALPHA_VISIBLE_RULE_CODES = new Set([
  'HEATING_SYSTEM_WITHOUT_DOCUMENTATION',
  'UNCONFIRMED_SCAN_RESULTS',
  'HOUSE_WITHOUT_DOCUMENTS',
]);
