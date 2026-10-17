import { productNameIdentity } from './product-name';
import { calendar } from '../activities/domain';
import { invalid, object, text } from '../review/domain';
import type { ProductItem, ProductSource } from './domain';

export const profileFields = ['brand', 'model', 'reference', 'serialNumber', 'powerWatts', 'voltageVolts', 'frequencyHz', 'capacityLitres', 'purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'] as const;
export type ProfileKey = typeof profileFields[number];
export type ProfileOrigin = 'user_declared' | 'extraction_confirmed' | 'derived_from_purchase' | 'derived_from_delivery' | 'default_24_months' | 'manufacturer_page' | 'derived_from_product_name';
export type ProfileField = { value: string; origin: ProfileOrigin; sources: ProductSource[]; externalSource?: { url: string; checkedAt: string } };
export type ObjectProfile = Partial<Record<ProfileKey, ProfileField>>;

export function addCalendarMonths(value: string, months: number) {
  calendar(value);
  const [year, month, day] = value.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months + 1, 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, end.getUTCDate())).padStart(2, '0')}`;
}
export function profileValue(key: ProfileKey, input: unknown): string {
  const value = text(input, key === 'brand' || key === 'serialNumber' ? 80 : 120).normalize('NFC').replace(/\s+/gu, ' ');
  if (key.endsWith('Date') || key.startsWith('warranty')) return calendar(value)!;
  if (['powerWatts', 'capacityLitres'].includes(key) && (!/^\d+(?:[.,]\d+)?$/u.test(value) || Number(value.replace(',', '.')) <= 0 || Number(value.replace(',', '.')) > 1000000)) throw invalid('Controlla il valore e la sua unità.');
  if (['voltageVolts', 'frequencyHz'].includes(key) && !/^\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$/u.test(value)) throw invalid('Controlla il valore o l’intervallo.');
  return value;
}
export function proposedProfile(item: ProductItem): ObjectProfile {
  const result: ObjectProfile = {};
  for (const key of profileFields) if (item.fields[key]) result[key] = { value: profileValue(key, item.fields[key]!.value), origin: 'extraction_confirmed', sources: [item.fields[key]!.source] };
  const inferred=productNameIdentity(item);
  const equal=(a:string,b:string)=>a.normalize('NFC').toLocaleLowerCase('it')===b.normalize('NFC').toLocaleLowerCase('it');
  const contradicts=(['brand','model'] as const).some(key=>result[key]&&inferred[key]&&!equal(result[key]!.value,inferred[key]!));
  const identity=contradicts?{}:inferred;
  for(const key of ['brand','model'] as const) if(!result[key]&&identity[key]&&item.fields.name) result[key]={value:profileValue(key,identity[key]),origin:'derived_from_product_name',sources:[item.fields.name.source]};
  if (!result.warrantyStart && (result.deliveredDate || result.purchaseDate)) {
    const base = result.deliveredDate ?? result.purchaseDate!;
    result.warrantyStart = { value: base.value, origin: result.deliveredDate ? 'derived_from_delivery' : 'derived_from_purchase', sources: base.sources };
  }
  if (!result.warrantyEnd && result.warrantyStart) result.warrantyEnd = { value: addCalendarMonths(result.warrantyStart.value, 24), origin: 'default_24_months', sources: result.warrantyStart.sources };
  return result;
}

export type ProfileDecisions = Partial<Record<ProfileKey, { action: 'accept' | 'manual' | 'keep' | 'defer' | 'skip'; value?: string }>>;
export function profileDecisions(input: unknown): ProfileDecisions {
  const row = object(input ?? {}, [...profileFields]), result: ProfileDecisions = {};
  for (const [key, raw] of Object.entries(row)) {
    const field = key as ProfileKey, decision = object(raw, ['action', 'value']);
    if (!['accept', 'manual', 'keep', 'defer', 'skip'].includes(String(decision.action))) throw invalid();
    if (decision.action !== 'manual' && decision.value !== undefined) throw invalid();
    result[field] = { action: decision.action as NonNullable<ProfileDecisions[ProfileKey]>['action'], ...(decision.action === 'manual' ? { value: profileValue(field, decision.value) } : {}) };
  }
  return result;
}
export function resolveProfile(existing: ObjectProfile, proposals: ObjectProfile, decisions: ProfileDecisions) {
  const fields = { ...existing }, deferred: ObjectProfile = {};
  for (const [field, decision] of Object.entries(decisions)) {
    const key = field as ProfileKey, old = existing[key], proposal = proposals[key];
    if (decision.action === 'skip' || decision.action === 'keep') continue;
    if (decision.action === 'defer') { if (old && proposal && old.value !== proposal.value) deferred[key] = proposal; continue; }
    const value = decision.action === 'manual' ? decision.value! : proposal?.value;
    if (!value) throw invalid('Nessun valore proposto da accettare.');
    if (old) { if (old.value !== value) throw invalid('Il dato è già confermato. Mantienilo o decidi più avanti.'); continue; }
    fields[key] = decision.action === 'manual' ? { value, origin: 'user_declared', sources: [] } : proposal!;
  }
  if(decisions.warrantyStart?.action==='accept'&&proposals.warrantyStart?.origin.startsWith('derived_from_')){const base=proposals.warrantyStart.origin==='derived_from_delivery'?fields.deliveredDate:fields.purchaseDate;if(base&&base.value!==fields.warrantyStart?.value)throw invalid('Hai cambiato una data: controlla anche l’inizio garanzia proposto.');}
  if(decisions.warrantyEnd?.action==='accept'&&proposals.warrantyEnd?.origin==='default_24_months'&&fields.warrantyStart&&addCalendarMonths(fields.warrantyStart.value,24)!==fields.warrantyEnd?.value)throw invalid('Hai cambiato l’inizio garanzia: controlla anche la scadenza proposta.');
  const start = fields.warrantyStart?.value, end = fields.warrantyEnd?.value;
  if (start && end && end < start) throw invalid('La fine garanzia non può precedere l’inizio.');
  return { fields, deferred };
}
