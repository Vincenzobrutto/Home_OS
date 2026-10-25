/** Service evidence, independent of the issuer or filename. A contact phone
 * number alone says nothing about what is being invoiced. */
export function telecomSubscription(text:string):boolean {
 const line=/\b(?:informazioni\s+(?:sulla\s+)?linea|linea\s+(?:fissa|telefonica|internet)|codice\s+(?:di\s+)?migrazione)\b/iu.test(text);
 const subscription=/\b(?:abbonament[oi]\s+attiv[io]|canone\s+(?:mensile|di\s+abbonamento)|servizi(?:o)?\s+di\s+accesso)\b/iu.test(text);
 const identity=/\b(?:numero\s+(?:di\s+)?telefono|codice\s+(?:di\s+)?migrazione)\s*:/iu.test(text);
 return line&&subscription&&identity;
}
