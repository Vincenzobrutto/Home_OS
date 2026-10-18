import { expenseNeedsReview, profileNeedsReview, labels, type Draft, type Form } from './model';

export function reviewIssues(draft: Draft, forms: Record<string, Form>) {
  const issues: Array<{itemId:string;message:string;field:string}> = [];
  for (const [index,item] of draft.items.entries()) {
    const form=forms[item.id];
    if(!form||item.decision&&item.decision.state!=='deferred'||['skip','document_only'].includes(form.action))continue;
    const add=(message:string,field:string)=>issues.push({itemId:item.id,message:`Articolo ${index+1}: ${message}`,field});
    if(form.action==='create'&&!form.name.trim())add('indica il nome dell’oggetto.','Nome');
    if(form.action==='create'&&item.disposition!=='household_object'&&!form.confirmHouseholdObject)add('conferma che vuoi censirlo come oggetto della casa.','Voglio creare');
    if(form.action==='link'&&form.targets.length!==(item.quantity?.value??1))add('scegli una scheda per ogni esemplare da collegare.','Collega');
    if(expenseNeedsReview(form))add(form.expenseAutoState==='pending'?'attendi il controllo dei possibili doppioni della spesa.':'controlla i possibili doppioni e scegli come gestire il costo.','Cosa fare con il costo');
    for(const [key,decision] of Object.entries(form.fields))if(decision?.action==='replace'&&(!decision.consent||!decision.expectedValue))add(`conferma la sostituzione del dato ${labels[key as keyof typeof labels]??key}.`,labels[key as keyof typeof labels]??key);
    if(form.expense==='create'){
      if(!/^\d+(?:[.,]\d{1,2})?$/.test(form.amount)||Number(form.amount.replace(',','.'))<=0)add('indica un importo positivo per la spesa.','Prezzo');
      if(!form.spentOn)add('indica la data della spesa.','Data');
    }
    if(form.expense==='link'&&!form.expenseId)add('scegli la spesa esistente da collegare.','Cosa fare con il costo');
  }
  return issues;
}

export function reviewTotals(draft: Draft, forms: Record<string, Form>) {
  let newObjects = 0, linkedObjects = 0, newExpenses = 0, amountCents = 0, excludedCents = 0, excludedUnknown = 0;
  for (const item of draft.items) {
    const form = forms[item.id];
    if (!form || item.decision && item.decision.state !== 'deferred') continue;
    if (form.action === 'skip') {
      const declared = form.manualItemAmount && /^\d+(?:[.,]\d{1,2})?$/.test(form.amount) && Number(form.amount.replace(',', '.')) > 0 ? Math.round(Number(form.amount.replace(',', '.')) * 100) : undefined;
      const known = item.purchaseAmount?.amountCents ?? (draft.items.length === 1 ? draft.purchaseTotal?.amountCents : declared);
      if (known !== undefined) excludedCents += known; else excludedUnknown++;
      continue;
    }
    if(form.action==='document_only')continue;
    if (form.action === 'create') newObjects += item.quantity?.value ?? 1;
    else linkedObjects += form.targets.length;
    if (form.expense === 'create') {
      newExpenses++;
      const cents = Math.round(Number(form.amount.replace(',', '.')) * 100);
      if (Number.isSafeInteger(cents) && cents > 0) amountCents += cents;
    }
  }
  return { newObjects, linkedObjects, newExpenses, amountCents, excludedCents, excludedUnknown };
}

export function reviewProblem(draft: Draft, forms: Record<string, Form>) {
  for (const item of draft.items) {
    const form = forms[item.id];
    if (!form || item.decision && item.decision.state !== 'deferred' || ['skip','document_only'].includes(form.action)) continue;
    if (expenseNeedsReview(form) || profileNeedsReview(form)) return 'Completa le scelte evidenziate prima di salvare.';
    if (form.action === 'create' && !form.name.trim()) return 'Indica il nome di ogni oggetto da creare.';
    if (form.action === 'create' && item.disposition !== 'household_object' && !form.confirmHouseholdObject) return 'Conferma quali articoli vuoi censire come oggetti della casa.';
    if (form.action === 'link' && form.targets.length !== (item.quantity?.value ?? 1)) return 'Scegli gli oggetti a cui collegare gli articoli.';
    if (form.expense === 'create' && (!/^\d+(?:[.,]\d{1,2})?$/.test(form.amount) || Number(form.amount.replace(',', '.')) <= 0 || !form.spentOn)) return 'Completa importo e data delle spese scelte.';
    if (form.expense === 'link' && !form.expenseId) return 'Scegli la spesa esistente da collegare.';
  }
  const totals = reviewTotals(draft, forms);
  if (draft.purchaseTotal && totals.amountCents > draft.purchaseTotal.amountCents) return 'Le spese scelte superano il totale della fattura. Controlla gli importi per articolo.';
  return null;
}
