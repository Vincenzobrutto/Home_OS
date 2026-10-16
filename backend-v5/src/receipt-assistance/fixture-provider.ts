import { Injectable } from '@nestjs/common';
import { digest } from '../security';
import { PdfTextExtractor, type InputDocument } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { receiptExtraction } from './domain';

export type ReceiptFixtureKind = 'purchase' | 'multiple' | 'unreadable' | 'unsupported';
const kinds: ReceiptFixtureKind[] = ['purchase', 'multiple', 'unreadable', 'unsupported'];

/** Deterministic synthetic PDFs. This is an explicit simulation, never an AI fallback. */
export function receiptFixturePdf(kind: ReceiptFixtureKind): Buffer {
  const lines = kind === 'unreadable' ? [] : kind === 'unsupported' ? ['DIMORA RECEIPT TEST ONLY', 'Certificato energetico sintetico', 'Classe energetica: B'] : [
    'DIMORA RECEIPT TEST ONLY', 'Macchina caffe demo', 'Marca: Lume', 'Modello: Mini 90',
    'Venditore: Negozio sintetico', 'Data documento: 2026-09-15', 'Numero ricevuta: DEMO-179',
    ...(kind === 'multiple' ? ['Secondo articolo: Tostapane demo', 'Totale documento: 229,90 EUR'] : ['Totale documento: 179,90 EUR']),
  ];
  const stream = 'BT /F1 12 Tf 40 790 Td ' + lines.map((line, i) => (i ? '0 -24 Td ' : '') + '(' + line.replace(/[()\\]/g, char => '\\' + char) + ') Tj').join('\n') + ' ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream'];
  let source = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((value, i) => { offsets.push(Buffer.byteLength(source)); source += (i + 1) + ' 0 obj\n' + value + '\nendobj\n'; });
  const xref = Buffer.byteLength(source);
  source += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(source + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}

const known = new Map(kinds.map(kind => [digest(receiptFixturePdf(kind)), kind]));
export const receiptFixtureKind = (sha256: string) => known.get(sha256) ?? null;

@Injectable()
export class ReceiptFixtureProvider {
  constructor(private readonly parser: PdfTextExtractor = new PdfTextExtractor()) {}
  readonly isSimulation = true;

  async analyze(input: InputDocument, today: string) {
    const kind = receiptFixtureKind(input.snapshot.documentSha256);
    // Reject unknown originals before reading or parsing them; matching text/filename
    // alone never authorizes a document for this controlled test provider.
    if (!kind) throw new ProviderFailure('provider_fixture_unsupported');
    const [{ pages }] = await this.parser.extract([input]);
    if (kind === 'unsupported') throw new ProviderFailure('receipt_document_unsupported');
    const cite = (excerpt: string) => [{ documentId: input.snapshot.documentId, documentVersion: input.snapshot.documentVersion, sha256: input.snapshot.documentSha256, page: 1, excerpt }];
    const field = (value: string, excerpt: string) => ({ value, sources: cite(excerpt) });
    return receiptExtraction({
      documentKind: 'purchase_receipt', multipleItems: kind === 'multiple',
      fields: {
        name: field('Macchina caffe demo', 'Macchina caffe demo'), title: field('Macchina caffe demo', 'Macchina caffe demo'),
        brand: field('Lume', 'Marca: Lume'), model: field('Mini 90', 'Modello: Mini 90'),
        supplier: field('Negozio sintetico', 'Venditore: Negozio sintetico'),
        documentDate: field('2026-09-15', 'Data documento: 2026-09-15'), documentNumber: field('DEMO-179', 'Numero ricevuta: DEMO-179'),
      },
      total: { amountCents: 17990, sources: cite('Totale documento: 179,90 EUR') },
    }, pages, input.snapshot, today);
  }
}
