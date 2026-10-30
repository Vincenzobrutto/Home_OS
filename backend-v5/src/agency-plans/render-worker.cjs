// Disposable decoder. No credentials, URLs, caller-supplied paths or commands.
const emit = v => process.stdout.write(JSON.stringify(v));
const deny = () => { throw new Error('network_disabled'); };
for (const name of ['node:http','node:https']) { const m=require(name);m.request=deny;m.get=deny; }
require('node:net').connect=deny;require('node:net').createConnection=deny;
globalThis.fetch=deny;globalThis.WebSocket=undefined;
let body='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{body+=chunk;if(body.length>29*1024*1024)process.exit(2);});
process.stdin.on('end',async()=>{
 let loading;
 try {
  const {bytes:encoded,mimeType,page:pageNumber,dpi}=JSON.parse(body),bytes=Buffer.from(encoded,'base64');
  if(bytes.length>20*1024*1024||!Number.isSafeInteger(pageNumber)||pageNumber<1||pageNumber>20||!Number.isSafeInteger(dpi)||dpi<72||dpi>300)throw new Error('render_invalid');
  let imageDecodeFailed=false;
  const captureWarning=(...parts)=>{if(parts.some(v=>typeof v==='string'&&/Unable to decode (?:inline )?image|BMP image decoding failed/u.test(v)))imageDecodeFailed=true;};
  console.log=captureWarning;console.warn=captureWarning;
  const {createCanvas,loadImage}=require('@napi-rs/canvas');
  let canvas,pageCount=1,transform;
  function dimensions(w,h){if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<8||h<8||w>5000||h>5000||w*h>4000000)throw new Error('render_limits_exceeded');}
  if(mimeType==='application/pdf'){
   const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
   // PDF.js needs an explicit local codec root for CCITT/JBIG2/JPEG2000 images in scanned PDFs.
   // The URL must end in '/', including on Windows. No caller-supplied path or network fetch.
   const wasmUrl=require('node:path').join(require('node:path').dirname(require.resolve('pdfjs-dist/package.json')),'wasm')+'/';
   loading=getDocument({wasmUrl,data:Uint8Array.from(bytes),verbosity:1,isEvalSupported:false,disableFontFace:true,useWorkerFetch:false,stopAtErrors:true});
   const doc=await loading.promise;pageCount=doc.numPages;
   if(pageCount>20||pageNumber>pageCount)throw new Error('render_limits_exceeded');
   const page=await doc.getPage(pageNumber),viewport=page.getViewport({scale:dpi/72}),w=Math.ceil(viewport.width),h=Math.ceil(viewport.height);
   dimensions(w,h);canvas=createCanvas(w,h);transform=viewport.transform;
   await page.render({canvasContext:canvas.getContext('2d'),viewport,canvas,background:'rgb(255,255,255)'}).promise;
   if(imageDecodeFailed)throw new Error('render_invalid');
   page.cleanup();
  }else if(mimeType==='image/png'){
   if(pageNumber!==1||bytes.length<33||bytes.subarray(12,16).toString('ascii')!=='IHDR')throw new Error('render_invalid');
   const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);dimensions(w,h);
   const image=await loadImage(bytes);if(image.width!==w||image.height!==h)throw new Error('render_invalid');
   canvas=createCanvas(w,h);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0);transform=[1,0,0,1,0,0];
  }else throw new Error('render_media_unsupported');
  const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,gray=Buffer.alloc(canvas.width*canvas.height);
  for(let i=0;i<gray.length;i++)gray[i]=Math.round((299*rgba[4*i]+587*rgba[4*i+1]+114*rgba[4*i+2])/1000);
  emit({width:canvas.width,height:canvas.height,gray:gray.toString('base64'),pageCount,transform});
 }catch(e){emit({error:e?.name==='PasswordException'?'render_encrypted':['render_invalid','render_limits_exceeded','render_media_unsupported'].includes(e?.message)?e.message:'render_invalid'});}
 finally{if(loading)await loading.destroy().catch(()=>{});}
});
