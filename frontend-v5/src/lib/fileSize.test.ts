import { expect, it } from 'vitest';
import { formatBytes } from './fileSize';
import { MAX_UPLOAD_BYTES, MAX_EXPORT_BYTES, validateUploadFile, exportProblem } from './files';
import type { DocumentSummary } from '../api/types';

it.each([[500,'500 B'],[1000,'1 KB'],[396800,'397 KB'],[1_000_000,'1 MB'],[10_485_760,'10,5 MB']])('converts %i bytes to decimal units: %s',(bytes,label)=>{
 expect(formatBytes(Number(bytes))).toBe(label);
});

it('display rounding does not expand the exact upload and ZIP limits',()=>{
 const file=new File(['pdf'],'test.pdf',{type:'application/pdf'});
 Object.defineProperty(file,'size',{value:MAX_UPLOAD_BYTES,configurable:true});
 expect(validateUploadFile(file)).toBeUndefined();
 Object.defineProperty(file,'size',{value:MAX_UPLOAD_BYTES+1});
 expect(validateUploadFile(file)).toContain('circa 21 MB');
 expect(exportProblem([{byteSize:MAX_EXPORT_BYTES} as DocumentSummary])).toBeUndefined();
 expect(exportProblem([{byteSize:MAX_EXPORT_BYTES+1} as DocumentSummary])).toContain('circa 105 MB');
 expect(MAX_UPLOAD_BYTES).toBe(20_971_520);
 expect(MAX_EXPORT_BYTES).toBe(104_857_600);
});
