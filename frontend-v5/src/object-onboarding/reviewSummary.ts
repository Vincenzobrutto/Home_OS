import { expenseNeedsReview, profileNeedsReview, type Draft, type Form } from './model';

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
    if (!form || item.decision && item.decision.state !== 'deferred' || form.action === 'skip') continue;
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
