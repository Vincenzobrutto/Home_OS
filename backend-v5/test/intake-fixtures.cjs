// Public synthetic corpus; ordinary PDFs, not recognized by hash or fixture provider.
function pdf(lines) {
  const stream = 'BT /F1 12 Tf 40 790 Td ' + lines.map((line, i) => (i ? '0 -24 Td ' : '') + '(' + line.replace(/[()\\]/g, c => '\\' + c) + ') Tj').join('\n') + ' ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream'];
  let source = '%PDF-1.4\n'; const offsets = [0]; for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(source)); source += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n'; }
  const xref = Buffer.byteLength(source); source += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(source + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}
const corpus = { 'ape-sintetico.pdf': pdf(['DIMORA - ESEMPIO SINTETICO, NON VALIDO', 'Attestato di prestazione energetica', 'Dati dimostrativi per provare le raccolte.']), 'pratica-mista-sintetica.pdf': pdf(['DIMORA - ESEMPIO SINTETICO, NON VALIDO', 'Comunicazione inizio lavori asseverata - CILA', 'Certificato di agibilita', 'Nessuna pratica reale. Due contenuti, un originale.']), 'regolamento-sintetico.pdf': pdf(['DIMORA - ESEMPIO SINTETICO', 'Regolamento condominiale', 'Questo documento resta privato dopo la classificazione.']), 'ricevuta-sintetica.pdf': pdf(['DIMORA - ESEMPIO SINTETICO', 'Documento commerciale', 'Macchina caffe dimostrativa', 'Totale: 179,90 EUR']), 'senza-testo-sintetico.pdf': pdf([]) };
module.exports = { pdf, corpus };
