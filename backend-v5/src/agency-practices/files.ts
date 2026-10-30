import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile, link, unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { PracticeError } from './domain';

const MARKER = '.dimora-agency-vault-v1';
const OWNER = 'Dimora Agency immutable files v1\n';
const MAX = 20 * 1024 * 1024;
export function inspectAgencyFile(input: unknown) {
  if (!Buffer.isBuffer(input) || input.length < 8 || input.length > MAX) throw new PracticeError('invalid_input');
  const bytes = Buffer.from(input); // Own the snapshot before any asynchronous work.
  let mimeType: 'application/pdf' | 'image/png' | 'image/jpeg';
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) mimeType = 'application/pdf';
  else if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mimeType = 'image/png';
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) mimeType = 'image/jpeg';
  else throw new PracticeError('invalid_input');
  // Signature identification is not a parser, virus scan or guarantee of renderability.
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.length, mimeType };
}

/** Internal bytes port. Never expose this object or accept its hash/path from HTTP. */
export class AgencyFileVault {
  private constructor(private readonly root: string) {}
  static async open(root: string) {
    if (typeof root !== 'string' || !isAbsolute(root)) throw new Error('agency_storage_root_invalid');
    root = resolve(root);
    await mkdir(root, { recursive: true, mode: 0o700 });
    if (!(await lstat(root)).isDirectory() || (await lstat(root)).isSymbolicLink() || resolve(await realpath(root)).toLowerCase() !== root.toLowerCase()) throw new Error('agency_storage_root_invalid');
    const entries = await readdir(root);
    if (!entries.length) {
      try { await writeFile(join(root, MARKER), OWNER, { flag: 'wx', mode: 0o600 }); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
    }
    const marker = join(root, MARKER);
    if ((await lstat(marker)).isSymbolicLink() || await readFile(marker, 'utf8') !== OWNER) throw new Error('agency_storage_root_unowned');
    return new AgencyFileVault(root);
  }
  private async checkedPath(hash: string) {
    if (!/^[a-f0-9]{64}$/u.test(hash)) throw new PracticeError('invalid_input');
    if ((await lstat(this.root)).isSymbolicLink() || resolve(await realpath(this.root)).toLowerCase() !== this.root.toLowerCase()) throw new Error('agency_storage_root_invalid');
    return join(this.root, 'object-' + hash);
  }
  async put(input: Buffer) {
    const file = inspectAgencyFile(input), target = await this.checkedPath(file.sha256), temp = join(this.root, 'pending-' + randomUUID());
    try {
      await writeFile(temp, file.bytes, { flag: 'wx', mode: 0o600 });
      try { await link(temp, target); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
      await this.read(file.sha256, file.byteSize); // Verify existing objects too; never overwrite.
      return { sha256: file.sha256, byteSize: file.byteSize, mimeType: file.mimeType };
    } finally { await unlink(temp).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }); }
  }
  async read(hash: string, expectedSize: number) {
    if (!Number.isSafeInteger(expectedSize) || expectedSize < 8 || expectedSize > MAX) throw new PracticeError('invalid_input');
    const target = await this.checkedPath(hash);
    try {
      const stat = await lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expectedSize) throw new Error('integrity');
      const bytes = await readFile(target);
      if (bytes.length !== expectedSize || createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('integrity');
      return bytes;
    } catch { throw new Error('agency_file_unavailable'); }
  }
}
