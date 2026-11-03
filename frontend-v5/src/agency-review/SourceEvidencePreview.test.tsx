import {render,screen,within} from '@testing-library/react';
import {useState} from 'react';
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
it('focuses and scrolls a newly opened preview, then returns to the connected trigger on close',async()=>{
 const source=props(),user=userEvent.setup(),scroll=vi.fn(),old=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'scrollIntoView');
 Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,writable:true,value:scroll});
 try{
  function Harness(){const [open,setOpen]=useState(false);return <><button type="button" onClick={()=>setOpen(true)}>Apri fonte · pagina 5</button>{open&&<SourceEvidencePreview {...source} onClose={()=>setOpen(false)}/>}</>;}
  render(<Harness/>);const trigger=screen.getByRole('button',{name:'Apri fonte · pagina 5'});
  await user.click(trigger);const preview=screen.getByRole('region',{name:'Fonte originale della citazione'});
  expect(preview).toHaveAttribute('tabindex','-1');expect(preview).toHaveFocus();expect(scroll).toHaveBeenCalledWith({block:'start'});
  await user.click(within(preview).getByRole('button',{name:'Chiudi anteprima fonte'}));
  expect(screen.queryByRole('region',{name:'Fonte originale della citazione'})).toBeNull();expect(trigger).toHaveFocus();
 }finally{if(old)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',old);else Reflect.deleteProperty(HTMLElement.prototype,'scrollIntoView');}
});
it('does not steal focus back from an interaction outside the preview when it unmounts',()=>{
 const source=props();const trigger=document.createElement('button'),outside=document.createElement('button');document.body.append(trigger,outside);trigger.focus();
 try{const view=render(<SourceEvidencePreview {...source}/>);expect(screen.getByRole('region',{name:'Fonte originale della citazione'})).toHaveFocus();outside.focus();view.unmount();expect(outside).toHaveFocus();}finally{trigger.remove();outside.remove();}
});
it('does not attempt to focus a trigger removed while its source preview is open',()=>{
 const source=props(),trigger=document.createElement('button');document.body.append(trigger);trigger.focus();
 const view=render(<SourceEvidencePreview {...source}/>);expect(screen.getByRole('region',{name:'Fonte originale della citazione'})).toHaveFocus();
 trigger.remove();const focus=vi.spyOn(trigger,'focus');view.unmount();expect(focus).not.toHaveBeenCalled();expect(document.body).toHaveFocus();
});
it('keeps current preview focus and view on rerender instead of refocusing after another interaction',()=>{
 const source=props(),outside=document.createElement('button');document.body.append(outside);
 try{const view=render(<SourceEvidencePreview {...source}/>);outside.focus();view.rerender(<SourceEvidencePreview {...source} excerpt="Citazione sintetica aggiornata"/>);expect(outside).toHaveFocus();view.unmount();expect(outside).toHaveFocus();}finally{outside.remove();}
});
