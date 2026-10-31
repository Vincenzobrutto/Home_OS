import {act,render,screen,waitFor,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import type {GiftDocumentProvenance} from '../api/types';
import {GiftDocumentBadge,GiftDocumentOrigin} from './GiftDocumentOrigin';
import {FakeBackend} from '../test/fakeBackend';
import {renderApp} from '../test/harness';

function provenance():GiftDocumentProvenance{
  return {schemaVersion:1,kind:'agency_gift',invitationId:'gift-invitation-demo',agencyId:'agency-demo',practiceId:'practice-demo',
    sourceId:'source-demo',sourceVersion:7,sourceSha256:'a'.repeat(64),metadataVersion:4,
    origin:'agency_generated',author:'Tecnico produttore dichiarato DEMO',title:'Titolo originale alla consegna DEMO',
    surface:{kind:'commercial',qualification:'estimated',method:'A4 presunto e scala dichiarata',geometryRevision:12,
      caveats:['Formato carta non verificato','Scala da controllare','Perimetro da rivedere']}};
}
describe('owner Gift document origin — read-only received provenance',()=>{
  it('adds the Gift badge only for Gift, preserving manual and old unspecified origins',()=>{
    const view=render(<GiftDocumentBadge source="manual_upload"/>);expect(view.container).toBeEmptyDOMElement();
    view.rerender(<GiftDocumentBadge source="agency_gift"/>);expect(screen.getByText('Ricevuto con Gift')).toBeVisible();
    view.rerender(<GiftDocumentBadge source={undefined}/>);expect(view.container).toBeEmptyDOMElement();
  });
  it('shows immutable delivery title, declared origin/author, source proof and versions without fabricating an agency name',()=>{
    const p=provenance();render(<GiftDocumentOrigin provenance={p}/>);
    const panel=screen.getByRole('region',{name:'Provenienza della Gift'});
    for(const text of [p.title,p.author,p.sourceId,p.sourceSha256,'Produzione dell’agenzia dichiarata dall’agente'])expect(within(panel).getByText(text)).toBeVisible();
    expect(within(panel).getByText('Versione della fonte').nextElementSibling).toHaveTextContent('7');
    expect(within(panel).getByText('Versione dei metadati').nextElementSibling).toHaveTextContent('4');
    expect(panel).not.toHaveTextContent(p.agencyId);expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(panel).toHaveTextContent('non certifica contenuto, firma, proprietà o validità tecnica');
  });
  it.each([
    ['commercial','estimated','Superficie commerciale · Stima'],
    ['net','reviewed','Superficie netta · Revisionata'],
    ['cadastral','unverified','Superficie catastale · Da verificare'],
  ] as const)('preserves %s/%s qualification without certifying or inventing a numeric area', (kind,qualification,label)=>{
    const p=provenance();p.surface={...p.surface!,kind,qualification};render(<GiftDocumentOrigin provenance={p}/>);
    const panel=screen.getByRole('region',{name:label});expect(within(panel).getByRole('heading',{name:label})).toBeVisible();
    expect(within(panel).getByText(p.surface.method)).toBeVisible();
    expect(within(panel).getByText('Revisione della geometria').nextElementSibling).toHaveTextContent('12');
    const limits=within(panel).getByRole('list',{name:'Limiti della superficie ricevuta'});
    expect(within(limits).getAllByRole('listitem').map(item=>item.textContent)).toEqual(p.surface.caveats);
    expect(panel).toHaveTextContent('non certificano la misura');expect(panel).not.toHaveTextContent(/misura certificata|firma verificata|\d[,.]?\d*\s*m[²2]/i);
  });
  it('retains all thirty caveats and full long source/method text rather than truncating provenance',()=>{
    const p=provenance();p.sourceId='s'.repeat(100);p.surface!.method='m'.repeat(200);p.surface!.caveats=Array.from({length:30},(_,i)=>'Limite '+i+' '+'c'.repeat(450));
    render(<GiftDocumentOrigin provenance={p}/>);
    expect(screen.getByText(p.sourceId)).toBeVisible();expect(screen.getByText(p.sourceSha256)).toBeVisible();expect(screen.getByText(p.surface!.method)).toBeVisible();
    const list=screen.getByRole('list',{name:'Limiti della superficie ricevuta'});expect(within(list).getAllByRole('listitem').map(item=>item.textContent)).toEqual(p.surface!.caveats);
  });
  it('received origin is distinct from agency production and absent surface never becomes a measurement',()=>{
    const p=provenance();p.origin='received';delete p.surface;render(<GiftDocumentOrigin provenance={p}/>);
    expect(screen.getByText('Documento ricevuto dall’agenzia')).toBeVisible();expect(screen.queryByText('Produzione dell’agenzia dichiarata dall’agente')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading',{level:3})).not.toBeInTheDocument();expect(screen.queryByText(/m²/)).not.toBeInTheDocument();
  });
  it('missing optional metadata is explicitly unknown and never falls back to manual upload or stale provenance',()=>{
    const p=provenance(),view=render(<GiftDocumentOrigin provenance={p}/>);
    view.rerender(<GiftDocumentOrigin/>);expect(screen.getByText('Documento ricevuto con Gift. I dettagli della provenienza non sono disponibili.')).toBeVisible();
    for(const value of [p.title,p.author,p.sourceSha256,'Caricamento manuale'])expect(screen.queryByText(value)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading',{level:3})).not.toBeInTheDocument();
  });
  it('renders metadata as inert text without network, storage or Agency lookup side effects',()=>{
    const network=vi.spyOn(globalThis,'fetch'),read=vi.spyOn(Storage.prototype,'getItem'),write=vi.spyOn(Storage.prototype,'setItem');
    const p=provenance();p.title='<img src=x onerror=alert(1)>';p.author='<a href="https://example.test">Autore</a>';
    const view=render(<GiftDocumentOrigin provenance={p}/>);expect(screen.getByText(p.title)).toBeVisible();expect(screen.getByText(p.author)).toBeVisible();
    expect(view.container.querySelector('img,a,iframe')).toBeNull();expect(network).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
  });
});

const password='gift-owner-password-001';
async function ownerDocumentApp(isGift:boolean){
  const backend=new FakeBackend(),owner=backend.seedAccount('Proprietario DEMO','gift-owner@example.test',password);
  const home=backend.seedHome(owner.id,'Casa ricevuta DEMO','Via Esempio 1');
  const document=await backend.seedDocument({homeId:home.id,uploaderId:owner.id,name:'Titolo scelto dal proprietario',originalFilename:'prospetto-demo.pdf',visibility:'private'});
  const received=provenance();received.sourceSha256=document.sha256;
  const original=backend.handle.bind(backend);
  // Synthetic wire projection only: production code never imports or seeds this fixture.
  backend.handle=async request=>{
    const response=await original(request);if(!isGift||request.method!=='GET'||response.status!==200)return response;
    if(request.path===`/homes/${home.id}/documents/${document.id}`){
      const body=response.body as {document:Record<string,unknown>};
      return {...response,body:{document:{...body.document,source:'agency_gift',giftProvenance:received}}};
    }
    if(request.path===`/homes/${home.id}/documents`||request.path.startsWith(`/homes/${home.id}/documents?`)){
      const body=response.body as {items:Array<{id:string}>};
      return {...response,body:{...body,items:body.items.map(item=>item.id===document.id?{...item,source:'agency_gift'}:item)}};
    }
    return response;
  };
  const app=renderApp({path:'/accedi',backend});
  await screen.findByRole('heading',{name:'Accedi'});
  await app.user.type(screen.getByLabelText('Email'),owner.email);await app.user.type(screen.getByLabelText('Password'),password);await app.user.click(screen.getByRole('button',{name:'Accedi'}));
  await waitFor(()=>expect(app.router.state.location.pathname).not.toBe('/accedi'));
  await act(async()=>{await app.router.navigate(`/home/${home.id}/documenti?workflow=all`);});
  const list=await screen.findByRole('list',{name:'Documenti di Casa ricevuta DEMO'});
  return {...app,home,document,list,received};
}

describe('normal owner Documents routes retain Gift provenance without Agency access',()=>{
  it('shows received badge/date in archive and complete provenance in detail while keeping original access on Home API',async()=>{
    const app=await ownerDocumentApp(true),row=within(app.list).getByRole('listitem');
    expect(within(row).getByText('Ricevuto con Gift')).toBeVisible();await app.user.click(within(row).getByText('Dettagli del file',{exact:true}));
    expect(within(row).getByText('Ricevuto in Dimora il')).toBeVisible();expect(within(row).queryByText('Caricato il')).not.toBeInTheDocument();
    await app.user.click(within(row).getByRole('link',{name:'Titolo scelto dal proprietario'}));
    expect(await screen.findByRole('heading',{level:1,name:'Titolo scelto dal proprietario'})).toBeVisible();
    const received=screen.getByRole('region',{name:'Provenienza della Gift'});expect(within(received).getByText(app.received.title)).toBeVisible();
    expect(within(received).getByText(app.received.author)).toBeVisible();expect(within(received).getByText(app.document.sha256)).toBeVisible();
    expect(within(received).getAllByRole('listitem').map(item=>item.textContent)).toEqual(app.received.surface!.caveats);
    const data=screen.getByRole('region',{name:'Dati del file'});expect(data).toHaveTextContent('Gift dell’agenzia');expect(data).toHaveTextContent('Ricevuto in Dimora il');expect(data).not.toHaveTextContent('Caricamento manuale');expect(data).toHaveTextContent('Ricevuto con Gift e conservato');
    await waitFor(()=>expect(app.backend.log.some(request=>request.path===`/homes/${app.home.id}/documents/${app.document.id}/file`)).toBe(true));
    expect(app.backend.log.some(request=>/^\/agencies(?:\/|$)/.test(request.path))).toBe(false);
    expect(app.backend.log.filter(request=>request.method==='POST'&&/documents|gift|agency/.test(request.path))).toHaveLength(0);
  });
  it('keeps manual source/date/file text exactly and adds no Gift badge or panel',async()=>{
    const app=await ownerDocumentApp(false),row=within(app.list).getByRole('listitem');
    expect(within(row).queryByText('Ricevuto con Gift')).not.toBeInTheDocument();await app.user.click(within(row).getByText('Dettagli del file',{exact:true}));expect(within(row).getByText('Caricato il')).toBeVisible();
    await app.user.click(within(row).getByRole('link',{name:'Titolo scelto dal proprietario'}));await screen.findByRole('heading',{level:1,name:'Titolo scelto dal proprietario'});
    const data=screen.getByRole('region',{name:'Dati del file'});expect(data).toHaveTextContent('Caricamento manuale');expect(data).toHaveTextContent('Caricato il');expect(data).toHaveTextContent('Caricato e conservato. Lo stato in alto riguarda la compilazione.');
    expect(screen.queryByText('Ricevuto con Gift')).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Provenienza della Gift'})).not.toBeInTheDocument();
  });
});
