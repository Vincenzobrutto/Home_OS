import { contactChoices } from '../contacts/proposals';
import {confirmBody} from '../economy/document-domain';
import { object, text, uuid, version, invalid } from '../review/domain';
import { objectTypes, roomIds } from '../home-objects/domain';
import { manualSelection } from '../home-objects/manuals';
import { profileDecisions, type ProfileDecisions } from './profile';
import { amountCents, spentOn } from '../expenses/domain';

export type OnboardingExpense = { action: 'skip' } | { action: 'link'; id: string; expectedVersion: number } | { action: 'create'; title: string; amountCents: number; spentOn: string; supplier: string | null; manualItemAmount?: boolean; acknowledgePossibleDuplicate?: boolean };
export type OnboardingChoice = { itemId: string } & (
  { action: 'skip' } | { action: 'defer' } | {action:'document_only'} |
  { action: 'create'; name: string; type: string; unitNames: string[]; roomIds: string[]; fields: ProfileDecisions; manual: ReturnType<typeof manualSelection> | null; confirmHouseholdObject: boolean; acknowledgeExistingSource: boolean; expense: OnboardingExpense } |
  { action: 'link'; targets: Array<{ id: string; expectedVersion: number }>; fields: ProfileDecisions; manual: ReturnType<typeof manualSelection> | null; expense: OnboardingExpense }
);
export function requestKey(input: string | undefined) { if (!input || !/^[A-Za-z0-9_-]{16,100}$/u.test(input)) throw invalid('Chiave della richiesta non valida.'); return input; }
export function startOnboarding(input: unknown) {
  const row = object(input, ['documentId', 'provider', 'consentToProviderTransfer']);
  if (row.provider !== 'anthropic' || typeof row.consentToProviderTransfer !== 'boolean' || row.provider === 'anthropic' && !row.consentToProviderTransfer) throw invalid('Conferma l’invio del documento per l’analisi assistita.');
  return { documentId: uuid(row.documentId), provider: row.provider as 'anthropic', consentToProviderTransfer: row.consentToProviderTransfer };
}
function expense(input: unknown, today: string): OnboardingExpense {
  const r = object(input ?? { action: 'skip' }, ['action', 'id', 'expectedVersion', 'title', 'amountCents', 'spentOn', 'supplier', 'acknowledgePossibleDuplicate', 'manualItemAmount']);
  if (r.action === 'skip') { object(r, ['action']); return { action: 'skip' }; }
  if (r.action === 'link') { object(r, ['action', 'id', 'expectedVersion']); return { action: 'link', id: uuid(r.id), expectedVersion: version(r.expectedVersion) }; }
  if (r.action !== 'create') throw invalid();
  object(r, ['action', 'title', 'amountCents', 'spentOn', 'supplier', 'acknowledgePossibleDuplicate', 'manualItemAmount']);
  if(r.manualItemAmount!==undefined&&typeof r.manualItemAmount!=='boolean')throw invalid();
  if (r.acknowledgePossibleDuplicate !== undefined && typeof r.acknowledgePossibleDuplicate !== 'boolean') throw invalid();
  return { ...(r.manualItemAmount!==undefined?{manualItemAmount:r.manualItemAmount}:{}),...(r.acknowledgePossibleDuplicate !== undefined ? { acknowledgePossibleDuplicate: r.acknowledgePossibleDuplicate } : {}), action: 'create', title: text(r.title, 120), amountCents: amountCents(r.amountCents), spentOn: spentOn(r.spentOn, today), supplier: r.supplier === undefined || r.supplier === null ? null : text(r.supplier, 120) };
}
export function onboardingConfirmation(input: unknown, today: string) {
  const r = object(input, ['expectedVersion', 'source', 'choices', 'houseExpenses', 'manualPurchaseTotalCents','documentOnly','contacts']);
  const contacts=contactChoices(r.contacts);
  if(r.documentOnly!==undefined&&r.documentOnly!==true)throw invalid();
  const manualPurchaseTotalCents = r.manualPurchaseTotalCents === undefined ? undefined : amountCents(r.manualPurchaseTotalCents);
  const source = object(r.source, ['documentId', 'documentVersion', 'sha256']);
  if (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(source.sha256) || !Array.isArray(r.choices) || (!r.choices.length&&!Array.isArray(r.houseExpenses)&&!contacts.length&&!r.documentOnly) || r.choices.length > 20) throw invalid();
  const choices: OnboardingChoice[] = r.choices.map(raw => {
    const c = object(raw, ['itemId', 'action', 'name', 'type', 'unitNames', 'roomIds', 'fields', 'manual', 'confirmHouseholdObject', 'acknowledgeExistingSource', 'targets', 'expense']);
    const itemId = text(c.itemId, 80);
    if (!/^[A-Za-z0-9_-]{1,80}$/u.test(itemId)) throw invalid();
    if (c.action === 'skip' || c.action === 'defer' || c.action==='document_only') { object(c, ['itemId', 'action']); return { itemId, action: c.action }; }
    const fields = profileDecisions(c.fields), manual = c.manual === undefined || c.manual === null ? null : manualSelection(c.manual), cost = expense(c.expense, today);
    if (manual?.mode === 'remove') throw invalid();
    if (c.action === 'link') {
      object(c, ['itemId', 'action', 'targets', 'fields', 'manual', 'expense']);
      if (!Array.isArray(c.targets) || !c.targets.length || c.targets.length > 20) throw invalid();
      const targets = c.targets.map(raw => { const t = object(raw, ['id', 'expectedVersion']); return { id: uuid(t.id), expectedVersion: version(t.expectedVersion) }; });
      if (new Set(targets.map(t => t.id)).size !== targets.length) throw invalid();
      return { itemId, action: 'link', targets, fields, manual, expense: cost };
    }
    if (c.action !== 'create' || typeof c.type !== 'string' || !objectTypes.includes(c.type as typeof objectTypes[number]) || c.confirmHouseholdObject !== undefined && typeof c.confirmHouseholdObject !== 'boolean' || c.acknowledgeExistingSource !== undefined && typeof c.acknowledgeExistingSource !== 'boolean') throw invalid();
    object(c, ['itemId', 'action', 'name', 'type', 'unitNames', 'roomIds', 'fields', 'manual', 'confirmHouseholdObject', 'acknowledgeExistingSource', 'expense']);
    if (c.unitNames !== undefined && (!Array.isArray(c.unitNames) || c.unitNames.length > 20)) throw invalid();
    const unitNames = c.unitNames === undefined ? [] : (c.unitNames as unknown[]).map(n => text(n, 120));
    if (new Set(unitNames.map(n => n.normalize('NFC').toLocaleLowerCase('it'))).size !== unitNames.length) throw invalid('Dai un nome distinto a ciascun esemplare.');
    return { itemId, action: 'create', name: text(c.name, 120), type: c.type, unitNames, roomIds: roomIds(c.roomIds ?? []), fields, manual, confirmHouseholdObject: c.confirmHouseholdObject === true, acknowledgeExistingSource: c.acknowledgeExistingSource === true, expense: cost };
  });
  if (new Set(choices.map(c => c.itemId)).size !== choices.length) throw invalid();
  const houseExpenses=houseChoices(r.houseExpenses,r.expectedVersion,today);if(!choices.length&&!houseExpenses.length&&!contacts.length&&!r.documentOnly)throw invalid();
  return {...(contacts.length?{contacts}:{}),...(r.documentOnly?{documentOnly:true as const}:{}),...(manualPurchaseTotalCents!==undefined?{manualPurchaseTotalCents}:{}),...(houseExpenses.length?{houseExpenses}:{}), expectedVersion: version(r.expectedVersion), source: { documentId: uuid(source.documentId), documentVersion: version(source.documentVersion), sha256: source.sha256 }, choices };
}

