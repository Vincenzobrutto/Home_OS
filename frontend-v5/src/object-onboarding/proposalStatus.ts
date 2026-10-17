import type { Capabilities, Draft } from './model';
export function proposalStatus(c?: Capabilities) {
  const open = c?.drafts.find(d => d.state === 'open');
  if (open) return { state: 'review' as const, draftId: open.id, label: 'Da confermare' };
  if (['queued', 'running'].includes(c?.job?.state ?? '')) return { state: 'running' as const, draftId: null, label: 'Analisi in corso' };
  const completed = c?.drafts.find(d => d.state === 'confirmed');
  if (completed) return { state: 'confirmed' as const, draftId: completed.id, label: 'Proposta accettata' };
  if (c?.drafts[0]) return { state: 'review' as const, draftId: c.drafts[0].id, label: 'Da verificare' };
  return { state: 'empty' as const, draftId: null, label: c?.job?.state === 'uncertain' ? 'Esito da verificare' : c?.job?.state === 'failed' ? 'Lettura non riuscita' : 'Da preparare' };
}

/** A readable description from already accepted data; never renames the original. */
export function proposalIdentity(draft?: Draft) {
  const bill = draft?.houseExpenses?.[0]?.proposedFields;
  if (bill) return ['Bolletta', bill.supplier?.value, bill.documentDate?.value?.split('-').reverse().join('/')].filter(Boolean).join(' · ');
  return [...new Set(draft?.items?.flatMap(item=>item.decision?.objects??[]).filter(obj=>obj.id&&obj.state==='active').map(obj=>obj.name).filter(Boolean)??[])].join(', ');
}
