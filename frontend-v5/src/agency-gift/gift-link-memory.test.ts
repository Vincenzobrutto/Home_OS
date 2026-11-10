import {describe,it,expect,vi} from 'vitest';
import {buildGiftLink,createGiftLinkMemory,safeGiftNext} from './gift-link-memory';
const id='11111111-2222-3333-4444-555555555555',other='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const token='A'.repeat(42)+'_',nextToken='b'.repeat(42)+'-';
const fragment='#token='+token;

describe('Gift personal-link memory custody',()=>{
 it('captures an exact fragment and normalizes UUID case without changing the credential',()=>{
  const memory=createGiftLinkMemory();expect(memory.capture(other.toUpperCase(),fragment)).toBe(true);expect(memory.get(other)).toBe(token);expect(memory.get(other.toUpperCase())).toBe(token);
 });
 it('keeps different invitation credentials isolated',()=>{
  const memory=createGiftLinkMemory();memory.capture(id,fragment);memory.capture(other,'#token='+nextToken);expect(memory.get(id)).toBe(token);expect(memory.get(other)).toBe(nextToken);
 });
 it('rejects malformed identifiers, types and bounded long inputs',()=>{
  const memory=createGiftLinkMemory();for(const bad of [undefined,null,{},0,'',id+'\n','../'+id,id.replaceAll('-',''),id.replace('1','g'),'x'.repeat(100000)]){expect(memory.capture(bad,fragment)).toBe(false);expect(memory.get(bad)).toBe(null);}
  expect(memory.get(id)).toBe(null);
 });
 it('rejects missing, encoded, duplicated or extra fragment fields instead of interpreting URL parameters',()=>{
  const memory=createGiftLinkMemory();for(const bad of [undefined,null,{},'',token,'token='+token,'#Token='+token,'#token='+token+'&token='+nextToken,fragment+'&next=/gift/'+other,fragment+'#again','#token=%41'+token.slice(1),fragment+'\n','https://example.test/gift/'+id+fragment,'#token='+'A'.repeat(100000)])expect(memory.capture(id,bad)).toBe(false);
  expect(memory.get(id)).toBe(null);
 });
 it('rejects wrong token length or alphabet, including padding, whitespace and Unicode',()=>{
  const memory=createGiftLinkMemory();for(const bad of ['A'.repeat(42),'A'.repeat(44),'A'.repeat(42)+'=','A'.repeat(42)+'+','A'.repeat(42)+'/','A'.repeat(42)+' ','A'.repeat(42)+'é','A'.repeat(42)+'\u0000'])expect(memory.capture(id,'#token='+bad)).toBe(false);
 });
 it('does not erase an existing credential after a rejected capture',()=>{
  const memory=createGiftLinkMemory();memory.capture(id,fragment);expect(memory.capture(id,fragment+'&ignored=1')).toBe(false);expect(memory.get(id)).toBe(token);
 });
 it('can replace a valid credential only with another exact valid fragment for the same invitation',()=>{
  const memory=createGiftLinkMemory();memory.capture(id,fragment);expect(memory.capture(id,'#token='+nextToken)).toBe(true);expect(memory.get(id)).toBe(nextToken);
 });
 it('clears one invitation without affecting another or accepting a malformed alias',()=>{
  const memory=createGiftLinkMemory();memory.capture(id,fragment);memory.capture(other,'#token='+nextToken);memory.clear('../'+id);expect(memory.get(id)).toBe(token);memory.clear(id.toUpperCase());expect(memory.get(id)).toBe(null);expect(memory.get(other)).toBe(nextToken);
 });
 it('supports explicit clearAll and clear without an ID',()=>{
  const memory=createGiftLinkMemory();memory.capture(id,fragment);memory.clearAll();expect(memory.get(id)).toBe(null);memory.capture(other,fragment);memory.clear();expect(memory.get(other)).toBe(null);
 });
 it('loses custody on a new instance/reload and never shares credentials between instances',()=>{
  const first=createGiftLinkMemory(),reloaded=createGiftLinkMemory();first.capture(id,fragment);expect(reloaded.get(id)).toBe(null);reloaded.capture(other,'#token='+nextToken);first.clearAll();expect(reloaded.get(other)).toBe(nextToken);
 });
 it('does not read/write browser storage, log credentials, or call the network',()=>{
  const reads=vi.spyOn(Storage.prototype,'getItem'),writes=vi.spyOn(Storage.prototype,'setItem'),fetch=vi.spyOn(globalThis,'fetch'),logs=vi.spyOn(console,'log'),info=vi.spyOn(console,'info'),errors=vi.spyOn(console,'error');
  const memory=createGiftLinkMemory();memory.capture(id,fragment);memory.get(id);safeGiftNext('/gift/'+id);buildGiftLink('https://example.test',id,token);memory.clear();
  for(const spy of [reads,writes,fetch,logs,info,errors])expect(spy).not.toHaveBeenCalled();
 });
});

