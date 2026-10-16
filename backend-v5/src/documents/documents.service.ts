import { ConflictException, ForbiddenException, Injectable, OnModuleInit, PayloadTooLargeException, HttpException, UnprocessableEntityException } from '@nestjs/common';
import archiver from 'archiver';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { digest, validMembership } from '../security';
import { DocumentPolicy, canReadDocument, canExport } from './access';
import { LocalFileStorage, detectOriginal, safeFilename, storageUnavailable, MAX_EXPORT_BYTES } from './storage';
import { UploadDocumentDto, SearchDocumentsDto } from './dto';
import { SEARCH_CAPABILITIES, literalPattern, searchAnchor, searchCursor, searchFilters } from './search';
import { object } from '../review/domain';
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
  async searchCapabilities(accountId: string, homeId: string, query: unknown) {
    object(query, []);
    return this.db.$transaction(async tx => { await this.policy.requireLocked(tx, accountId, homeId); return SEARCH_CAPABILITIES; });
  }
  async list(accountId: string, homeId: string, query: SearchDocumentsDto) {
    const filters = searchFilters(query), anchor = searchAnchor(query.cursor, accountId, homeId, filters);
    // Prisma raw Date parameters are timestamptz; Document.createdAt is timestamp.
    // Bind the cursor's exact stored wall value as text, avoiding session timezone
    // conversion that would repeat a page in a non-UTC PostgreSQL session.
    const anchorTime = anchor?.createdAt.toISOString().slice(0, -1);
    const mime = { pdf: 'application/pdf', jpeg: 'image/jpeg', png: 'image/png' };
    const pattern = literalPattern(filters.q);
    return this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, accountId, homeId);
      // Use the installed deterministic Unicode ICU collation; the development
      // database's default C collation only folds ASCII. Never rewrite originals.
      const ids = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT d.id FROM "Document" d LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
        WHERE d."homeId"=${homeId} AND (d.visibility='home' OR d."uploaderId"=${accountId})
        ${filters.visibility === 'all' ? Prisma.empty : Prisma.sql`AND d.visibility::text=${filters.visibility}`}
        ${filters.format === 'all' ? Prisma.empty : Prisma.sql`AND v."mimeType"=${mime[filters.format]}`}
        ${!filters.q ? Prisma.empty : Prisma.sql`AND (normalize(d.name,NFC) COLLATE "und-x-icu" ILIKE ${pattern} ESCAPE '\\' OR normalize(v."originalFilename",NFC) COLLATE "und-x-icu" ILIKE ${pattern} ESCAPE '\\')`}
        ${!anchor ? Prisma.empty : Prisma.sql`AND (d."createdAt"<${anchorTime}::timestamp OR (d."createdAt"=${anchorTime}::timestamp AND d.id<${anchor.id}))`}
        ORDER BY d."createdAt" DESC,d.id DESC LIMIT ${query.limit + 1}`);
      const docs = await tx.document.findMany({ where: { ...readableWhere(accountId, homeId), id: { in: ids.map(row => row.id) } }, include: includeOriginal, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const member = await this.policy.require(accountId, homeId, 'read', tx);
      const page = docs.slice(0, query.limit), last = page.at(-1);
      return { items: page.map(doc => publicDocument(doc, canExport(member))), nextCursor: docs.length > query.limit && last ? searchCursor(last, accountId, homeId, filters) : null };
    }, { timeout: 15000, maxWait: 15000 });
  }
  async get(accountId: string, homeId: string, id: string) {
    const { doc, member } = await this.accessible(accountId, homeId, id);
    return { document: publicDocument(doc, canExport(member), true) };
  }
  async upload(accountId: string, homeId: string, dto: UploadDocumentDto, file: { buffer: Buffer; originalname: string } | undefined, key?: string) {
    await this.policy.require(accountId, homeId, 'edit');
    const account = await this.db.account.findUnique({where:{id:accountId}});
    if (account?.requiresEmailVerification && !account.emailVerifiedAt) throw new ForbiddenException({code:'email_verification_required',message:'Conferma la tua email prima di caricare documenti.'});
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
