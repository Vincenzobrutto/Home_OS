import type { Draft, Form } from './model';
import { reviewIssues } from './reviewSummary';

/** `question` and `hint` are presentation only: each card asks one question. Keys, titles and order are unchanged. */
export type CompilationStep = { key: string; title: string; itemId?: string; question: string; hint?: string };
export function compilationSteps(draft: Draft, forms: Record<string, Form>, documentOnly = false): CompilationStep[] {
  const steps: CompilationStep[] = [{ key: 'documento', title: 'Documento', question: 'Che documento è?', hint: documentOnly ? 'Conservi solo il documento: dopo questa scheda c’è il riepilogo.' : 'Controlla titolo e tipo. Oggetti e spese li decidi nelle schede successive.' }];
  const open = draft.items.filter(item => !item.decision || item.decision.state === 'deferred');
  if (!documentOnly) {
    if (draft.documentKind !== 'utility_bill' && open.length) {
      steps.push({ key: 'contenuto', title: 'Contenuto', question: 'Cosa contiene il documento?', hint: 'Per ogni riga scegli solo la direzione: i dettagli arrivano nelle schede successive.' });
      draft.items.forEach((item, index) => {
        const form = forms[item.id];
        if ((!item.decision || item.decision.state === 'deferred') && (form?.action === 'create' || form?.action === 'link')) {
          const name = form.name.trim();
          steps.push(form.action === 'create'
            ? { key: 'articolo:' + item.id, title: 'Articolo ' + (index + 1), itemId: item.id, question: 'Crea la scheda dell’oggetto', hint: (name ? 'Dalla riga «' + name + '». ' : '') + 'Il resto si può completare più tardi dalla scheda.' }
            : { key: 'articolo:' + item.id, title: 'Articolo ' + (index + 1), itemId: item.id, question: 'A quale oggetto si riferisce?', hint: (name ? 'Riga «' + name + '». ' : '') + 'Collegarla non cambia i dati già confermati dell’oggetto.' });
        }
      });
    }
    if (!['conformity_declaration', 'house_document'].includes(draft.documentKind) && (draft.houseExpenses?.some(expense => !expense.decision || expense.decision.state === 'deferred') || open.some(item => ['create', 'link'].includes(forms[item.id]?.action ?? '')))) steps.push({ key: 'spese', title: 'Spese', question: 'Quali spese registrare?', hint: 'Ogni costo è registrato una sola volta in Spese.' });
    if (draft.contacts?.some(contact => !contact.decision)) steps.push({ key: 'contatti', title: 'Contatti', question: 'Quali contatti conservare in rubrica?', hint: 'Vengono salvati solo quelli che scegli.' });
  }
  steps.push({ key: 'riepilogo', title: 'Riepilogo', question: 'Controlla e conferma', hint: 'Niente è ancora registrato nelle schede di casa. La conferma finale registra insieme le scelte.' });
  return steps;
}

export function issueStep(issue: ReturnType<typeof reviewIssues>[number]) {
  return ['Cosa fare con il costo', 'Prezzo', 'Data'].includes(issue.field) ? 'spese' : 'articolo:' + issue.itemId;
}

/** Removing an article must not silently advance past the remaining review. */
export function resolveCompilationStep(steps: CompilationStep[], current: string): string {
  return steps.some(step => step.key === current) ? current : steps.some(step => step.key === 'contenuto') ? 'contenuto' : 'documento';
}
