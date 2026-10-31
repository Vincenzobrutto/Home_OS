import sharedPacketJson from '../../tests/fixtures/agency-gift/packet-v1.json?raw';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {GiftPacketPreview,type GiftPreviewPacket} from './GiftPacketPreview';
const scope={agencyId:'agency',practiceId:'practice',revision:4,accountId:'agent'};
const packet=():GiftPreviewPacket=>({schemaVersion:'agency-gift-preparation-v1',purpose:'internal_preview',agencyId:'agency',practiceId:'practice',practiceRevision:4,preparedBy:'agent',requestedHomeId:'one-home',recipients:[{subjectRef:'holder-a'},{subjectRef:'holder-b'}],canDeliver:false,createsHome:false,grantsAccess:false,certification:false,homeDestinationAuthorized:false,recipientIdentityVerified:false,documents:[{sourceId:'generated',version:2,sha256:'a'.repeat(64),metadataVersion:1,title:'Prospetto DEMO',author:'Agenzia DEMO',origin:'agency_generated',lifecycle:'final',signatureVerification:'not_assessed',surface:{kind:'commercial',qualification:'estimated',method:'A4 presunto',geometryRevision:3,caveats:['Formato carta non verificato']}},{sourceId:'received',version:1,sha256:'b'.repeat(64),metadataVersion:2,title:'Atto DEMO',author:'Autore dichiarato DEMO',origin:'received',lifecycle:'signed',signatureVerification:'not_assessed'}]});
describe('internal Gift packet preview — no delivery or Home authority',()=>{
 it('shows one destination, distinct recipients and received/agency-produced provenance',()=>{
  render(<GiftPacketPreview scope={scope} access="allowed" packet={packet()}/>);
  expect(screen.getByRole('heading',{name:'Una sola casa di destinazione'})).toBeInTheDocument();expect(screen.getByText('one-home')).toBeInTheDocument();
  expect(screen.getByText('holder-a')).toBeInTheDocument();expect(screen.getByText('holder-b')).toBeInTheDocument();
  expect(screen.getByText('Prodotto dall’agenzia')).toBeInTheDocument();expect(screen.getByText('Ricevuto dall’agenzia')).toBeInTheDocument();
  expect(screen.getByText(/nessuna casa o autorizzazione viene creata/)).toBeInTheDocument();
 });
 it('keeps estimated commercial method/caveat and does not promote signed label to verification',()=>{
  render(<GiftPacketPreview scope={scope} access="allowed" packet={packet()}/>);
  expect(screen.getByRole('heading',{name:'Superficie commerciale · Stima'})).toBeInTheDocument();expect(screen.getByText(/Metodo: A4 presunto · revisione geometria 3/)).toBeInTheDocument();
  expect(screen.getByText('Formato carta non verificato')).toBeInTheDocument();expect(screen.getByText('Sottoscritto dichiarato · firma non verificata')).toBeInTheDocument();
  expect(screen.getByText(/Il pacchetto non dichiara il fascicolo completo o conforme/)).toBeInTheDocument();
 });
 it('source action supplies only the exact original descriptor, with no URL or metadata mutation',()=>{
  const open=vi.fn(),p=packet();render(<GiftPacketPreview scope={scope} access="allowed" packet={p} onOpenSource={open}/>);
  fireEvent.click(screen.getByRole('button',{name:'Rivedi originale · Prospetto DEMO'}));expect(open).toHaveBeenCalledExactlyOnceWith({sourceId:'generated',version:2,sha256:'a'.repeat(64)});
  expect(p.documents[0]!.title).toBe('Prospetto DEMO');expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it('provides no send, accept, export or sharing operation',()=>{
  render(<GiftPacketPreview scope={scope} access="allowed" packet={packet()}/>);expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText(/Questo trasferimento è ancora da collegare/)).toBeInTheDocument();
 });
 it.each(['agencyId','practiceId','accountId','revision'] as const)('hides packet immediately when scope %s changes',key=>{
  const p=packet(),v=render(<GiftPacketPreview scope={scope} access="allowed" packet={p}/>);
  v.rerender(<GiftPacketPreview scope={{...scope,[key]:key==='revision'?5:'other'}} access="allowed" packet={p}/>);
  expect(screen.queryByText('Prospetto DEMO')).not.toBeInTheDocument();expect(screen.queryByText('holder-a')).not.toBeInTheDocument();expect(screen.getByText('Prepara nuovamente il pacchetto dalla pratica corrente.')).toBeInTheDocument();
 });
 it.each(['loading','denied'] as const)('redacts previous packet while access is %s',access=>{
  const p=packet(),v=render(<GiftPacketPreview scope={scope} access="allowed" packet={p}/>);
  v.rerender(<GiftPacketPreview scope={scope} access={access} packet={p}/>);expect(screen.queryByText('Prospetto DEMO')).not.toBeInTheDocument();expect(screen.queryByText('one-home')).not.toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
 it('has a clear state when no packet has been prepared',()=>{
  render(<GiftPacketPreview scope={scope} access="allowed" packet={null}/>);expect(screen.getByRole('status')).toHaveTextContent('Prepara nuovamente');
 });
 it.each(['canDeliver','createsHome','grantsAccess','certification','homeDestinationAuthorized','recipientIdentityVerified'] as const)('refuses an operation with promoted %s authority',flag=>{
  const p=packet();Object.assign(p,{[flag]:true});render(<GiftPacketPreview scope={scope} access="allowed" packet={p}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Pacchetto non compatibile');expect(screen.queryByText('holder-a')).not.toBeInTheDocument();
 });
 it('refuses drafts or a signature verification operation instead of presenting them as Gift-ready',()=>{
  const p=packet();Object.assign(p.documents[0]!,{lifecycle:'draft'});const v=render(<GiftPacketPreview scope={scope} access="allowed" packet={p}/>);expect(screen.getByRole('alert')).toBeInTheDocument();
  const signed=packet();Object.assign(signed.documents[1]!,{signatureVerification:'verified'});v.rerender(<GiftPacketPreview scope={scope} access="allowed" packet={signed}/>);expect(screen.getByRole('alert')).toBeInTheDocument();
 });
 it('renders document titles as text rather than executable markup',()=>{
  const p=packet();p.documents[0]!.title='<img src=x onerror=alert(1)>';const v=render(<GiftPacketPreview scope={scope} access="allowed" packet={p}/>);expect(v.container.querySelector('img')).toBeNull();expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
 });
});

it('renders the canonical backend-produced packet used by the isolated harness',()=>{
 const p=JSON.parse(sharedPacketJson) as GiftPreviewPacket;
 const fromServer={agencyId:p.agencyId,practiceId:p.practiceId,revision:p.practiceRevision,accountId:p.preparedBy};
 render(<GiftPacketPreview scope={fromServer} access="allowed" packet={p}/>);
 expect(screen.getByText('CASA-DEMO-001')).toBeInTheDocument();expect(screen.getByText('INT-DEMO-A')).toBeInTheDocument();expect(screen.getByText('INT-DEMO-B')).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Documenti selezionati · 2'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Superficie commerciale · Stima'})).toBeInTheDocument();
 expect(screen.getByText('Formato della pagina non verificato.')).toBeInTheDocument();expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
