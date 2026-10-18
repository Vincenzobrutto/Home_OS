import type { ProductExtraction } from './domain';
import { proposedProfile } from './profile';
import type { OnboardingChoice } from './bodies';

export class AutomaticReviewNeeded extends Error {}
export function automaticPlan(output: ProductExtraction) {
  const review = (message: string): never => { throw new AutomaticReviewNeeded(message); };
  if (output.documentKind === 'unsupported' || output.needsReview || output.reviewWarnings?.length) review('Alcune informazioni richiedono un controllo sull’originale.');
  if (output.documentKind === 'house_document' && !output.items.length && !output.houseExpenses?.length && output.documentInfo) return { choices: [], documentOnly: true };
  if (!output.items.length && !output.houseExpenses?.length) review('Non ci sono informazioni sufficienti per completare la scheda.');
  const documentCost = !!output.houseExpenses?.length;
  const choices: OnboardingChoice[] = output.items.map(item => {
    const name = item.fields.name?.value;
    if (!name || item.nameTruncated || item.disposition !== 'household_object' || item.quantity?.value !== 1) review('Controlla quali articoli riguardano la casa e le loro quantità.');
    const profile = proposedProfile(item), system = item.subjectKind === 'system' || output.documentKind === 'conformity_declaration';
    const index = item.sourceIndex ?? output.items.indexOf(item);
    const type = system ? output.documentInfo?.facts.find(f => f.subjectIndex === index && f.field === 'systemType')?.value : /\b(?:video)?citofon/iu.test(name!) ? 'electrical' : /robot|caff|coffee|frigo|lavatr|asciugat|router|modem|televisor|\btv\b|forno|lavastov|clima|congel|tostap|speaker/iu.test(name!) ? 'appliance' : 'other';
    if (system && !type) review('Indica il tipo di impianto.');
    const amount = item.purchaseAmount?.amountCents ?? (output.items.length === 1 ? output.purchaseTotal?.amountCents : null);
    const purchase = ['purchase_document', 'order_confirmation'].includes(output.documentKind);
    if (!documentCost && purchase && (!amount || !profile.purchaseDate)) review('Mancano prezzo o data d’acquisto verificabili.');
    if (!documentCost && output.items.length > 1 && output.purchaseTotal && !item.purchaseAmount) review('Manca il prezzo di una riga: il totale non viene ripartito automaticamente.');
    return { itemId: item.id, action: 'create', name: name!, type: type ?? 'appliance', unitNames: [], roomIds: [], fields: Object.fromEntries(Object.keys(profile).map(k => [k, { action: 'accept' as const }])), manual: null, confirmHouseholdObject: false, acknowledgeExistingSource: false,
      expense: !documentCost && amount && profile.purchaseDate ? { action: 'create', title: ('Acquisto ' + name).slice(0,120), amountCents: amount, spentOn: profile.purchaseDate.value, supplier: null, ...(output.items.length>1?{manualItemAmount:true}:{}), acknowledgePossibleDuplicate: false } : { action: 'skip' } };
  });
  const houseExpenses = (output.houseExpenses ?? []).map(item => {
    const totals = item.amountCandidates.filter(c => c.role === 'current_document_total');
    const due = item.amountCandidates.filter(c => c.role === 'amount_due');
    if (totals.length !== 1 || item.amountSelectionRequired || item.amountCandidates.some(c => c.role === 'arrears_balance') || due.some(c => c.amountCents !== totals[0].amountCents)) review('Il documento contiene più importi: controlla il costo da registrare.');
    const fields = item.proposedFields;
    if (!fields.documentDate || !fields.category || !fields.title) review('Completa data, categoria o descrizione della spesa.');
    return { itemId: item.id, action: 'create', values: { title: fields.title.value, category: fields.category.value, amountCents: totals[0].amountCents, spentOn: fields.documentDate.value, ...Object.fromEntries(['supplier','documentNumber','documentDate','competenceFrom','competenceTo','dueOn'].filter(k => fields[k]).map(k => [k, fields[k].value])), objectRef: null }, amountSelection: { mode: 'candidate', candidateId: totals[0].id }, acknowledgePossibleDuplicate: false };
  });
  const allocated = choices.reduce((sum,c) => sum + ('expense' in c && c.expense.action === 'create' ? c.expense.amountCents : 0), 0);
  if (output.purchaseTotal && !documentCost && allocated > output.purchaseTotal.amountCents) review('Le righe superano il totale del documento.');
  return { choices, houseExpenses };
}
