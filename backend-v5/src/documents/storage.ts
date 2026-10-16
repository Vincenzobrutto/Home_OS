import { Injectable, ServiceUnavailableException, UnsupportedMediaTypeException, UnprocessableEntityException, PayloadTooLargeException, HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, unlink, readFile, lstat, readdir, statfs } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { WindowsDefenderScanner } from './file-control';
import { digest } from '../security';
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_EXPORT_BYTES = 100 * 1024 * 1024;
export function storageUnavailable() { return new ServiceUnavailableException({ code: 'storage_unavailable', message: 'Originale temporaneamente non disponibile.' }); }
export function safeFilename(input: string) {
  // Multipart filename parameters can arrive as UTF-8 bytes decoded as Latin-1.
  if ([...input].every(char => char.charCodeAt(0) <= 255)) {
    const bytes = Buffer.from(input, 'latin1');
    const utf8 = bytes.toString('utf8');
    if (Buffer.from(utf8, 'utf8').equals(bytes)) input = utf8;
  }
  const leaf = input.replace(/\\/g, '/').split('/').pop() || 'documento';
  const clean = leaf.normalize('NFC').replace(/[<>:"/\\|?*\p{Cc}\p{Cf}]/gu, '_').replace(/^[. ]+|[. ]+$/g, '');
  return [...(clean || 'documento')].slice(0, 120).join('');
}
export async function detectOriginal(buffer: Buffer) {
  if (!buffer.length) throw new UnprocessableEntityException({ code: 'validation_error', message: 'Il file è vuoto.', fieldErrors: { file: 'Seleziona un file non vuoto.' } });
  if (buffer.length > MAX_FILE_BYTES) throw new PayloadTooLargeException({ code: 'file_too_large', message: 'Il file supera 20 MiB.' });
  let detected;
  try { detected = await fileTypeFromBuffer(buffer); } catch { detected = undefined; }
  if (!detected || !['application/pdf', 'image/jpeg', 'image/png'].includes(detected.mime)) {
    throw new UnsupportedMediaTypeException({ code: 'unsupported_file_type', message: 'Sono ammessi originali PDF, JPEG e PNG.' });
  }
  return detected.mime;
}
@Injectable()
export class LocalFileStorage {
  constructor(private readonly scanner: WindowsDefenderScanner = new WindowsDefenderScanner()) {}
  root = resolve(__dirname, '../../storage-private');
  path(key: string) {
    if (!/^[a-f0-9-]{36}\.bin$/.test(key)) throw storageUnavailable();
    return join(this.root, key);
  }
  protected async availableBytes() { const space=await statfs(this.root,{bigint:true});return space.bavail*space.bsize; }
  async write(buffer: Buffer) { return (await this.writeVerified(buffer)).key; }
  async writeVerified(buffer: Buffer) {
    const key = randomUUID() + '.bin';
    const stage = join(this.root, key + '.part');
    try {
      await mkdir(this.root, { recursive: true });
      if(await this.availableBytes()<1073741824n+BigInt(buffer.length))throw new ServiceUnavailableException({code:'storage_capacity_low',message:'Spazio temporaneamente insufficiente. Nessun documento salvato.'});
      await writeFile(stage, buffer, { flag: 'wx', mode: 0o600 });
      const control=await this.scanner.scan(stage,digest(buffer));
      await rename(stage, this.path(key));
      return {key,control};
    } catch (error) {
      await unlink(stage).catch(() => undefined);
      if(error instanceof HttpException)throw error;
      throw storageUnavailable();
    }
  }
  async read(key: string) {
    try {
      const target = this.path(key);
      const stat = await lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_BYTES) throw storageUnavailable();
      return await readFile(target);
    } catch { throw storageUnavailable(); }
  }
  async remove(key: string) { await unlink(this.path(key)); }
  async cleanup(isReferenced: (key: string) => Promise<boolean>, now = Date.now()) {
    await mkdir(this.root, { recursive: true });
    for (const key of await readdir(this.root)) {
      if (!/^[a-f0-9-]{36}\.bin(\.part)?$/.test(key)) continue;
      const stat = await lstat(join(this.root, key));
      if (!stat.isFile() || stat.isSymbolicLink() || now - stat.mtimeMs < 86400_000) continue;
      // Never delete after an uncertain DB result: lookup must succeed first.
      if (!(await isReferenced(key.replace(/\.part$/, '')))) await unlink(join(this.root, key));
    }
  }
}
