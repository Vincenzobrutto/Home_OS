import { citation, type Citation } from '../economy/document-domain';
import { object, text, invalid, uuid, version } from '../review/domain';
import { ProviderFailure, type Snapshot } from '../review/provider';
import { digest } from '../security';
import { printedCents, printedDates } from '../economy/document-evidence';
import { receiptPurchaseDate, tableQuantity } from './invoice-evidence';
import { calendar } from '../activities/domain';

export const onboardingLimits = { maxItems: 20, maxUnits: 20, maxImageBytes: 5 * 1024 * 1024 } as const;
export const productFields = ['name', 'brand', 'model', 'reference', 'serialNumber', 'powerWatts', 'voltageVolts', 'frequencyHz', 'capacityLitres', 'purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'] as const;
export type ProductField = typeof productFields[number];
export type Region = { x: number; y: number; width: number; height: number };
export type ProductSource = Citation & { basis: 'verified_text' | 'provider_observed_image'; region: Region | null };
export type ProductValue = { value: string; source: ProductSource };
export type ProductItem = {
  id: string; fingerprint: string;
  fields: Partial<Record<ProductField, ProductValue>>;
  quantity: { value: number; source: ProductSource } | null;
  nameTruncated: boolean;
  disposition: 'household_object' | 'consumable' | 'uncertain';
};
export type ProductExtraction = {
  documentKind: 'delivery_notice' | 'order_confirmation' | 'purchase_document' | 'product_document' | 'device_label' | 'unsupported';
  items: ProductItem[];
  needsReview: boolean;
  purchaseTotal: { amountCents: number; source: ProductSource } | null;
};
export type ProductEvidenceContext = { snapshot: Snapshot } & (
  { kind: 'text'; pages: string[] } | { kind: 'image' } | { kind: 'visual_pdf'; pageCount: number }
);
export class ProductEvidenceFailure extends ProviderFailure {
  constructor(readonly field: ProductField | 'quantity' | 'purchaseTotal', readonly reason: 'citation' | 'value' | 'date' | 'unit' | 'quantity' | 'total') { super('evidence_unverified'); }
}
const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
const equal = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && normalize(a).toLocaleLowerCase('it') === normalize(b).toLocaleLowerCase('it');

function region(input: unknown): Region {
  const r = object(input, ['x', 'y', 'width', 'height']);
  for (const key of ['x', 'y', 'width', 'height']) if (typeof r[key] !== 'number' || !Number.isFinite(r[key]) || r[key] as number < 0 || r[key] as number > 1) throw invalid();
  const result = r as Region;
  if (result.width <= 0 || result.height <= 0 || result.x + result.width > 1.000001 || result.y + result.height > 1.000001) throw invalid();
  return result;
}

function evidence(input: unknown, context: ProductEvidenceContext): ProductSource {
  const r = object(input, ['page', 'excerpt', 'region']);
  const excerpt = text(r.excerpt, 2000);
  if (!Number.isSafeInteger(r.page) || Number(r.page) < 1) throw invalid();
  const bound = { documentId: context.snapshot.documentId, documentVersion: context.snapshot.documentVersion, sha256: context.snapshot.documentSha256, page: Number(r.page), excerpt };
  if (context.kind === 'text') {
    if (r.region !== null) throw invalid();
    return { ...citation(bound, context.pages, context.snapshot), basis: 'verified_text', region: null };
  }
  if (context.kind === 'image' ? r.page !== 1 : Number(r.page) > context.pageCount) throw invalid();
  return { ...bound, basis: 'provider_observed_image', region: region(r.region) };
}