function houseChoices(input:unknown,expectedVersion:unknown,today:string){
 if(input===undefined)return [];if(!Array.isArray(input)||input.length>10)throw invalid();const ids=new Set<string>();
 return input.map(raw=>{const r=object(raw,['itemId','action','values','amountSelection','expenseId','expectedExpenseVersion','acknowledgePossibleDuplicate']),itemId=text(r.itemId,80);if(!/^[A-Za-z0-9_-]{1,80}$/.test(itemId)||ids.has(itemId))throw invalid();ids.add(itemId);
  if(r.action==='skip'||r.action==='defer'){object(r,['itemId','action']);return {itemId,action:r.action as 'skip'|'defer',confirmation:null,acknowledgePossibleDuplicate:false};}
  if(r.action!=='create'&&r.action!=='link_existing'||r.acknowledgePossibleDuplicate!==undefined&&typeof r.acknowledgePossibleDuplicate!=='boolean')throw invalid();
  object(r,r.action==='create'?['itemId','action','values','amountSelection','acknowledgePossibleDuplicate']:['itemId','action','expenseId','expectedExpenseVersion']);
  const confirmation=confirmBody({expectedVersion,mode:r.action,...(r.action==='create'?{values:r.values,amountSelection:r.amountSelection}:{expenseId:r.expenseId,expectedExpenseVersion:r.expectedExpenseVersion})},today);
  if(confirmation.mode==='create'&&(confirmation.values.objectRef||confirmation.values.workId||!['electricity','gas','water','internet_services','maintenance','repairs_works','purchase_replacement'].includes(String(confirmation.values.category))))throw invalid('Questa spesa riguarda la casa, senza collegamenti a singoli oggetti o lavori.');
  return {itemId,action:r.action as 'create'|'link_existing',confirmation,acknowledgePossibleDuplicate:r.acknowledgePossibleDuplicate===true};
 });
}
export type HouseExpenseChoice=NonNullable<ReturnType<typeof onboardingConfirmation>['houseExpenses']>[number];
