import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({getDocument:vi.fn(),destroy:vi.fn(async()=>{}),content:vi.fn(),numPages:1}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{},getDocument:state.getDocument}));
import {localBillPdf} from './localBillPdf';
beforeEach(()=>{
 state.numPages=1;state.destroy.mockClear();state.content.mockReset().mockResolvedValue({items:[{str:'Bolletta energia elettrica',hasEOL:true},{str:'Totale da pagare: 23,00 €',hasEOL:true}]});
 state.getDocument.mockReset().mockImplementation(()=>({destroy:state.destroy,promise:Promise.resolve({get numPages(){return state.numPages;},getPage:async()=>({getTextContent:state.content,cleanup:vi.fn()})})}));
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
it('an image-only PDF explicitly requires OCR, without fabricated proposals',async()=>{state.content.mockResolvedValue({items:[]});const {blob,hash}=await input();await expect(localBillPdf(blob,hash,new AbortController().signal)).rejects.toThrow('local_pdf_text_unavailable');expect(state.destroy).toHaveBeenCalledOnce();});
it('excessive text is discarded',async()=>{state.content.mockResolvedValue({items:[{str:'x'.repeat(100001),hasEOL:true}]});const {blob,hash}=await input();expect(await localBillPdf(blob,hash,new AbortController().signal)).toBeNull();expect(state.destroy).toHaveBeenCalledOnce();});
