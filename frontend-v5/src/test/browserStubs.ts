// Stub del browser assenti in jsdom (solo test): URL di Blob e download via <a download>.
// Registrano le chiamate per verificare creazione/revoca degli URL e i file salvati.

export const blobUrls = {
  created: new Map<string, Blob>(),
  revoked: new Set<string>(),
  get active() {
    return [...this.created.keys()].filter((u) => !this.revoked.has(u));
  },
  reset() {
    this.created.clear();
    this.revoked.clear();
  },
};

export const downloads: Array<{ filename: string; blob: Blob | undefined }> = [];

let counter = 0;

export function installBrowserStubs() {
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = `blob:test/${++counter}`;
    blobUrls.created.set(url, obj as Blob);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    blobUrls.revoked.add(url);
  };
  // jsdom non implementa la navigazione: il click su <a download> viene solo registrato.
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
    if (this.hasAttribute('download')) {
      downloads.push({ filename: this.download, blob: blobUrls.created.get(this.href) });
    }
  };
}

/** Byte di un Blob anche in jsdom (dove Blob.arrayBuffer non esiste). */
export function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
