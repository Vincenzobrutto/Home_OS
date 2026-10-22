import { requiresPaymentReview } from './payment-review';
import type { ProductExtraction } from './domain';
import { proposedProfile } from './profile';
import type { OnboardingChoice } from './bodies';

export class AutomaticReviewNeeded extends Error {}
function resourcePlan(output: ProductExtraction) {
  const review = (message: string): never => { throw new AutomaticReviewNeeded(message); };
  if(requiresPaymentReview(output))review('Controlla il regime di pagamento e il costo complessivo nell’originale prima di confermare.');
  if(output.evidenceMode&&output.evidenceMode!=='text')review('Controlla il documento visivo: le citazioni non sono verificate sul testo.');
  if(output.documentKind==='conformity_declaration'){
    if(output.documentInfo?.kind!=='conformity_declaration'||output.needsReview||output.reviewWarnings?.some(w=>!['-1:issuer','-1:documentDate'].includes(w.field))||output.houseExpenses?.length||output.purchaseTotal)review('Controlla la classificazione del documento nell’originale.');
    return output.items.length?{choices:output.items.map(item=>({itemId:item.id,action:'document_only' as const}))}:{choices:[],documentOnly:true};
  }
  if (output.documentKind === 'unsupported' || output.needsReview || output.reviewWarnings?.length) review('Alcune informazioni richiedono un controllo sull’originale.');
  if (output.documentKind === 'house_document' && !output.items.length && !output.houseExpenses?.length && output.documentInfo) return { choices: [], documentOnly: true };
  if (!output.items.length && !output.houseExpenses?.length) review('Non ci sono informazioni sufficienti per completare la scheda.');
  const documentCost = !!output.houseExpenses?.length;
  if(output.houseExpenses?.some(item=>item.documentKind==='simple_invoice'&&/\b(?:acconto|saldo)\b/iu.test(item.proposedFields.title?.value??'')))review('Controlla acconto o saldo e il collegamento all’oggetto esistente prima di registrare la spesa.');
  const choices: OnboardingChoice[] = output.items.map(item => {
    const name = item.fields.name?.value;
    if (!name || item.nameTruncated || item.disposition !== 'household_object' || item.quantity?.value !== 1) review('Controlla quali articoli riguardano la casa e le loro quantità.');
    const profile = proposedProfile(item), type=item.objectType?.value;
    if(!type||item.objectType?.certainty!=='certain'||item.objectType.source.basis!=='verified_text')review('Conferma la tipologia proposta per l’oggetto o l’impianto.');
    const amount = item.purchaseAmount?.amountCents ?? (output.items.length === 1 ? output.purchaseTotal?.amountCents : null);
    const purchase = ['purchase_document', 'order_confirmation'].includes(output.documentKind);
    if (!documentCost && purchase && (!amount || !profile.purchaseDate)) review('Mancano prezzo o data d’acquisto verificabili.');
    if (!documentCost && output.items.length > 1 && output.purchaseTotal && !item.purchaseAmount) review('Manca il prezzo di una riga: il totale non viene ripartito automaticamente.');
    return { itemId: item.id, action: 'create', name: name!, type: type!, unitNames: [], roomIds: [], fields: Object.fromEntries(Object.keys(profile).map(k => [k, { action: 'accept' as const }])), manual: null, confirmHouseholdObject: false, acknowledgeExistingSource: false,
      expense: !documentCost && amount && profile.purchaseDate ? { action: 'create', title: ('Acquisto ' + name).slice(0,120), amountCents: amount, spentOn: profile.purchaseDate.value, supplier: null, ...(output.items.length>1?{manualItemAmount:true}:{}), acknowledgePossibleDuplicate: false } : { action: 'skip' } };
  });
  const houseExpenses = (output.houseExpenses ?? []).map(item => {
    const totals = item.amountCandidates.filter(c => c.role === 'current_document_total');
    const due = item.amountCandidates.filter(c => c.role === 'amount_due');
    if (totals.length !== 1 || item.amountSelectionRequired || item.amountCandidates.some(c => c.role === 'arrears_balance'&&c.amountCents>0) || due.some(c => c.amountCents !== totals[0].amountCents)) review('Il documento contiene più importi: controlla il costo da registrare.');
    const fields = item.proposedFields;
    if (!fields.documentDate || !fields.category || !fields.title) review('Completa data, categoria o descrizione della spesa.');
    if(output.documentKind==='utility_bill'&&(!fields.competenceFrom||!fields.competenceTo))review('Indica il periodo di riferimento della bolletta.');
    return { itemId: item.id, action: 'create', values: { title: fields.title.value, category: fields.category.value, amountCents: totals[0].amountCents, spentOn: fields.documentDate.value, ...Object.fromEntries(['supplier','documentNumber','documentDate','competenceFrom','competenceTo','dueOn'].filter(k => fields[k]).map(k => [k, fields[k].value])), objectRef: null }, amountSelection: { mode: 'candidate', candidateId: totals[0].id }, acknowledgePossibleDuplicate: false };
  });
  const allocated = choices.reduce((sum,c) => sum + ('expense' in c && c.expense.action === 'create' ? c.expense.amountCents : 0), 0);
  if (output.purchaseTotal && !documentCost && allocated > output.purchaseTotal.amountCents) review('Le righe superano il totale del documento.');
  return { choices, houseExpenses };
}

export function automaticPlan(output:ProductExtraction,withContacts=false){const plan=resourcePlan(output);if(!withContacts||!output.contacts?.length)return plan;return {...plan,contacts:output.contacts.map(p=>({proposalId:p.id,action:'save' as const}))};}
