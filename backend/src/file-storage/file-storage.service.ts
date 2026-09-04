import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

interface StagedFile {
  originalPath: string;
  stagedPath: string;
}

@Injectable()
export class FileStorageService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private readonly trashDir = path.join(this.uploadDir, '.trash');

  store(file: Pick<Express.Multer.File, 'buffer' | 'originalname'>): string {
    fs.mkdirSync(this.uploadDir, { recursive: true });
    const safeOriginalName = path
      .basename(file.originalname)
      // eslint-disable-next-line no-control-regex -- range intenzionale: rimuove anche i caratteri di controllo (incluso il null byte) da un nome file non fidato, non solo i separatori di percorso.
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    const storedName = `${randomUUID()}-${safeOriginalName || 'documento'}`;
    fs.writeFileSync(path.join(this.uploadDir, storedName), file.buffer);
    return `uploads/${storedName}`;
  }

  read(fileUrl: string): Buffer {
    return fs.readFileSync(this.resolveExisting(fileUrl));
  }

  resolveExisting(fileUrl: string): string {
    const resolved = this.resolve(fileUrl);
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw new Error(`Il percorso ${fileUrl} non è un file`);
    return resolved;
  }

  // DB e filesystem non condividono una transazione. I file vengono quindi
  // spostati atomicamente in una staging area sullo stesso volume; se la
  // cancellazione DB fallisce tornano al loro posto, se riesce vengono
  // eliminati fisicamente. È la garanzia richiesta da B61 senza lasciare
  // record vivi che puntano a file già persi.
  async withFilesRemoved<T>(
    fileUrls: string[],
    removeDatabaseRecords: () => Promise<T>,
  ): Promise<T> {
    const operationDir = path.join(this.trashDir, randomUUID());
    const staged: StagedFile[] = [];

    try {
      for (const [index, fileUrl] of [...new Set(fileUrls)].entries()) {
        const originalPath = this.resolve(fileUrl);
        if (!fs.existsSync(originalPath)) continue;
        fs.mkdirSync(operationDir, { recursive: true });
        const stagedPath = path.join(
          operationDir,
          `${index}-${path.basename(originalPath)}`,
        );
        fs.renameSync(originalPath, stagedPath);
        staged.push({ originalPath, stagedPath });
      }
    } catch (error) {
      this.restore(staged);
      throw error;
    }

    let result: T;
    try {
      result = await removeDatabaseRecords();
    } catch (error) {
      this.restore(staged);
      throw error;
    }
    fs.rmSync(operationDir, { recursive: true, force: true });
    return result;
  }

  private resolve(fileUrl: string): string {
    const resolved = path.resolve(process.cwd(), fileUrl);
    if (
      resolved === this.uploadDir ||
      !resolved.startsWith(`${this.uploadDir}${path.sep}`) ||
      resolved.startsWith(`${this.trashDir}${path.sep}`)
    ) {
      throw new Error(`Percorso file non valido: ${fileUrl}`);
    }
    return resolved;
  }

  private restore(staged: StagedFile[]): void {
    for (const entry of [...staged].reverse()) {
      if (fs.existsSync(entry.stagedPath)) {
        fs.mkdirSync(path.dirname(entry.originalPath), { recursive: true });
        fs.renameSync(entry.stagedPath, entry.originalPath);
      }
    }
    if (staged.length > 0) {
      fs.rmSync(path.dirname(staged[0].stagedPath), {
        recursive: true,
        force: true,
      });
    }
  }
}
