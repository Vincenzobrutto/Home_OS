import { formatBytes } from './fileSize';
export { formatBytes };
// Regole documents-v1 lato client. Sono un aiuto immediato all'utente: il server
// verifica byte, formato e limiti e resta l'unica autorità.
import type { DocumentMimeType, DocumentSummary, DocumentVisibility } from '../api/types';

export const MiB = 1024 * 1024;
/** Limite tecnico locale per file (non quota commerciale). */
export const MAX_UPLOAD_BYTES = 20 * MiB;
/** Limiti tecnici locali per un singolo ZIP. */
export const MAX_EXPORT_DOCUMENTS = 50;
export const MAX_EXPORT_BYTES = 100 * MiB;
/** Pagina dell'archivio (contratto: 1–50, default 20). */
export const DOCUMENTS_PAGE_SIZE = 20;

export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

const EXTENSIONS: Record<string, DocumentMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const MIME_LABEL: Record<DocumentMimeType, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
};

export function formatLabel(mime: string) {
  return MIME_LABEL[mime as DocumentMimeType] ?? 'File';
}

export function isImage(mime: string) {
  return mime === 'image/jpeg' || mime === 'image/png';
}

const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
}

export const VISIBILITY_LABEL: Record<DocumentVisibility, string> = {
  private: 'Solo io',
  home: 'Persone della casa',
};

export const VISIBILITY_HINT: Record<DocumentVisibility, string> = {
  private: 'Solo tu puoi vedere e scaricare questo documento, finché hai accesso alla casa.',
  home: 'Visibile alle persone che hanno accesso a questa casa.',
};

/** Fonte: il contratto non dice chi ha caricato il documento, quindi niente «Caricato da te». */
export const SOURCE_LABEL = 'Caricamento manuale';
export const STATUS_LABEL = 'Originale caricato';

/** Tipo dichiarato o, in mancanza, dedotto dall'estensione. Il server controlla i byte. */
export function declaredType(file: File): DocumentMimeType | null {
  if (file.type in MIME_LABEL) return file.type as DocumentMimeType;
  if (file.type && file.type !== 'application/octet-stream') return null;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSIONS[ext] ?? null;
}

export function validateUploadFile(file: File | null): string | undefined {
  if (!file) return 'Scegli un file da caricare.';
  if (!declaredType(file)) return /\.heic$/i.test(file.name) ? 'Formato non supportato: puoi caricare PDF, JPEG o PNG. Esporta o salva questa foto come JPEG e seleziona la nuova copia.' : 'Formato non supportato: puoi caricare PDF, JPEG o PNG. Salva una copia in uno di questi formati.';
  if (file.size === 0) return 'Il file è vuoto. Seleziona una copia completa del documento.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Il file pesa ${formatBytes(file.size)}: il limite per file è circa 21 MB. Riducilo o dividilo prima di caricarlo.`;
  }
  return undefined;
}

export function validateDocumentName(raw: string): string | undefined {
  const n = [...raw.trim()].length;
  if (n === 0) return 'Inserisci un titolo.';
  if (n > 160) return 'Massimo 160 caratteri.';
  return undefined;
}

/** Problema che impedisce l'export della selezione, se presente. */
export function exportProblem(selected: DocumentSummary[]): string | undefined {
  if (selected.length === 0) return 'Seleziona almeno un documento.';
  if (selected.length > MAX_EXPORT_DOCUMENTS) {
    return `Puoi esportare al massimo ${MAX_EXPORT_DOCUMENTS} documenti per volta.`;
  }
  const total = selected.reduce((sum, d) => sum + d.byteSize, 0);
  if (total > MAX_EXPORT_BYTES) {
    return `La selezione pesa ${formatBytes(total)}: il limite per uno ZIP è circa 105 MB.`;
  }
  return undefined;
}

/** Salva un Blob con il nome indicato; l'URL temporaneo viene revocato subito dopo. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Lascia al browser il tempo di avviare il download prima di revocare.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