describe('safe token-free Gift authentication next path',()=>{
 it('allows only a literal Gift UUID path and normalizes its case',()=>{
  expect(safeGiftNext('/gift/'+id)).toBe('/gift/'+id);expect(safeGiftNext('/gift/'+other.toUpperCase())).toBe('/gift/'+other);
 });
 it('rejects absolute/protocol-relative URLs, traversal, query, fragment, encoded bypass and backslashes',()=>{
  for(const bad of ['https://evil.test/gift/'+id,'//evil.test/gift/'+id,'/gift/'+id+'?next=evil','/gift/'+id+fragment,'/gift/'+id+'/','/gift/../'+id,'/gift/%2e%2e/'+id,'/gift/%31'+id.slice(1),'%2fgift%2f'+id,'\\gift\\'+id,'/gift/'+id+'\\evil','/gift/'+id+'\n',' /gift/'+id,'/GIFt/'+id,'/gift/'+id.replace('1','g'),'/gift/'+id+'x','/gift/'+id.slice(1)])expect(safeGiftNext(bad)).toBe('/');
 });
 it('falls back safely for nonstrings and arbitrarily long inputs without coercion',()=>{
  for(const bad of [undefined,null,{},[],42,{toString:()=>'/gift/'+id},'/gift/'+'A'.repeat(100000)])expect(safeGiftNext(bad)).toBe('/');
 });
});

describe('manual Gift personal-link builder',()=>{
 it('builds a credential only in the fragment for HTTP or HTTPS root origins',()=>{
  expect(buildGiftLink('https://example.test',id,token)).toBe('https://example.test/gift/'+id+fragment);expect(buildGiftLink('http://127.0.0.1:5174/',other.toUpperCase(),nextToken)).toBe('http://127.0.0.1:5174/gift/'+other+'#token='+nextToken);
  expect(buildGiftLink('HTTPS://EXAMPLE.TEST:443/',id,token)).toBe('https://example.test/gift/'+id+fragment);
 });
 it('rejects unsafe or non-origin bases before URL normalization can hide them',()=>{
  for(const base of ['','/','//example.test','javascript:alert(1)','data:text/html,test','ftp://example.test','https://user:pass@example.test','https://@example.test','https://example.test/path','https://example.test/.','https://example.test/../','https://example.test/%2e%2e','https://example.test/?x=1','https://example.test?','https://example.test/#token=x','https://example.test#','https:\\example.test',' https://example.test','https://example.test\n','https://example.test:99999','https://','x'.repeat(2049)])expect(()=>buildGiftLink(base,id,token)).toThrow(TypeError);
 });
 it('rejects wrong IDs and credentials rather than constructing an incomplete personal link',()=>{
  for(const badId of ['',id+'\n','../'+id,id.replaceAll('-','')])expect(()=>buildGiftLink('https://example.test',badId,token)).toThrow(TypeError);
  for(const badToken of ['',token+'=',token.slice(1),token+'&next=evil',token+'\n'])expect(()=>buildGiftLink('https://example.test',id,badToken)).toThrow(TypeError);
 });
 it('does not echo an invalid input or credential into the error text',()=>{
  const privateInput='private-personal-link-secret';try{buildGiftLink('https://example.test/path/'+privateInput,id,privateInput);expect.unreachable();}catch(error){expect(error).toBeInstanceOf(TypeError);expect(String(error)).not.toContain(privateInput);}
 });
});
