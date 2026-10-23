import { printedCents } from '../economy/document-evidence';

export const compactEvidence = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
// Semantic roles, never merchant names, SKUs, fixed prices or sample dates.
export const dateLabels = {
 order: /^(?:(?:il tuo )?ordine\s+(?:del|effettuato\s+(?:il|in data))|data\s*(?:(?:di|d[’']|dell[’'])\s*)?ordine|order\s+(?:date|placed\s+on)|ordered\s+on)\s*[:=–-]?\s*/iu,
 purchase: /^(?:ricevuta\s+d[’']acquisto|data\s*(?:(?:di|d[’'])\s*)?acquisto|acquisto\s+(?:del|effettuato\s+(?:il|in data))|acquistato\s+il|purchase\s+date|purchased\s+on)\s*[:=–-]?\s*/iu,
};

/** Full printed date token, with no product qualifier or extra narrative. */
export function dateOnly(value: string): boolean {
 return /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}([/.-])\d{1,2}\1\d{4}|\d{1,2}\s+[a-zà]+\s+\d{4})$/iu.test(compactEvidence(value));
}

const currency = '(?:EUR|EURO|€)';
const number = '\\d(?:[\\d.,\\u00a0\\u202f ]*\\d)?';
/** Whole monetary cell, explicit euro currency in this cell or its own column. */
export function monetaryCell(value: string, euroColumn = false): number | null {
 const clean = compactEvidence(value);
 const syntax = new RegExp('^(?:'+currency+'\\s*'+number+'|'+number+'\\s*'+currency+'|'+number+'\\s*\\(\\s*'+currency+'\\s*\\)'+(euroColumn?'|'+number:'')+')$','iu');
 const amounts = printedCents(clean);
 return syntax.test(clean) && amounts.length === 1 ? amounts[0] : null;
}

export function purchaseGrandTotal(excerpt: string, amountCents: number): boolean {
 const quote = compactEvidence(excerpt);
 const label = /^(?:(?:prezzo|importo)\s+totale|totale(?:\s+(?:documento(?:\s+corrente)?|scontrino|ricevuta|complessivo|costi|ordine|fattura))?|grand\s+total|order\s+total|total\s+(?:order|amount)|total)\s*[:=]?\s*/iu.exec(quote);
 return !!label && monetaryCell(quote.slice(label[0].length)) === amountCents;
}

export function shippingMoney(excerpt: string): string | null {
 const quote = compactEvidence(excerpt);
 const label = /^(?:(?:spese|costi)(?:\s+di)?\s+spedizione|spedizione|(?:spese|costi)(?:\s+di)?\s+trasporto|shipping(?:\s+(?:costs?|charges?|fee))?|delivery\s+(?:costs?|charges?|fee))\s*[:=]?\s*/iu.exec(quote);
 if (!label) return null;
 const money = quote.slice(label[0].length);
 return monetaryCell(money) !== null ? money : null;
}

/** A free-form labelled price must bind name, role and money to the same row. */
export function labelledProductAmount(excerpt: string, productName: string, amountCents: number): boolean {
 const lines=excerpt.split(/\r?\n/u).map(compactEvidence).filter(Boolean);
 const role=/(?:totale\s+riga|importo\s+riga|prezzo\s+articolo|line\s+total|row\s+total)\s*[:=]?\s*/iu;
 const candidates=lines.filter(line=>line.includes(compactEvidence(productName))&&role.test(line));
 if(candidates.length!==1)return false;
 const row=candidates[0],label=role.exec(row)!;
 if(!row.slice(0,label.index).includes(compactEvidence(productName))||monetaryCell(row.slice(label.index+label[0].length))!==amountCents)return false;
 // Attribution is to this named row, not to unrelated numbers in a model/specification.
 return true;
}

type Column = 'description' | 'quantity' | 'total' | 'unit' | 'other';
function column(label: string): Column {
 const value = compactEvidence(label).replace(/\s*\(\s*(?:EUR|EURO|€)\s*\)\s*$/iu,'').toLocaleLowerCase('it');
 if (/^(?:descrizione|articolo|prodotto|description|item|product)$/u.test(value)) return 'description';
 if (/^(?:quant\.?|quantit[aà]|quantity|qty\.?|q\.?t[aà]\.?)$/u.test(value)) return 'quantity';
 if (/^(?:totale(?:\s+riga)?|importo(?:\s+riga)?|line\s+total|row\s+total|total)$/u.test(value)) return 'total';
 if (/^(?:prezzo\s+unitario|unit\s+price)$/u.test(value)) return 'unit';
 return 'other';
}

/** Explicit delimited columns may be reordered. No multiplication or cell borrowing. */
export function columnProductRow(excerpt: string, productName: string): {quantity: number | null; totalCents: number | null} | null | undefined {
 const lines = excerpt.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
 const tables = lines.flatMap((line,h)=> {
  const separator=['|','\t',';'].find(s=>line.includes(s));if(!separator)return [];
  const headers=line.split(separator).map(compactEvidence),roles=headers.map(column);
  return roles.includes('description') && roles.some(r=>r==='quantity'||r==='total')?[{h,separator,headers,roles}]:[];
 });
 if(!tables.length)return undefined;
 // Two headers or repeated blocks cannot lend their columns to each other.
 if(tables.length!==1)return null;
 const {h,separator,headers,roles}=tables[0];
 if(roles.filter(r=>r==='description').length!==1||['quantity','total'].some(role=>roles.filter(r=>r===role).length>1))return null;
 const description=roles.indexOf('description'),quantity=roles.indexOf('quantity'),total=roles.indexOf('total');
 const matches: Array<{quantity: number | null; totalCents: number | null}>=[];
 for (const line of lines.slice(h+1)) {
  const row=line.split(separator).map(compactEvidence);
  if (!compactEvidence(row[description]??'').includes(compactEvidence(productName))) continue;
  if (row.length!==headers.length) return null;
  const count=quantity>=0&&/^\d{1,2}$/u.test(row[quantity])?Number(row[quantity]):null;
  const cents=total>=0?monetaryCell(row[total],/\(\s*(?:EUR|EURO|€)\s*\)\s*$/iu.test(headers[total])):null;
  // Missing/invalid money must not erase an independently printed quantity, or vice versa.
  matches.push({quantity:count!==null&&count>=1&&count<=20?count:null,totalCents:cents!==null&&cents>0?cents:null});
 }
 return matches.length===1?matches[0]:null;
}