/** Validates provider output, not truth of visual observations. No DB writes. */
export function productExtraction(input: unknown, context: ProductEvidenceContext): ProductExtraction {
  try {
    const row = object(input, ['documentKind', 'items', 'hasMoreItems', 'purchaseTotal', 'requiresHumanReview']);
    if (!['delivery_notice', 'order_confirmation', 'purchase_document', 'product_document', 'device_label', 'unsupported'].includes(String(row.documentKind)) || typeof row.hasMoreItems !== 'boolean' || !Array.isArray(row.items) || row.items.length > onboardingLimits.maxItems) throw invalid();
    if (row.hasMoreItems) throw new ProviderFailure('object_onboarding_too_many_items');
    if (row.documentKind === 'unsupported' && row.items.length) throw invalid();
    const fingerprints = new Set<string>();
    if (row.requiresHumanReview !== undefined && typeof row.requiresHumanReview !== 'boolean') throw invalid();
    let needsReview = row.requiresHumanReview === true;
    const items: ProductItem[] = [];
    for (const raw of row.items) {
      const r = object(raw, ['fields', 'quantity', 'nameTruncated', 'disposition', 'confidence']);
      if (typeof r.nameTruncated !== 'boolean' || !['household_object', 'consumable', 'uncertain'].includes(String(r.disposition)) || !['high', 'low'].includes(String(r.confidence))) throw invalid();
      const fields: Partial<Record<ProductField, ProductValue>> = {};
      for (const [key, rawField] of Object.entries(object(r.fields, [...productFields]))) {
        if (rawField === null) continue;
        const field = object(rawField, ['value', 'evidence']);
        const value = normalize(text(field.value, key === 'brand' || key === 'serialNumber' ? 80 : 120));
        let source:ProductSource;try{source=evidence(field.evidence,context);}catch(error){if(error instanceof ProviderFailure&&error.code==='evidence_unverified')throw new ProductEvidenceFailure(key as ProductField,'citation');throw error;}
        if (['purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'].includes(key)) {
          calendar(value);
          const dateMeaning = ({purchaseDate: /(?:data.{0,12}(?:acquisto|ordine|fattura)|purchase.{0,8}date|order.{0,8}date|acquistato.{0,5}il)/iu,deliveredDate: /(?:consegnato.{0,8}il|consegna.{0,8}effettiva|delivered.{0,8}on)/iu,warrantyStart: /(?:inizio.{0,10}garanzia|garanzia.{0,10}(?:dal|decorrenza)|warranty.{0,10}start)/iu,warrantyEnd: /(?:scadenza.{0,10}garanzia|garanzia.{0,10}(?:al|fino)|warranty.{0,10}(?:end|expir))/iu} as Record<string,RegExp>)[key];
          if ((key==='purchaseDate'||key==='deliveredDate')&&value>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'}))throw new ProviderFailure('evidence_unverified');
          if (!(dateMeaning.test(source.excerpt)&&printedDates(source.excerpt).length===1&&printedDates(source.excerpt).includes(value)) && !(key==='purchaseDate'&&row.documentKind==='purchase_document'&&receiptPurchaseDate(source.excerpt,value))) throw new ProductEvidenceFailure(key as ProductField,'date');
        } else if (!normalize(source.excerpt).includes(value)) throw new ProductEvidenceFailure(key as ProductField,'value');
        const unit = ({ powerWatts: 'W', voltageVolts: 'V', frequencyHz: 'Hz', capacityLitres: '(?:L|litri|litres?|liters?)' } as Record<string, string>)[key];
        if (unit && (!/^\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$/u.test(value) || !new RegExp(value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&') + '\\s*' + unit + '\\b', 'iu').test(source.excerpt))) throw new ProductEvidenceFailure(key as ProductField,'unit');
        fields[key as ProductField] = { value, source };
      }
      const primary = fields.name ?? fields.reference ?? fields.model;
      if (!primary || !fields.name && row.documentKind !== 'device_label') throw invalid();
      let quantity: ProductItem['quantity'] = null;
      if (r.quantity !== null) {
        const q = object(r.quantity, ['value', 'evidence']);
        if (!Number.isSafeInteger(q.value) || Number(q.value) < 1 || Number(q.value) > onboardingLimits.maxUnits) throw invalid();
        const source = evidence(q.evidence, context);
        const printed = [...source.excerpt.matchAll(/(?:quantit[aà]|quantity|qty|qt[aà])\s*[:x×]?\s*(\d+)\b/giu)].map(match => Number(match[1]));
        const table=context.kind==='text'&&fields.name?tableQuantity(source.excerpt,fields.name.value):null;
        if (source.page !== primary.source.page || !(printed.length===1&&printed[0]===q.value || printed.length===0&&table===q.value)) throw new ProductEvidenceFailure('quantity','quantity');
        quantity = { value: Number(q.value), source };
      }
      if (r.confidence === 'low') { needsReview = true; continue; }
      const fingerprint = digest(JSON.stringify([context.snapshot.documentSha256, normalize(primary.value).toLocaleLowerCase('it'), fields.brand?.value?.toLocaleLowerCase('it') ?? null, fields.model?.value?.toLocaleLowerCase('it') ?? fields.reference?.value?.toLocaleLowerCase('it') ?? null, primary.source.page, quantity?.value ?? null]));
      if (fingerprints.has(fingerprint)) throw new ProviderFailure('object_onboarding_repeated_item');
      fingerprints.add(fingerprint);
      const id = digest(JSON.stringify([context.snapshot.documentId, fingerprint]));
      items.push({ id, fingerprint, fields, quantity, nameTruncated: r.nameTruncated, disposition: r.disposition as ProductItem['disposition'] });
    }
    let purchaseTotal: ProductExtraction['purchaseTotal'] = null;
    if (row.purchaseTotal !== null && row.purchaseTotal !== undefined) {
      const total = object(row.purchaseTotal, ['amountCents', 'evidence']);
      const source = evidence(total.evidence, context);
      if (row.documentKind !== 'purchase_document' || !Number.isSafeInteger(total.amountCents) || Number(total.amountCents) <= 0 || Number(total.amountCents) > 999999999 || !/(?:€|\bEUR\b|\bEURO\b)/iu.test(source.excerpt) || !/^\s*totale(?:\s+(?:documento|scontrino|ricevuta|complessivo))?\s*[:=]?\s*(?:EUR|€)?\s*\d[\d., ]*\s*(?:EUR|€)?\s*$/iu.test(source.excerpt) || !printedCents(source.excerpt).includes(Number(total.amountCents))) throw new ProductEvidenceFailure('purchaseTotal','total');
      purchaseTotal = { amountCents: Number(total.amountCents), source };
    }
    return { documentKind: row.documentKind as ProductExtraction['documentKind'], items, needsReview, purchaseTotal };
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    throw new ProviderFailure('analysis_invalid_output');
  }
}

export type OnboardingObjectCandidate = {
  id: string; version: number; accountId: string; homeId: string; state: string;
  name: string; brand: string | null; model: string | null;
  confirmedItemFingerprints: string[];
};
export type ProductCandidateReason = 'confirmed_item' | 'same_brand_model' | 'same_complete_name';

/** Caller must query authorized names/fields first. Same document is NOT an item match. */
export function productCandidates(item: ProductItem, rows: OnboardingObjectCandidate[], scope: { accountId: string; homeId: string }) {
  return rows.flatMap(row => {
    if (row.accountId !== scope.accountId || row.homeId !== scope.homeId || row.state !== 'active') return [];
    const reasons: ProductCandidateReason[] = [];
    if (row.confirmedItemFingerprints.includes(item.fingerprint)) reasons.push('confirmed_item');
    const brand = item.fields.brand?.value, model = item.fields.model?.value;
    const contradicts = (!!brand && !!row.brand && !equal(brand, row.brand)) || (!!model && !!row.model && !equal(model, row.model));
    if (equal(brand, row.brand) && equal(model, row.model)) reasons.push('same_brand_model');
    if (!item.nameTruncated && !contradicts && equal(item.fields.name?.value, row.name)) reasons.push('same_complete_name');
    return reasons.length ? [{ id: row.id, version: row.version, reasons }] : [];
  }).sort((a, b) => Number(b.reasons.includes('confirmed_item')) - Number(a.reasons.includes('confirmed_item')) || a.id.localeCompare(b.id));
}

export type ProductChoice = { itemId: string } & (
  { action: 'skip' } | { action: 'create'; name: string; units: number } |
  { action: 'link'; objectId: string; expectedVersion: number }
);

/** Builds a write plan only. Transaction must recheck source, membership and targets. */
export function productChoices(input: unknown, extraction: ProductExtraction): { choices: ProductChoice[]; newObjects: number; expenses: 0 } {
  if (!Array.isArray(input) || !input.length || input.length > onboardingLimits.maxItems) throw invalid();
  const items = new Map(extraction.items.map(item => [item.id, item]));
  const seen = new Set<string>(), targets = new Set<string>();
  let newObjects = 0;
  const choices: ProductChoice[] = input.map(raw => {
    const r = object(raw, ['itemId', 'action', 'name', 'units', 'objectId', 'expectedVersion']);
    if (typeof r.itemId !== 'string' || !items.has(r.itemId) || seen.has(r.itemId)) throw invalid();
    seen.add(r.itemId);
    const item = items.get(r.itemId)!;
    if (r.action === 'skip') { object(raw, ['itemId', 'action']); return { itemId: r.itemId, action: 'skip' }; }
    if (r.action === 'link') {
      object(raw, ['itemId', 'action', 'objectId', 'expectedVersion']);
      const objectId = uuid(r.objectId);
      if (targets.has(objectId)) throw invalid('Due prodotti richiedono una verifica separata prima di collegarli alla stessa scheda.');
      targets.add(objectId);
      return { itemId: r.itemId, action: 'link', objectId, expectedVersion: version(r.expectedVersion) };
    }
    if (r.action !== 'create') throw invalid();
    object(raw, ['itemId', 'action', 'name', 'units']);
    if (item.disposition !== 'household_object') throw invalid('Questo articolo richiede una verifica manuale prima di creare una scheda.');
    if (!Number.isSafeInteger(r.units) || Number(r.units) < 1 || Number(r.units) !== (item.quantity?.value ?? 1)) throw invalid('Conferma esplicitamente tutte le unità di questo articolo oppure rivedilo separatamente.');
    newObjects += Number(r.units);
    if (newObjects > onboardingLimits.maxUnits) throw invalid();
    return { itemId: r.itemId, action: 'create', name: normalize(text(r.name, 120)), units: Number(r.units) };
  });
  return { choices, newObjects, expenses: 0 };
}

export function productConfirmation(input: unknown, extraction: ProductExtraction, snapshot: Snapshot) {
  const row = object(input, ['expectedVersion', 'source', 'choices']);
  const source = object(row.source, ['documentId', 'documentVersion', 'sha256']);
  if (source.documentId !== snapshot.documentId || source.documentVersion !== snapshot.documentVersion || source.sha256 !== snapshot.documentSha256) throw invalid('Il documento è cambiato: ricarica la proposta.');
  return { expectedVersion: version(row.expectedVersion), ...productChoices(row.choices, extraction) };
}
