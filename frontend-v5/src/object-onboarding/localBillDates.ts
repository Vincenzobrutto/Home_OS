export const BILL_MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
export const BILL_MONTH_PATTERN = '(?:'+BILL_MONTHS.flatMap(month => [month, month.slice(0,3)+'\\.?']).join('|')+')';
export const BILL_FULL_DATE_PATTERN = '(?:\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{4}|\\d{1,2}[ \\t]+'+BILL_MONTH_PATTERN+'[ \\t]+\\d{4}|\\d{4}[ \\t]+\\d{1,2}[ \\t]+'+BILL_MONTH_PATTERN+')';
/** Short years are allowed only for an explicitly labelled period, bound to the
 * same four-digit issue year. Due/issue dates never borrow a year or the clock. */
export function localBillDate(input: string, periodYear?: string): string | undefined {
  const value=input.trim().replace(/\s+/gu,' ');
  let day:string|undefined,month:string|undefined,year:string|undefined;
  const numeric=/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/u.exec(value);
  if(numeric){[,day,month,year]=numeric;}
  else {
    const words=value.split(' ');
    if(words.length!==3)return undefined;
    const yearFirst=/^\d{4}$/u.test(words[0]!);
    [day,month,year]=yearFirst?[words[1],words[2],words[0]]:words;
    const index=BILL_MONTHS.findIndex(name=>[name,name.slice(0,3)].includes(month!.toLowerCase().replace(/\.$/u,'')));
    if(index<0)return undefined;month=String(index+1);
  }
  if(!day||!month||!year||!/^\d{1,2}$/u.test(day)||!/^\d{1,2}$/u.test(month))return undefined;
  if(year.length===2){if(!periodYear||!/^\d{4}$/u.test(periodYear)||!periodYear.endsWith(year))return undefined;year=periodYear;}
  if(!/^\d{4}$/u.test(year))return undefined;
  const iso=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,parsed=new Date(iso+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:undefined;
}
