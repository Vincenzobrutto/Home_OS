import type { Draft, HouseForm } from './model';
/** Local, conservative proposals. No issuer catalogue, filename rules or payment inference. */
export type LocalBill = {
  supplier?: string; amount?: string; category?: string; documentDate?: string;
  competenceFrom?: string; competenceTo?: string; dueOn?: string;
};
export function localBillEligible(draft: Draft | undefined, mimeType: string | undefined) {
  return !!draft && draft.mode === 'manual' && draft.state === 'open' && !draft.review &&
    ['unsupported','utility_bill'].includes(draft.documentKind) &&
    !draft.items.some(item => item.decision || Object.keys(item.fields).length) &&
    !draft.houseExpenses?.some(item => item.decision || Object.keys(item.proposedFields).length || item.amountCandidates.length) &&
    !!draft.snapshot && mimeType === 'application/pdf';
}
export function localBillForm(bill: LocalBill): HouseForm {
  return {candidateId:'',manual:true,amount:bill.amount??'',title:'Bolletta',supplier:bill.supplier??'',date:bill.documentDate??'',category:bill.category??'',mode:'create',expenseId:'',ack:false,periodFrom:bill.competenceFrom??'',periodTo:bill.competenceTo??'',dueOn:bill.dueOn??''};
}
const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function date(value: string) {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value.trim());
  if (!m) return undefined;
  const iso = `${m[3]}-${m[2]!.padStart(2,'0')}-${m[1]!.padStart(2,'0')}`;
  const parsed = new Date(iso+'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === iso ? iso : undefined;
}
const unique = (values: string[]) => { const all = [...new Set(values)]; return all.length === 1 ? all[0] : undefined; };
const dateToken = '(\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]\\d{4})';
function labeledDates(text: string, label: string) {
  return unique([...text.matchAll(new RegExp('(?:'+label+')[ \\t:]*(?:\\n[ \\t]*)?'+dateToken,'giu'))].flatMap(m => date(m[1]!) ?? []));
}
export function localBill(pages: string[]): LocalBill | null {
  if (!pages.length || pages.length > 20 || pages.join('').length > 100000) return null;
  const text = pages.join('\n').normalize('NFKC').replace(/\r/g,'');
  const firstLine = text.split('\n').find(line=>line.trim())?.trim()??'';
  const deniedHeading = /^(?:preventivo|offerta\s+commerciale|fac[ -]?simile|esempio\s+di\s+bolletta)\b/iu;
  const denied = /\bnon\s+(?:(?:è|e['’])\s+|costituisce\s+)(?:una\s+)?bolletta\b/iu;
  if (deniedHeading.test(firstLine) || denied.test(text)) return null;
  // Require a billing signal AND a utility/consumption signal; a casual mention is insufficient.
  const billing = /\b(?:bolletta|fattura|periodo\s+di\s+fatturazione)\b/iu.test(text);
  const categories = [
    ['electricity', /\b(?:energia\s+elettrica|fornitura\s+elettrica|kWh|POD)\b/iu],
    ['gas', /\b(?:gas\s+naturale|fornitura\s+(?:di\s+)?gas|Smc|PDR)\b/iu],
    ['water', /\b(?:servizio\s+idrico|fornitura\s+(?:di\s+)?acqua|acquedotto)\b/iu],
    ['internet_services', /\b(?:telefonia|connessione\s+internet|banda\s+larga|fibra\s+ottica)\b/iu],
  ] as const;
  const found = categories.filter(([,pattern]) => pattern.test(text)).map(([kind]) => kind);
  const heading = /^(?:bolletta|fattura)\b/imu.test(text) || /\bperiodo\s+di\s+fatturazione\b/iu.test(text);
  if (!billing || !heading || !found.length) return null;
  const invoiceNumbers = [...new Set([...text.matchAll(/\b(?:numero\s+fattura|fattura\s+(?:n\.?|numero))[ \t:]*([\w/-]+)/giu)].map(m=>m[1]))];
  if (invoiceNumbers.length > 1) return null;
  const result: LocalBill = { category: unique(found) };
  // Labels are explicit: never use VAT, rates, historical balances or an arbitrary euro value.
  const money = [...text.matchAll(/\b(?:totale\s+(?:da\s+pagare|(?:della\s+)?bolletta|(?:della\s+)?fattura|documento)|importo\s+(?:da\s+pagare|(?:della\s+)?bolletta))[^\S\n]*:?[ \t]*(?:\n[ \t]*)?(?:€|EUR)?[ \t]*((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?:[ \t]*(?:€|EUR))?/giu)].map(m => m[1]!.replace(/\./g,'').replace(',','.')).filter(v => Number(v)>0 && Number(v)*100<=999999999);
  result.amount = unique(money);
  const suppliers = [...text.matchAll(/^(?:fornitore|venditore|società\s+di\s+vendita|ragione\s+sociale\s+del\s+fornitore)[ \t]*:[ \t]*([^\n]{2,120})$/gimu)].map(m=>m[1]!.trim());
  // A legal name at the top is usable only when unique; no logo/brand lookup.
  const headingNames = pages[0]!.split('\n').slice(0,12).map(line=>line.trim()).filter(line=>/^[\p{L}][\p{L}\d '&’.-]{1,100}\s+(?:S\.?p\.?A\.?|S\.?r\.?l\.?)$/iu.test(line));
  result.supplier = unique(suppliers.length ? suppliers : headingNames.includes(firstLine) ? headingNames : []);
  result.documentDate = labeledDates(text, 'data[ \\t]+(?:di[ \\t]+)?emissione|data[ \\t]+(?:della[ \\t]+)?fattura');
  result.dueOn = labeledDates(text, 'data[ \\t]+(?:di[ \\t]+)?scadenza|scadenza|da[ \\t]+saldare[ \\t]+entro|pagare[ \\t]+entro');
  const periods: string[] = [];
  const label = '(?:periodo[ \\t]+(?:di[ \\t]+)?(?:riferimento|fatturazione|competenza)|periodo[ \\t]+fatturato)';
  for (const m of text.matchAll(new RegExp(label+'[ \\t:]*\\n?[ \\t]*(?:dal[ \\t]+)?'+dateToken+'[ \\t]*(?:al|[-–])[ \\t]*'+dateToken,'giu'))) {
    const from = date(m[1]!), to = date(m[2]!);
    if (from && to && from <= to) periods.push(from+'/'+to);
  }
  for (const m of text.matchAll(new RegExp(label+'[ \\t:]*\\n?[ \\t]*('+months.join('|')+')[ \\t]+(\\d{4})\\b','giu'))) {
    const month = months.indexOf(m[1]!.toLowerCase())+1, year = Number(m[2]);
    if (year < 1900 || year > 2100) continue;
    const prefix = `${year}-${String(month).padStart(2,'0')}-`;
    periods.push(prefix+'01/'+prefix+new Date(Date.UTC(year,month,0)).getUTCDate());
  }
  const period = unique(periods);
  if (period) [result.competenceFrom,result.competenceTo] = period.split('/');
  return result;
}
