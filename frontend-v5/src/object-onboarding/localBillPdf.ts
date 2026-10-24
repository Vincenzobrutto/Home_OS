import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { localBill } from './localBill';

/** Authorized bytes only; no OCR, remote model, persistence or unbounded PDF processing. */
export async function localBillPdf(blob: Blob, sha256: string, signal: AbortSignal) {
  if (blob.size > 10*1024*1024 || signal.aborted) return null;
  const buffer = await blob.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if (hash !== sha256 || signal.aborted) return null;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = lib.getDocument({data:new Uint8Array(buffer),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/'});
  const stop = () => { void task.destroy(); };
  const timer = setTimeout(stop,10000);
  signal.addEventListener('abort',stop,{once:true});
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20 || signal.aborted) return null;
    const pages: string[] = [];
    let count = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      if (signal.aborted) return null;
      const source = await pdf.getPage(page), content = await source.getTextContent();
      // Keep the PDF's line boundaries: money/date labels must not consume unrelated columns.
      const text = content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
      count += text.length;
      if (count > 100000) return null;
      pages.push(text);
      source.cleanup();
    }
    if (!pages.some(page=>page.trim())) throw new Error('local_pdf_text_unavailable');
    return localBill(pages);
  } finally { clearTimeout(timer); signal.removeEventListener('abort',stop); await task.destroy(); }
}
