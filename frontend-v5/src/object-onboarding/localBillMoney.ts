const label=/^[ \t]*(?:totale\s+(?:da\s+pagare|(?:della\s+)?bolletta|(?:della\s+)?fattura|documento)|importo\s+(?:da\s+pagare|(?:della\s+)?bolletta))[ \t]*:?[ \t]*(.*)$/iu;
const currencyOnly=/^(?:EURO|[a-z]{3}|\p{Sc})$/iu;
const euro=/^(?:EUR|EURO|€)$/iu;
const noteWord=/^(?:IVA|VAT|PER|DUE|CON|TAX)$/iu;
const number=/^((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(?!\d)/u;
const token=/(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?!\d)/gu;
const normalize=(raw:string)=>raw.replaceAll('.','').replace(',','.');
type Candidate={kind:'ignore'|'invalid'}|{kind:'value';value:string};

function amount(row:string):Candidate{
 // A currency symbol in the labelled value is never a request to convert it.
 if([...row.matchAll(/\p{Sc}/gu)].some(m=>m[0]!=='€'))return {kind:'invalid'};
 const value=row.replace(/^(?:EURO|EUR|€)[ \t]*/iu,'');
 const match=number.exec(value);
 if(!match)return {kind:/^(?:[+-]?\d|\p{Sc}|[a-z]{3,}[ \t]*\d)/iu.test(row)?'invalid':'ignore'};
 let tail=value.slice(match[0].length).trim();
 if(/^(?:[.,/:\\][ \t]*\d|[eE][+-]?\d|[+-])/u.test(tail))return {kind:'invalid'};
 const marker=/^(EURO|[a-z]{3}|€)/iu.exec(tail);
 if(marker){
  if(!euro.test(marker[1]!)&&!noteWord.test(marker[1]!))return {kind:'invalid'};
  if(euro.test(marker[1]!)){
   tail=tail.slice(marker[0].length).trim();
   const second=/^([a-z]{3})(?=$|[ \t(.,])/iu.exec(tail);
   if(second&&!euro.test(second[1]!)&&!noteWord.test(second[1]!))return {kind:'invalid'};
   if(/^[+-](?:[ \t]*$|[ \t]*\d)/u.test(tail))return {kind:'invalid'};
  }
 }
 const values=new Set([...row.matchAll(token)].map(m=>Number(normalize(m[0]))));
 if(values.size!==1)return {kind:'invalid'};
 const normalized=normalize(match[1]!),cents=Number(normalized.replace('.',''));
 if(!Number.isSafeInteger(cents)||cents<=0||cents>999999999)return {kind:'invalid'};
 return {kind:'value',value:normalized};
}

/** EUR-only proposals from complete labelled values, without conversion or prefix truncation. */
export function localBillAmount(text:string):string|undefined{
 const values=new Set<string>();
 // Join only a recognized amount label, never arbitrary rows or monetary values.
 const lines=text.replace(new RegExp(label.source,'gimu'),part=>part.replace(/\s*\n\s*/gu,' ')).split('\n');
 for(const declared of text.matchAll(/^[ \t]*(?:valuta(?:\s+(?:di\s+fatturazione|della\s+fattura|del\s+documento))?|(?:billing\s+)?currency)[ \t]*:[ \t\n]*([a-z]{3,}|\p{Sc})(?=$|[ \t(])/gimu)){
  if(!euro.test(declared[1]!))return undefined;
 }
 for(let i=0;i<lines.length;i++){
  const match=label.exec(lines[i]!);if(!match)continue;
  let row=match[1]!.trim(),last=i;
  if(!row){last++;row=lines[last]?.trim()??'';}
  const next=lines[last+1]?.trim()??'';
  if(currencyOnly.test(row)&&/^[\d., \t]+$/u.test(next))row+=' '+next;
  else if(/^[\d., \t]+$/u.test(row)&&currencyOnly.test(next))row+=' '+next;
  const candidate=amount(row);
  if(candidate.kind==='invalid')return undefined;
  if(candidate.kind==='value')values.add(candidate.value);
 }
 return values.size===1?[...values][0]:undefined;
}
