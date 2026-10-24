import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,useLocation} from 'react-router';
import {it,expect,vi} from 'vitest';
import {AppShell} from './AppShell';
import {seededBackend} from '../test/harness';
vi.mock('../session/hooks',()=>({useLogout:()=>({mutate:vi.fn(),isPending:false,isError:false})}));
vi.mock('./EmailVerificationNotice',()=>({EmailVerificationNotice:()=>null}));
// Empty trash: the discreet link stays hidden (covered with real queries in documents/Trash.test.tsx).
vi.mock('../documents/trash',()=>({useTrash:()=>({data:{items:[]}})}));
const all=['Casa','Oggetti e impianti','Ambienti','Attività','Documenti','Spese','Rubrica'];
function mount(section='spese'){
 const {a,homeA1:home}=seededBackend();const container=document.createElement('div');container.id='root';document.body.append(container);
 function Current(){const location=useLocation();return <p data-testid="location">{location.pathname}</p>;}
 render(<MemoryRouter initialEntries={['/home/'+home.id+'/'+section]}><AppShell account={a} home={home}><Current/></AppShell></MemoryRouter>,{container});return {home,user:userEvent.setup()};
}
it('desktop exposes seven direct sections while the bottom bar keeps the original five',()=>{
 const {home}=mount('oggetti/object/test');const navs=screen.getAllByRole('navigation',{name:'Sezioni di '+home.name});
 expect(within(navs[0]!).getAllByRole('link').map(a=>a.textContent)).toEqual(all);
 expect(within(navs[0]!).getByRole('link',{name:'Oggetti e impianti'})).toHaveAttribute('aria-current','page');
 expect(within(navs[0]!).getByRole('link',{name:'Casa'})).not.toHaveAttribute('aria-current');
 expect(within(navs[1]!).getAllByRole('link').map(a=>a.textContent)).toEqual(['Casa','Attività','Documenti','Spese','Rubrica']);
 expect(within(navs[1]!).getByRole('link',{name:'Casa'})).toHaveAttribute('aria-current','page');
});
it('mobile menu exposes all sections and closes after navigating directly to a room page',async()=>{
 const {home,user}=mount();const trigger=screen.getByRole('button',{name:'Menu'});await user.click(trigger);
 const dialog=screen.getByRole('dialog',{name:'Menu'});expect(trigger).toHaveAttribute('aria-expanded','true');expect(document.getElementById('root')).toHaveProperty('inert',true);
 expect(within(dialog).getAllByRole('link').map(a=>a.textContent)).toEqual(all);expect(screen.getByRole('button',{name:'Chiudi menu'})).toHaveFocus();
 await user.click(within(dialog).getByRole('link',{name:'Ambienti'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(screen.getByTestId('location')).toHaveTextContent('/home/'+home.id+'/ambienti');
 expect(document.getElementById('root')).toHaveProperty('inert',false);expect(document.body.style.overflow).not.toBe('hidden');
 expect(within(screen.getAllByRole('navigation',{name:'Sezioni di '+home.name})[0]!).getByRole('link',{name:'Ambienti'})).toHaveAttribute('aria-current','page');
});
it('Escape and the close button restore focus, trap tabbing and leave the current route intact',async()=>{
 const {user}=mount();const trigger=screen.getByRole('button',{name:'Menu'});await user.click(trigger);
 const close=screen.getByRole('button',{name:'Chiudi menu'}),last=within(screen.getByRole('dialog')).getByRole('link',{name:'Rubrica'});
 await user.tab({shift:true});expect(last).toHaveFocus();await user.tab();expect(close).toHaveFocus();
 await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();expect(screen.getByTestId('location')).toHaveTextContent('/spese');
 await user.click(trigger);await user.click(screen.getByRole('button',{name:'Chiudi menu'}));expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute('aria-expanded','false');
});
