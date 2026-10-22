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
  async renderPage(input:InputDocument,page:number):Promise<{bytes:Buffer;pageCount:number}>{
    if(input.bytes.length>ANALYSIS_LIMITS.maxFileBytes||digest(input.bytes)!==input.snapshot.documentSha256||!Number.isSafeInteger(page)||page<1||page>20)throw new ProviderFailure('analysis_limits_exceeded');
    return new Promise((res,rej)=>{
      const child=execFile(process.execPath,['--max-old-space-size=256',resolve(__dirname,'../../src/review/pdf-worker.cjs')],{timeout:15000,maxBuffer:8*1024*1024,windowsHide:true,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP}},(error,stdout)=>{
        if(error){rej(new ProviderFailure('pdf_invalid'));return;}
        try{const data=JSON.parse(stdout);if(data.error)throw new ProviderFailure(data.error);if(typeof data.image!=='string'||!Number.isSafeInteger(data.pageCount)||data.pageCount<page||data.pageCount>20)throw new ProviderFailure('pdf_invalid');res({bytes:Buffer.from(data.image,'base64'),pageCount:data.pageCount});}catch(e){rej(e instanceof ProviderFailure?e:new ProviderFailure('pdf_invalid'));}
      });child.stdin?.on('error',()=>rej(new ProviderFailure('pdf_invalid')));child.stdin?.end(JSON.stringify({bytes:input.bytes.toString('base64'),renderPage:page}));
    });
  }
  async pageCount(input: InputDocument): Promise<number> {
    if (input.bytes.length > ANALYSIS_LIMITS.maxFileBytes || digest(input.bytes) !== input.snapshot.documentSha256) throw new ProviderFailure('analysis_limits_exceeded');
    return new Promise((resolveResult, reject) => {
      const child = execFile(process.execPath, ['--max-old-space-size=256', resolve(__dirname, '../../src/review/pdf-worker.cjs')], {
        timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
      }, (error, stdout) => {
        if (error) { reject(new ProviderFailure('pdf_invalid')); return; }
        try {
          const data = JSON.parse(stdout);
          if (data.error) throw new ProviderFailure(data.error);
          if (!Number.isSafeInteger(data.pageCount) || data.pageCount < 1 || data.pageCount > 20) throw new ProviderFailure('pdf_invalid');
          resolveResult(data.pageCount);
        } catch (failure) { reject(failure instanceof ProviderFailure ? failure : new ProviderFailure('pdf_invalid')); }
      });
      child.stdin?.on('error', () => reject(new ProviderFailure('pdf_invalid')));
      child.stdin?.end(JSON.stringify({ bytes: input.bytes.toString('base64'), metadataOnly: true }));
    });
  }
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
