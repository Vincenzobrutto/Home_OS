import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({destroy:vi.fn(),render:vi.fn(()=>({promise:Promise.resolve(),cancel:vi.fn()})),getPage:vi.fn()}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{workerSrc:''},getDocument:vi.fn(()=>({promise:Promise.resolve({numPages:2,getPage:fixture.getPage}),destroy:fixture.destroy}))}));
import {PdfPreview} from './PdfPreview';
beforeEach(()=>{vi.clearAllMocks();fixture.getPage.mockReset();fixture.getPage.mockImplementation(async()=>({getViewport:()=>({width:600,height:800}),render:fixture.render}));});
it('preserves the original filename and can leave a single download action to its parent',()=>{
 const blob={arrayBuffer:async()=>new ArrayBuffer(12)} as Blob;
 const view=render(<PdfPreview blob={blob} url="blob:original" filename="fattura-originale.pdf"/>);
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('download','fattura-originale.pdf');
 view.rerender(<PdfPreview blob={blob} url="blob:original" showDownload={false}/>);
 expect(screen.queryByRole('link',{name:'Scarica originale'})).toBeNull();
});
it('renders authorized bytes locally, changes page and zoom, then releases the document',async()=>{
 fixture.getPage.mockImplementation(async()=>({getViewport:()=>({width:600,height:800}),render:fixture.render}));
 const blob={arrayBuffer:async()=>new ArrayBuffer(12)} as Blob,user=userEvent.setup();const view=render(<PdfPreview blob={blob} url="blob:authorized"/>);
 await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(1));
 await user.click(screen.getByRole('button',{name:'Pagina successiva'}));await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(2));
 expect(screen.getByRole('button',{name:'Pagina successiva'})).toBeDisabled();
 await user.selectOptions(screen.getByRole('combobox',{name:'Zoom PDF'}),'1.5');expect(screen.getByLabelText('Pagina 2 del documento originale')).toHaveStyle({width:'150%'});
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('href','blob:authorized');view.unmount();expect(fixture.destroy).toHaveBeenCalled();
});
it('rotates the preview relative to the PDF orientation, cycles through four turns and leaves download unchanged',async()=>{
 const viewport=vi.fn(()=>({width:800,height:600}));fixture.getPage.mockImplementation(async()=>({rotate:90,getViewport:viewport,render:fixture.render}));
 const user=userEvent.setup();render(<PdfPreview blob={{arrayBuffer:async()=>new ArrayBuffer(12)} as Blob} url="blob:unchanged-original"/>);
 await waitFor(()=>expect(viewport).toHaveBeenLastCalledWith({scale:1.5,rotation:90}));
 for(const rotation of [180,270,0,90]){await user.click(screen.getByRole('button',{name:'Ruota anteprima di 90 gradi'}));await waitFor(()=>expect(viewport).toHaveBeenLastCalledWith({scale:1.5,rotation}));}
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('href','blob:unchanged-original');
});
it('opens the exact requested physical page without rendering page one first',async()=>{
 render(<PdfPreview blob={{arrayBuffer:async()=>new ArrayBuffer(12)} as Blob} url="blob:cited" initialPage={2}/>);
 await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(2));
 expect(fixture.getPage).not.toHaveBeenCalledWith(1);
 expect(screen.getByLabelText('Pagina 2 del documento originale')).toBeInTheDocument();
});
it('reopens a different citation on its exact page while releasing the previous preview',async()=>{
 const blob={arrayBuffer:async()=>new ArrayBuffer(12)} as Blob;
 const view=render(<PdfPreview blob={blob} url="blob:cited" initialPage={2}/>);
 await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(2));fixture.getPage.mockClear();
 view.rerender(<PdfPreview blob={blob} url="blob:cited" initialPage={1}/>);
 await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(1));
 expect(fixture.getPage).not.toHaveBeenCalledWith(2);expect(fixture.destroy).toHaveBeenCalled();
});
it('does not silently replace a missing cited page with page one',async()=>{
 render(<PdfPreview blob={{arrayBuffer:async()=>new ArrayBuffer(12)} as Blob} url="blob:cited" initialPage={3}/>);
 await screen.findByText(/La pagina richiesta non è disponibile/);
 expect(fixture.getPage).not.toHaveBeenCalled();expect(screen.queryByLabelText(/Pagina \d del documento originale/)).toBeNull();
 expect(screen.getByRole('button',{name:'Pagina precedente'})).toBeDisabled();expect(screen.getByRole('button',{name:'Pagina successiva'})).toBeDisabled();
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('href','blob:cited');
});
it.each([0,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY])('rejects invalid requested page %s without rendering a substitute',async initialPage=>{
 render(<PdfPreview blob={{arrayBuffer:async()=>new ArrayBuffer(12)} as Blob} url="blob:cited" initialPage={initialPage}/>);
 expect(screen.getByText(/La pagina richiesta non è disponibile/)).toBeInTheDocument();
 expect(fixture.getPage).not.toHaveBeenCalled();expect(screen.queryByLabelText(/del documento originale/)).toBeNull();
});
it('keeps an honest download fallback if the requested page cannot be rendered',async()=>{
 fixture.getPage.mockRejectedValueOnce(new Error('unreadable page'));
 render(<PdfPreview blob={{arrayBuffer:async()=>new ArrayBuffer(12)} as Blob} url="blob:cited" initialPage={2}/>);
 await screen.findByText(/Anteprima non disponibile per questo PDF/);
 expect(fixture.getPage).toHaveBeenCalledWith(2);expect(fixture.getPage).not.toHaveBeenCalledWith(1);
 expect(screen.getByRole('link',{name:'Scarica originale'})).toBeInTheDocument();
});
it('hides old page pixels while a replacement blob is loading',async()=>{
 const blob={arrayBuffer:async()=>new ArrayBuffer(12)} as Blob;
 const view=render(<PdfPreview blob={blob} url="blob:cited" initialPage={2}/>);
 await waitFor(()=>expect(fixture.getPage).toHaveBeenCalledWith(2));
 let resolve!:(value:ArrayBuffer)=>void;const next={arrayBuffer:()=>new Promise<ArrayBuffer>(r=>{resolve=r;})} as Blob;
 view.rerender(<PdfPreview blob={next} url="blob:cited" initialPage={2}/>);
 expect(screen.queryByLabelText('Pagina 2 del documento originale')).toBeNull();
 expect(screen.getByText('Preparazione anteprima…')).toBeInTheDocument();
 await waitFor(()=>expect(resolve).toBeTypeOf('function'));resolve(new ArrayBuffer(12));
 await screen.findByLabelText('Pagina 2 del documento originale');
});
