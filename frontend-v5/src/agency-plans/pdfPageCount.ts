import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export async function pdfPageCount(blob:Blob,signal:AbortSignal):Promise<number>{
 const [pdfjs,bytes]=await Promise.all([import('pdfjs-dist'),blob.arrayBuffer()]);
 signal.throwIfAborted();
 pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
 const task=pdfjs.getDocument({data:new Uint8Array(bytes)});
 const destroy=()=>task.destroy().catch(()=>{});
 const abort=()=>{void destroy();};
 signal.addEventListener('abort',abort,{once:true});
 try{
  const pdf=await task.promise;
  return pdf.numPages;
 }finally{
  signal.removeEventListener('abort',abort);
  if(!signal.aborted)await destroy();
 }
}
