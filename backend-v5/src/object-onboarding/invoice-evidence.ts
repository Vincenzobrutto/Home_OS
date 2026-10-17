import { printedDates } from '../economy/document-evidence';

/** Purchase receipt heading is evidence of purchase, never a manufacturing or expected date. */
export function receiptPurchaseDate(excerpt: string, value: string): boolean {
 const lines=excerpt.split(/\r?\n/u).map(line=>line.trim());
 return lines.some(line=>/^ricevuta\s+d[’']acquisto\s*[:–-]?\s+/iu.test(line)&&printedDates(line).length===1&&printedDates(line)[0]===value);
}
/** A quantity column is usable only when a unique product row can be attributed. */
export function tableQuantity(excerpt:string, productName:string):number|null {
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
