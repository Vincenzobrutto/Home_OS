/** Service evidence, independent of the issuer or filename. A contact phone
 * number alone says nothing about what is being invoiced. */
export function telecomSubscription(text:string):boolean {
 const line=/\b(?:informazioni\s+(?:sulla\s+)?linea|linea\s+(?:fissa|telefonica|internet)|codice\s+(?:di\s+)?migrazione)\b/iu.test(text);
 const subscription=/\b(?:abbonament[oi]\s+attiv[io]|canone\s+(?:mensile|di\s+abbonamento)|servizi(?:o)?\s+di\s+accesso)\b/iu.test(text);
 const identity=/\b(?:numero\s+(?:di\s+)?telefono|codice\s+(?:di\s+)?migrazione)\s*:/iu.test(text);
 return line&&subscription&&identity;
}

/** Additional service wording must occupy its own service/header row. A vendor
 * name or a product description mentioning a service is not evidence of a bill. */
export function declaredBillServices(text:string):string[]{
 const rows=text.split('\n').map(row=>row.trim()
  .replace(/^(?:bolletta|fattura)(?:\s+per)?[ \t]+/iu,'')
  .replace(/^(?:tipo\s+di\s+servizio|servizio|oggetto\s+della\s+fornitura)[ \t]*:[ \t]*/iu,''));
 const services=[
  ['electricity',/^fornitura\s+di\s+elettricità$/iu],
  ['gas',/^servizio\s+di\s+distribuzione\s+del\s+gas$/iu],
  ['water',/^(?:fornitura\s+idrica|servizi\s+idrici)$/iu],
  ['internet_services',/^(?:servizio\s+telefonico|servizi\s+telefonici|accesso\s+a\s+internet|connettività\s+internet)$/iu],
 ] as const;
 return services.filter(([,pattern])=>rows.some(row=>pattern.test(row))).map(([category])=>category);
}

/** The issuer's identity is not the service supplied by the document. Retain
 * original text for field extraction; exclude these rows only from type signals. */
export function billServiceText(text:string):string{
 return text.split('\n').filter(row=>{
  const value=row.trim();
  return !/^(?:fornitore|venditore|società\s+di\s+vendita|ragione\s+sociale\s+del\s+fornitore)[ \t]*:/iu.test(value)&&
   !/^[\p{L}][\p{L}\d '&’.-]{1,100}\s+(?:S\.?p\.?A\.?|S\.?r\.?l\.?)$/iu.test(value);
 }).join('\n');
}
