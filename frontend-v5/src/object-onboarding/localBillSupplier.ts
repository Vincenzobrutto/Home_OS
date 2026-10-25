/** A branded customer app can corroborate a supplier when its name agrees with
 * both explicitly labelled web and email contacts. Never infer a legal name
 * from an arbitrary URL, recipient email, assistance company or issuer list. */
export function contactBillSupplier(text:string):string|undefined {
 const lines=text.normalize('NFKC').split('\n').map(line=>line.trim());
 const values=(label:RegExp)=>lines.flatMap((line,index)=>{
  const match=label.exec(line);if(!match)return [];
  return [match[1]?.trim()||lines[index+1]||''];
 });
 const emails=values(/^E[ -]?MAIL\s*:?\s*(.*)$/iu).flatMap(value=>{
  const match=/^[\w.+-]+[ \t]*@[ \t]*([a-z\d-]+\.[a-z.]{2,})\s*$/iu.exec(value);return match?[match[1]!.toLowerCase()]:[];
 });
 const websites=values(/^(?:WEB|SITO\s+WEB)\s*:?\s*(.*)$/iu).flatMap(value=>{
  const match=/^(?:https?:\/\/)?(?:www\.)?([a-z\d-]+\.[a-z.]{2,})(?:\/[^\s]*)?\s*$/iu.exec(value);return match?[match[1]!.toLowerCase()]:[];
 });
 const apps=values(/^APP\s*:?\s*(.*)$/iu).flatMap(value=>{
  const match=/^(?:My)?([A-Z][a-zA-Z\d-]{2,60})(?:\s*\([^\n]*\))?\s*$/u.exec(value);return match?[match[1]!]:[];
 });
 const domains=[...new Set(emails.filter(email=>websites.includes(email)))];
 if(domains.length!==1)return undefined;
 const stem=domains[0]!.split('.')[0]!;
 const names=[...new Set(apps.filter(app=>app.toLowerCase()===stem))];
 return names.length===1?names[0]:undefined;
}
