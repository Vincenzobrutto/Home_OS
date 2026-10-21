import {act,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {renderApp} from '../test/harness';
import {contactCatalogFixture} from '../test/contactCatalogFixture';
async function world(){const fixture=await contactCatalogFixture();return {...fixture,...renderApp({backend:fixture.backend,fetch:fixture.fetch,path:'/home/'+fixture.home.id+'/rubrica'})};}
it('searches without a submit button, appends pages and restores filters, pages, focus and scroll from detail',async()=>{
 const w=await world();await screen.findByRole('link',{name:'Anna Bianchi'});
 expect(screen.queryByRole('button',{name:'Cerca'})).not.toBeInTheDocument();
 await w.user.click(screen.getByRole('button',{name:'Mostra altri contatti'}));await screen.findByRole('link',{name:'Tecnica Nord'});
 expect(screen.getByRole('link',{name:'Anna Bianchi'})).toBeVisible();
 expect(screen.getByRole('link',{name:'Chiama Anna Bianchi'})).toHaveAttribute('href','tel:0000000001');
 expect(screen.queryByRole('link',{name:'Email a Paolo Conti'})).not.toBeInTheDocument();
 Object.defineProperty(window,'scrollY',{configurable:true,value:620});const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 await w.user.click(screen.getByRole('link',{name:'Tecnica Nord'}));await screen.findByRole('heading',{name:'Tecnica Nord',level:1});
 await w.user.click(screen.getByRole('link',{name:'← Rubrica'}));await screen.findByRole('link',{name:'Tecnica Nord'});
 await waitFor(()=>expect(scroll).toHaveBeenCalledWith(0,620));expect(screen.getByRole('link',{name:'Tecnica Nord'})).toHaveFocus();
 const input=screen.getByRole('searchbox',{name:'Cerca nome o mestiere'});await w.user.type(input,'Idraulico');
 await waitFor(()=>expect(screen.queryByRole('link',{name:'Anna Bianchi'})).not.toBeInTheDocument());await screen.findByRole('link',{name:'Carlo Fontana'});
 await w.user.click(screen.getByRole('link',{name:'Carlo Fontana'}));await screen.findByRole('heading',{name:'Carlo Fontana',level:1});await act(async()=>{await w.router.navigate(-1);});
 expect(await screen.findByRole('searchbox',{name:'Cerca nome o mestiere'})).toHaveValue('Idraulico');
 await w.user.click(screen.getByRole('button',{name:'Azzera ricerca'}));await screen.findByRole('link',{name:'Anna Bianchi'});
 expect(w.calls.filter(c=>c.path.includes('/contacts')&&c.method!=='GET')).toHaveLength(0);scroll.mockRestore();Object.defineProperty(window,'scrollY',{configurable:true,value:0});
});
it('keeps the archive filter on return and exposes clear empty search recovery',async()=>{
 const w=await world();await screen.findByRole('link',{name:'Anna Bianchi'});
 await w.user.selectOptions(screen.getByRole('combobox',{name:'Mostra contatti'}),'archived');await screen.findByRole('link',{name:'Zeno Fabbri'});
 await w.user.click(screen.getByRole('link',{name:'Zeno Fabbri'}));await screen.findByRole('heading',{name:'Zeno Fabbri',level:1});await w.user.click(screen.getByRole('link',{name:'← Rubrica'}));
 expect(await screen.findByRole('combobox',{name:'Mostra contatti'})).toHaveValue('archived');
 await w.user.type(screen.getByRole('searchbox'),'inesistente');await screen.findByRole('heading',{name:'Nessun contatto trovato'});await w.user.click(screen.getAllByRole('button',{name:'Azzera ricerca'})[0]!);await screen.findByRole('link',{name:'Zeno Fabbri'});
});

it('keeps loaded contacts visible when loading the next page fails and retries without replacing them',async()=>{
 const f=await contactCatalogFixture();let fail=true;
 const fetch:typeof f.fetch=async(url,init)=>{if(fail&&url.includes('/contacts?')&&url.includes('cursor=')){fail=false;throw new TypeError('Synthetic connection failure');}return f.fetch(url,init);};
 const w=renderApp({backend:f.backend,fetch,path:'/home/'+f.home.id+'/rubrica'});
 await screen.findByRole('link',{name:'Anna Bianchi'});await w.user.click(screen.getByRole('button',{name:'Mostra altri contatti'}));
 await screen.findByText('Altri contatti non caricati');expect(screen.getByRole('link',{name:'Anna Bianchi'})).toBeVisible();
 await w.user.click(screen.getByRole('button',{name:'Riprova'}));await screen.findByRole('link',{name:'Tecnica Nord'});
 expect(screen.getByRole('link',{name:'Anna Bianchi'})).toBeVisible();expect(screen.getAllByRole('link',{name:'Anna Bianchi'})).toHaveLength(1);
});

it('hides cached contacts when access is denied while loading another page',async()=>{
 const f=await contactCatalogFixture();
 const fetch:typeof f.fetch=async(url,init)=>url.includes('/contacts?')&&url.includes('cursor=')?Response.json({error:{code:'forbidden',message:'Accesso revocato'}},{status:403}):f.fetch(url,init);
 const w=renderApp({backend:f.backend,fetch,path:'/home/'+f.home.id+'/rubrica'});
 await screen.findByRole('link',{name:'Anna Bianchi'});await w.user.click(screen.getByRole('button',{name:'Mostra altri contatti'}));
 await screen.findByRole('alert');expect(screen.queryByRole('link',{name:'Anna Bianchi'})).not.toBeInTheDocument();
 expect(w.queryClient.getQueryData(['account',f.account.id,'home',f.home.id,'contacts-view'])).toBeUndefined();
});

it('focuses the first appended contact and announces the appended count',async()=>{
 const w=await world();await screen.findByRole('link',{name:'Anna Bianchi'});
 const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 try{
  await w.user.click(screen.getByRole('button',{name:'Mostra altri contatti'}));
  await waitFor(()=>expect(screen.getByRole('link',{name:'Studio Alba'})).toHaveFocus());
  expect(screen.getByText('Aggiunti 5 contatti · 13 caricati')).toBeInTheDocument();
  expect(scroll).toHaveBeenCalled();
  expect(w.calls.filter(c=>c.path.includes('/contacts')&&c.method!=='GET')).toHaveLength(0);
 }finally{scroll.mockRestore();}
});
