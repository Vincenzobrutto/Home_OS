import { BILL_MONTH_PATTERN, localBillDate } from './localBillDates';
export type PositionedDateEvidence={text:string;bbox?:{x0:number;y0:number;x1:number;y1:number}};
const dateLabel=(text:string)=>/^(?:emess[ao] il|data (?:di )?emissione|data fattura|(?:da )?saldare entro|(?:data (?:di )?)?scadenza|pagare entro)$/iu.test(text.trim().replace(/[:\s]+$/u,''));
/** OCR inputs passed the unchanged confidence thresholds; native glyphs use
 * their PDF positions. The caller supplies evidence from one page and scale. */
export function confidentOcrDatePairs(lines:PositionedDateEvidence[]){
 const result:string[]=[];
 for(const header of lines){
  const box=header.bbox;if(!box||!dateLabel(header.text))continue;
  const height=box.y1-box.y0;if(height<=0)continue;
  const column=(value:PositionedDateEvidence)=>{
   const b=value.bbox;if(!b)return false;
   const center=(b.x0+b.x1)/2,aligned=center>=box.x0-height&&center<=box.x1+height||Math.abs(b.x0-box.x0)<=height;
   const blocked=lines.some(other=>other!==header&&other!==value&&other.bbox&&dateLabel(other.text)&&other.bbox.y0>box.y1&&other.bbox.y0<b.y0&&Math.abs(other.bbox.x0-box.x0)<=height);
   return b.y0>=box.y1&&b.y0-box.y1<=8*height&&aligned&&!blocked;
  };
  const row=(value:PositionedDateEvidence)=>{
   const b=value.bbox;if(!b)return false;
   const overlap=Math.min(box.y1,b.y1)-Math.max(box.y0,b.y0),minimum=Math.min(height,b.y1-b.y0);
   return minimum>0&&overlap/minimum>=.35&&b.x0>=box.x1&&b.x0-box.x1<=20*minimum;
  };
  const candidates=lines.filter(line=>line!==header&&line.bbox&&(localBillDate(line.text)||new RegExp('^\\d{1,2}\\s+'+BILL_MONTH_PATTERN+'$','iu').test(line.text.trim()))&&(column(line)||row(line)));
  const years=[...new Set(lines.filter(line=>/^\d{4}$/u.test(line.text.trim())&&column(line)).map(line=>line.text.trim()))];
  if(candidates.some(line=>!localBillDate(line.text))&&years.length!==1)continue;
  const dates=[...new Set(candidates.flatMap(line=>localBillDate(line.text)??(years.length===1?localBillDate(line.text.trim()+' '+years[0]):undefined)??[]))];
  if(dates.length===1&&(!years.length||years.length===1&&dates[0]!.startsWith(years[0]+'-'))){const iso=dates[0]!;result.push(header.text.trim().replace(/[:\s]+$/u,'')+': '+iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4));}
 }
 return result;
}
