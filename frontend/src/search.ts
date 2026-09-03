// Ricerca unificata (B49) — funzione pura, nessuna richiesta di rete per
// keystroke: stesso pattern già collaudato in HouseDocuments.tsx (filtro
// client-side su array già caricati), esteso a più tipi di entità. Dataset
// per casa piccoli (decine di righe per tipo, nessuna paginazione in tutto
// il backend), quindi un endpoint di ricerca dedicato non è giustificato
// oggi — vedi decisions.md B49.
import type { Asset, Contact, CustomField, DocumentRecord, Intervention, Warranty } from './types';

export type SearchResultKind = 'asset' | 'contact' | 'document' | 'warranty' | 'intervention';

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
}

type AssetWithFields = Asset & { customFields?: CustomField[] };

export interface SearchData {
  assets: AssetWithFields[];
  contacts: Contact[];
  documents: DocumentRecord[];
  warranties: Warranty[];
  interventions: Intervention[];
}

function matches(value: string | null | undefined, q: string): boolean {
  return !!value && value.toLowerCase().includes(q);
}

export function searchHouse(query: string, data: SearchData): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const asset of data.assets) {
    if (asset.dismissedAt) continue;
    const fields = [
      asset.name,
      asset.code,
      asset.manufacturer,
      asset.model,
      asset.serialNumber,
      asset.supplier,
      ...(asset.customFields ?? []).map((f) => f.value),
    ];
    if (fields.some((v) => matches(v, q))) {
      results.push({ kind: 'asset', id: asset.id, title: asset.name, subtitle: asset.code });
    }
  }

  for (const contact of data.contacts) {
    if ([contact.name, contact.role, contact.phone, contact.email].some((v) => matches(v, q))) {
      results.push({ kind: 'contact', id: contact.id, title: contact.name, subtitle: contact.role ?? 'Contatto' });
    }
  }

  for (const doc of data.documents) {
    if ([doc.originalFilename, doc.docType].some((v) => matches(v, q))) {
      results.push({ kind: 'document', id: doc.id, title: doc.originalFilename, subtitle: doc.docType ?? 'Documento' });
    }
  }

  for (const warranty of data.warranties) {
    const assetName = warranty.asset?.name ?? '';
    if ([warranty.kind, warranty.notes, assetName].some((v) => matches(v, q))) {
      results.push({
        kind: 'warranty',
        id: warranty.id,
        title: assetName ? `Garanzia — ${assetName}` : 'Garanzia',
        subtitle: `scade il ${warranty.expiresAt.slice(0, 10)}`,
      });
    }
  }

  for (const intervention of data.interventions) {
    const contactName = intervention.contact?.name ?? '';
    const assetNames = intervention.assets.map((a) => a.name).join(', ');
    if ([intervention.title, intervention.description, contactName, assetNames].some((v) => matches(v, q))) {
      results.push({
        kind: 'intervention',
        id: intervention.id,
        title: intervention.title,
        subtitle: assetNames || contactName || 'Intervento',
      });
    }
  }

  return results;
}
