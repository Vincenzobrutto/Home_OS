import { localBillDate } from './localBillDates';
import {billSummaryAmounts} from './localBillSummary';
export type BillToken={text:string;x:number;y:number;width:number;height:number};
export type BillPageLayout={height:number;tokens:BillToken[]};
export type BillLayoutHints={supplier?:string;periods:Array<{from:string;to:string}>;summaryAmounts?:string[]};
const overlaps=(a:BillToken,b:BillToken)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>=Math.min(a.width,b.width)*.6;
/** Native PDF reading order is not spatial order. Restrict issuer hints to an
 * unambiguous legal header, and periods to values under a Periodo column. */
export function billLayoutHints(pages:BillPageLayout[],issuedOn?:string):BillLayoutHints{
  const first=pages[0],names:string[]=[],periods:BillLayoutHints['periods']=[];
  if(first){
    const headers=first.tokens.filter(t=>t.y>=0&&t.y<=first.height*.2&&t.width>0&&t.height>0);
    for(const candidate of headers.filter(t=>t.y<=first.height*.12)){
      const legal=/^([\p{L}][\p{L}\d '&’.-]{0,100}\s+(?:S\.?p\.?A\.?|S\.?r\.?l\.?))[ \t_]*$/iu.exec(candidate.text.trim());
      if(!legal)continue;
      const nearby=headers.filter(t=>overlaps(candidate,t)&&t.y>=candidate.y-3*candidate.height&&t.y<=candidate.y+12*candidate.height);
      const recipient=nearby.some(t=>/\b(?:cliente|destinatario|intestatario|spett(?:abile)?\.?|fatturare\s+a)\b/iu.test(t.text)||/cliente|destinatario|intestatario|spettabile|fatturarea/iu.test(t.text.replace(/[\s.]/gu,'')));
      const legalContext=nearby.some(t=>t.y>candidate.y&&/sedelegale|registro.*imprese|capitalesociale|capsoc/iu.test(t.text.replace(/[\s.]/gu,'')));
      if(!recipient&&legalContext)names.push(legal[1]!.trim());
    }
  }
  for(const page of pages){
    const headers=page.tokens.filter(t=>/^periodo(?:\s+(?:di\s+)?(?:riferimento|fatturazione|competenza))?$/iu.test(t.text.trim()));
    for(const value of page.tokens){
      const interval=/^(.+?)\s+[-–]\s+(.+)$/u.exec(value.text.trim());if(!interval)continue;
      const header=headers.filter(h=>overlaps(h,value)&&value.y>=h.y+h.height&&value.y-h.y<=8*h.height).sort((a,b)=>b.y-a.y)[0];
      if(!header)continue;
      const from=localBillDate(interval[1]!,issuedOn?.slice(0,4)),to=localBillDate(interval[2]!,issuedOn?.slice(0,4));
      if(from&&to&&from<=to)periods.push({from,to});
    }
  }
  const distinct=[...new Set(names)];
  const summaryAmounts=billSummaryAmounts(first);
  return {supplier:distinct.length===1?distinct[0]:undefined,periods,...(summaryAmounts.length?{summaryAmounts}:{})};
}
