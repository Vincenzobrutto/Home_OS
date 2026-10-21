import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({destroy:vi.fn(),render:vi.fn(()=>({promise:Promise.resolve(),cancel:vi.fn()})),getPage:vi.fn()}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{workerSrc:''},getDocument:vi.fn(()=>({promise:Promise.resolve({numPages:2,getPage:fixture.getPage}),destroy:fixture.destroy}))}));
import {PdfPreview} from './PdfPreview';
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
