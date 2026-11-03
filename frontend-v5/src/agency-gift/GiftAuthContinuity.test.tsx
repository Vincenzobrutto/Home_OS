import {screen,waitFor} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {renderApp,seededBackend,PASSWORD_A} from '../test/harness';
const id='11111111-1111-4111-8111-111111111111',next='/gift/'+id;
describe('normal authentication preserves only token-free Gift destination',()=>{
 it('login→register→login carries the same token-free next',async()=>{
  const x=renderApp({path:'/accedi?next='+encodeURIComponent(next)});
  await screen.findByRole('heading',{name:'Accedi'});await x.user.click(screen.getByRole('link',{name:'Crea un account Dimora'}));
  await screen.findByRole('heading',{name:'Crea un account'});expect(x.router.state.location.search).toBe('?next='+encodeURIComponent(next));
  await x.user.click(screen.getByRole('link',{name:'Accedi'}));await screen.findByRole('heading',{name:'Accedi'});expect(x.router.state.location.search).toBe('?next='+encodeURIComponent(next));
 });
 it.each([next+'#token=hidden',next+'?token=hidden','https://example.test/gift/'+id])('does not forward a credential or external URL through auth links: %s',async bad=>{
  const x=renderApp({path:'/registrati?next='+encodeURIComponent(bad)});await screen.findByRole('heading',{name:'Crea un account'});
  expect(screen.getByRole('link',{name:'Accedi'})).toHaveAttribute('href','/accedi');expect(x.router.state.location.pathname).toBe('/registrati');
 });
 it('logged account cannot redirect a secret-bearing next into a Gift route',async()=>{
  const seed=seededBackend();const x=renderApp({path:'/accedi?next='+encodeURIComponent(next+'#token=hidden'),backend:seed.backend});
  await screen.findByRole('heading',{name:'Accedi'});await x.user.type(screen.getByLabelText('Email'),seed.a.email);await x.user.type(screen.getByLabelText('Password'),PASSWORD_A);await x.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(x.router.state.location.pathname).not.toBe('/accedi'));expect(x.router.state.location.pathname).not.toBe(next);expect(x.router.state.location.hash).toBe('');
 });
 it.each(['/%67ift/'+id,'/g%69ft/'+id,'/gift/'+id.replaceAll('1','%31'),'/GIFT/'+id])('rejects an encoded/case Gift destination with a token after actual login: %s',async path=>{
  const token='s'.repeat(43),seed=seededBackend(),x=renderApp({path:'/accedi?next='+encodeURIComponent(path+'#token='+token),backend:seed.backend});await screen.findByRole('heading',{name:'Accedi'});await x.user.type(screen.getByLabelText('Email'),seed.a.email);await x.user.type(screen.getByLabelText('Password'),PASSWORD_A);await x.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(x.router.state.location.pathname).toBe('/case'));expect(x.router.state.location.hash).toBe('');expect(x.router.state.location.search).toBe('');expect(JSON.stringify(x.router.state.location)).not.toContain(token);
 });
 it('preserves normal non-Gift private next navigation',async()=>{
  const seed=seededBackend(),target='/home/'+seed.homeA2.id+'/casa',x=renderApp({path:'/accedi?next='+encodeURIComponent(target),backend:seed.backend});await screen.findByRole('heading',{name:'Accedi'});await x.user.type(screen.getByLabelText('Email'),seed.a.email);await x.user.type(screen.getByLabelText('Password'),PASSWORD_A);await x.user.click(screen.getByRole('button',{name:'Accedi'}));await waitFor(()=>expect(x.router.state.location.pathname).toBe(target));expect(await screen.findByRole('heading',{level:1,name:seed.homeA2.name})).toBeInTheDocument();
 });
});
