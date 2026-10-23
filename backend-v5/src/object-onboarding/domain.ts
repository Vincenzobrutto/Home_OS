import { columnProductRow } from './role-evidence';
import { invoiceCoverage, assertInvoicePages, type InvoiceCoverage } from './invoice-coverage';
import { verifiedInvoiceLine, type InvoiceLine } from './invoice-lines';
import { paymentReview, type PaymentReview } from './payment-review';
import { contactProposal, type ContactProposal } from '../contacts/extraction';
import { readObjectType, type ObjectTypeProposal } from './object-type';
import { HttpException } from '@nestjs/common';
import { citation, type Citation, type EconomicOutput } from '../economy/document-domain';
import { object, text, invalid, uuid, version } from '../review/domain';
import { ProviderFailure, type Snapshot } from '../review/provider';
import { digest } from '../security';
import { printedCents, printedDates, periodBoundary } from '../economy/document-evidence';
import { readUnderstanding, type DocumentUnderstanding, type UnderstandingWarning } from './understanding';
import { calendar } from '../activities/domain';
import { separateInvoices } from './invoice-segments';
import { locateDecodeFailure, type DecodeLocation } from './decode-diagnostic';
import { shortProductName } from './short-name';
import { validateProductField, ProductEvidenceFailure } from './field-validation';
import { validateProductQuantity, validateProductAmount, validatePurchaseTotal } from './purchase-validation';
export { ProductEvidenceFailure } from './field-validation';

export const onboardingLimits = { maxItems: 20, maxUnits: 20, maxImageBytes: 5 * 1024 * 1024 } as const;
export const productFields = ['name', 'brand', 'model', 'reference', 'serialNumber', 'powerWatts', 'voltageVolts', 'frequencyHz', 'capacityLitres', 'orderDate', 'purchaseDate', 'deliveredDate', 'warrantyStart', 'warrantyEnd'] as const;
export type ProductField = typeof productFields[number];
export type Region = { x: number; y: number; width: number; height: number };
export type ProductSource = Citation & { basis: 'verified_text' | 'provider_observed_image'; region: Region | null };
export type ProductValue = { value: string; source: ProductSource };
export type ProductItem = {
  /** Entire verified source name retained when the display name is abbreviated. */
  fullName?: string;
  invoiceLine?: InvoiceLine;
  objectType?: ObjectTypeProposal;
  id: string; fingerprint: string; sourceIndex?: number; subjectKind?: 'product' | 'system';
  fields: Partial<Record<ProductField, ProductValue>>;
  quantity: { value: number; source: ProductSource } | null;
  purchaseAmount?: { amountCents: number; source: ProductSource } | null;
  nameTruncated: boolean;
  disposition: 'household_object' | 'consumable' | 'uncertain';
};
export type HouseExpense = EconomicOutput & {id:string;fingerprint:string;reviewWarnings?:string[];invoiceSegment?:{key:string;page:number}};
export type ProductExtraction = {
  evidenceMode?: 'text'|'image'|'visual_pdf';
  paymentReview?: PaymentReview;
  invoiceCoverage?: InvoiceCoverage;
  floorPlan?: import('./floor-plan-domain').FloorPlan;
  contacts?:ContactProposal[];
  houseExpenses?:HouseExpense[];
  documentInfo?:DocumentUnderstanding;
  reviewWarnings?:UnderstandingWarning[];
  documentKind: 'delivery_notice' | 'order_confirmation' | 'purchase_document' | 'product_document' | 'device_label' | 'utility_bill' | 'conformity_declaration' | 'house_document' | 'unsupported';
  items: ProductItem[];
  needsReview: boolean;
  /** Human review may propose a verified cost despite optional delivery/guarantee omissions. Never authorizes automatic confirmation. */
  purchaseExpenseReady?: boolean;
  purchaseTotal: { amountCents: number; source: ProductSource } | null;
};
export type ProductEvidenceContext = { snapshot: Snapshot; allowedPages?:number[]; invoiceExpensePages?:number[] } & (
  { kind: 'text'; pages: string[] } | { kind: 'image' } | { kind: 'visual_pdf'; pageCount: number }
);
const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
const equal = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && normalize(a).toLocaleLowerCase('it') === normalize(b).toLocaleLowerCase('it');

