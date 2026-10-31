import {describe,it,expect,vi} from 'vitest';
import {DocumentsApi} from './documents-api';
import {parseGiftDocumentProvenance,validateGiftDocumentWire} from './gift-provenance';
import type {DocumentDetail,GiftDocumentProvenance} from './types';
import type {ApiTransport} from './transport';
const hash='a'.repeat(64);
const provenance=():GiftDocumentProvenance=>({schemaVersion:1,kind:'agency_gift',invitationId:'invitation-demo',agencyId:'agency-demo',practiceId:'practice-demo',sourceId:'source-demo',sourceVersion:5,sourceSha256:hash,metadataVersion:2,origin:'agency_generated',author:'Agency DEMO',title:'Prospetto DEMO',surface:{kind:'commercial',qualification:'estimated',method:'A4 presunto',geometryRevision:3,caveats:['Scala da verificare']}});
const document=():DocumentDetail=>({id:'doc',homeId:'home',name:'Gift',originalFilename:'gift.pdf',mimeType:'application/pdf',byteSize:20,createdAt:'2026-10-31T00:00:00.000Z',version:1,source:'agency_gift',status:'stored',visibility:'private',permissions:['read','export'],sha256:hash,giftProvenance:provenance()});
const client=(wire:unknown)=>new DocumentsApi({request:vi.fn().mockResolvedValue(wire)} as unknown as ApiTransport);
describe('Gift document wire provenance',()=>{
 it('keeps original source version distinct from the Home document version and preserves estimates',async()=>{
  const d=await client({document:document()}).getDocument('home','doc',undefined,'owner');expect(d.version).toBe(1);expect(d.giftProvenance?.sourceVersion).toBe(5);expect(d.giftProvenance?.surface).toEqual(provenance().surface);
 });
 it('accepts list origin without detail metadata',async()=>{
  const {giftProvenance:_,sha256:__,...summary}=document();void _;void __;
  const page=await client({items:[summary],nextCursor:null}).listDocuments('home',{},undefined,'owner');expect(page.items[0]?.source).toBe('agency_gift');expect('giftProvenance'in page.items[0]!).toBe(false);
 });
 it('leaves old manual documents compatible',async()=>{
  const d=document();d.source='manual_upload';delete d.giftProvenance;expect((await client({document:d}).getDocument('home','doc',undefined,'owner')).source).toBe('manual_upload');
 });
 it('rejects Gift detail without provenance, malformed provenance or mismatched bytes',async()=>{
  for(const mutate of [(d:DocumentDetail)=>delete d.giftProvenance,(d:DocumentDetail)=>{d.sha256='b'.repeat(64);},(d:DocumentDetail)=>{Object.assign(d.giftProvenance!,{tokenHash:'injected'});}]){const d=document();mutate(d);await expect(client({document:d}).getDocument('home','doc',undefined,'owner')).rejects.toMatchObject({kind:'service'});}
 });
 it('rejects an unknown source marker rather than treating it as manual',()=>{
  const d=document();Object.assign(d,{source:'other_source'});delete d.giftProvenance;
  expect(()=>validateGiftDocumentWire(d,true)).toThrow();
 });
 it('does not accept provenance hidden under a manual source',()=>{
  const d=document();d.source='manual_upload';expect(()=>validateGiftDocumentWire(d,true)).toThrow();
 });
 it('rejects private or certification fields instead of copying them through',()=>{
  for(const field of ['email','accountId','token','ledger','certification'])expect(()=>parseGiftDocumentProvenance({...provenance(),[field]:'injected'})).toThrow();
  expect(()=>parseGiftDocumentProvenance({...provenance(),surface:{...provenance().surface,verified:true}})).toThrow();
 });
 it('refuses lost caveats or non-canonical surface values',()=>{
  for(const change of [{caveats:[]},{caveats:['same','same']},{method:''},{geometryRevision:0},{qualification:'certified'}])expect(()=>parseGiftDocumentProvenance({...provenance(),surface:{...provenance().surface,...change}})).toThrow();
 });
 it('returns fresh nested metadata instead of mutable aliases to the response',()=>{
  const d=document(),out=validateGiftDocumentWire(d,true);out.giftProvenance!.surface!.caveats.push('changed');expect(d.giftProvenance!.surface!.caveats).toEqual(['Scala da verificare']);
 });
});
