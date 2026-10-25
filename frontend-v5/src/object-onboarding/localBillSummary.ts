import type {BillPageLayout,BillToken} from './localBillLayout';
import {BILL_FULL_DATE_PATTERN,localBillDate} from './localBillDates';
/** A unique prominent currency value in a fiscal invoice summary column.
 * Coordinates are relative to the heading, never a supplier/template position.
 * These raw values still go through the ordinary EUR/ambiguity validator. */
export function billSummaryAmounts(page:BillPageLayout|undefined):string[]{
 if(!page)return [];
 const headings=page.tokens.filter(t=>/^fattura(?:\s+[\p{L}.]+\s+\d{4})?$/iu.test(t.text.trim()));
 if(headings.length!==1)return [];
 const head=headings[0]!;
 if(head.height<=0||head.width<=0)return [];
 const inColumn=(t:BillToken)=>t.y>=head.y+head.height&&t.y<=head.y+10*head.height&&t.x>=head.x-head.height&&t.x+t.width<=head.x+head.width+head.height;
 const column=page.tokens.filter(inColumn);
 if(!column.some(t=>/^(?:numero\s+fattura|fattura\s+(?:n\.?|numero))[ \t:]+[\w/-]+$/iu.test(t.text.trim())))return [];
 const dateLabel=new RegExp('^(?:data\\s+(?:di\\s+)?emissione|emess[ao]\\s+il)[ \\t:]+('+BILL_FULL_DATE_PATTERN+')$','iu');
 if(!column.some(t=>{const m=dateLabel.exec(t.text.trim());return !!m&&!!localBillDate(m[1]!);} ))return [];
 const prominent=column.filter(t=>t.height>=head.height*1.4);
 const currencies=prominent.filter(t=>/^(?:\p{Sc}|[A-Z]{3})$/u.test(t.text.trim()));
 if(currencies.length>4)return ['ambiguous-summary'];
 const paired=new Set<BillToken>(),values:string[]=[];
 for(const currency of currencies){
  const numbers=prominent.filter(t=>{
   const overlap=Math.min(t.y+t.height,currency.y+currency.height)-Math.max(t.y,currency.y);
   const gap=Math.max(t.x,currency.x)-Math.min(t.x+t.width,currency.x+currency.width);
   return t!==currency&&/^[+-]?[\d.,]+$/u.test(t.text.trim())&&overlap>=Math.min(t.height,currency.height)*.7&&gap>=0&&gap<=currency.height*1.5;
  });
  if(numbers.length!==1||paired.has(numbers[0]!))return ['ambiguous-summary'];
  const value=numbers[0]!;
  const extras=column.filter(t=>t!==currency&&t!==value&&Math.min(t.y+t.height,value.y+value.height)-Math.max(t.y,value.y)>=Math.min(t.height,value.height)*.35);
  if(extras.some(t=>/^[+−–-]$|^\s*[/:%]|\b(?:per|al|ogni)\s+(?:mese|anno|unità|kWh|Smc)\b|^cad\.?$/iu.test(t.text.trim())))return ['ambiguous-summary'];
  paired.add(numbers[0]!);values.push(currency.text.trim()+' '+numbers[0]!.text.trim());
 }
 for(const t of prominent.filter(t=>!paired.has(t)&&!currencies.includes(t))){
  if(/^(?:(?:\p{Sc}|[A-Z]{3})\s*[+-]?[\d.,]+|[+-]?[\d.,]+\s*(?:\p{Sc}|[A-Z]{3}))$/u.test(t.text.trim()))values.push(t.text.trim());
 }
 return values.length>1?['ambiguous-summary']:values;
}
