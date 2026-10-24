import {afterEach,expect,it,vi} from 'vitest';
import {confidentOcrText,LocalOcr,needsOcr} from './localOcr';
import {localBill} from './localBill';
afterEach(()=>vi.unstubAllGlobals());
const line=(text:string,confidence=97,wordConfidence=97)=>({text,confidence,words:text.split(' ').map(text=>({text,confidence:wordConfidence}))});
const page=(...lines:ReturnType<typeof line>[])=>({blocks:[{paragraphs:[{lines}]}]});
it('accepts confident words and never corrects uncertain digits',()=>{
 const text=confidentOcrText(page(line('Bolletta energia elettrica'),line('Totale da pagare: 123,45 EUR',97,89),line('Data emissione: 11/02/2026',70),line('Scadenza: 21/02/2026')));
 expect(localBill([text])).toMatchObject({category:'electricity',dueOn:'2026-02-21'});
 expect(localBill([text])?.amount).toBeUndefined();expect(localBill([text])?.documentDate).toBeUndefined();
 expect(confidentOcrText(page(line('Totale da pagare: 1O0,00 EUR')))).toContain('1O0,00');
 expect(localBill(['Bolletta energia elettrica\n'+confidentOcrText(page(line('Totale da pagare: 1O0,00 EUR')))])?.amount).toBeUndefined();
});
it('rejects missing confidence data and does not join incomplete lines',()=>{
 expect(confidentOcrText({})).toBe('');expect(confidentOcrText(page({...line('Totale 12,00'),words:[]}))).toBe('[lettura incerta]');
 expect(needsOcr('  ')).toBe(true);expect(needsOcr('testo completo '.repeat(20))).toBe(false);
});
it('conflicting confident totals remain ambiguous',()=>expect(localBill([confidentOcrText(page(line('Bolletta energia elettrica'),line('Totale da pagare: 20,00 EUR'),line('Totale bolletta: 30,00 EUR')))])?.amount).toBeUndefined());
it('retains a confident label before an uncertain redaction without joining numbers across it',()=>{
 const header={text:'N. fattura elettronica XX',confidence:83,words:[...line('N. fattura elettronica').words,{text:'XX',confidence:42}]};
 const amount={text:'Totale da pagare: 1 15,36 EUR',confidence:83,words:[...line('Totale da pagare:').words,{text:'1',confidence:42},...line('15,36 EUR').words]};
 const text=confidentOcrText(page(header,line('SERVIZIO ENERGIA ELETTRICA'),amount,line('Emessa il 24/02/2026')));
 expect(localBill([text])).toMatchObject({category:'electricity',documentDate:'2026-02-24'});expect(localBill([text])?.amount).toBeUndefined();expect(text).toContain('[lettura incerta]');
});
const positioned=(text:string,x0:number,y0:number,x1:number,y1:number)=>({...line(text),bbox:{x0,y0,x1,y1}});
it('pairs totals and dates by their unique column geometry, not by OCR reading order',()=>{
 const text=confidentOcrText(page(line('N. fattura elettronica'),line('Servizio energia elettrica'),positioned('Da saldare entro',800,200,1050,235),positioned('Totale da pagare',50,200,300,235),positioned('63,47 EUR',450,195,650,240),positioned('05/10/2026',800,250,1050,285),positioned('Emessa il',50,100,200,130),positioned('12/09/2026',300,100,480,130)));
 expect(localBill([text])).toMatchObject({category:'electricity',amount:'63.47',documentDate:'2026-09-12',dueOn:'2026-10-05'});
});
it('does not take the first of two spatially plausible totals',()=>{
 const text=confidentOcrText(page(line('Bolletta energia elettrica'),positioned('Totale da pagare',50,100,300,130),positioned('63,47 EUR',400,100,550,130),positioned('99,00 EUR',650,100,800,130)));
 expect(localBill([text])?.amount).toBeUndefined();
});
it('does not prefer a right-hand amount over a different amount below the label',()=>{
 const text=confidentOcrText(page(line('Bolletta energia elettrica'),positioned('Totale da pagare',50,100,300,130),positioned('63,47 EUR',400,100,550,130),positioned('99,00 EUR',50,150,250,180)));
 expect(localBill([text])?.amount).toBeUndefined();
});
it('never pairs labels and values from different pages',()=>{
 const a=confidentOcrText(page(line('Bolletta energia elettrica'),positioned('Totale da pagare',50,100,300,130)));
 const b=confidentOcrText(page(positioned('63,47 EUR',400,100,550,130)));
 expect(localBill([a,b])?.amount).toBeUndefined();
});
function mockWorker(auto=true){
 class WorkerStub{
  static instance:WorkerStub;onmessage?:({data}:{data:unknown})=>void;onerror?:()=>void;
  terminate=vi.fn();messages:Array<{jobId:string;action:string;payload:unknown}>=[];
  url:string;constructor(url:string){this.url=url;WorkerStub.instance=this;}
  postMessage(data:{jobId:string;action:string;payload:unknown}){this.messages.push(data);if(auto)queueMicrotask(()=>this.onmessage?.({data:{...data,status:'resolve',data:page(line('Bolletta energia elettrica'))}}));}
 }
 vi.stubGlobal('Worker',WorkerStub);return WorkerStub;
}
it('uses the pinned local worker protocol, disables caches, and terminates exactly once',async()=>{
 const W=mockWorker(),ocr=new LocalOcr(new AbortController().signal);await ocr.initialize();
 expect(W.instance.url).toBe('/ocr/v1/worker.js');expect(W.instance.messages.map(m=>m.action)).toEqual(['load','loadLanguage','initialize','setParameters']);
 expect(W.instance.messages[1]?.payload).toMatchObject({langs:['ita'],options:{langPath:'/ocr/v1/lang',cacheMethod:'none'}});
 expect(await ocr.recognize({arrayBuffer:async()=>new ArrayBuffer(2)} as Blob)).toBe('Bolletta energia elettrica');ocr.dispose();ocr.dispose();expect(W.instance.terminate).toHaveBeenCalledOnce();
});
it('abort terminates initialization immediately, including a worker that never becomes ready',async()=>{
 const W=mockWorker(false),control=new AbortController(),ocr=new LocalOcr(control.signal),pending=ocr.initialize();
 control.abort();await expect(pending).rejects.toThrow('local_ocr_cancelled');expect(W.instance.terminate).toHaveBeenCalledOnce();
});
it('a worker rejection terminates the process and exposes no rejected OCR contents',async()=>{
 const W=mockWorker(false),ocr=new LocalOcr(new AbortController().signal),pending=ocr.initialize();const message=W.instance.messages[0]!;
 W.instance.onmessage?.({data:{...message,status:'reject',data:'private text'}});await expect(pending).rejects.toThrow('local_ocr_failed');expect(W.instance.terminate).toHaveBeenCalledOnce();
});
