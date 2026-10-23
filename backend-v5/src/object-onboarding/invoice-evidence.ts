import { printedDates, printedCents } from '../economy/document-evidence';

const normalized = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim();
const orderLabel = /^(?:(?:il tuo )?ordine\s+(?:del|effettuato il)|data\s*(?:(?:di|d[’'])\s*)?ordine|order date)\s*[:–-]?\s*/iu;
const purchaseLabel = /^(?:ricevuta\s+d[’']acquisto|data\s*(?:(?:di|d[’'])\s*)?(?:acquisto|fattura)|acquistato il|purchase date)\s*[:–-]?\s*/iu;
const conflictingLabel = /(?:consegna|consegnato|prevista|previsto|produzione|prodotto il|scadenza|pagamento|spedizione|manufactur|delivery|payment|due date)/iu;

/** Date-only citations need an unambiguous purchase label on the same original page. */
export function purchaseDateSource(excerpt: string, value: string, page?: string, role: 'purchase' | 'order' = 'purchase'): string | null {
  const labelPattern = role === 'order' ? orderLabel : purchaseLabel;
  const dates = printedDates(excerpt);
  if (dates.length !== 1 || dates[0] !== value || conflictingLabel.test(excerpt)) return null;
  const valid = (candidate: string) => {
    const compact = normalized(candidate), label = labelPattern.exec(compact);
    if (!label || conflictingLabel.test(compact)) return false;
    const printed = printedDates(compact.slice(label[0].length));
    return printed.length === 1 && printed[0] === value;
  };
  if (valid(excerpt)) return excerpt;
  // Do not borrow a label from elsewhere on the page or from a different date occurrence.
  if (!page || !/^(?:\d{4}-\d{2}-\d{2}|\d{1,2}([/.-])\d{1,2}\1\d{4}|\d{1,2}\s+[a-zà]+\s+\d{4})$/iu.test(normalized(excerpt))) return null;
  const lines = page.split(/\r?\n/u).map(line => line.trim());
  const occurrences: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!normalized(lines[i]).includes(normalized(excerpt))) continue;
    let candidate = lines[i];
    if (!valid(candidate) && normalized(lines[i]) === normalized(excerpt) && i > 0) {
      const previous = lines[i - 1], label = labelPattern.exec(normalized(previous));
      if (label && !normalized(previous).slice(label[0].length)) candidate = previous + '\n' + lines[i];
    }
    if (!valid(candidate)) return null;
    occurrences.push(candidate);
  }
  return occurrences.length ? occurrences[0] : null;
}

export function receiptPurchaseDate(excerpt: string, value: string): boolean {
  return purchaseDateSource(excerpt, value) !== null;
}
/** A quantity column is usable only when a unique product row can be attributed. */
export function tableQuantity(excerpt:string, productName:string):number|null {
 const described=descriptionRows(excerpt,productName);if(described)return described.quantity;
 const clean=(s:string)=>s.normalize('NFC').replace(/\s+/gu,' ').trim();
 const lines=excerpt.split(/\r?\n/u).map(line=>line.trim()).filter(Boolean);
 const header=lines.findIndex(line=>/^(?:quantit[aà]|quantity|qty|qt[aà])\.?\s+(?:articolo|prodotto|descrizione|item|product)\b/iu.test(line));
 if(header<0)return null;
 const rows:Array<{quantity:number;text:string}>=[];
 for(const line of lines.slice(header+1)){
  if(/^(?:totale|subtotale|spedizione|costi di spedizione|ordine|ricevuta|indirizzo)\b/iu.test(line))break;
  const start=/^(\d+)\s+(.+)$/u.exec(line);
  if(start)rows.push({quantity:Number(start[1]),text:start[2]});else if(rows.length)rows[rows.length-1].text+=' '+line;
 }
 const matches=rows.filter(row=>clean(row.text).includes(clean(productName)));
 return matches.length===1?matches[0].quantity:null;
}

/** Read description-first tables without borrowing a quantity or price from another row. */
function descriptionRows(excerpt:string,productName:string):{quantity:number;totalCents:number}|null {
 const lines=excerpt.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
 const header=lines.findIndex(s=>/^(?:descrizione|articolo|prodotto|description|item)\s+(?:quant\.?|quantit[aà]|quantity|qty|qt[aà]|q\.?t[aà])\.?\s+(?:prezzo|price|importo|totale|total)/iu.test(s));
 if(header<0||!/(?:totale|total)\b/iu.test(lines[header]))return null;
 const money='(?:(?:€|EUR|EURO)\\s*\\d[\\d.,]*|\\d[\\d.,]*\\s*(?:€|EUR|EURO))';
 const tail=new RegExp('^(.*?)\\b(\\d{1,2})\\s+('+money+')(?:(?:\\s+)('+money+'))?\\s*$','iu');
 const rows:Array<{name:string;quantity:number;totalCents:number}>=[];let pending:string[]=[];
 for(const line of lines.slice(header+1)){
  if(/^(?:totale|subtotale|spedizione|costi di spedizione|ordine|ricevuta|indirizzo|pagamento|iva|vat|total|shipping)\b/iu.test(line))break;
  const match=tail.exec(line);
  if(match){const name=normalized(match[1].trim() ? match[1] : pending.join(' ')),amounts=printedCents(match[4]??match[3]);
   // A separate unit-price column requires its own printed row total.
   if(name&&amounts.length===1&&(match[4]||!/unitari|unit\s+price/iu.test(lines[header])))rows.push({name,quantity:Number(match[2]),totalCents:amounts[0]});
   pending=[];
  }else if(/(?:€|\bEUR\b|euro)/iu.test(line)&&printedCents(line).length)pending=[];else pending.push(line);
 }
 const matches=rows.filter(r=>r.name.includes(normalized(productName)));
 return matches.length===1?{quantity:matches[0].quantity,totalCents:matches[0].totalCents}:null;
}
export function tablePurchaseAmount(excerpt:string,productName:string):number|null{return descriptionRows(excerpt,productName)?.totalCents??null;}

export function orderDateSource(excerpt: string, value: string, page?: string): string | null { return purchaseDateSource(excerpt, value, page, 'order'); }
