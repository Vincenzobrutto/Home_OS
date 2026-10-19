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
import { currentOrganization, organizationView } from '../document-intake/organization';
import { DOCUMENT_COLLECTIONS } from '../document-intake/domain';
import { documentRemoval } from './removal';
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
  async removalCapability(accountId:string,homeId:string,id:string){
    return this.db.$transaction(async tx=>{await this.policy.requireLocked(tx,accountId,homeId);await this.policy.require(accountId,homeId,'edit',tx);const target=await documentRemoval(tx,accountId,homeId,id);if(!target)throw new ForbiddenException();return {allowed:target.allowed,reason:target.reason};});
  }
  async remove(accountId:string,homeId:string,id:string,input:unknown,key?:string){
    const body=object(input,['expectedVersion']);if(!Number.isSafeInteger(body.expectedVersion)||Number(body.expectedVersion)<1||!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw new UnprocessableEntityException();
    const fingerprint=digest(JSON.stringify(body)),operation='document-removal-v1';
    const result=await this.db.$transaction(async tx=>{
      await this.policy.requireLocked(tx,accountId,homeId);await this.policy.require(accountId,homeId,'edit',tx);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'g1:'+homeId},0))::text AS locked`;
      const prior=await tx.objectOnboardingRequest.findUnique({where:{accountId_homeId_operation_target_key:{accountId,homeId,operation,target:id,key:key!}}});
      if(prior){if(prior.digest!==fingerprint)throw new ConflictException();return prior.response as {storageKey:string};}
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR UPDATE`;
      const target=await documentRemoval(tx,accountId,homeId,id);if(!target)throw new ForbiddenException();
      if(!target.allowed)throw new ConflictException({code:'document_removal_unavailable',message:target.reason});
      const doc=target.doc;if(doc.original!.version!==body.expectedVersion)throw new ConflictException({code:'document_version_conflict',message:'Il documento è cambiato. Riapri la sua scheda.'});
      const itemIds=doc.intakeItems.map(i=>i.id),batchIds=[...new Set(doc.intakeItems.map(i=>i.batchId))];
      await tx.documentIntakeAnalysis.deleteMany({where:{itemId:{in:itemIds}}});
      await tx.documentIntakeItem.deleteMany({where:{id:{in:itemIds}}});
      await tx.documentIntakeBatch.updateMany({where:{id:{in:batchIds}},data:{version:{increment:1},updatedAt:new Date()}});
      await tx.uploadRequest.deleteMany({where:{documentId:id}});
      await tx.documentVersion.delete({where:{documentId:id}});await tx.document.delete({where:{id}});await tx.storedFile.delete({where:{id:doc.original!.fileId}});
      const response={storageKey:doc.original!.file.storageKey};await tx.objectOnboardingRequest.create({data:{accountId,homeId,operation,target:id,key:key!,digest:fingerprint,response}});return response;
    });
    const ref=await this.db.storedFile.findUnique({where:{storageKey:result.storageKey}}).catch(()=>undefined);if(ref===null)await this.storage.remove(result.storageKey).catch(()=>undefined);
    return {removed:true};
  }
  async accessible(accountId: string, homeId: string, documentId: string) {
    const member = await this.policy.require(accountId, homeId);
    const doc = await this.db.document.findUnique({ where: { id: documentId }, include: includeOriginal });
    if (!doc || doc.homeId !== homeId || !canReadDocument(doc, accountId)) throw new ForbiddenException('Accesso non consentito.');
    return { doc, member };
  }
  async searchCapabilities(accountId: string, homeId: string, query: unknown) {
    object(query, []);
    return this.db.$transaction(async tx => { await this.policy.requireLocked(tx, accountId, homeId); return { ...SEARCH_CAPABILITIES, collections: DOCUMENT_COLLECTIONS }; });
  }
  async workflowSummary(accountId:string,homeId:string,query:unknown){
    object(query,[]);const {state}=workflowSql(accountId,homeId);
    return this.db.$transaction(async tx=>{
      await this.policy.requireLocked(tx,accountId,homeId);
      const rows=await tx.$queryRaw<Array<{state:string;count:bigint}>>(Prisma.sql`SELECT x.state,COUNT(*) AS count FROM (
        SELECT ${state} AS state FROM "Document" d LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
        LEFT JOIN "DocumentOrganization" o ON o."documentId"=d.id AND o."accountId"=${accountId} AND o."homeId"=${homeId} AND o."documentVersion"=v.version AND o."documentSha256"=v.sha256
        WHERE d."homeId"=${homeId} AND (d.visibility='home' OR d."uploaderId"=${accountId})
      ) x GROUP BY x.state`);
      const counts={to_compile:0,review:0,analyzing:0,attention:0,completed:0};
      for(const row of rows)if(row.state in counts)counts[row.state as keyof typeof counts]=Number(row.count);
      return {counts};
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:15000,maxWait:15000});
  }
  async list(accountId: string, homeId: string, query: SearchDocumentsDto) {
    const filters = searchFilters(query), anchor = searchAnchor(query.cursor, accountId, homeId, filters);
    // Prisma raw Date parameters are timestamptz; Document.createdAt is timestamp.
    // Bind the cursor's exact stored wall value as text, avoiding session timezone
    // conversion that would repeat a page in a non-UTC PostgreSQL session.
    const anchorTime = anchor?.createdAt.toISOString().slice(0, -1);
    const mime = { pdf: 'application/pdf', jpeg: 'image/jpeg', png: 'image/png' };
    const pattern = literalPattern(filters.q);
    const {completed,state}=workflowSql(accountId,homeId);

    return this.db.$transaction(async tx => {
      await this.policy.requireLocked(tx, accountId, homeId);
      // Use the installed deterministic Unicode ICU collation; the development
      // database's default C collation only folds ASCII. Never rewrite originals.
      const ids = await tx.$queryRaw<Array<{ id: string; workflowState: string }>>(Prisma.sql`
        SELECT d.id, ${state} AS "workflowState"
        FROM "Document" d LEFT JOIN "DocumentVersion" v ON v."documentId"=d.id
        LEFT JOIN "DocumentOrganization" o ON o."documentId"=d.id AND o."accountId"=${accountId} AND o."homeId"=${homeId} AND o."documentVersion"=v.version AND o."documentSha256"=v.sha256
        WHERE d."homeId"=${homeId} AND (d.visibility='home' OR d."uploaderId"=${accountId})
        ${filters.workflow==='all'?Prisma.empty:['pending','completed'].includes(filters.workflow)?Prisma.sql`AND ${completed}=${filters.workflow==='completed'}`:Prisma.sql`AND ${state}=${filters.workflow}`}
        ${filters.visibility === 'all' ? Prisma.empty : Prisma.sql`AND d.visibility::text=${filters.visibility}`}
        ${filters.format === 'all' ? Prisma.empty : Prisma.sql`AND v."mimeType"=${mime[filters.format]}`}
        ${filters.collection === 'all' ? Prisma.empty : filters.collection === 'house' ? Prisma.sql`AND o.collections && ARRAY['building','energy','technical','contracts']::text[]` : filters.collection === 'floor_plans' ? Prisma.sql`AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.parts) part WHERE part->>'kind'='floor_plan')` : filters.collection === 'unclassified' ? Prisma.sql`AND (o.id IS NULL OR ${filters.collection}=ANY(o.collections))` : Prisma.sql`AND ${filters.collection}=ANY(o.collections)`}
        ${!filters.q ? Prisma.empty : Prisma.sql`AND (normalize(COALESCE(o.title,d.name),NFC) COLLATE "und-x-icu" ILIKE ${pattern} ESCAPE '\\' OR normalize(v."originalFilename",NFC) COLLATE "und-x-icu" ILIKE ${pattern} ESCAPE '\\')`}
        ${!anchor ? Prisma.empty : Prisma.sql`AND (d."createdAt"<${anchorTime}::timestamp OR (d."createdAt"=${anchorTime}::timestamp AND d.id<${anchor.id}))`}
        ORDER BY d."createdAt" DESC,d.id DESC LIMIT ${query.limit + 1} FOR SHARE OF d`);
      if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM "DocumentVersion" WHERE "documentId" IN (${Prisma.join(ids.map(row => row.id))}) ORDER BY id FOR SHARE`);
      const docs = await tx.document.findMany({ where: { ...readableWhere(accountId, homeId), id: { in: ids.map(row => row.id) } }, include: includeOriginal, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const member = await this.policy.require(accountId, homeId, 'read', tx);
      const page = docs.slice(0, query.limit), last = page.at(-1);
      return { items: await Promise.all(page.map(async doc => {
        const org = await currentOrganization(tx, accountId, homeId, doc);
        return { ...publicDocument(doc, canExport(member)), ...(org ? { name: org.title } : {}), organization: org ? organizationView(org) : null, workflowState: ids.find(row => row.id === doc.id)!.workflowState };
      })), nextCursor: docs.length > query.limit && last ? searchCursor(last, accountId, homeId, filters) : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000, maxWait: 15000 });
  }
  async get(accountId: string, homeId: string, id: string) {
    return this.db.$transaction(async tx => {
      const member = await this.policy.requireLocked(tx, accountId, homeId);
      await tx.$queryRaw`SELECT id FROM "Document" WHERE id=${id} FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "DocumentVersion" WHERE "documentId"=${id} FOR SHARE`;
      const current = await tx.document.findUnique({ where: { id }, include: includeOriginal });
      if (!current || current.homeId !== homeId || !canReadDocument(current, accountId)) throw new ForbiddenException();
      const org = await currentOrganization(tx, accountId, homeId, current);
      return { document: { ...publicDocument(current, canExport(member), true), ...(org ? { name: org.title } : {}), organization: org ? organizationView(org) : null } };
    });
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
    const stored = await this.storage.writeVerified(file.buffer), storageKey=stored.key;
    try {
      const doc = await this.db.$transaction(async tx => {
        // Recheck membership inside the transaction, after multipart and file IO.
        const member = await tx.homeMembership.findUnique({ where: { accountId_homeId: { accountId, homeId } } });
        if (!member || !validMembership(member) || member.role === 'viewer') throw new ForbiddenException('Accesso non consentito.');
        const created = await tx.document.create({ data: { homeId, uploaderId: accountId, name: dto.name, visibility: dto.visibility, original: { create: { originalFilename, mimeType, byteSize: file.buffer.length, sha256, fileControlEngine:stored.control.engine,fileControlCheckedAt:stored.control.checkedAt,fileControlSignature:stored.control.signatureVersion, file: { create: { storageKey } } } } }, include: includeOriginal });
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
      const organizations = await this.db.$transaction(async tx => {
        await this.policy.requireLocked(tx, accountId, homeId);
        return new Map(await Promise.all(docs.map(async doc => {
          const org = await currentOrganization(tx, accountId, homeId, doc);
          return [doc.id, org ? organizationView(org) : null] as const;
        })));
      });
      const archive = archiver('zip', { store: true });
      const chunks: Buffer[] = [];
      const completed = new Promise<Buffer>((resolve, reject) => { archive.on('data', (chunk: Buffer) => chunks.push(chunk)); archive.on('error', reject); archive.on('warning', reject); archive.on('end', () => resolve(Buffer.concat(chunks))); });
      for (const { doc, bytes } of files) archive.append(bytes, { name: `${doc.id}-${doc.original!.originalFilename}` });
      archive.append(JSON.stringify({ documents: files.map(({ doc }) => ({ documentId: doc.id, version: doc.original!.version, originalFilename: doc.original!.originalFilename, byteSize: doc.original!.byteSize, sha256: doc.original!.sha256, visibility: doc.visibility, organization: organizations.get(doc.id) })) }, null, 2), { name: 'manifest.json' });
      void archive.finalize().catch(error => { archive.emit('error', error); archive.abort(); });
      const bytes = await completed.catch(() => { throw storageUnavailable(); });
      await this.policy.require(accountId, homeId, 'export');
      for (const doc of docs) {
        const current = await this.accessible(accountId, homeId, doc.id);
        if (current.doc.original?.version !== doc.original!.version || current.doc.original?.sha256 !== doc.original!.sha256) throw new ForbiddenException();
      }
      return bytes;
    } finally { this.exportsRunning--; }
  }
}

function workflowSql(accountId:string,homeId:string){
    const completed=Prisma.sql`(
      NOT EXISTS(SELECT 1 FROM "ObjectOnboardingDraft" p WHERE p.mode<>'floor_plan' AND p."accountId"=${accountId} AND p."homeId"=${homeId} AND p."documentId"=d.id AND p."documentVersion"=v.version AND p."documentSha256"=v.sha256 AND p.state='open')
      AND NOT EXISTS(SELECT 1 FROM "ObjectOnboardingJob" j WHERE j.purpose='products' AND j."accountId"=${accountId} AND j."homeId"=${homeId} AND j."documentId"=d.id AND j."documentVersion"=v.version AND j."documentSha256"=v.sha256 AND (j.state IN ('queued','running') OR (j.state='uncertain' AND NOT EXISTS(SELECT 1 FROM "ObjectOnboardingDraft" c WHERE c.mode<>'floor_plan' AND c."accountId"=j."accountId" AND c."documentId"=d.id AND c."documentVersion"=v.version AND c."documentSha256"=v.sha256 AND c.state='confirmed' AND c."updatedAt">=j."updatedAt"))))
      AND (EXISTS(SELECT 1 FROM "ObjectOnboardingDraft" p WHERE p.mode<>'floor_plan' AND p."accountId"=${accountId} AND p."homeId"=${homeId} AND p."documentId"=d.id AND p."documentVersion"=v.version AND p."documentSha256"=v.sha256 AND p.state='confirmed')
      OR (o.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.parts) p WHERE p->>'kind' IN ('invoice','receipt','utility_bill','purchase_document','purchase_order','product_label','delivery_notice'))))
    )`;
return {completed,state:Prisma.sql`CASE
          WHEN ${completed} THEN 'completed'
          WHEN EXISTS(SELECT 1 FROM "ObjectOnboardingJob" j WHERE j.purpose='products' AND j."accountId"=${accountId} AND j."homeId"=${homeId} AND j."documentId"=d.id AND j."documentVersion"=v.version AND j."documentSha256"=v.sha256 AND j.state IN ('queued','running')) THEN 'analyzing'
          WHEN EXISTS(SELECT 1 FROM "ObjectOnboardingDraft" p WHERE p.mode<>'floor_plan' AND p."accountId"=${accountId} AND p."homeId"=${homeId} AND p."documentId"=d.id AND p."documentVersion"=v.version AND p."documentSha256"=v.sha256 AND p.state='open' AND p.mode='extraction') THEN 'review'
          WHEN (SELECT j.state FROM "ObjectOnboardingJob" j WHERE j.purpose='products' AND j."accountId"=${accountId} AND j."homeId"=${homeId} AND j."documentId"=d.id AND j."documentVersion"=v.version AND j."documentSha256"=v.sha256 ORDER BY j."createdAt" DESC,j.id DESC LIMIT 1) IN ('failed','uncertain') THEN 'attention'
          ELSE 'to_compile' END`};
}
