import {expect,it} from 'vitest';
import {localBillDate} from './localBillDates';
import {billLayoutHints,type BillToken} from './localBillLayout';
import {localBill} from './localBill';
import {billOcrPages,confidentOcrText,type OcrLine} from './localOcr';
const invoice='Fattura servizi di telecomunicazione\nTotale da pagare: 37,82 EUR\nData emissione: 11/04/2027';
it.each(['servizi di telecomunicazione','servizi telecomunicazioni','telefonia','fibra ottica'])('recognizes %s without an issuer catalogue',service=>expect(localBill(['Fattura\n'+service])).toMatchObject({category:'internet_services'}));
it.each(['Preventivo servizi di telecomunicazione','Contratto servizi di telecomunicazione\nLa fattura sarà emessa in seguito.','Non è una bolletta servizi di telecomunicazione'])('keeps the negative evidence: %s',text=>expect(localBill([text])).toBeNull());
it.each([['9 novembre 2027','2027-11-09'],['2027 9 Novembre','2027-11-09'],['01 set. 2027','2027-09-01'],['29 febbraio 2028','2028-02-29']])('reads explicit calendar dates: %s',(input,result)=>expect(localBillDate(input)).toBe(result));
it.each(['31 aprile 2027','29 febbraio 2027','9 novembre','9 novembre 20270','1O/11/2027'])('does not repair or invent a date: %s',value=>expect(localBillDate(value)).toBeUndefined());
it('anchors short period years only to a matching explicit issue year',()=>{
 expect(localBillDate('01 mar 27','2027')).toBe('2027-03-01');expect(localBillDate('01 mar 27')).toBeUndefined();expect(localBillDate('01 mar 26','2027')).toBeUndefined();
 expect(localBill([invoice+'\nScadenza: 20 maggio 2027'])).toMatchObject({documentDate:'2027-04-11',dueOn:'2027-05-20'});
 expect(localBill([invoice+'\nScadenza: 20 maggio 27'])?.dueOn).toBeUndefined();
});
const token=(text:string,x:number,y:number,width=100,height=10):BillToken=>({text,x,y,width,height});
const legal=[token('Nuovo Servizio S.p.A. __',300,45),token('S e d e L e g a l e',300,65)];
it('uses spatial legal header and period column even when PDF reading order differs',()=>{
 const hints=billLayoutHints([{height:840,tokens:[token('01 mar 27 – 31 mar 27',330,180,100),...legal,token('Periodo',380,160,50)]}],'2027-04-11');
 expect(hints).toEqual({supplier:'Nuovo Servizio S.p.A.',periods:[{from:'2027-03-01',to:'2027-03-31'}]});
 expect(localBill([invoice+'\nFattura Aprile 2027'],hints)).toMatchObject({supplier:'Nuovo Servizio S.p.A.',competenceFrom:'2027-03-01',competenceTo:'2027-03-31'});
});
it('does not infer a supplier from a recipient header or a period from an unrelated column',()=>{
 const hints=billLayoutHints([{height:840,tokens:[...legal,token('Intestatario',300,35),token('Periodo',100,160,50),token('01 mar 27 – 31 mar 27',330,180)]}],'2027-04-11');
 expect(hints).toEqual({supplier:undefined,periods:[]});
});
it.each(['Capitale sociale','Registro delle imprese'])('accepts another explicit legal issuer role: %s',role=>{
 expect(billLayoutHints([{height:840,tokens:[token('Servizio Alternativo Srl',300,45),token(role,300,65)]}]).supplier).toBe('Servizio Alternativo Srl');
});
it('rejects a letter-spaced recipient role even beside a legal address',()=>{
 expect(billLayoutHints([{height:840,tokens:[...legal,token('I n t e s t a t a r i o',300,30)]}]).supplier).toBeUndefined();
});
it('does not choose between two plausible legal issuers',()=>{
 expect(billLayoutHints([{height:840,tokens:[...legal,token('Altro Servizio Srl',50,45),token('Sede legale',50,65)]}]).supplier).toBeUndefined();
});
it('conflicting native period or supplier evidence stays ambiguous',()=>{
 const hints={supplier:'Nuovo Servizio S.p.A.',periods:[{from:'2027-03-01',to:'2027-03-31'}]};
 const result=localBill([invoice+'\nFornitore: Altro Servizio Srl\nPeriodo di riferimento: febbraio 2027'],hints);
 expect(result?.supplier).toBeUndefined();expect(result?.competenceFrom).toBeUndefined();expect(result?.competenceTo).toBeUndefined();expect(result?.amount).toBe('37.82');
});
it('selects a hybrid page with an unread graphic due date despite abundant native text',()=>{
 const pages=[invoice+'\nScadenza\n'+('Testo informativo. '.repeat(30)),invoice+'\nScadenza: 20/05/2027'];
 expect(billOcrPages(pages,localBill([pages[0]!]))).toEqual([0,1]);
 expect(billOcrPages([pages[1]!],localBill([pages[1]!]))).toEqual([]);
 expect(billOcrPages([''],null)).toEqual([0]);expect(billOcrPages([invoice],localBill([invoice]))).toEqual([]);
});
const line=(text:string,x:number,y:number,width=110,confidence=97):OcrLine=>({text,confidence,words:text.split(' ').map(text=>({text,confidence})),bbox:{x0:x,y0:y,x1:x+width,y1:y+20}});
const recognized=(...lines:OcrLine[])=>confidentOcrText({blocks:[{paragraphs:[{lines}]}]});
it('pairs a graphic day/month with its own explicit calendar year',()=>{
 const text=recognized(line('Scadenza',400,100),line('09 Novembre',400,130),line('2027',430,160,50));
 expect(localBill([invoice+'\n'+text])?.dueOn).toBe('2027-11-09');
 expect(localBill([invoice+'\n'+recognized(line('Scadenza',400,100),line('09 Novembre',400,130))])?.dueOn).toBeUndefined();
});
it('does not borrow a distant year, cross a date label or choose between conflicting years',()=>{
 const heading=line('Scadenza',400,100),date=line('09 Novembre',400,130);
 for(const lines of [[heading,date,line('2027',50,160,50)],[heading,date,line('2027',430,160,50),line('2028',430,190,50)],[heading,line('Data emissione',400,125),line('2027 09 Novembre',400,155)]])expect(localBill([invoice+'\n'+recognized(...lines)])?.dueOn).toBeUndefined();
});
it('retains digit confidence and conflicting date rules in graphic calendars',()=>{
 const heading=line('Scadenza',400,100),year=line('2027',430,160,50);
 expect(localBill([invoice+'\n'+recognized(heading,line('09 Novembre',400,130,110,89),year)])?.dueOn).toBeUndefined();
 expect(localBill([invoice+'\nScadenza: 10/11/2027\n'+recognized(heading,line('09 Novembre',400,130),year)])?.dueOn).toBeUndefined();
});
it('combines a native explicit year with a confident graphic day/month on the same page',()=>{
 const data={blocks:[{paragraphs:[{lines:[line('Scadenza',400,100),line('09 Novembre',400,160)]}]}]};
 const native=[{text:'2027',bbox:{x0:430,y0:135,x1:480,y1:150}}];
 expect(localBill([invoice+'\n'+confidentOcrText(data,native)])?.dueOn).toBe('2027-11-09');
 const conflict={blocks:[{paragraphs:[{lines:[...data.blocks[0]!.paragraphs[0]!.lines,line('2028',430,195,50)]}]}]};
 expect(localBill([invoice+'\n'+confidentOcrText(conflict,native)])?.dueOn).toBeUndefined();
 const fullConflict={blocks:[{paragraphs:[{lines:[line('Scadenza',400,100),line('09/11/2028',400,160)]}]}]};
 expect(localBill([invoice+'\n'+confidentOcrText(fullConflict,native)])?.dueOn).toBeUndefined();
});
it('native context never promotes uncertain OCR digits or a year in another column',()=>{
 const data={blocks:[{paragraphs:[{lines:[line('Scadenza',400,100),line('09 Novembre',400,160,110,89)]}]}]};
 expect(localBill([invoice+'\n'+confidentOcrText(data,[{text:'2027',bbox:{x0:430,y0:135,x1:480,y1:150}}])])?.dueOn).toBeUndefined();
 const certain={blocks:[{paragraphs:[{lines:[line('Scadenza',400,100),line('09 Novembre',400,160)]}]}]};
 expect(localBill([invoice+'\n'+confidentOcrText(certain,[{text:'2027',bbox:{x0:50,y0:135,x1:100,y1:150}}])])?.dueOn).toBeUndefined();
});
