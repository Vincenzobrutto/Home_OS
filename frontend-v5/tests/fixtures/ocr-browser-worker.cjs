// Test-only browser worker emulation: every resource is an in-memory bundled asset.
// No HTTP server, credentials, database or external fetch exists in this harness.
const {parentPort,workerData}=require('node:worker_threads');
const vm=require('node:vm');
const assets=new Map(workerData.assets.map(([key,bytes])=>[key,Buffer.from(bytes)]));
const loaded=[];let listener;
const read=url=>{const parsed=new URL(url,'http://offline.test/ocr/v1/worker.js');if(parsed.origin!=='http://offline.test'||!assets.has(parsed.pathname))throw Error('external_resource_forbidden');loaded.push(parsed.pathname);return assets.get(parsed.pathname);};
const context=vm.createContext({URL,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Blob,Response,crypto:require('node:crypto').webcrypto,performance,setTimeout,clearTimeout,queueMicrotask,atob,btoa,navigator:{hardwareConcurrency:1},location:{href:'http://offline.test/ocr/v1/worker.js',origin:'http://offline.test'},console:{log(){},warn(){},error(){}},
 addEventListener(type,fn){if(type==='message')listener=fn;},
 postMessage(data){parentPort.postMessage(data);},
 fetch:async url=>new Response(String(url).startsWith('data:application/octet-stream;base64,AGFzbQ')?Buffer.from(String(url).split(',')[1],'base64'):read(url),{headers:{'Content-Type':String(url).endsWith('.wasm')||String(url).startsWith('data:')?'application/wasm':'application/octet-stream'}}),
 importScripts(...urls){for(const url of urls)vm.runInContext(read(url).toString('utf8'),context,{filename:url});},
});
context.self=context;context.WorkerGlobalScope=function WorkerGlobalScope(){};
vm.runInContext(assets.get('/ocr/v1/worker.js').toString('utf8'),context,{filename:'local-ocr-worker.js'});
parentPort.on('message',data=>{if(data.testInventory){parentPort.postMessage({testInventory:loaded});return;}listener({data});});
