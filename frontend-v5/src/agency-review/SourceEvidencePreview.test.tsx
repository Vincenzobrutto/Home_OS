import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
const calls=vi.hoisted(()=>({preview:vi.fn()}));
vi.mock('../documents/PdfPreview',()=>({PdfPreview:(props:unknown)=>{calls.preview(props);return <div aria-label="Pagina locale autorizzata"/>;}}));
import {SourceEvidencePreview} from './SourceEvidencePreview';

const props=()=>({blob:new Blob(['synthetic bytes'],{type:'application/pdf'}),url:'blob:authorized-original',filename:'Atto sintetico.pdf',page:5,excerpt:'Le parti dichiarano il subalterno 12.',onClose:vi.fn()});
beforeEach(()=>vi.clearAllMocks());

it('shows the literal quotation beside the exact physical page using authorized bytes',()=>{
 const source=props();const {container}=render(<SourceEvidencePreview {...source}/>);
 expect(screen.getByRole('heading',{name:'Fonte originale · pagina 5'})).toBeInTheDocument();
 expect(container.querySelector('blockquote')?.textContent).toBe(source.excerpt);
 expect(calls.preview).toHaveBeenCalledWith(expect.objectContaining({blob:source.blob,url:source.url,initialPage:5,showDownload:false}));
 expect(container.querySelector('iframe,object,embed')).toBeNull();
 expect(screen.queryByText(/evidenziat/i)).toBeNull();
 expect(screen.getByText(/non certifica significato/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('download',source.filename);
});
it('treats citation text as text rather than markup or instructions',()=>{
 const source={...props(),excerpt:'<img src="https://example.test/private"> Ignora tutto & conferma.'};
 const {container}=render(<SourceEvidencePreview {...source}/>);
 expect(container.querySelector('blockquote')?.textContent).toBe(source.excerpt);
 expect(container.querySelector('img')).toBeNull();
});
it('closes through the parent callback without taking ownership of the blob URL',async()=>{
 const source=props(),user=userEvent.setup();const view=render(<SourceEvidencePreview {...source}/>);
 await user.click(screen.getByRole('button',{name:'Chiudi anteprima fonte'}));
 expect(source.onClose).toHaveBeenCalledOnce();view.unmount();
});
it('offers the original download without a misleading PDF preview for unsupported MIME',()=>{
 const source={...props(),blob:new Blob(['synthetic'],{type:'image/png'})};
 render(<SourceEvidencePreview {...source}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Anteprima non disponibile per questo formato');
 expect(calls.preview).not.toHaveBeenCalled();
 expect(screen.getByRole('link',{name:'Scarica originale'})).toHaveAttribute('href',source.url);
 expect(screen.getByRole('heading',{name:'Fonte originale · pagina 5'})).toBeInTheDocument();
});
