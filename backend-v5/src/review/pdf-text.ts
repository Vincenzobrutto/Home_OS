import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { ProviderFailure, Snapshot } from './provider';
import { digest } from '../security';
export const ANALYSIS_LIMITS = { maxFileBytes: 10 * 1024 * 1024, maxTotalPages: 20, maxExtractedCodePoints: 100000, maxInputTokens: 50000 };
export type InputDocument = { snapshot: Snapshot; bytes: Buffer };
export type TextDocument = { snapshot: Snapshot; pages: string[] };
@Injectable()
export class PdfTextExtractor {
  async extract(inputs: InputDocument[]): Promise<TextDocument[]> {
    const documents: TextDocument[] = []; let pages = 0, characters = 0;
    for (const input of inputs) {
      if (input.bytes.length > ANALYSIS_LIMITS.maxFileBytes) throw new ProviderFailure('analysis_limits_exceeded');
      if (digest(input.bytes) !== input.snapshot.documentSha256) throw new ProviderFailure('storage_unavailable');
      const parsed = await this.parse(input.bytes);
      pages += parsed.length; characters += parsed.reduce((total, text) => total + [...text].length, 0);
      if (pages > ANALYSIS_LIMITS.maxTotalPages || characters > ANALYSIS_LIMITS.maxExtractedCodePoints) throw new ProviderFailure('analysis_limits_exceeded');
      documents.push({ snapshot: input.snapshot, pages: parsed });
    }
    return documents;
  }
  parse(bytes: Buffer): Promise<string[]> {
    return new Promise((resolveResult, reject) => {
      const child = execFile(process.execPath, ['--max-old-space-size=256', resolve(__dirname, '../../src/review/pdf-worker.cjs')], {
        timeout: 10000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
      }, (error, stdout) => {
        if (error) { reject(new ProviderFailure('pdf_invalid')); return; }
        try { const data = JSON.parse(stdout) as { error?: string; pages?: string[] }; if (data.error) throw new ProviderFailure(data.error); if (!data.pages?.length || data.pages.some(p => typeof p !== 'string' || !p.trim())) throw new ProviderFailure('pdf_text_unavailable'); resolveResult(data.pages); }
        catch (failure) { reject(failure instanceof ProviderFailure ? failure : new ProviderFailure('pdf_invalid')); }
      });
      child.stdin?.on('error', () => { reject(new ProviderFailure('pdf_invalid')); });
      child.stdin?.end(JSON.stringify({ bytes: bytes.toString('base64') }));
    });
  }
}
