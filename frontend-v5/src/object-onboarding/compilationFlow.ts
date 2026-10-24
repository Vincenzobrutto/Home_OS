import type { Draft, Form } from './model';
import { reviewIssues } from './reviewSummary';

export type CompilationStep = { key: string; title: string; itemId?: string };
export function compilationSteps(draft: Draft, forms: Record<string, Form>, documentOnly = false): CompilationStep[] {
  const steps: CompilationStep[] = [{ key: 'documento', title: 'Documento' }];
  const open = draft.items.filter(item => !item.decision || item.decision.state === 'deferred');
  if (!documentOnly) {
    if (draft.documentKind !== 'utility_bill' && open.length) {
      steps.push({ key: 'contenuto', title: 'Contenuto' });
      draft.items.forEach((item, index) => {
        if ((!item.decision || item.decision.state === 'deferred') && ['create', 'link'].includes(forms[item.id]?.action ?? '')) {
          steps.push({ key: 'articolo:' + item.id, title: 'Articolo ' + (index + 1), itemId: item.id });
        }
      });
    }
    if (!['conformity_declaration', 'house_document'].includes(draft.documentKind) && (draft.houseExpenses?.some(expense => !expense.decision || expense.decision.state === 'deferred') || open.some(item => ['create', 'link'].includes(forms[item.id]?.action ?? '')))) steps.push({ key: 'spese', title: 'Spese' });
    if (draft.contacts?.some(contact => !contact.decision)) steps.push({ key: 'contatti', title: 'Contatti' });
  }
  steps.push({ key: 'riepilogo', title: 'Riepilogo' });
  return steps;
}

export function issueStep(issue: ReturnType<typeof reviewIssues>[number]) {
  return ['Cosa fare con il costo', 'Prezzo', 'Data'].includes(issue.field) ? 'spese' : 'articolo:' + issue.itemId;
}

/** Removing an article must not silently advance past the remaining review. */
export function resolveCompilationStep(steps: CompilationStep[], current: string): string {
  return steps.some(step => step.key === current) ? current : steps.some(step => step.key === 'contenuto') ? 'contenuto' : 'documento';
}
