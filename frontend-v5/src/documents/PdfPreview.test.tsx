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
