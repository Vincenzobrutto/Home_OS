import {HttpException,ServiceUnavailableException} from '@nestjs/common';
import {digest} from '../security';
import {PracticeError} from './domain';
import {detectOriginal,safeFilename,storageUnavailable,MAX_FILE_BYTES,type LocalFileStorage} from '../documents/storage';
import {fileControlUnavailable,type FileControlReceipt} from '../documents/file-control';

export type GiftOriginalProof={sha256:string;byteSize:number;mimeType:string;originalFilename:string};
export type StagedGiftOriginal={storageKey:string;sha256:string;byteSize:number;mimeType:string;originalFilename:string;control:FileControlReceipt};
type Storage=Pick<LocalFileStorage,'writeVerified'|'read'|'remove'>;
const keyPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.bin$/u;
function proof(input:GiftOriginalProof):GiftOriginalProof{
 if(!input||typeof input!=='object'||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(input.sha256)||!Number.isSafeInteger(input.byteSize)||input.byteSize<1||input.byteSize>MAX_FILE_BYTES||
   !['application/pdf','image/png','image/jpeg'].includes(input.mimeType)||typeof input.originalFilename!=='string'||!input.originalFilename.trim()||input.originalFilename.length>4096)throw new PracticeError('invalid_input');
 return {sha256:input.sha256,byteSize:input.byteSize,mimeType:input.mimeType,originalFilename:safeFilename(input.originalFilename)};
}
function receipt(input:FileControlReceipt):FileControlReceipt{
 if(!input||input.engine!=='microsoft_defender'||!(input.checkedAt instanceof Date)||!Number.isFinite(input.checkedAt.getTime())||typeof input.signatureVersion!=='string'||!input.signatureVersion.trim()||input.signatureVersion.length>200||Array.from(input.signatureVersion).some(c=>c.charCodeAt(0)<32))throw fileControlUnavailable();
 return {engine:input.engine,checkedAt:new Date(input.checkedAt.getTime()),signatureVersion:input.signatureVersion};
}
function sanitized(error:unknown):Error{
 if(error instanceof PracticeError&&['access_denied','invalid_input','revision_conflict','idempotency_conflict','source_changed'].includes(error.code))return new PracticeError(error.code);
 // Reconstruct only known public storage failures; never forward provider/body diagnostics.
 if(error instanceof HttpException){
  try{
   const body=error.getResponse(),code=body&&typeof body==='object'&&!Array.isArray(body)?(body as {code?:unknown}).code:undefined;
   if(error.getStatus()===503){
    if(code==='storage_unavailable')return storageUnavailable();
    if(code==='file_check_unavailable')return fileControlUnavailable();
    if(code==='storage_capacity_low')return new ServiceUnavailableException({code:'storage_capacity_low',message:'Spazio temporaneamente insufficiente. Nessun documento salvato.'});
   }
  }catch{/* Unknown diagnostic shape remains a generic storage failure. */}
 }
 return storageUnavailable();
}

/**
 * Internal staging only: caller supplies an authorized source reader and an independent Home storage.
 * No Home/document/receipt is written here. Persist successful staging immediately in the caller's ledger.
 * A rejected write has unknown outcome and no known owned key: never guess a cleanup path.
 */
export async function stageGiftOriginal(readSource:()=>Promise<Buffer>,expected:GiftOriginalProof,storage:Storage):Promise<StagedGiftOriginal>{
 const selected=proof(expected);
 if(typeof readSource!=='function')throw new PracticeError('invalid_input');
 let source:Buffer;
 try{const loaded=await readSource();if(!Buffer.isBuffer(loaded))throw new PracticeError('source_changed');source=Buffer.from(loaded);}catch(error){throw sanitized(error);}
 if(source.length!==selected.byteSize||digest(source)!==selected.sha256)throw new PracticeError('source_changed');
 const detected=await detectOriginal(source);
 if(detected!==selected.mimeType)throw new PracticeError('source_changed');
 let admitted:Awaited<ReturnType<Storage['writeVerified']>>;
 try{admitted=await storage.writeVerified(Buffer.from(source));}catch(error){throw sanitized(error);}
 // Only a valid key returned by our new write is eligible for cleanup before this helper returns.
 let ownedKey:string|null=null;
 try{
  if(!admitted||typeof admitted.key!=='string'||!keyPattern.test(admitted.key))throw storageUnavailable();
  ownedKey=admitted.key;
  const control=receipt(admitted.control),copied=await storage.read(ownedKey);
  if(!Buffer.isBuffer(copied)||copied.length!==selected.byteSize||digest(copied)!==selected.sha256)throw storageUnavailable();
  return {storageKey:ownedKey,sha256:selected.sha256,byteSize:selected.byteSize,mimeType:detected,originalFilename:selected.originalFilename,control};
 }catch(error){
  // No DB reference can exist yet under this staging contract. Never remove older/source objects.
  if(ownedKey){try{await storage.remove(ownedKey);}catch{/* Preserve the original admission failure; orphan cleanup remains safe. */}}
  throw sanitized(error);
 }
}
