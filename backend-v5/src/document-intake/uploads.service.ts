import { removalTarget } from './removal';
import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { LocalFileStorage, detectOriginal, safeFilename, storageUnavailable } from '../documents/storage';
import { digest } from '../security';
import { conflict, invalid, object, uuid, version } from '../review/domain';
import { IntakeBatchesService } from './batches.service';

export const INTAKE_UPLOAD_LEASE_MS = 120000;
type Tx = Prisma.TransactionClient;
type Incoming = { buffer: Buffer; originalname: string };
@Injectable()
export class IntakeUploadsService {
  constructor(private readonly db: PrismaService, private readonly batches: IntakeBatchesService, private readonly storage: LocalFileStorage) {}
  private canonical(tx: Tx, a: string, h: string, sha256: string, byteSize: number, mimeType: string, id?: string) {
    // Only the uploader's private originals qualify; shared/private variants are never merged.
    return tx.document.findFirst({ where: { ...(id ? { id } : {}), homeId: h, uploaderId: a, visibility: 'private', trashedAt: null, original: { sha256, byteSize, mimeType } }, include: { original: { include: { file: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  }
  private async cleanup(key: string | undefined) {
    if (!key) return;
    // A failed commit response is not proof of rollback. Keep the file if DB is unavailable.
    const reference = await this.db.storedFile.findUnique({ where: { storageKey: key } }).catch(() => undefined);
    if (reference === null) await this.storage.remove(key).catch(() => undefined);
  }
  async remove(a:string,h:string,batchId:string,itemId:string,input:unknown,key?:string){
    uuid(batchId);uuid(itemId);if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw invalid();const body=object(input,['expectedVersion']),expectedVersion=version(body.expectedVersion),fingerprint=digest(String(expectedVersion)),operation='remove:'+itemId;
    const stored=await this.batches.authorized(a,h,true,async tx=>{
      const batch=await this.batches.locked(tx,a,h,batchId),prior=await tx.documentIntakeRequest.findUnique({where:{batchId_operation_key:{batchId,operation,key:key!}}});
      if(prior){if(prior.digest!==fingerprint)throw conflict('idempotency_conflict','Chiave già utilizzata.');return prior.results as {storageKey?:string};}
      const item=batch.items.find(i=>i.id===itemId);if(!item)throw new ForbiddenException();
      if(batch.state!=='open'||item.version!==expectedVersion)throw conflict('item_version_conflict','Il file è cambiato: rileggi il caricamento.');
      if(item.documentId)await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${item.documentId} FOR UPDATE`;
      const target=await removalTarget(tx,a,h,item);if(!target)throw conflict('intake_remove_unavailable','Puoi rimuovere soltanto file non ancora elaborati o collegati. Attendi eventuali letture locali in corso e rileggi il caricamento.');
      await tx.documentIntakeAnalysis.deleteMany({where:{itemId}});await tx.documentIntakeItem.delete({where:{id:itemId}});
      if(target.documentId){await tx.documentVersion.delete({where:{documentId:target.documentId}});await tx.document.delete({where:{id:target.documentId}});await tx.storedFile.delete({where:{id:target.fileId!}});}
      await tx.documentIntakeBatch.update({where:{id:batchId},data:{version:{increment:1},updatedAt:new Date()}});
      const result=target.storageKey?{storageKey:target.storageKey}:{};await tx.documentIntakeRequest.create({data:{batchId,operation,key:key!,digest:fingerprint,body:{expectedVersion},results:result}});return result;
    });
    await this.cleanup(stored.storageKey);return this.batches.get(a,h,batchId,{});
  }
  async upload(a: string, h: string, batchId: string, itemId: string, file: Incoming | undefined, key?: string) {
    uuid(batchId); uuid(itemId);
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw invalid('Chiave del caricamento non valida.');
    if (!file || !Buffer.isBuffer(file.buffer) || typeof file.originalname !== 'string') throw invalid('Seleziona il file originale.');
    const filename = safeFilename(file.originalname), sha256 = digest(file.buffer), fingerprint = digest(JSON.stringify([filename, file.buffer.length, sha256])), token = randomUUID();
    const claim = await this.batches.authorized(a, h, true, async tx => {
      const batch = await tx.documentIntakeBatch.findFirst({ where: { id: batchId, accountId: a, homeId: h } });
      if (!batch) throw new ForbiddenException('Accesso non consentito.');
      const account = await tx.account.findUniqueOrThrow({ where: { id: a } });
      if (account.requiresEmailVerification && !account.emailVerifiedAt) throw new ForbiddenException({ code: 'email_verification_required', message: 'Conferma la tua email prima di caricare documenti.' });
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'intake-upload-account:' + a},0))::text AS locked`;
      await tx.$queryRaw`SELECT id FROM "DocumentIntakeItem" WHERE id=${itemId} FOR UPDATE`;
      const item = await tx.documentIntakeItem.findFirst({ where: { id: itemId, batchId } });
      if (!item) throw new ForbiddenException('Accesso non consentito.');
      if (item.uploadKey && (item.uploadKey !== key || item.uploadDigest !== fingerprint)) throw conflict('idempotency_conflict', 'Questo elemento è già associato a un altro caricamento.');
      if (item.uploadState === 'stored' || item.uploadState === 'duplicate') return { replay: true, item };
      if (batch.state !== 'open') throw conflict('intake_batch_closed', 'Il lotto è già concluso.');
      if (item.uploadState === 'uploading' && item.uploadLeaseUntil && item.uploadLeaseUntil.getTime() > Date.now()) throw conflict('intake_upload_in_progress', 'Il file è già in caricamento. Recupera lo stato prima di riprovare.');
      const active = await tx.documentIntakeItem.count({ where: { batch: { accountId: a }, uploadState: 'uploading', uploadLeaseUntil: { gt: new Date() } } });
      if (active >= 2) throw new HttpException({ code: 'intake_upload_busy', message: 'Sono già in caricamento due tuoi file. Attendi e riprova questo elemento.' }, 429);
      await tx.documentIntakeItem.update({ where: { id: itemId }, data: { uploadState: 'uploading', uploadKey: key, uploadDigest: fingerprint, uploadLeaseToken: token, uploadLeaseUntil: new Date(Date.now() + INTAKE_UPLOAD_LEASE_MS), uploadError: null, version: { increment: 1 }, updatedAt: new Date() } });
      await tx.documentIntakeBatch.update({ where: { id: batchId }, data: { version: { increment: 1 }, updatedAt: new Date() } });
      return { replay: false, item };
    });
    if (claim.replay) return this.batches.get(a, h, batchId, {});
    let stored: Awaited<ReturnType<LocalFileStorage['writeVerified']>> | undefined;
    let cleanupAllowed = true;
    try {
      const mimeType = await detectOriginal(file.buffer);
      if (filename !== claim.item.filename || file.buffer.length !== claim.item.byteSize || mimeType !== claim.item.mimeType) throw invalid('Il file non corrisponde all’elemento del lotto. Non è stato aggiunto alcun documento.', 'intake_manifest_mismatch');
      const known = await this.batches.authorized(a, h, true, tx => this.canonical(tx, a, h, sha256, file.buffer.length, mimeType));
      let verified: { id: string; version: number } | null = null;
      if (known?.original) {
        const original = await this.storage.read(known.original.file.storageKey);
        if (original.length !== known.original.byteSize || digest(original) !== sha256) throw storageUnavailable();
        verified = { id: known.id, version: known.original.version };
      }
      // Exact, still-readable admitted bytes need no second storage object. Legacy originals
      // without an admission receipt still pass the existing scanner via a fresh staging file.
      if (!known?.original?.fileControlCheckedAt || known.original.fileControlEngine !== 'microsoft_defender' || !known.original.fileControlSignature) stored = await this.storage.writeVerified(file.buffer);
      await this.batches.authorized(a, h, true, async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'intake-content:' + a + ':' + h + ':' + sha256},0))::text AS locked`;
        await tx.$queryRaw`SELECT id FROM "DocumentIntakeItem" WHERE id=${itemId} FOR UPDATE`;
        const item = await tx.documentIntakeItem.findFirst({ where: { id: itemId, batchId, batch: { accountId: a, homeId: h } } });
        if (!item || item.uploadState !== 'uploading' || item.uploadLeaseToken !== token || !item.uploadLeaseUntil || item.uploadLeaseUntil.getTime() <= Date.now()) throw conflict('intake_upload_lease_expired', 'Il caricamento è stato interrotto. Recupera lo stato prima di riprovare.');
        let existing = await this.canonical(tx, a, h, sha256, file.buffer.length, mimeType);
        if (existing) {
          await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${existing.id} FOR SHARE`;
          await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${existing.id} FOR SHARE`;
          existing = await this.canonical(tx, a, h, sha256, file.buffer.length, mimeType, existing.id);
          if (!existing) throw conflict('intake_source_changed', 'L’originale di riferimento è cambiato. Riprova questo file.');
        }
        if (!stored && (!existing?.original || verified?.id !== existing.id || verified.version !== existing.original.version)) throw conflict('intake_source_changed', 'L’originale di riferimento è cambiato. Riprova questo file.');
        let doc = existing;
        if (!doc) {
          if (!stored) throw storageUnavailable();
          doc = await tx.document.create({ data: { homeId: h, uploaderId: a, name: filename, visibility: 'private', original: { create: { originalFilename: filename, mimeType, byteSize: file.buffer.length, sha256, fileControlEngine: stored.control.engine, fileControlCheckedAt: stored.control.checkedAt, fileControlSignature: stored.control.signatureVersion, file: { create: { storageKey: stored.key } } } } }, include: { original: { include: { file: true } } } });
        }
        await tx.documentIntakeItem.update({ where: { id: itemId }, data: { uploadState: existing ? 'duplicate' : 'stored', documentId: doc.id, documentVersion: doc.original!.version, documentSha256: sha256, uploadLeaseToken: null, uploadLeaseUntil: null, uploadError: null, version: { increment: 1 }, updatedAt: new Date() } });
        await tx.documentIntakeBatch.update({ where: { id: batchId }, data: { version: { increment: 1 }, updatedAt: new Date() } });
      });
    } catch (error) {
      const response = error instanceof HttpException ? error.getResponse() : null;
      const code = error instanceof ForbiddenException ? 'access_revoked' : response && typeof response === 'object' && 'code' in response && ['file_too_large', 'unsupported_file_type', 'file_check_unavailable', 'storage_unavailable', 'storage_capacity_low', 'intake_manifest_mismatch', 'intake_upload_lease_expired', 'intake_source_changed'].includes(String(response.code)) ? String(response.code) : 'intake_upload_failed';
      // Unknown transaction/transport errors can precede a still-pending commit.
      // Absence in a fresh lookup alone does not prove that a file is unreferenced.
      if (code === 'intake_upload_failed') cleanupAllowed = false;
      await this.db.$transaction(async tx => {
        const changed = await tx.documentIntakeItem.updateMany({ where: { id: itemId, batchId, uploadState: 'uploading', uploadLeaseToken: token, batch: { accountId: a, homeId: h } }, data: { uploadState: 'failed', uploadError: code, uploadLeaseToken: null, uploadLeaseUntil: null, version: { increment: 1 }, updatedAt: new Date() } });
        if (changed.count) await tx.documentIntakeBatch.update({ where: { id: batchId }, data: { version: { increment: 1 }, updatedAt: new Date() } });
      }).catch(() => { cleanupAllowed = false; });
      throw error;
    } finally { if (cleanupAllowed) await this.cleanup(stored?.key); }
    return this.batches.get(a, h, batchId, {});
  }
}
