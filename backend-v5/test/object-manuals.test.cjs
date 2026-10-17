require('reflect-metadata');
const {test}=require('node:test'), assert=require('node:assert/strict');
const {ManufacturerManuals,manualLookup,manualSelection,externalManualUrl}=require('../dist/home-objects/manuals');
const productUrl='https://www.moulinex.it/p/synthetic-product/1234567';
const manualUrl='https://dam.groupeseb.com/m/synthetic/original/synthetic-IFU.pdf';
const html=(mpn='TEST123',links=`<a href="${manualUrl}"><span>Scarica le Istruzioni per l’uso</span></a>`)=>`<script type="application/ld+json">${JSON.stringify({'@type':'Product',mpn})}</script>${links}`;
const lookup=()=>manualLookup({brand:'Moulinex',reference:'TEST123',productUrl});
const status=fn=>assert.throws(fn,e=>e.getStatus?.()===422);
test('manual URLs reject scripts, local/file/plainHTTP, credentials, whitespace and ports',()=>{
 for(const url of ['javascript:alert(1)','file:///C:/test','http://example.com/manual.pdf','https://127.0.0.1/a','https://[::1]/a','https://localhost/a','https://server.local/a','https://a:b@example.com/a','https://example.com:123/a','https://example.com/\nmanual.pdf'])status(()=>externalManualUrl(url));
 assert.equal(externalManualUrl('https://manufacturer.example/manual.pdf'),'https://manufacturer.example/manual.pdf');
 status(()=>manualSelection({mode:'manual',kind:'manual',url:manualUrl,brand:'Lume',reference:'x',origin:'manufacturer_page'}));
 assert.equal(manualSelection({mode:'manual',kind:'manual',url:manualUrl,brand:'Lume',reference:'x'}).manual.origin,'user_provided');
});
test('official lookup verifies exact structured product reference and instructions label',async()=>{
 const service=new ManufacturerManuals(),calls=[];
 service.fetchImpl=async(url,init)=>{calls.push({url,init});return new Response(html(),{headers:{'content-type':'text/html'}});};
 const found=await service.lookup(lookup(),'scope-A');
 assert.equal(found.candidate.manual.url,manualUrl);assert.equal(found.candidate.manual.origin,'manufacturer_page');
 assert.equal(calls.length,1);assert.equal(calls[0].url,productUrl);assert.equal(calls[0].init.redirect,'error');
 assert.equal(service.accept(found.candidate.token,'scope-A').reference,'TEST123');
 status(()=>service.accept(found.candidate.token,'scope-B'));
 status(()=>service.accept(found.candidate.token+'a','scope-A'));
});
test('wrong product, multiple manuals, missing manual and wrong CDN never become automatic links',async()=>{
 const service=new ManufacturerManuals();
 for(const page of [html('OTHER'),html('TEST123','<a href="https://evil.example/m.pdf">Istruzioni per l’uso</a>'),html('TEST123',''),html('TEST123',`<a href="${manualUrl}">Istruzioni per l’uso</a><a href="${manualUrl.replace('IFU','OTHER')}">Istruzioni per l’uso</a>`)]){
  service.fetchImpl=async()=>new Response(page,{headers:{'content-type':'text/html'}});
  assert.equal((await service.lookup(lookup(),'scope')).candidate,null);
 }
});
test('no arbitrary hosts, query URL or unsupported manufacturer is fetched',async()=>{
 const service=new ManufacturerManuals();let calls=0;service.fetchImpl=async()=>{calls++;throw Error();};
 for(const data of [{brand:'Moulinex',reference:'X',productUrl:'https://evil.example/p/x/123'},{brand:'Moulinex',reference:'X',productUrl:productUrl+'?redirect=evil'},{brand:'Other',reference:'X',productUrl}])await assert.rejects(service.lookup(manualLookup(data),'scope'));
 assert.equal((await service.lookup(manualLookup({brand:'Other',reference:'X'}),'scope')).candidate,null);assert.equal(calls,0);
});
test('expired/restarted proof cannot claim verified manufacturer origin',async()=>{
 let now=1000;const service=new ManufacturerManuals(()=>now);service.fetchImpl=async()=>new Response(html(),{headers:{'content-type':'text/html'}});
 const found=await service.lookup(lookup(),'scope');
 now+=16*60000;status(()=>service.accept(found.candidate.token,'scope'));
 status(()=>new ManufacturerManuals(()=>1000).accept(found.candidate.token,'scope'));
});
test('network, redirects, nonHTML and oversized response are explicit failures',async()=>{
 const service=new ManufacturerManuals();
 for(const response of [()=>{throw Error();},()=>new Response('',{status:302,headers:{location:'https://evil.example'}}),()=>new Response('pdf',{headers:{'content-type':'application/pdf'}}),()=>new Response('x'.repeat(2*1024*1024+1),{headers:{'content-type':'text/html'}})]){
  service.fetchImpl=async()=>response();await assert.rejects(service.lookup(lookup(),'scope'),e=>e.getStatus?.()===503);
 }
});
test('personal export includes manual metadata of owned objects only and strips arbitrary nested fields',()=>{
 const {Projection}=require('../dist/personal-export/projection');
 const p=new Projection(new Map(),new Set(['mine']),new Set(),new Set(),new Set(),new Set(),new Set());
 const manual={url:manualUrl,kind:'manual',brand:'Moulinex',reference:'TEST1',origin:'user_provided',sourceUrl:null,checkedAt:null,boundVersion:2,token:'must-not-export'};
 const saved=p.snapshot('object',{id:'mine',name:'My object',manual});
 assert.equal(saved.manual.url,manualUrl);assert(!JSON.stringify(saved).includes('must-not-export'));
 assert.equal(p.snapshot('object',{id:'foreign',manual}),null);
});