function region(input: unknown): Region {
  try {
  const r = object(input, ['x', 'y', 'width', 'height']);
  for (const key of ['x', 'y', 'width', 'height']) if (typeof r[key] !== 'number' || !Number.isFinite(r[key]) || r[key] as number < 0 || r[key] as number > 1) throw invalid();
  const result = r as Region;
  if (result.width <= 0 || result.height <= 0 || result.x + result.width > 1.000001 || result.y + result.height > 1.000001) throw invalid();
  return result;
  } catch (error) { throw locateDecodeFailure(error, { section: 'source_region' }); }
}

function evidence(input: unknown, context: ProductEvidenceContext): ProductSource {
  const r = object(input, ['page', 'excerpt', 'region']);
  const excerpt = text(r.excerpt, 2000);
  if (!Number.isSafeInteger(r.page) || Number(r.page) < 1) throw invalid();
  if(context.allowedPages&&!context.allowedPages.includes(Number(r.page)))throw invalid();
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
  let location: DecodeLocation = { section: 'root' };
  try {
    const row = object(input, ['documentKind', 'items', 'hasMoreItems', 'purchaseTotal', 'requiresHumanReview', 'houseExpenses', 'documentInfo', 'facts']);
    if (!['delivery_notice', 'order_confirmation', 'purchase_document', 'product_document', 'device_label', 'utility_bill', 'conformity_declaration', 'house_document', 'unsupported'].includes(String(row.documentKind)) || typeof row.hasMoreItems !== 'boolean' || !Array.isArray(row.items) || row.items.length > onboardingLimits.maxItems) throw invalid();
    if (row.hasMoreItems) throw new ProviderFailure('object_onboarding_too_many_items');
    const fingerprints = new Set<string>();
    const invoiceLines = new Set<string>();
    const orderItems = new Set<string>();
    if (row.requiresHumanReview !== undefined && typeof row.requiresHumanReview !== 'boolean') throw invalid();
    location = { section: 'document_info' };
    const understanding=readUnderstanding(row.documentInfo,row.facts,row.items.length,value=>evidence(value,context),context.kind==='text'?context.pages:undefined);
    if(['conformity_declaration','house_document'].includes(String(row.documentKind))&&!understanding.documentInfo)throw invalid();
    if(row.documentKind==='conformity_declaration'&&understanding.documentInfo?.kind!=='conformity_declaration')throw invalid();
    if(understanding.documentInfo){const mapped:Record<string,string>={invoice:'purchase_document',receipt:'purchase_document',purchase_document:'purchase_document',purchase_order:'order_confirmation',delivery_notice:'delivery_notice',product_label:'device_label',conformity_declaration:'conformity_declaration',utility_bill:'utility_bill',ape:'house_document',floor_plan:'house_document'};row.documentKind=mapped[understanding.documentInfo.kind]??row.documentKind;}
    if(['unsupported','utility_bill','house_document'].includes(String(row.documentKind))&&row.items.length)throw invalid();
    const payment = paymentReview(context);
    let needsReview = payment?.reason === 'split_payment' || row.requiresHumanReview === true || understanding.warnings.length>0;
    const items: ProductItem[] = [];
    for (const [sourceIndex, raw] of row.items.entries()) {
      location = { section: 'item' };
      const r = object(raw, ['fields', 'quantity', 'purchaseAmount', 'nameTruncated', 'disposition', 'confidence', 'subjectKind','objectType']);
      if (typeof r.nameTruncated !== 'boolean' || !['household_object', 'consumable', 'uncertain'].includes(String(r.disposition)) || !['high', 'low'].includes(String(r.confidence))) throw invalid();
      if(r.subjectKind!==undefined&&!['product','system'].includes(String(r.subjectKind)))throw invalid();
      const fields: Partial<Record<ProductField, ProductValue>> = {};
      location = { section: 'item_fields' };
      for (const [key, rawField] of Object.entries(object(r.fields, [...productFields]))) {
        if (rawField === null) continue;
        location = { section: 'item_field', field: key };
        try {
        fields[key as ProductField] = validateProductField(key as ProductField, rawField, row.documentKind, context, value => evidence(value, context));
        } catch(error){if(key==='name'||!(error instanceof HttpException)&&!(error instanceof ProviderFailure))throw error;understanding.warnings.push({field:'item:'+sourceIndex+':'+key,reason:'unverified'});needsReview=true;}
      }
      location = { section: 'item_identity' };
      const primary = fields.name ?? fields.reference ?? fields.model;
      if (!primary || !fields.name && row.documentKind !== 'device_label') throw invalid();
      const line = ['purchase_document','order_confirmation'].includes(String(row.documentKind)) && !(Array.isArray(row.houseExpenses)&&row.houseExpenses.length) ? verifiedInvoiceLine(context, primary.value, primary.source.page) : null;
      if(line && (r.fields as Record<string,unknown>).purchaseDate == null && line.purchaseDate && line.purchaseDate.value <= new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'}))fields.purchaseDate=line.purchaseDate;
      location = { section: 'item_type' };
      const objectType=readObjectType(r.objectType,value=>evidence(value,context),primary.value);
      location = { section: 'item_quantity' };
      let quantity: ProductItem['quantity'] = null;
      if(r.quantity === null && line)quantity={value:line.quantity,source:line.source};
      if (r.quantity !== null) {try{
        quantity = validateProductQuantity(r.quantity, context, fields, primary, line, onboardingLimits, value => evidence(value, context));
      }catch(error){if(!(error instanceof HttpException)&&!(error instanceof ProviderFailure))throw error;needsReview=true;understanding.warnings.push({field:'item:'+sourceIndex+':quantity',reason:'unverified'});}}
      if (r.confidence === 'low') { needsReview = true;understanding.warnings.push({field:'item:'+sourceIndex,reason:'missing_identity'});continue; }
      if (row.documentKind === 'order_confirmation') {
        const identity = JSON.stringify([normalize(primary.value).toLocaleLowerCase('it'),fields.brand?.value?.toLocaleLowerCase('it')??null,fields.model?.value?.toLocaleLowerCase('it')??fields.reference?.value?.toLocaleLowerCase('it')??null]);
        if (orderItems.has(identity)) throw new ProviderFailure('object_onboarding_repeated_item');
        orderItems.add(identity);
      }
      const fingerprint = digest(JSON.stringify([context.snapshot.documentSha256, normalize(primary.value).toLocaleLowerCase('it'), fields.brand?.value?.toLocaleLowerCase('it') ?? null, fields.model?.value?.toLocaleLowerCase('it') ?? fields.reference?.value?.toLocaleLowerCase('it') ?? null, primary.source.page, quantity?.value ?? null]));
      if (fingerprints.has(fingerprint)) throw new ProviderFailure('object_onboarding_repeated_item');
      fingerprints.add(fingerprint);
      const id = digest(JSON.stringify([context.snapshot.documentId, fingerprint]));
      let purchaseAmount: ProductItem['purchaseAmount'] = null;
      location = { section: 'item_price' };
      if (r.purchaseAmount !== undefined && r.purchaseAmount !== null) {try{
        purchaseAmount = validateProductAmount(r.purchaseAmount, row.documentKind, fields, line, value => evidence(value, context));
      }catch(error){if(!(error instanceof HttpException)&&!(error instanceof ProviderFailure))throw error;needsReview=true;understanding.warnings.push({field:sourceIndex+':purchaseAmount',reason:'unverified'});}}
      if(line && r.purchaseAmount == null)purchaseAmount={amountCents:line.amountCents,source:line.source};
      const quotedRow=quantity&&fields.name?columnProductRow(quantity.source.excerpt,fields.name.value):undefined;
      if (['purchase_document','order_confirmation'].includes(String(row.documentKind)) && quotedRow && quotedRow.totalCents===null && !purchaseAmount) {
        needsReview=true;understanding.warnings.push({field:sourceIndex+':purchaseAmount',reason:'unverified'});
      }
      const invoiceLine = line && purchaseAmount?.amountCents===line.amountCents && quantity?.value===line.quantity ? line.invoiceLine : null;
      if(invoiceLine){if(invoiceLines.has(invoiceLine.key))throw new ProviderFailure('object_onboarding_repeated_item');invoiceLines.add(invoiceLine.key);}
      items.push({...(invoiceLine?{invoiceLine}:{}),...(objectType?{objectType}:{}),...(r.subjectKind?{subjectKind:r.subjectKind as 'product'|'system'}:{}), id, fingerprint,...(understanding.documentInfo?{sourceIndex}:{}), fields, quantity, ...(purchaseAmount ? { purchaseAmount } : {}), nameTruncated: r.nameTruncated, disposition: r.disposition as ProductItem['disposition'] });
    }
    let purchaseTotal: ProductExtraction['purchaseTotal'] = null;
    location = { section: 'purchase_total' };
    if (row.purchaseTotal !== null && row.purchaseTotal !== undefined) {try{
      purchaseTotal = validatePurchaseTotal(row.purchaseTotal, row.documentKind, value => evidence(value, context));
    }catch(error){if(!(error instanceof HttpException)&&!(error instanceof ProviderFailure))throw error;needsReview=true;understanding.warnings.push({field:'purchaseTotal',reason:'unverified'});}}
    if (purchaseTotal && items.reduce((sum, item) => sum + (item.purchaseAmount?.amountCents ?? 0), 0) > purchaseTotal.amountCents){needsReview=true;understanding.warnings.push({field:'purchaseTotal',reason:'unverified'});}
    location = { section: 'house_expenses' };
    let houseExpenses=readHouseExpenses(row.houseExpenses,context,row.documentKind==='utility_bill'?'utility_bill':'simple_invoice');
    if(houseExpenses.length&&!['utility_bill','purchase_document'].includes(String(row.documentKind)))throw invalid();
    assertInvoicePages(houseExpenses,context.invoiceExpensePages);
    const pageInvoices=context.kind==='visual_pdf'&&context.pageCount>1&&understanding.documentInfo?.kind==='invoice'&&!items.length&&houseExpenses.length>0;
    if(row.documentKind==='purchase_document'&&(houseExpenses.length>1||pageInvoices)){if(row.items.length||row.purchaseTotal!=null||Array.isArray(row.facts)&&row.facts.length)throw invalid();houseExpenses=separateInvoices({items,purchaseTotal,documentInfo:understanding.documentInfo},houseExpenses,context.snapshot.documentSha256,context.snapshot.documentId,pageInvoices);needsReview=true;}
    location = { section: 'invoice_coverage' };
    const coverage=invoiceCoverage(context,{documentKind:row.documentKind as ProductExtraction['documentKind'],documentInfo:understanding.documentInfo,items},houseExpenses);
    if(coverage?.pendingPages.length)needsReview=true;
    location = { section: 'contacts' };
    const party=contactProposal(understanding.documentInfo,context.kind==='text'?context.pages:undefined);
    // Matching, prices, quantities and fingerprints above use the entire name.
    // Preserve its variants and source, and forbid automatic acceptance of the abbreviation.
    for (const [index, item] of items.entries()) {
      const name = item.fields.name;
      if (!name || [...name.value].length <= 120) continue;
      location = { section: 'item_field', field: 'name' };
      const abbreviated = shortProductName(name.value);
      item.fullName = name.value;
      item.fields.name = { ...name, value: abbreviated };
      item.nameTruncated = true;
      needsReview = true;
      understanding.warnings.push({ field: 'item:' + (item.sourceIndex ?? index) + ':name', reason: 'unverified' });
    }
    return { evidenceMode:context.kind, ...(coverage?{invoiceCoverage:coverage}:{}), ...(payment?{paymentReview:payment}:{}), ...(party?{contacts:[party]}:{}),...(understanding.documentInfo?{documentInfo:understanding.documentInfo}:{}),...(understanding.warnings.length?{reviewWarnings:understanding.warnings}:{}),documentKind: row.documentKind as ProductExtraction['documentKind'], items, needsReview:needsReview||houseExpenses.some(x=>x.reviewWarnings?.length), purchaseTotal,purchaseExpenseReady:row.requiresHumanReview!==true&&understanding.warnings.length>0&&understanding.warnings.every(w=>w.reason==='unverified'&&/^item:\d+:(deliveredDate|warrantyStart|warrantyEnd)$/.test(w.field))&&!houseExpenses.some(x=>x.reviewWarnings?.length),...(row.houseExpenses!==undefined?{houseExpenses}:{}) };
  } catch (error) {
    throw locateDecodeFailure(error, location);
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


const billKeys=['title','supplier','category','documentNumber','documentDate','competenceFrom','competenceTo','dueOn'];
const billRoles=['current_document_total','amount_due','arrears_balance','taxable','tax','line_total','other'];
const auxiliaryBillRoles=['arrears_balance','taxable','tax','line_total','other'];
const moneyNumber=String.raw`[-−+]?\d(?:[\d.,\u00a0\u202f ]*\d)?[.,]\d{2}`;
const euroUnit=String.raw`(?:€|\bEUR(?:O)?\b|\(\s*(?:€|EUR(?:O)?)\s*\))`;
function billAmountEvidence(excerpt:string,amount:number,role:string,kind:'utility_bill'|'simple_invoice') {
 const monetary=new RegExp(String.raw`(?:${euroUnit}\s*${moneyNumber}(?![\d.,]|\s*%)|(?<![\d.,])${moneyNumber}\s*${euroUnit}(?!\s*%))`,'giu');
 if(![...excerpt.matchAll(monetary)].some(match=>printedCents(match[0]).includes(amount)))return false;
 const compact=normalize(excerpt);
 if(kind==='utility_bill'&&['current_document_total','amount_due'].includes(role)){
  const label=role==='current_document_total'
   ?String.raw`(?:totale(?:\s+(?:bolletta|fattura|documento(?:\s+corrente)?|costi|complessivo|della\s+bolletta|della\s+fattura|del\s+documento))?|importo\s+(?:bolletta|fattura|documento(?:\s+corrente)?|totale))`
   :String.raw`(?:totale\s+(?:da|a)\s+(?:pagare|versare)|importo\s+(?:(?:da|a)\s+(?:pagare|versare)|dovuto)|da\s+(?:pagare|versare)|saldo\s+(?:da\s+pagare|dovuto))`;
  const primary=new RegExp(String.raw`^${label}\s*[:=]?\s*(?:${euroUnit}\s*${moneyNumber}(?![\d.,%])|${moneyNumber}\s*${euroUnit})`,'iu').exec(compact);
  if(!primary||!printedCents(primary[0]).includes(amount))return false;
 }
 return true;
}
function readHouseExpenses(input:unknown,context:ProductEvidenceContext,kind:'utility_bill'|'simple_invoice'):HouseExpense[]{
 if(input===undefined)return [];if(!Array.isArray(input)||input.length>10)throw invalid();const fingerprints=new Set<string>();
 return input.map(raw=>{const r=object(raw,['fields','amountCandidates']),fields:HouseExpense['proposedFields']={},reviewWarnings:string[]=[];
  for(const [key,rawField]of Object.entries(object(r.fields,billKeys))){try{const field=object(rawField,['value','evidence']),value=text(field.value,key==='documentNumber'?80:120),source=evidence(field.evidence,context);
   if(['documentDate','competenceFrom','competenceTo','dueOn'].includes(key)){calendar(value);if(!(['competenceFrom','competenceTo'].includes(key)?periodBoundary(source.excerpt,key,value):printedDates(source.excerpt).includes(value)))throw new ProductEvidenceFailure('purchaseDate','date');}
   else if(key==='category'){const matches:Record<string,RegExp>={electricity:/elettric|electric/iu,gas:/\bgas\b/iu,water:/acqua|water/iu,internet_services:/internet/iu,maintenance:/manutenzion/iu,repairs_works:/lavor|adeguamento|riparazion|installazion/iu,purchase_replacement:/acquisto|sostituzion/iu};if(!matches[value]?.test(source.excerpt))throw invalid();}
   else if(!normalize(source.excerpt).toLocaleLowerCase('it').includes(normalize(value).toLocaleLowerCase('it')))throw invalid();fields[key]={value,sources:[source]};
  }catch{reviewWarnings.push('field:'+key);}}
  if(!Array.isArray(r.amountCandidates)||r.amountCandidates.length>10)throw invalid();const seen=new Set<string>();
  const amounts:HouseExpense['amountCandidates']=[];
  for(const rawAmount of r.amountCandidates){try{const x=object(rawAmount,['id','amountCents','role','label','evidence']),id=text(x.id,80),role=text(x.role,40),source=evidence(x.evidence,context);if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)||seen.has(id)||!billRoles.includes(role)||!Number.isSafeInteger(x.amountCents)||Number(x.amountCents)<0||Number(x.amountCents)===0&&!auxiliaryBillRoles.includes(role)||Number(x.amountCents)>999999999||!printedCents(source.excerpt).includes(Number(x.amountCents)))throw invalid();seen.add(id);
   if(!billAmountEvidence(source.excerpt,Number(x.amountCents),role,kind))throw invalid();
   if(['current_document_total','amount_due'].includes(role)&&!/(?:totale|importo|da\s+pagare|da\s+versare)/iu.test(source.excerpt))throw invalid();
   if(kind==='simple_invoice'&&['current_document_total','amount_due'].includes(role)&&!/^\s*totale(?:\s+(?:documento(?:\s+corrente)?|scontrino|ricevuta|complessivo|costi))?\s*[:=]?\s*(?:EUR|EURO|€)?\s*\d[\d., ]*\s*(?:EUR|EURO|€|\(\s*(?:EUR|EURO|€)\s*\))?\s*$/iu.test(source.excerpt))throw invalid();
   amounts.push({id,amountCents:Number(x.amountCents),role,label:text(x.label,120),sources:[source]});
  }catch{reviewWarnings.push('amount');}}
  const fingerprint=digest(JSON.stringify([context.snapshot.documentSha256,fields.supplier?.value??null,fields.documentNumber?.value??null,fields.documentDate?.value??null,amounts[0]?.sources[0].page??fields.title?.sources[0].page??1]));if(fingerprints.has(fingerprint))throw invalid();fingerprints.add(fingerprint);
  return {id:digest(context.snapshot.documentId+':bill:'+fingerprint),fingerprint,documentKind:kind,proposedFields:fields,amountCandidates:amounts,...(reviewWarnings.length?{reviewWarnings:[...new Set(reviewWarnings)]}:{}),amountSelectionRequired:amounts.some(a=>a.role==='arrears_balance'&&a.amountCents>0)||amounts.filter(a=>a.role==='current_document_total').length!==1};
 });
}
