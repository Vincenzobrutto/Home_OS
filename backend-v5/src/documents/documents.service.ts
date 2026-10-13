import { ConflictException, ForbiddenException, Injectable, OnModuleInit, PayloadTooLargeException, HttpException, UnprocessableEntityException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import archiver from 'archiver';
import type { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest, validMembership } from '../security';
import { DocumentPolicy, canReadDocument, canExport } from './access';
import { LocalFileStorage, detectOriginal, safeFilename, storageUnavailable, MAX_EXPORT_BYTES } from './storage';
import { UploadDocumentDto, ListDocumentsDto } from './dto';
const includeOriginal = { original: { include: { file: true } } } as const;
type OriginalDocument = Prisma.DocumentGetPayload<{ include: typeof includeOriginal }>;
function readableWhere(accountId: string, homeId: string): Prisma.DocumentWhereInput { return { homeId, OR: [{ visibility: 'home' }, { uploaderId: accountId }] }; }
export function publicDocument(doc: OriginalDocument, exporting: boolean, detail = false) {
  if (!doc.original) throw storageUnavailable();
  const original = doc.original;
  return { id: doc.id, homeId: doc.homeId, name: doc.name, originalFilename: original.originalFilename, mimeType: original.mimeType, byteSize: original.byteSize, createdAt: doc.createdAt.toISOString(), version: original.version, source: 'manual_upload', status: 'stored', visibility: doc.visibility, permissions: exporting ? ['read', 'export'] : ['read'], ...(detail ? { sha256: original.sha256 } : {}) };
}
@Injectable()
export class DocumentsService implements OnModuleInit {
  private exportsRunning = 0;
  constructor(private readonly db: PrismaService, private readonly storage: LocalFileStorage, private readonly policy: DocumentPolicy) {}
  async onModuleInit() {
    await this.storage.cleanup(async storageKey => !!(await this.db.storedFile.findUnique({ where: { storageKey } }))).catch(() => console.warn('Cleanup storage V5 rinviato: nessun file eliminato senza verifica.'));
  }
  async accessible(accountId: string, homeId: string, documentId: string) {
    const member = await this.policy.require(accountId, homeId);
    const doc = await this.db.document.findUnique({ where: { id: documentId }, include: includeOriginal });
    if (!doc || doc.homeId !== homeId || !canReadDocument(doc, accountId)) throw new ForbiddenException('Accesso non consentito.');
    return { doc, member };
  }
  async list(accountId: string, homeId: string, query: ListDocumentsDto) {
    const member = await this.policy.require(accountId, homeId);
    let anchor: { createdAt: Date; id: string } | undefined;
    if (query.cursor) {
      try {
        const data = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as { t: string; id: string; h: string; a: string };
        if (!isUUID(data.id) || data.h !== homeId || data.a !== accountId || !Number.isFinite(Date.parse(data.t))) throw new Error();
        anchor = { createdAt: new Date(data.t), id: data.id };
      } catch { throw new UnprocessableEntityException({ code: 'validation_error', message: 'Pagina non valida.' }); }
    }
    const docs = await this.db.document.findMany({ where: { AND: [readableWhere(accountId, homeId), ...(anchor ? [{ OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] }] : [])] }, include: includeOriginal, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1 });
    const page = docs.slice(0, query.limit); const last = page.at(-1);
    return { items: page.map(doc => publicDocument(doc, canExport(member))), nextCursor: docs.length > query.limit && last ? Buffer.from(JSON.stringify({ t: last.createdAt.toISOString(), id: last.id, h: homeId, a: accountId })).toString('base64url') : null };
  }
  async get(accountId: string, homeId: string, id: string) {
    const { doc, member } = await this.accessible(accountId, homeId, id);
    return { document: publicDocument(doc, canExport(member), true) };
  }
  async upload(accountId: string, homeId: string, dto: UploadDocumentDto, file: { buffer: Buffer; originalname: string } | undefined, key?: string) {
    await this.policy.require(accountId, homeId, 'edit');
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new UnprocessableEntityException({ code: 'validation_error', message: 'Chiave di caricamento non valida.' });
    if (!file) throw new UnprocessableEntityException({ code: 'validation_error', message: 'Seleziona un originale.', fieldErrors: { file: 'File richiesto.' } });
    const mimeType = await detectOriginal(file.buffer);
    const originalFilename = safeFilename(file.originalname);
    const sha256 = digest(file.buffer);
    const fingerprint = digest(JSON.stringify([dto.name, dto.visibility, originalFilename, sha256]));
    const lookup = { accountId_homeId_key: { accountId, homeId, key } };
    const prior = await this.db.uploadRequest.findUnique({ where: lookup });
    if (prior) return this.prior(accountId, homeId, prior, fingerprint);
    const storageKey = await this.storage.write(file.buffer);
    try {
      const doc = await this.db.$transaction(async tx => {
        // Recheck membership inside the transaction, after multipart and file IO.
        const member = await tx.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } } });
        if (!member || !validMembership(member) || member.role === 'viewer') throw new ForbiddenException('Accesso non consentito.');
        const created = await tx.document.create({ data: { homeId, uploaderId: accountId, name: dto.name, visibility: dto.visibility, original: { create: { originalFilename, mimeType, byteSize: file.buffer.length, sha256, file: { create: { storageKey } } } } }, include: includeOriginal });
        await tx.uploadRequest.create({ data: { accountId, homeId, key, digest: fingerprint, documentId: created.id } });
        return created;
      });
      return { document: publicDocument(doc, true, true) };
    } catch (error) {
      // A failed connection can leave commit uncertain. Keep files if DB lookup fails.
      const referenced = await this.db.storedFile.findUnique({ where: { storageKey } }).catch(() => undefined);
      if (referenced === null) await this.storage.remove(storageKey).catch(() => undefined);
      if ((error as { code?: string }).code === 'P2002') {
        const completed = await this.db.uploadRequest.findUnique({ where: lookup });
        if (completed) return this.prior(accountId, homeId, completed, fingerprint);
      }
      throw error;
    }
  }
  private prior(accountId: string, homeId: string, prior: { digest: string; documentId: string }, fingerprint: string) {
    if (prior.digest !== fingerprint) throw new ConflictException({ code: 'idempotency_conflict', message: 'La chiave è già usata per un altro caricamento.' });
    return this.get(accountId, homeId, prior.documentId);
  }
  async originalBytes(doc: OriginalDocument) {
    if (!doc.original) throw storageUnavailable();
    const bytes = await this.storage.read(doc.original.file.storageKey);
    if (bytes.length !== doc.original.byteSize || digest(bytes) !== doc.original.sha256) throw storageUnavailable();
    return bytes;
  }
  async file(accountId: string, homeId: string, id: string) {
    const { doc } = await this.accessible(accountId, homeId, id);
    const bytes = await this.originalBytes(doc);
    await this.policy.require(accountId, homeId);
    return { bytes, filename: doc.original!.originalFilename, mimeType: doc.original!.mimeType };
  }
  async export(accountId: string, homeId: string, ids: string[]) {
    await this.policy.require(accountId, homeId, 'export');
    const docs = await this.db.document.findMany({ where: { AND: [readableWhere(accountId, homeId), { id: { in: ids } }] }, include: includeOriginal });
    if (docs.length !== ids.length) throw new ForbiddenException('Accesso non consentito.');
    if (docs.reduce((sum, doc) => sum + (doc.original?.byteSize ?? 0), 0) > MAX_EXPORT_BYTES) throw new PayloadTooLargeException({ code: 'export_too_large', message: 'Gli originali selezionati superano 100 MiB.' });
    if (this.exportsRunning >= 2) throw new HttpException('Esportazione occupata. Riprova fra poco.', 429);
    this.exportsRunning++;
    try {
      const files = [];
      for (const doc of docs) files.push({ doc, bytes: await this.originalBytes(doc) });
      const archive = archiver('zip', { store: true });
      const chunks: Buffer[] = [];
      const completed = new Promise<Buffer>((resolve, reject) => { archive.on('data', (chunk: Buffer) => chunks.push(chunk)); archive.on('error', reject); archive.on('warning', reject); archive.on('end', () => resolve(Buffer.concat(chunks))); });
      for (const { doc, bytes } of files) archive.append(bytes, { name: `${doc.id}-${doc.original!.originalFilename}` });
      archive.append(JSON.stringify({ documents: files.map(({ doc }) => ({ documentId: doc.id, version: doc.original!.version, originalFilename: doc.original!.originalFilename, byteSize: doc.original!.byteSize, sha256: doc.original!.sha256, visibility: doc.visibility })) }, null, 2), { name: 'manifest.json' });
      void archive.finalize().catch(error => { archive.emit('error', error); archive.abort(); });
      const bytes = await completed.catch(() => { throw storageUnavailable(); });
      await this.policy.require(accountId, homeId, 'export');
      return bytes;
    } finally { this.exportsRunning--; }
  }
}
