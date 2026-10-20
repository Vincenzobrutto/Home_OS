import { screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderApp } from '../test/harness';
import { contactActionsFixture } from '../test/contactActionsFixture';

async function world(){
 const fixture=await contactActionsFixture();
 const app=renderApp({backend:fixture.backend,fetch:fixture.fetch,path:'/home/'+fixture.home.id+'/rubrica/'+fixture.contact.id});
 await screen.findByRole('heading',{name:fixture.contact.name,level:1});
 await screen.findByRole('button',{name:'Rimuovi collegamento con «Fattura impianto di collaudo»'});
 return {...fixture,...app};
}
it('explains and archives reversibly without deleting contact values or links',async()=>{
 const w=await world(),original=structuredClone(w.contact),before=structuredClone(w.getLinks());
 const archive=screen.getByRole('button',{name:'Archivia contatto'});
 expect(archive).toHaveAccessibleDescription(/Recapiti, note e tutti i collegamenti restano salvati/);
 expect(w.writes).toHaveLength(0);
 await w.user.click(archive);
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Contatto archiviato.'));
 expect(w.contact).toMatchObject({...original,state:'archived',version:2});
 expect(w.getLinks()).toEqual(before);
 expect(screen.getByRole('button',{name:'Ripristina contatto'})).toHaveAccessibleDescription(/aggiungere nuovi collegamenti/);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Ripristina contatto'})).toHaveFocus());
 await w.user.click(screen.getByRole('button',{name:'Ripristina contatto'}));
 await waitFor(()=>expect(w.contact.state).toBe('active'));
 expect(w.getLinks()).toEqual(before);expect(w.writes).toHaveLength(2);
 expect(w.writes.every(call=>call.key&&call.body.expectedVersion)).toBe(true);
});

it('removes only the named association and announces what remains, including for archived contacts',async()=>{
 const w=await world(),values=structuredClone(w.contact);
 await w.user.click(screen.getByRole('button',{name:'Archivia contatto'}));
 await screen.findByRole('button',{name:'Ripristina contatto'});
 const unlink=screen.getByRole('button',{name:'Rimuovi collegamento con «Fattura impianto di collaudo»'});
 expect(unlink).toHaveAccessibleDescription(/solo l’associazione.*Gli altri collegamenti non cambiano/);
 await w.user.click(unlink);
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Collegamento con «Fattura impianto di collaudo» rimosso'));
 expect(w.getLinks().map(l=>l.resource.id)).toEqual(['synthetic-object']);
 expect(w.contact).toMatchObject({...values,state:'archived',version:3});
 expect(screen.getByRole('heading',{name:'Collegamenti'})).toHaveFocus();
 expect(screen.queryByRole('button',{name:'Rimuovi collegamento con «Fattura impianto di collaudo»'})).not.toBeInTheDocument();
 expect(w.writes.at(-1)?.body).toEqual({expectedVersion:2,resource:{kind:'document',id:'synthetic-invoice'}});
});

it('a rejected operation preserves links and never announces success',async()=>{
 const w=await world(),before=structuredClone(w.getLinks());w.rejectNext();
 await w.user.click(screen.getByRole('button',{name:'Rimuovi collegamento con «Fattura impianto di collaudo»'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Il contatto è cambiato');
 expect(screen.getByRole('status')).toBeEmptyDOMElement();expect(w.getLinks()).toEqual(before);
 expect(within(screen.getByRole('region',{name:'Collegamenti del contatto'})).getAllByRole('button',{name:/Rimuovi collegamento con/})).toHaveLength(2);
});
