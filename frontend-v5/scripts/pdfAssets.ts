import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createRequire} from 'node:module';
import type {Plugin} from 'vite';
/** Bundle only PDF.js support files; document bytes never enter this public asset map. */
export function pdfAssets():Plugin{
 const root=dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
 const files=new Map<string,Buffer>();
 for(const folder of ['cmaps','standard_fonts','wasm','iccs'])for(const name of readdirSync(join(root,folder))){files.set('pdfjs/'+folder+'/'+name,readFileSync(join(root,folder,name)));}
 return {name:'local-pdf-support',
  configureServer(server){server.middlewares.use((request,response,next)=>{const key=(request.url??'').split('?')[0]!.replace(/^\//,'');const data=files.get(key);if(!data){next();return;}response.setHeader('Content-Type',key.endsWith('.js')?'text/javascript':'application/octet-stream');response.end(data);});},
  generateBundle(){for(const [fileName,source] of files)this.emitFile({type:'asset',fileName,source});}
 };
}
