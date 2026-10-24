import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({getDocument:vi.fn(),destroy:vi.fn(async()=>{}),content:vi.fn(),numPages:1,initialize:vi.fn(),recognize:vi.fn(),dispose:vi.fn(),render:vi.fn()}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument:state.getDocument}));
vi.mock('./localOcr',async()=>{const actual=await vi.importActual<typeof import('./localOcr')>('./localOcr');return {...actual,LocalOcr:class{initialize=state.initialize;recognize=state.recognize;dispose=state.dispose;}};});
import {localBillPdf} from './localBillPdf';
beforeEach(()=>{
 state.numPages=1;state.destroy.mockClear();state.content.mockReset().mockResolvedValue({items:[{str:'Bolletta energia elettrica',hasEOL:true},{str:'Totale da pagare: 23,00 €',hasEOL:true}]});
 state.initialize.mockReset().mockRejectedValue(new Error('local_ocr_unavailable'));state.recognize.mockReset();state.dispose.mockClear();state.render.mockReset().mockReturnValue({promise:Promise.resolve()});
 state.getDocument.mockReset().mockImplementation(()=>({destroy:state.destroy,promise:Promise.resolve({get numPages(){return state.numPages;},getPage:async()=>({getTextContent:state.content,cleanup:vi.fn(),getViewport:({scale}:{scale:number})=>({width:600*scale,height:840*scale}),render:state.render})})}));
});
const bytes=new TextEncoder().encode('synthetic-pdf-bytes');
async function input(){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');return {blob:{size:bytes.length,arrayBuffer:async()=>bytes.buffer} as Blob,hash};}
it('only processes matching authorized bytes and destroys the local PDF',async()=>{
 const {blob,hash}=await input();expect(await localBillPdf(blob,hash,new AbortController().signal)).toMatchObject({amount:'23.00',category:'electricity'});
 expect(state.getDocument).toHaveBeenCalledWith(expect.objectContaining({data:expect.any(Uint8Array)}));expect(state.destroy).toHaveBeenCalledOnce();
});
it('SHA mismatch never opens the PDF engine',async()=>{const {blob}=await input();expect(await localBillPdf(blob,'0'.repeat(64),new AbortController().signal)).toBeNull();expect(state.getDocument).not.toHaveBeenCalled();});
it('oversized bytes and aborted reads never open the PDF engine',async()=>{const {blob,hash}=await input();const controller=new AbortController();controller.abort();expect(await localBillPdf(blob,hash,controller.signal)).toBeNull();expect(await localBillPdf({size:10485761} as Blob,hash,new AbortController().signal)).toBeNull();expect(state.getDocument).not.toHaveBeenCalled();});
it('too many pages are rejected and the PDF is destroyed',async()=>{state.numPages=21;const {blob,hash}=await input();expect(await localBillPdf(blob,hash,new AbortController().signal)).toBeNull();expect(state.content).not.toHaveBeenCalled();expect(state.destroy).toHaveBeenCalledOnce();});
it('text extraction errors still destroy the PDF',async()=>{state.content.mockRejectedValueOnce(new Error('unreadable'));const {blob,hash}=await input();await expect(localBillPdf(blob,hash,new AbortController().signal)).rejects.toThrow('unreadable');expect(state.destroy).toHaveBeenCalledOnce();});
it('an unavailable OCR engine preserves the manual fallback and destroys resources',async()=>{state.content.mockResolvedValue({items:[]});const {blob,hash}=await input();await expect(localBillPdf(blob,hash,new AbortController().signal)).rejects.toThrow('local_ocr_unavailable');expect(state.destroy).toHaveBeenCalledOnce();expect(state.dispose).toHaveBeenCalledOnce();});
it('excessive text is discarded',async()=>{state.content.mockResolvedValue({items:[{str:'x'.repeat(100001),hasEOL:true}]});const {blob,hash}=await input();expect(await localBillPdf(blob,hash,new AbortController().signal)).toBeNull();expect(state.destroy).toHaveBeenCalledOnce();});
it('a scan is rendered within pixel limits, recognized locally and remains a manual proposal',async()=>{
 state.content.mockResolvedValue({items:[]});state.initialize.mockResolvedValue(undefined);state.recognize.mockResolvedValue('Bolletta energia elettrica\nTotale da pagare: 76,53 EUR\nData emissione: 13/09/2026');
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255])}),putImageData:vi.fn()} as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['synthetic png'])));
 const {blob,hash}=await input(),progress=vi.fn();const result=await localBillPdf(blob,hash,new AbortController().signal,progress);
 expect(result).toMatchObject({method:'ocr',amount:'76.53',documentDate:'2026-09-13'});expect(progress).toHaveBeenCalledWith('OCR locale · pagina 1 di 1');
 const canvas=state.render.mock.calls[0]![0].canvas as HTMLCanvasElement;expect(canvas.width).toBe(0);expect(canvas.height).toBe(0);expect(state.dispose).toHaveBeenCalledOnce();
});
it('OCR page limits fail before starting a worker',async()=>{state.numPages=11;state.content.mockResolvedValue({items:[]});const {blob,hash}=await input();await expect(localBillPdf(blob,hash,new AbortController().signal)).rejects.toThrow('local_ocr_limits');expect(state.initialize).not.toHaveBeenCalled();expect(state.destroy).toHaveBeenCalledOnce();});
it('the total OCR timeout also releases a canvas whose PNG encoding never returns',async()=>{
 let ready:()=>void=()=>{};const encoding=new Promise<void>(resolve=>{ready=resolve;});
 vi.useFakeTimers();state.content.mockResolvedValue({items:[]});state.initialize.mockResolvedValue(undefined);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255])}),putImageData:vi.fn()} as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(()=>ready());
 try{const {blob,hash}=await input(),pending=localBillPdf(blob,hash,new AbortController().signal);const result=expect(pending).rejects.toThrow('local_ocr_timeout');await encoding;await vi.advanceTimersByTimeAsync(120001);await result;expect(state.dispose).toHaveBeenCalled();expect(state.destroy).toHaveBeenCalled();}finally{vi.useRealTimers();}
});
