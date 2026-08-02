import * as pdfjsLib from 'pdfjs-dist';
// Vite risolve questi import in URL statici serviti dal dev server / bundle.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import jbig2WasmUrl from 'pdfjs-dist/wasm/jbig2.wasm?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// pdf.js 6 decodifica JBIG2/OpenJPEG/qcms via WASM e richiede la cartella
// dove si trovano quei file (jbig2.wasm, openjpeg.wasm, ecc.) — comune per
// le scansioni B/N ad alta compressione (es. planimetrie catastali). Senza
// "wasmUrl" il rendering "riesce" ma l'immagine raster resta vuota.
const WASM_BASE_URL = jbig2WasmUrl.replace(/jbig2\.wasm$/, '');

// Alcuni PDF scansionati (comune per planimetrie catastali) incorporano
// l'immagine raster con una codifica che pdf.js non riesce a decodificare
// nel browser: il rendering "riesce" ma il canvas resta bianco, tranne
// eventuali elementi vettoriali (bordi, testo). Rilevarlo qui evita di
// mostrare in silenzio uno sfondo vuoto che sembra funzionare.
function isCanvasEffectivelyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  // I bordi/testo del foglio sono spesso vettoriali e renderizzano comunque
  // correttamente anche quando l'immagine raster incorporata fallisce:
  // controlliamo solo il rettangolo centrale, dove sta il disegno vero.
  const cx = Math.floor(canvas.width * 0.2);
  const cy = Math.floor(canvas.height * 0.2);
  const cw = Math.floor(canvas.width * 0.6);
  const ch = Math.floor(canvas.height * 0.6);
  const { data } = ctx.getImageData(cx, cy, cw, ch);
  const totalPixels = data.length / 4;
  const step = Math.max(1, Math.floor(totalPixels / 20000)) * 4;

  let nonWhite = 0;
  let sampled = 0;
  for (let i = 0; i < data.length; i += step) {
    sampled++;
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) nonWhite++;
  }
  return sampled === 0 || nonWhite / sampled < 0.005;
}

// Renderizza la prima pagina di un PDF su un canvas e restituisce una data
// URL PNG, per poterla usare come sfondo della planimetria (l'editor lavora
// solo con immagini, mai con PDF direttamente). Lancia se il risultato è
// sostanzialmente vuoto, invece di restituire un'immagine bianca silenziosa.
export async function renderPdfFirstPageToDataUrl(
  arrayBuffer: ArrayBuffer,
  targetWidth = 1200,
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, wasmUrl: WASM_BASE_URL }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d')!;

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  if (isCanvasEffectivelyBlank(canvas)) {
    throw new Error(
      'Il PDF non può essere mostrato in anteprima nel browser (immagine scansionata in un formato non supportato). Prova a ricaricarlo come immagine (PNG/JPG).',
    );
  }

  return canvas.toDataURL('image/png');
}
