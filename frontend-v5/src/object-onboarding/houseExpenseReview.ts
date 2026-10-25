import type { ObjectRef } from '../api/types';
import type { ExpenseCandidate, HouseExpense, HouseForm } from './model';

export type HouseReview = {
  form: HouseForm;
  choice: unknown | null;
  newExpenses: number;
  amountCents: number;
  manual: boolean;
  action: string;
};

type FormState = HouseForm & Required<Pick<HouseForm,
  'purchaseMode' | 'purchaseTotal' | 'documentNumber' | 'documentDate' | 'note'
>>;

type ReviewInput = {
  item: HouseExpense;
  form: FormState;
  today: string;
  objectRef: ObjectRef | null;
  objectValid: boolean;
  suggestionsResolved: boolean;
  suggestionsError: boolean;
  candidates: { items: ExpenseCandidate[]; isSuccess: boolean; isError: boolean };
};

/** Pure projection of editable inputs. It never authorizes or sends a write. */
export function houseExpenseReview({
  item, form, today, objectRef, objectValid, suggestionsResolved, suggestionsError, candidates,
}: ReviewInput) {
 const isBill = item.documentKind !== 'simple_invoice';
 const done = ['confirmed', 'skipped'].includes(item.decision?.state ?? '');
 const fields = item.proposedFields;
 const {
   candidateId, amount, manual, title, supplier, date, category: effectiveCategory, mode,
   expenseId, ack, periodFrom, periodTo, dueOn, documentNumber, documentDate, note,
   purchaseMode, purchaseTotal,
 } = form;
 const monthValid=!form.invoiceMonth||/^\d{4}-(0[1-9]|1[0-2])$/.test(form.invoiceMonth)&&!form.invoiceMonth.startsWith('0000');
 const periodValid = !isBill || monthValid&&(periodFrom||periodTo?!!periodFrom&&!!periodTo&&periodFrom<=periodTo:!!form.invoiceMonth);
 const duplicates = candidates.items.filter(x => x.rank > 0);
 const row = candidates.items.find(x => x.id === expenseId);
 const purchaseCents = Math.round(Number(purchaseTotal.replace(',', '.')) * 100);
 const purchaseValid = !purchaseMode ||
   /^\d+(?:[.,]\d{1,2})?$/.test(purchaseTotal) &&
   Number.isSafeInteger(purchaseCents) && purchaseCents > 0 && purchaseCents <= 999999999 &&
   (mode !== 'create' || purchaseCents === Math.round(Number(amount.replace(',', '.')) * 100));
 const installment = !isBill && /\b(?:acconto|saldo)\b/iu.test(title);
 const valid = purchaseValid &&
   (!installment || mode !== 'create' || purchaseMode === 'confirmed_total') &&
   (mode === 'skip' || mode === 'defer' ? true : mode === 'link_existing' ? !!row :
     suggestionsResolved && objectValid && periodValid &&
     (isBill || (!documentDate || documentDate <= today) &&
       [...documentNumber].length <= 80 && [...note].length <= 500) &&
     !!title.trim() && [...title].length <= 120 && !!effectiveCategory &&
     !!date && date <= today && /^\d+(?:[.,]\d{1,2})?$/.test(amount) &&
     Number(amount.replace(',', '.')) > 0 && (manual || !!candidateId) &&
     (!duplicates.length || ack));

 function selection(action: string) {
   const values = {
     title, category: effectiveCategory, supplier: supplier || null,
     amountCents: Math.round(Number(amount.replace(',', '.')) * 100),
     spentOn: date, objectRef: isBill ? null : objectRef,
     ...Object.fromEntries(
       ['documentNumber', 'documentDate', 'competenceFrom', 'competenceTo', 'dueOn']
         .filter(k => fields[k]).map(k => [k, fields[k]!.value])),
     ...(!isBill ? {
       documentNumber: documentNumber || null, documentDate: documentDate || null, note: note || null,
     } : {}),
     ...(isBill ? {
       ...(form.invoiceMonth?{invoiceMonth:form.invoiceMonth}:{}),documentDate: date, competenceFrom: periodFrom || null, competenceTo: periodTo || null, dueOn: dueOn || null,
     } : {}),
   };
   return {
     itemId: item.id, action,
     ...(!isBill && purchaseMode && ['create', 'link_existing'].includes(action) ? {
       purchaseReview: { mode: purchaseMode, confirmedTotalCents: purchaseCents },
     } : {}),
     ...(action === 'create' ? {
       values,
       amountSelection: manual ? { mode: 'manual' } : { mode: 'candidate', candidateId },
       acknowledgePossibleDuplicate: ack,
     } : action === 'link_existing' ? { expenseId, expectedExpenseVersion: row?.version } : {}),
   };
 }

 const review: HouseReview = {
   form,
   choice: valid && (['skip', 'defer'].includes(mode) || candidates.isSuccess) ? selection(mode) : null,
   newExpenses: mode === 'create' ? 1 : 0,
   amountCents: mode === 'create' ? Math.round(Number(amount.replace(',', '.')) * 100) || 0 : 0,
   manual, action: mode,
 };
 const missing:Array<{message:string;field:string}>=[];
 if(!done&&!['skip','defer'].includes(mode)){
  const add=(message:string,field:string)=>missing.push({message,field});
  if(!purchaseValid)add('Indica il costo complessivo verificato: nessun importo viene ricavato da acconto e saldo.','Costo complessivo confermato');
  if(installment&&mode==='create'&&purchaseMode!=='confirmed_total')add('Verifica il costo complessivo oppure lascia la spesa in sospeso.','Conferma del costo');
  if(mode==='link_existing'&&!row)add('Scegli la spesa esistente da collegare.','Spesa da collegare');
  if(mode==='create'){
   if(!periodValid)add(form.invoiceMonth?'Verifica il mese della fattura e gli estremi del periodo dei servizi.':'Indica il mese della fattura oppure entrambi gli estremi del periodo dei servizi.','Mese di riferimento della fattura');
   if(!title.trim())add('Indica il titolo della spesa.','Titolo della spesa');
   else if([...title].length>120)add('Riduci il titolo a 120 caratteri, compresa l’etichetta acconto o saldo.','Titolo della spesa');
   if(!objectValid)add('Verifica l’oggetto o impianto scelto, oppure lascia la spesa senza collegamento.','Oggetto o impianto');
   if(!suggestionsResolved)add(suggestionsError?'Riprova la ricerca degli oggetti già presenti.':'Controlla se la fattura riguarda un oggetto già presente.','Oggetto o impianto');
   if(!effectiveCategory)add('Scegli la categoria della spesa.',isBill?'Categoria della bolletta':'Categoria della spesa');
   if(!date||date>today)add(isBill?'Indica una data di emissione valida, non futura.':'Indica una data della spesa valida, non futura.',isBill?'Data di emissione':'Data della spesa');
   if(!isBill&&documentDate>today)add('Correggi la data di emissione: non può essere futura.','Data di emissione');
   if(!isBill&&[...documentNumber].length>80)add('Riduci il numero fattura a 80 caratteri.','Numero fattura');
   if(!isBill&&[...note].length>500)add('Riduci la nota a 500 caratteri.','Nota');
   if(!manual&&!candidateId)add('Scegli il totale da usare o inserisci un importo corretto.',isBill?'Totale della bolletta':'Totale della fattura');
   else if(!/^\d+(?:[.,]\d{1,2})?$/.test(amount)||Number(amount.replace(',','.'))<=0)add('Inserisci un importo positivo.',isBill?'Importo della bolletta':'Importo della spesa');
   if(duplicates.length&&!ack)add('Conferma che la spesa è distinta dai possibili doppioni.','Ho verificato');
  }
  if(!candidates.isSuccess)add(candidates.isError?'Riprova il controllo dei doppioni.':'Attendi il controllo dei doppioni.','Riprova');
 }
 return { duplicates, valid, review, missing, selection };
}
