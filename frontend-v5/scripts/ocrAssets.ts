import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createRequire} from 'node:module';
import type {Plugin} from 'vite';
export const OCR_PATH='/ocr/v1/';
/** No document bytes: pinned, distributable runtime and Italian language assets only. */
export function ocrAssetMap(){
 const require=createRequire(import.meta.url),root=(name:string)=>dirname(require.resolve(name+'/package.json'));
 const core=root('tesseract.js-core'),engine=root('tesseract.js'),lang=root('@tesseract.js-data/ita');
 const files=new Map<string,Buffer>();
 for(const name of readdirSync(core).filter(name=>/\.wasm(?:\.js)?$/.test(name)))files.set(OCR_PATH+'core/'+name,readFileSync(join(core,name)));
 files.set(OCR_PATH+'lang/ita.traineddata.gz',readFileSync(join(lang,'4.0.0_best_int/ita.traineddata.gz')));
 for(const [name,dir] of [['engine',engine],['core',core],['ita',lang]]){
  const pkg=JSON.parse(readFileSync(join(dir!,'package.json'),'utf8')) as {name:string;version:string;license:string};
  files.set(OCR_PATH+name+'-notice.txt',Buffer.from(`${pkg.name} ${pkg.version}\nLicense: ${pkg.license}\n`));
  for(const license of readdirSync(dir!).filter(file=>/^licen[sc]e(?:\.|$)/i.test(file)))files.set(OCR_PATH+name+'-'+license,readFileSync(join(dir!,license)));
 }
 files.set(OCR_PATH+'ita-upstream-LICENSE.txt',readFileSync(new URL('./ocr-notices/TESSDATA-LICENSE.txt',import.meta.url)));
 files.set(OCR_PATH+'NOTICE.txt',Buffer.from('Local OCR assets for Dimora. Tesseract.js 6.0.1 worker modified only by prepending a network guard. Engine/core original licenses included. Italian model: @tesseract.js-data/ita 1.0.0, 4.0.0_best_int, upstream https://github.com/naptha/tessdata (Apache-2.0); npm packaging declares MIT. No document bytes are included.\n'));
 const allowed=[...files.keys()];
 // This guard executes in the dedicated OCR worker, before the pinned engine.
 const guard=`(()=>{const allowed=new Set(${JSON.stringify(allowed)});const check=value=>{const u=new URL(typeof value==='string'?value:value.url,self.location.href);if(u.origin!==self.location.origin||u.search||u.hash||!allowed.has(u.pathname))throw Error('ocr_external_resource_forbidden');return u.href;};const fetchLocal=self.fetch.bind(self);self.fetch=(input,init={})=>{if(String(init.method||input.method||'GET').toUpperCase()!=='GET')throw Error('ocr_external_resource_forbidden');const embedded=typeof input==='string'&&input.startsWith('data:application/octet-stream;base64,AGFzbQ')&&input.length<=6000000;return fetchLocal(embedded?input:check(input),{...init,credentials:'omit',redirect:'error'});};const scripts=self.importScripts.bind(self);self.importScripts=(...urls)=>scripts(...urls.map(check));self.XMLHttpRequest=function(){throw Error('ocr_external_resource_forbidden');};self.WebSocket=function(){throw Error('ocr_external_resource_forbidden');};self.EventSource=function(){throw Error('ocr_external_resource_forbidden');};})();\n`;
 files.set(OCR_PATH+'worker.js',Buffer.concat([Buffer.from(guard),readFileSync(join(engine,'dist/worker.min.js'))]));
 return files;
}
export function ocrAssets():Plugin{
 const files=ocrAssetMap();
 return {name:'local-ocr-assets',
  configureServer(server){server.middlewares.use((req,res,next)=>{const data=files.get((req.url??'').split('?')[0]!);if(!data){next();return;}res.setHeader('Content-Type',req.url?.endsWith('.js')?'text/javascript':req.url?.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.end(data);});},
  generateBundle(){for(const [fileName,source] of files)this.emitFile({type:'asset',fileName:fileName.slice(1),source});}
 };
}
