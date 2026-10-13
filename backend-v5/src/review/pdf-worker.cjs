// Only this disposable child parses untrusted PDF bytes; it has no API key.
const emit = value => process.stdout.write(JSON.stringify(value));
let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { body += chunk; if (body.length > 15 * 1024 * 1024) process.exit(2); });
process.stdin.on('end', async () => {
  let loading;
  try {
    const { bytes } = JSON.parse(body);
    console.warn = () => {}; console.log = () => {};
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    loading = getDocument({ data: Uint8Array.from(Buffer.from(bytes, 'base64')), verbosity: 0, isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, stopAtErrors: true });
    const doc = await loading.promise;
    const metadata = await doc.getMetadata();
    if (metadata.info?.EncryptFilterName) { emit({ error: 'pdf_encrypted' }); return; }
    if (doc.numPages > 20) { emit({ error: 'analysis_limits_exceeded' }); return; }
    const pages = []; let length = 0;
    for (let page = 1; page <= doc.numPages; page++) {
      const item = await doc.getPage(page);
      const content = await item.getTextContent();
      const text = content.items.filter(i => typeof i.str === 'string').map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('').normalize('NFC').trim();
      length += [...text].length;
      if (!text) { emit({ error: 'pdf_text_unavailable' }); return; }
      if (length > 100000) { emit({ error: 'analysis_limits_exceeded' }); return; }
      pages.push(text); item.cleanup();
    }
    emit({ pages });
  } catch (error) { emit({ error: error?.name === 'PasswordException' ? 'pdf_encrypted' : 'pdf_invalid' }); }
  finally { if (loading) await loading.destroy().catch(() => {}); }
});
