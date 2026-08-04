// Rileva se il nome proposto da un'Observation (Room o Asset) assomiglia a
// qualcosa che esiste già in casa — usato SOLO per avvisare l'utente nello
// step di revisione (badge + scelta di default "Scarta" invece di
// "Conferma", sempre annullabile) e per far risolvere agli Asset osservati
// nello stesso giro la Room reale già esistente quando quella proposta da
// Genesis viene scartata in quanto duplicata. Non fonde MAI dati in
// automatico: unire per errore due impianti realmente diversi sarebbe un
// danno peggiore di un duplicato lasciato lì, scartabile a mano — vedi
// decisions.md #25. Stessa euristica "parola significativa condivisa" già
// validata in documents.service.ts (haveSimilarSuggestedName, decisions.md
// #23), adattata qui: senza la restrizione PRODUCT_WORDS su una singola
// parola condivisa, perché i nomi di ambiente non hanno lo stesso rischio di
// "solo la marca in comune" dei nomi di elettrodomestici.
const STOPWORDS = new Set([
  'con',
  'per',
  'del',
  'della',
  'dello',
  'nel',
  'nella',
  'casa',
  'impianto',
]);

function significantWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

export interface DuplicateCandidate {
  id: string;
  name: string;
  // Facoltativo: portato attraverso invariato solo per essere mostrato
  // all'utente (es. "AST-014") come riferimento per andare a controllare la
  // scheda reale — non usato dal matching.
  code?: string;
}

export function findPossibleDuplicate(
  proposedName: string,
  candidates: DuplicateCandidate[],
): DuplicateCandidate | null {
  const normalizedProposed = proposedName.trim().toLowerCase();
  const proposedWords = significantWords(proposedName);
  for (const candidate of candidates) {
    if (candidate.name.trim().toLowerCase() === normalizedProposed) {
      return candidate;
    }
    const candidateWords = significantWords(candidate.name);
    const sharedAny = [...proposedWords].some((w) => candidateWords.has(w));
    if (sharedAny) {
      return candidate;
    }
  }
  return null;
}
