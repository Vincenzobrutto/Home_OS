import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({getDocument:vi.fn(),destroy:vi.fn(async()=>{}),initialize:vi.fn(),recognize:vi.fn(),dispose:vi.fn(),render:vi.fn(),pages:[] as Array<Array<{str:string;hasEOL:true;width:number;height:number;transform:number[]}>>}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument:state.getDocument}));
vi.mock('./localOcr',async()=>{const actual=await vi.importActual<typeof import('./localOcr')>('./localOcr');return {...actual,LocalOcr:class{initialize=state.initialize;recognize=state.recognize;dispose=state.dispose;}};});
import {localBillPdf} from './localBillPdf';
const item=(str:string,x:number,y:number,width=150)=>({str,hasEOL:true as const,width,height:10,transform:[1,0,0,1,x,840-y-10]});
const bytes=new TextEncoder().encode('synthetic hybrid invoice');
async function read(){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');return localBillPdf({size:bytes.length,arrayBuffer:async()=>bytes.buffer} as Blob,hash,new AbortController().signal);}
beforeEach(()=>{
 state.pages=[[item('Fattura servizi di telecomunicazione',40,150),item('Totale da pagare: 37,82 EUR',40,180),item('Data emissione: 11/04/2027',40,210),item('Scadenza',400,250),item('2027',430,280,50),item('Nuovo Servizio S.p.A. __',300,45),item('S e d e L e g a l e',300,65)],[item('Periodo',380,160,50),item('01 mar 27 – 31 mar 27',330,180,100),item('Dettaglio delle prestazioni e delle condizioni del servizio. '.repeat(4),40,300)]];
 state.destroy.mockClear();state.initialize.mockReset().mockResolvedValue(undefined);state.recognize.mockReset().mockResolvedValue('Scadenza: 20/05/2027');state.dispose.mockClear();state.render.mockReset().mockReturnValue({promise:Promise.resolve()});
 state.getDocument.mockReset().mockImplementation(()=>({destroy:state.destroy,promise:Promise.resolve({numPages:state.pages.length,getPage:async(n:number)=>({rotate:0,getTextContent:async()=>({items:state.pages[n-1]}),getViewport:({scale}:{scale:number})=>({width:600*scale,height:840*scale,convertToViewportPoint:(x:number,y:number)=>[x,840-y]}),cleanup:vi.fn(),render:state.render})})}));
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255])}),putImageData:vi.fn()} as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['synthetic png'])));
});
it('combines native table/header and a graphic due date without replacing native evidence',async()=>{
 // The commissioned flow now reads the summary page only. Keep all the same
 // expected values, with its reference period in that first-page summary.
 state.pages[0]!.push(item('Periodo di riferimento',380,160,50),state.pages[1]![1]!);
 expect(await read()).toMatchObject({method:'ocr',supplier:'Nuovo Servizio S.p.A.',category:'internet_services',amount:'37.82',documentDate:'2027-04-11',competenceFrom:'2027-03-01',competenceTo:'2027-03-31',dueOn:'2027-05-20'});
 expect(state.recognize).toHaveBeenCalledOnce();expect(state.destroy).toHaveBeenCalledOnce();expect(state.dispose).toHaveBeenCalledOnce();
 const scale=state.render.mock.calls[0]![0].viewport.width/600;
 expect(state.recognize.mock.calls[0]![1]).toContainEqual({text:'2027',bbox:{x0:430*scale,y0:280*scale,x1:480*scale,y1:290*scale}});
 expect(state.recognize.mock.calls[0]![1]).not.toContainEqual(expect.objectContaining({text:'Periodo'}));
 const canvas=state.render.mock.calls[0]![0].canvas as HTMLCanvasElement;expect(canvas.width).toBe(0);expect(canvas.height).toBe(0);
});
it('does not search a later page for a missing reference period',async()=>{
 const bill=await read();expect(bill?.amount).toBe('37.82');expect(bill?.competenceFrom).toBeUndefined();expect(bill?.competenceTo).toBeUndefined();
});
it('retains ambiguity when OCR contradicts a native total',async()=>{
 state.recognize.mockResolvedValue('Scadenza: 20/05/2027\nTotale da pagare: 38,82 EUR');
 const bill=await read();expect(bill?.amount).toBeUndefined();expect(bill?.dueOn).toBe('2027-05-20');
});
it('does not turn an arbitrary date into the missing due date',async()=>{
 state.recognize.mockResolvedValue('Lettura incerta\n20/05/2027');expect((await read())?.dueOn).toBeUndefined();
});
it.each([false,true])('unknown provider summary reaches the proposal without reading page two; conflicting OCR=%s',conflict=>{
 const entry=(str:string,x:number,y:number,width=130,height=10)=>({str,hasEOL:true as const,width,height,transform:[1,0,0,1,x,840-y-height]});
 state.pages=[[entry('Fattura settembre 2026',200,200,150,13),entry('Numero fattura: DEMO-7',200,230),entry('Data emissione: 16/09/2026',200,245),entry('€',200,275,18,26),entry('48,37',225,275,65,26),entry('Numero telefono: 000000000',30,300),entry('Abbonamenti attivi al 01/09/2026',30,320),entry('Informazioni linea',30,340),entry('Fornitore: Rete Inventata Srl',30,360),entry('Scadenza',400,230)], [entry('Totale da pagare: 999,99 EUR',30,200)]];
 state.recognize.mockResolvedValue('Scadenza: 08/10/2026'+(conflict?'\nTotale da pagare: 49,00 EUR':''));
 return read().then(proposal=>{
  expect(proposal).toMatchObject({category:'internet_services',supplier:'Rete Inventata Srl',documentDate:'2026-09-16',dueOn:'2026-10-08'});
  expect(proposal?.amount).toBe(conflict?undefined:'48.37');expect(proposal?.competenceFrom).toBeUndefined();expect(state.recognize).toHaveBeenCalledOnce();
 });
});
