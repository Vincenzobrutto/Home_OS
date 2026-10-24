import {readFileSync} from 'node:fs';
import {Worker as Thread} from 'node:worker_threads';
import vm from 'node:vm';
import {expect,it,vi} from 'vitest';
import {ocrAssetMap} from '../../scripts/ocrAssets';
import {LocalOcr} from '../../src/object-onboarding/localOcr';
import {localBill} from '../../src/object-onboarding/localBill';

it('runs the pinned browser worker/WASM/Italian model on a synthetic scan with no network',async()=>{
 const assets=ocrAssetMap();
 class BrowserWorker {
  onmessage:((event:{data:unknown})=>void)|null=null;
  onerror:((error:Error)=>void)|null=null;
  private thread:Thread;
  constructor(url:string){expect(url).toBe('/ocr/v1/worker.js');this.thread=new Thread(new URL('./ocr-browser-worker.cjs',import.meta.url),{workerData:{assets:[...assets]}});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.(error));}
  postMessage(data:unknown){this.thread.postMessage(data);}
  terminate(){void this.thread.terminate();}
 }
 vi.stubGlobal('Worker',BrowserWorker);
 const ocr=new LocalOcr(new AbortController().signal);
 try{
  await ocr.initialize();
  const image=new Blob([readFileSync(new URL('./ocr/bolletta-sintetica.png',import.meta.url))]);
  const text=await ocr.recognize(image);
  expect(localBill([text])).toMatchObject({category:'electricity',supplier:'ENERGIA ESEMPIO SRL',amount:'147.82',documentDate:'2026-09-12',dueOn:'2026-10-05',competenceFrom:'2026-08-01',competenceTo:'2026-08-31'});
 }finally{ocr.dispose();vi.unstubAllGlobals();}
},60000);

it('bundles every worker dependency locally and blocks external resources, API calls and writes',async()=>{
 const assets=ocrAssetMap(),script=assets.get('/ocr/v1/worker.js')!.toString();
 const seen:string[]=[];
 const context=vm.createContext({URL,location:{href:'http://offline.test/ocr/v1/worker.js',origin:'http://offline.test'},fetch:async(url:string)=>{seen.push(url);return 'local';},importScripts:(...urls:string[])=>seen.push(...urls)});context.self=context;
 vm.runInContext(script.slice(0,script.indexOf('\n')),context);
 for(const url of ['https://cdn.jsdelivr.net/a','http://offline.test/api/v5/documents','http://offline.test/ocr/v1/lang/ita.traineddata.gz?document=secret','data:text/javascript,x','http://offline.test/ocr/v1/missing'])expect(()=>context.fetch(url)).toThrow('ocr_external_resource_forbidden');
 expect(()=>context.fetch('/ocr/v1/lang/ita.traineddata.gz',{method:'POST',body:'private'})).toThrow('ocr_external_resource_forbidden');
 expect(()=>context.importScripts('https://cdn.example/worker.js')).toThrow('ocr_external_resource_forbidden');
 expect(()=>new context.XMLHttpRequest()).toThrow('ocr_external_resource_forbidden');
 expect(()=>new context.WebSocket('wss://example.test')).toThrow('ocr_external_resource_forbidden');
 expect(seen).toEqual([]);
 expect(await context.fetch('/ocr/v1/lang/ita.traineddata.gz')).toBe('local');
 expect(assets.has('/ocr/v1/core/tesseract-core-simd-lstm.wasm.js')).toBe(true);
 expect(assets.has('/ocr/v1/core/tesseract-core-lstm.wasm.js')).toBe(true);
});
