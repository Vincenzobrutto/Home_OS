import { Candidate, FieldKey, candidate, decimal, object, text } from './domain';
import { ProviderFailure } from './provider';
import { TextDocument } from './pdf-text';
export const OUTPUT_SCHEMA = { type: 'object', additionalProperties: false, required: ['multipleAssets', 'claims'], properties: {
  multipleAssets: { type: 'boolean' }, claims: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['fieldKey', 'value', 'documentIndex', 'page', 'excerpt', 'quantityLabel'], properties: {
    fieldKey: { type: 'string', enum: ['brand', 'model', 'power'] }, value: { type: 'string', description: 'For power: the exact numeric portion only, such as "24" or "24,5", WITHOUT kW or other text. For brand/model: exact printed text.' }, documentIndex: { type: 'integer' }, page: { type: 'integer' }, excerpt: { type: 'string' }, quantityLabel: { type: ['string', 'null'] },
  } } },
} };
export const normalized = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
export function validateEvidence(input: unknown, documents: TextDocument[]): Record<FieldKey, Candidate[]> {
  try {
    const result = object(input, ['multipleAssets', 'claims']);
    if (typeof result.multipleAssets !== 'boolean' || !Array.isArray(result.claims) || result.claims.length > 30) throw new ProviderFailure('analysis_invalid_output');
    if (result.multipleAssets) throw new ProviderFailure('multi_assets_unsupported');
    const groups: Record<FieldKey, Map<string, Candidate>> = { brand: new Map(), model: new Map(), power: new Map() };
    for (const raw of result.claims) {
      const row = object(raw, ['fieldKey', 'value', 'documentIndex', 'page', 'excerpt', 'quantityLabel']);
      if (!['brand', 'model', 'power'].includes(String(row.fieldKey)) || !Number.isInteger(row.documentIndex) || !Number.isInteger(row.page)) throw new ProviderFailure('analysis_invalid_output');
      const field = row.fieldKey as FieldKey, document = documents[Number(row.documentIndex)], page = Number(row.page);
      const excerpt = text(row.excerpt, 2000), value = text(row.value, field === 'brand' ? 80 : field === 'model' ? 120 : 40);
      if (!document || page < 1 || !document.pages[page - 1] || !normalized(document.pages[page - 1]).includes(normalized(excerpt)) || !normalized(excerpt).includes(normalized(value))) throw new ProviderFailure('evidence_unverified');
      const source = { ...document.snapshot, page, excerpt };
      let measurement;
      if (field === 'power') {
        const quantityLabel = text(row.quantityLabel, 160);
        if (!normalized(excerpt).includes(normalized(quantityLabel))) throw new ProviderFailure('evidence_unverified');
        const canonical = decimal(value.replace(',', '.'));
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const label = quantityLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`${label}\\s*[:=–-]?\\s*${escaped}\\s*kW(?!\\w)`, 'u').test(normalized(excerpt))) throw new ProviderFailure('evidence_unverified');
        const quantityCode = quantityLabel === 'Potenza utile al riscaldamento' ? 'useful_heating' as const : quantityLabel === 'Potenza nominale riportata' ? 'reported_nominal' as const : 'other' as const;
        measurement = { value: canonical, unit: 'kW' as const, quantityLabel, quantityCode };
      } else if (row.quantityLabel !== null) throw new ProviderFailure('analysis_invalid_output');
      const key = JSON.stringify([measurement?.value ?? value, measurement]); const prior = groups[field].get(key);
      if (prior) { if (!prior.sources.some(s => JSON.stringify(s) === JSON.stringify(source))) prior.sources.push(source); }
      else groups[field].set(key, candidate(measurement?.value ?? value, [source], measurement));
    }
    return { brand: [...groups.brand.values()], model: [...groups.model.values()], power: [...groups.power.values()] };
  } catch (error) { if (error instanceof ProviderFailure) throw error; throw new ProviderFailure('analysis_invalid_output'); }
}
